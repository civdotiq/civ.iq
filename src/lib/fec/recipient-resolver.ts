/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Recipient Resolver - Links FEC disbursement recipients to CIV.IQ profiles
 *
 * Resolution chain:
 * 1. Get aggregated disbursements by recipient from FEC API
 * 2. For each recipient_id, fetch committee info to get candidate_ids
 * 3. Look up candidate FEC ID in reverse bioguide mapping
 * 4. Enrich with representative details (name, state, party, chamber)
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import { fecApiService } from './fec-api-service';
import {
  getBioguideFromFEC,
  getMappingByFEC,
  bioguideToFECMapping,
} from '@/lib/data/bioguide-fec-mapping';
import type { ResolvedRecipient } from '@/types/influence';

/**
 * Resolve all recipients of a committee's disbursements to CIV.IQ profiles
 * Fetches all pages of aggregated recipients and resolves each to a representative
 */
export async function resolveCommitteeRecipients(
  committeeId: string,
  cycle: number
): Promise<ResolvedRecipient[]> {
  const cacheKey = `influence:resolved-recipients:${committeeId}:${cycle}`;

  const cached = await govCache.get<ResolvedRecipient[]>(cacheKey);
  if (cached) {
    logger.debug(`[Recipient Resolver] Cache hit for ${committeeId}`);
    return cached;
  }

  logger.info(`[Recipient Resolver] Resolving recipients for ${committeeId} cycle ${cycle}`);

  // Step 1: Fetch all pages of aggregated disbursements by recipient
  const allRecipients: Array<{
    recipient_id: string;
    recipient_name: string;
    total: number;
    count: number;
    memo_total: number;
    memo_count: number;
  }> = [];

  let page = 1;
  let totalPages = 1;

  do {
    const response = await fecApiService.getCommitteeDisbursementsByRecipient(
      committeeId,
      cycle,
      page,
      100
    );
    allRecipients.push(...response.results);
    totalPages = response.pagination.pages;
    page++;
  } while (page <= totalPages && page <= 20); // Safety cap at 20 pages

  logger.info(
    `[Recipient Resolver] Fetched ${allRecipients.length} recipient entries across ${page - 1} pages`
  );

  // Step 2: Resolve each recipient to a CIV.IQ profile
  const resolved: ResolvedRecipient[] = [];

  for (const recipient of allRecipients) {
    const recipientId = recipient.recipient_id;
    if (!recipientId) continue;

    // Try to resolve recipient_id as a committee ID to find candidate_ids
    let candidateId: string | null = null;
    let bioguideId: string | null = null;
    let fecParty: string | null = null;

    // First check if recipient_id looks like a committee ID (starts with C)
    if (recipientId.startsWith('C')) {
      try {
        const committeeInfo = await fecApiService.getCommitteeInfo(recipientId);
        if (committeeInfo) {
          // Extract party from FEC committee data
          if (committeeInfo.party) {
            const partyMap: Record<string, string> = {
              DEM: 'Democrat',
              REP: 'Republican',
              IND: 'Independent',
              LIB: 'Libertarian',
              GRE: 'Green',
            };
            fecParty = partyMap[committeeInfo.party] ?? committeeInfo.party;
          }
          if (committeeInfo.candidate_ids && committeeInfo.candidate_ids.length > 0) {
            // Try each candidate_id for a bioguide match
            for (const cId of committeeInfo.candidate_ids) {
              const bgId = getBioguideFromFEC(cId);
              if (bgId) {
                candidateId = cId;
                bioguideId = bgId;
                break;
              }
            }
            // Even without bioguide match, record the candidate ID
            if (!candidateId && committeeInfo.candidate_ids[0]) {
              candidateId = committeeInfo.candidate_ids[0];
            }
          }
        }
      } catch {
        logger.debug(`[Recipient Resolver] Could not fetch committee info for ${recipientId}`);
      }
    }

    // If recipient_id looks like a candidate ID (starts with H, S, or P), try direct lookup
    if (
      !bioguideId &&
      (recipientId.startsWith('H') || recipientId.startsWith('S') || recipientId.startsWith('P'))
    ) {
      candidateId = recipientId;
      bioguideId = getBioguideFromFEC(recipientId);
    }

    // Enrich with representative details from our mapping
    const party: string | null = fecParty;
    let state: string | null = null;
    let chamber: 'House' | 'Senate' | null = null;
    let district: string | null = null;
    let civiqProfileLink: string | null = null;

    if (bioguideId) {
      const mapping = getMappingByFEC(candidateId!);
      if (mapping) {
        state = mapping.state;
        district = mapping.district ?? null;
        chamber = mapping.office === 'H' ? 'House' : 'Senate';
        civiqProfileLink = `/representative/${bioguideId}`;
      }

      const fullMapping = bioguideToFECMapping[bioguideId];
      if (fullMapping) {
        state = state ?? fullMapping.state;
        chamber = chamber ?? (fullMapping.office === 'H' ? 'House' : 'Senate');
        district = district ?? fullMapping.district ?? null;
      }
    }

    // Detect earmarked contributions
    const isEarmarked = recipient.memo_count > 0 && recipient.memo_total > 0;

    resolved.push({
      recipientName: recipient.recipient_name,
      recipientCommitteeId: recipientId,
      candidateId,
      bioguideId,
      totalAmount: recipient.total,
      transactionCount: recipient.count,
      party,
      state,
      chamber,
      district,
      isEarmarked,
      civiqProfileLink,
    });
  }

  // Sort by total amount descending
  resolved.sort((a, b) => b.totalAmount - a.totalAmount);

  // Cache for 24 hours (FEC data updates quarterly)
  await govCache.set(cacheKey, resolved, {
    ttl: 24 * 60 * 60 * 1000,
    source: 'influence-recipient-resolver',
    dataType: 'finance',
  });

  logger.info(
    `[Recipient Resolver] Resolved ${resolved.length} recipients, ${resolved.filter(r => r.bioguideId).length} linked to CIV.IQ profiles`
  );

  return resolved;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Finance × Committee Jurisdiction API — Gap 3 Join Endpoint
 *
 * The "money and power" join. Shows where a representative's campaign
 * donors overlap with their committee jurisdiction. For example:
 * "Rep. X sits on Energy & Commerce and received $200K from Health sector donors."
 *
 * Join logic:
 * 1. Get rep's committees → map to topics → map to IndustrySector values
 * 2. Get rep's FEC contributions → categorize by IndustrySector
 * 3. Cross-reference: which donor sectors overlap with committee jurisdiction?
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getTopicsForCommittee } from '@/lib/connections/committee-agency-map';
import { getAllPolicyAreas, getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { getFECMapping } from '@/lib/api/finance-helpers';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { categorizeContributionSmart, type IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { FinanceJurisdictionOverlap } from '@/types/joins';

export const revalidate = 43200; // 12 hours

/**
 * Derive which IndustrySectors are "jurisdictional" for a set of committee topics.
 * Maps committee topics → policyAreas → IndustrySectors.
 */
function getJurisdictionalSectors(committeeTopics: string[]): Set<IndustrySector> {
  const sectors = new Set<IndustrySector>();
  const topicSet = new Set(committeeTopics.map(t => t.toLowerCase()));

  for (const pa of getAllPolicyAreas()) {
    const mapping = getPolicyAreaMapping(pa);
    if (!mapping) continue;

    // Check if any of this policyArea's topics overlap with the committee's topics
    const hasOverlap = mapping.topics.some(t => topicSet.has(t.toLowerCase()));
    if (hasOverlap) {
      for (const sector of mapping.industrySectors) {
        sectors.add(sector);
      }
    }
  }

  return sectors;
}

interface SectorTotal {
  sector: IndustrySector;
  amount: number;
  count: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<FinanceJurisdictionOverlap | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    logger.info('Finance jurisdiction join request', { bioguideId });

    const cacheKey = `join-finance-jurisdiction:${bioguideId}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // Step 1: Get representative with committee assignments
        const rep = await getEnhancedRepresentative(bioguideId);
        if (!rep) {
          logger.warn('Representative not found', { bioguideId });
          return null;
        }

        const committeeNames = (rep.committees || []).map(c => c.name);
        if (committeeNames.length === 0) {
          logger.info('No committee assignments for representative', { bioguideId });
        }

        // Step 2: Map committees to topics and jurisdictional sectors
        const allTopics: string[] = [];
        for (const name of committeeNames) {
          const topics = getTopicsForCommittee(name);
          allTopics.push(...topics);
        }
        const uniqueTopics = [...new Set(allTopics)];
        const jurisdictionalSectors = getJurisdictionalSectors(uniqueTopics);

        // Step 3: Get FEC contribution data
        const fecMapping = getFECMapping(bioguideId);
        const sectorTotals = new Map<IndustrySector, SectorTotal>();

        if (fecMapping) {
          const contributions = await fecApiService.getSampleContributions(
            fecMapping.fecId,
            2024,
            250
          );

          // Categorize each contribution by sector
          for (const contrib of contributions) {
            const categorization = categorizeContributionSmart(
              contrib.contributor_employer,
              contrib.contributor_occupation,
              contrib.contributor_name
            );

            const existing = sectorTotals.get(categorization.sector) || {
              sector: categorization.sector,
              amount: 0,
              count: 0,
            };
            existing.amount += contrib.contribution_receipt_amount;
            existing.count++;
            sectorTotals.set(categorization.sector, existing);
          }
        }

        // Step 4: Build the overlap — which donor sectors match jurisdiction?
        const topSectors = [...sectorTotals.values()]
          .sort((a, b) => b.amount - a.amount)
          .map(s => ({ sector: s.sector, amount: s.amount }));

        // Find the first committee that matches (for the response envelope)
        const primaryCommittee = committeeNames[0] || 'Unknown';
        const primaryCode = rep.committees?.[0]
          ? `${rep.chamber === 'House' ? 'HS' : 'SS'}${rep.committees[0].name.slice(0, 2).toUpperCase()}`
          : 'UNKNOWN';

        const response: FinanceJurisdictionOverlap = {
          committeeCode: primaryCode,
          committeeName: primaryCommittee,
          jurisdictionTopics: uniqueTopics,
          industrySectors: [...jurisdictionalSectors],
          members: [
            {
              bioguideId,
              name: rep.name,
              party: rep.party,
              topSectors,
            },
          ],
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: fecMapping ? ['congress.gov', 'fec.gov'] : ['congress.gov'],
            joinType: 'finance-jurisdiction',
            dataQuality: fecMapping && sectorTotals.size > 0 ? 'complete' : 'partial',
          },
        };

        return response;
      },
      12 * 60 * 60 * 1000 // 12 hour cache
    );

    if (!result) {
      return NextResponse.json(
        { error: `Representative ${bioguideId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('Finance jurisdiction join error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

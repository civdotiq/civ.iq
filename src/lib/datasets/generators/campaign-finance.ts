/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Campaign Finance Dataset Generator
 *
 * Campaign finance totals for all members of Congress from FEC.gov.
 * Uses the bioguide-to-FEC mapping to look up each member's candidate
 * committee financials. Pre-generated via cron and cached in Redis.
 *
 * Source: FEC.gov API
 */

import logger from '@/lib/logging/simple-logger';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { cache } from '@/lib/cache';
import type { DatasetResult, DatasetColumn } from '@/types/dataset';

export const CAMPAIGN_FINANCE_CACHE_KEY = 'dataset:campaign-finance';
const CACHE_TTL = 172800; // 48 hours

const COLUMNS: DatasetColumn[] = [
  {
    key: 'bioguideId',
    label: 'Bioguide ID',
    description: 'Congressional bioguide identifier',
    type: 'string',
  },
  {
    key: 'fecCandidateId',
    label: 'FEC Candidate ID',
    description: 'FEC candidate identifier',
    type: 'string',
  },
  {
    key: 'name',
    label: 'Full Name',
    description: 'Candidate name from FEC records',
    type: 'string',
  },
  { key: 'party', label: 'Party', description: 'Party affiliation', type: 'string' },
  { key: 'state', label: 'State', description: 'Two-letter state code', type: 'string' },
  {
    key: 'district',
    label: 'District',
    description: 'Congressional district (House only)',
    type: 'string',
  },
  { key: 'office', label: 'Office', description: 'H (House) or S (Senate)', type: 'string' },
  { key: 'cycle', label: 'Election Cycle', description: 'Election cycle year', type: 'number' },
  {
    key: 'totalReceipts',
    label: 'Total Receipts',
    description: 'Total campaign receipts in dollars',
    type: 'number',
  },
  {
    key: 'totalDisbursements',
    label: 'Total Disbursements',
    description: 'Total campaign spending in dollars',
    type: 'number',
  },
  {
    key: 'cashOnHand',
    label: 'Cash on Hand',
    description: 'Cash on hand at end of reporting period in dollars',
    type: 'number',
  },
  {
    key: 'totalIndividualContributions',
    label: 'Individual Contributions',
    description: 'Total from individual donors in dollars',
    type: 'number',
  },
  {
    key: 'totalPACContributions',
    label: 'PAC Contributions',
    description: 'Total from PACs in dollars',
    type: 'number',
  },
];

interface CampaignFinanceRow {
  bioguideId: string;
  fecCandidateId: string;
  name: string;
  party: string;
  state: string;
  district: string;
  office: string;
  cycle: number;
  totalReceipts: number;
  totalDisbursements: number;
  cashOnHand: number;
  totalIndividualContributions: number;
  totalPACContributions: number;
}

/**
 * Fetch FEC candidate totals for a single FEC candidate ID
 */
async function fetchFECTotals(fecCandidateId: string): Promise<{
  totalReceipts: number;
  totalDisbursements: number;
  cashOnHand: number;
  totalIndividualContributions: number;
  totalPACContributions: number;
  cycle: number;
  party: string;
} | null> {
  const fecApiKey = process.env.FEC_API_KEY;
  if (!fecApiKey) return null;

  const cycles = [2024, 2022, 2020];

  for (const cycle of cycles) {
    try {
      const url = `https://api.open.fec.gov/v1/candidate/${fecCandidateId}/totals/?api_key=${fecApiKey}&cycle=${cycle}&per_page=1`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) continue;

      const json = await response.json();
      const results = json.results;
      if (results && results.length > 0) {
        const r = results[0];
        return {
          totalReceipts: r.receipts ?? 0,
          totalDisbursements: r.disbursements ?? 0,
          cashOnHand: r.last_cash_on_hand_end_period ?? 0,
          totalIndividualContributions: r.individual_contributions ?? 0,
          totalPACContributions: r.other_political_committee_contributions ?? 0,
          cycle,
          party: r.party ?? '',
        };
      }
    } catch {
      // Try next cycle
    }
  }

  return null;
}

/**
 * Generate campaign finance data on-demand (fallback if cache miss)
 * Processes in batches of 10 to respect FEC rate limits
 */
export async function generateCampaignFinanceOnDemand(): Promise<DatasetResult> {
  const entries = Object.entries(bioguideToFECMapping);
  const data: CampaignFinanceRow[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async ([bioguideId, mapping]) => {
        const totals = await fetchFECTotals(mapping.fecId);
        if (!totals) return null;

        return {
          bioguideId,
          fecCandidateId: mapping.fecId,
          name: mapping.name,
          party: totals.party || '',
          state: mapping.state,
          district: mapping.district ?? '',
          office: mapping.office,
          cycle: totals.cycle,
          totalReceipts: totals.totalReceipts,
          totalDisbursements: totals.totalDisbursements,
          cashOnHand: totals.cashOnHand,
          totalIndividualContributions: totals.totalIndividualContributions,
          totalPACContributions: totals.totalPACContributions,
        };
      })
    );

    for (const r of results) {
      if (r) data.push(r);
    }
  }

  const result = buildResult(data);

  // Cache the result for next time
  await cache.set(CAMPAIGN_FINANCE_CACHE_KEY, result, CACHE_TTL);

  return result;
}

/**
 * Get campaign finance dataset — reads from cache only.
 * This dataset is too large to generate on-demand (~535 FEC API calls).
 * Returns null when cache is cold so the download route can return 202.
 */
export async function generateCampaignFinance(): Promise<DatasetResult | null> {
  const cached = await cache.get<DatasetResult>(CAMPAIGN_FINANCE_CACHE_KEY);
  if (cached && cached.data && cached.data.length > 0) {
    logger.info('Campaign finance dataset served from cache', {
      recordCount: cached.data.length,
    });
    return cached;
  }

  logger.warn('Campaign finance dataset not yet generated — run the dataset-generator cron', {
    operation: 'dataset_download',
  });
  return null;
}

function buildResult(data: CampaignFinanceRow[]): DatasetResult {
  return {
    metadata: {
      name: 'Campaign Finance (119th Congress)',
      slug: 'campaign-finance',
      description:
        'Campaign finance totals for all members of the 119th Congress including receipts, disbursements, individual and PAC contributions.',
      source: 'Federal Election Commission',
      sourceUrl: 'https://api.open.fec.gov',
      generated: new Date().toISOString(),
      recordCount: data.length,
      license: 'Public Domain',
      columns: COLUMNS,
    },
    data,
  };
}

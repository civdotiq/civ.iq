/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Template Data Fetchers — typed, per-template data loading
 * using direct service imports (no self-fetch).
 *
 * Each function returns a fully typed object that maps directly
 * to the corresponding answer component's props.
 *
 * Expensive service calls are wrapped with cachedFetch to match
 * the caching behavior of the API routes they replace.
 */

import { cachedFetch } from '@/lib/cache';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { aggregateFinanceData } from '@/lib/fec/finance-aggregator';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeTemporalVotes } from '@/lib/intelligence/analyzers/temporal-vote-analyzer';
import { getComprehensiveBillsByMember } from '@/services/congress/optimized-congress.service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { getPartyAlignment, type PartyAlignment } from '@/lib/services/party-alignment.service';
import { searchPolicyArea } from '@/lib/services/policy-area-search.service';
import type {
  InsightResponse,
  VoteFinanceInsight,
  TemporalVoteInsight,
} from '@/lib/intelligence/types';
import type { PolicyAreaResults } from '@/types/joins';

// FEC fallback cycles — most recent completed cycle first
const FALLBACK_CYCLES = [2024, 2022, 2020] as const;

// Cache TTLs matching API route behavior
const FINANCE_TTL = 30 * 60; // 30 min (FEC data)
const ALIGNMENT_TTL = 30 * 60; // 30 min (party alignment)
const VOTES_TTL = 15 * 60; // 15 min (votes)

// ── Bills Sponsored ───────────────────────────────────────────

export interface BillsSponsoredData {
  bills: Array<{
    id: string;
    number: string;
    title: string;
    introducedDate: string;
    status: string;
    policyArea?: string;
    relationship: 'sponsored' | 'cosponsored';
  }>;
  sponsoredCount: number;
  cosponsoredCount: number;
}

// ── Donor-Voting Alignment ────────────────────────────────────

export interface DonorVotingAlignmentData {
  voteFinance: InsightResponse<VoteFinanceInsight> | null;
}

// ── Return Types ───────────────────────────────────────────────

export interface CampaignContributionsData {
  finance: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
  } | null;
  industries: {
    topIndustries: Array<{
      industry: string;
      amount: number;
      percentage: number;
      contributionCount: number;
    }>;
    metadata?: { cycle?: number; lastUpdated?: string };
  } | null;
  voteFinance: InsightResponse<VoteFinanceInsight> | null;
}

export interface PartyAlignmentTemplateData {
  partyAlignment: PartyAlignment | null;
  temporal: InsightResponse<TemporalVoteInsight> | null;
}

export interface VotingRecordTemplateData {
  votes: {
    votes: Array<{
      voteId: string;
      bill?: { number?: string; title?: string; congress?: number; type?: string };
      question: string;
      result: string;
      date: string;
      position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
    }>;
    totalResults: number;
  } | null;
  bills: {
    sponsored?: Array<{
      id?: string;
      number?: string;
      title?: string;
      introducedDate?: string;
      latestAction?: { text?: string; date?: string };
    }>;
    cosponsored?: Array<{
      id?: string;
      number?: string;
      title?: string;
      introducedDate?: string;
      latestAction?: { text?: string; date?: string };
    }>;
    totalSponsored?: number;
    totalCosponsored?: number;
  } | null;
}

// ── Helpers ────────────────────────────────────────────────────

function wrapInsight<T>(data: T | null): InsightResponse<T> | null {
  if (!data) return null;
  return { data, errors: [], status: 'complete' };
}

async function getFinancialSummaryWithFallback(fecId: string) {
  for (const cycle of FALLBACK_CYCLES) {
    const summary = await fecApiService.getFinancialSummary(fecId, cycle);
    if (summary) return summary;
  }
  return null;
}

// ── Fetchers ───────────────────────────────────────────────────

export async function fetchCampaignContributionsData(
  bioguideId: string,
  state: string
): Promise<CampaignContributionsData> {
  const fecId = getFECIdFromBioguide(bioguideId);

  const [financialSummary, processedFinance, voteFinanceResult] = await Promise.all([
    fecId ? getFinancialSummaryWithFallback(fecId).catch(() => null) : null,
    fecId
      ? cachedFetch(
          `question:industries:${bioguideId}`,
          () => aggregateFinanceData(fecId, 2024, state),
          FINANCE_TTL
        ).catch(() => null)
      : null,
    analyzeVoteFinance(bioguideId).catch(() => null),
  ]);

  const finance = financialSummary
    ? {
        totalRaised: financialSummary.receipts,
        totalSpent: financialSummary.disbursements,
        cashOnHand: financialSummary.last_cash_on_hand_end_period,
      }
    : null;

  const industries = processedFinance?.industryBreakdown?.length
    ? {
        topIndustries: processedFinance.industryBreakdown.map(item => ({
          industry: item.industry,
          amount: item.amount,
          percentage: item.percentage,
          contributionCount: item.count,
        })),
        metadata: {
          cycle: processedFinance.cycle,
          lastUpdated: processedFinance.lastUpdated,
        },
      }
    : null;

  return {
    finance,
    industries,
    voteFinance: wrapInsight(voteFinanceResult),
  };
}

export async function fetchPartyAlignmentData(
  bioguideId: string,
  party: string,
  chamber: 'House' | 'Senate'
): Promise<PartyAlignmentTemplateData> {
  const [partyAlignment, temporalResult] = await Promise.all([
    cachedFetch(
      `question:party-alignment:${bioguideId}`,
      () => getPartyAlignment(bioguideId, party, chamber),
      ALIGNMENT_TTL
    ).catch(() => null),
    analyzeTemporalVotes(bioguideId).catch(() => null),
  ]);

  return {
    partyAlignment,
    temporal: wrapInsight(temporalResult),
  };
}

export async function fetchVotingRecordData(
  bioguideId: string,
  chamber: 'House' | 'Senate'
): Promise<VotingRecordTemplateData> {
  const [rawVotes, billsResponse] = await Promise.all([
    cachedFetch(
      `question:votes:${bioguideId}`,
      () =>
        chamber === 'House'
          ? batchVotingService.getHouseMemberVotes(bioguideId, 119, undefined, 20)
          : batchVotingService.getSenateMemberVotes(bioguideId, 119, undefined, 20),
      VOTES_TTL
    ).catch(() => []),
    getComprehensiveBillsByMember({ bioguideId }).catch(() => null),
  ]);

  const votes = rawVotes.length
    ? {
        votes: rawVotes.map(v => ({
          voteId: v.voteId,
          bill: v.bill
            ? {
                number: v.bill.number,
                title: v.bill.title,
                congress: v.bill.congress,
                type: v.bill.type,
              }
            : undefined,
          question: v.question,
          result: v.result,
          date: v.date,
          position: v.position as 'Yea' | 'Nay' | 'Present' | 'Not Voting',
        })),
        totalResults: rawVotes.length,
      }
    : null;

  let bills: VotingRecordTemplateData['bills'] = null;
  if (billsResponse) {
    const sponsored = billsResponse.bills
      .filter(b => b.relationship === 'sponsored')
      .map(b => ({
        id: b.id,
        number: b.number,
        title: b.title,
        introducedDate: b.introducedDate,
        latestAction: b.lastAction ? { text: b.lastAction } : undefined,
      }));
    const cosponsored = billsResponse.bills
      .filter(b => b.relationship === 'cosponsored')
      .map(b => ({
        id: b.id,
        number: b.number,
        title: b.title,
        introducedDate: b.introducedDate,
        latestAction: b.lastAction ? { text: b.lastAction } : undefined,
      }));
    bills = {
      sponsored,
      cosponsored,
      totalSponsored: billsResponse.metadata.sponsoredCount ?? sponsored.length,
      totalCosponsored: cosponsored.length,
    };
  }

  return { votes, bills };
}

export async function fetchBillsSponsoredData(bioguideId: string): Promise<BillsSponsoredData> {
  const response = await getComprehensiveBillsByMember({ bioguideId }).catch(() => null);

  if (!response) {
    return { bills: [], sponsoredCount: 0, cosponsoredCount: 0 };
  }

  return {
    bills: response.bills.map(b => ({
      id: b.id,
      number: b.number,
      title: b.title,
      introducedDate: b.introducedDate,
      status: b.status,
      policyArea: b.policyArea,
      relationship: (b.relationship ?? 'sponsored') as 'sponsored' | 'cosponsored',
    })),
    sponsoredCount:
      response.metadata.sponsoredCount ??
      response.bills.filter(b => b.relationship === 'sponsored').length,
    cosponsoredCount:
      response.metadata.cosponsoredCount ??
      response.bills.filter(b => b.relationship === 'cosponsored').length,
  };
}

export async function fetchDonorVotingAlignmentData(
  bioguideId: string
): Promise<DonorVotingAlignmentData> {
  const result = await analyzeVoteFinance(bioguideId).catch(() => null);
  return { voteFinance: wrapInsight(result) };
}

// ── Topic Bills ───────────────────────────────────────────────

export interface TopicBillsData {
  results: PolicyAreaResults | null;
}

export async function fetchTopicBillsData(policyArea: string): Promise<TopicBillsData> {
  const results = await searchPolicyArea(policyArea, 10).catch(() => null);
  return { results };
}

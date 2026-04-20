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
import { aggregateFinanceDataFromAggregates } from '@/lib/fec/finance-aggregator';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeLobbyingPipeline } from '@/lib/intelligence/analyzers/lobbying-pipeline-analyzer';
import { getComprehensiveBillsByMember } from '@/services/congress/optimized-congress.service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { searchPolicyArea } from '@/lib/services/policy-area-search.service';
import { getCommitteeDataService } from '@/lib/services/committee.service';
import { fetchCommitteeActivity } from '@/lib/services/committee-activity.service';
import type {
  InsightResponse,
  VoteFinanceInsight,
  LobbyingPipelineInsight,
} from '@/lib/intelligence/types';
import type { Committee } from '@/types/committee';
import type { PolicyAreaResults } from '@/types/joins';
import type {
  CommitteeActivityMeeting,
  CommitteeActivityBill,
} from '@/lib/services/committee-activity.service';

// FEC fallback cycles — most recent completed cycle first
const FALLBACK_CYCLES = [2024, 2022, 2020] as const;

// Cache TTLs matching API route behavior
const FINANCE_TTL = 30 * 60; // 30 min (FEC data)
const VOTES_TTL = 15 * 60; // 15 min (votes)

// ── Bills Sponsored ───────────────────────────────────────────

export interface BillsSponsoredData {
  bills: Array<{
    id: string;
    number: string;
    // Bill type code from Congress.gov (e.g., "HR", "S", "HRES", "SRES",
    // "HJRES", "SJRES", "HCONRES", "SCONRES"). Required so the UI can
    // render "H.R. 7927" instead of the bare "7927" that collides across
    // chambers and bill/resolution types.
    type: string;
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
    // Source breakdown of totalRaised, pulled directly from FEC's candidate totals.
    // Sum may be less than totalRaised; the remainder is transfers, interest, and
    // other receipts that don't fit the four named buckets.
    individualContributions: number;
    pacContributions: number;
    partyContributions: number;
    candidateSelfFunding: number;
  } | null;
  industries: {
    // Top classified sectors only. The non-informative bucket (donors who left
    // employer blank, wrote RETIRED/SELF-EMPLOYED, etc.) is separated out as
    // `unattributedTotal` so it doesn't appear as a ranked "sector".
    topIndustries: Array<{
      industry: string;
      amount: number;
      percentage: number;
      contributionCount: number;
    }>;
    // Sum of itemized-individual dollars that the aggregator was able to look at.
    // This is the denominator the percentages are computed against — usually a
    // small fraction of totalRaised because PACs, parties, conduits, and
    // small-dollar unitemized donations don't carry employer strings.
    analyzedTotal: number;
    // Dollars within analyzedTotal where no employer info was provided.
    unattributedTotal: number;
    metadata?: { cycle?: number; lastUpdated?: string };
  } | null;
  voteFinance: InsightResponse<VoteFinanceInsight> | null;
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
    // True when the upstream fetcher hit its 500-bill page cap on
    // cosponsorships. The UI should render "500+" to avoid stating the cap
    // as the rep's actual cosponsorship count.
    cosponsoredCapped?: boolean;
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
          () => aggregateFinanceDataFromAggregates(fecId, 2024, state),
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
        individualContributions: financialSummary.individual_contributions ?? 0,
        pacContributions: financialSummary.other_political_committee_contributions ?? 0,
        partyContributions: financialSummary.political_party_committee_contributions ?? 0,
        candidateSelfFunding: financialSummary.candidate_contribution ?? 0,
      }
    : null;

  const industries = processedFinance?.industryBreakdown?.length
    ? (() => {
        // Buckets that don't represent a real industry — either the donor left
        // employer blank/"retired"/"self-employed" ("Unaffiliated / Non-employed")
        // or the employer didn't match any taxonomy entry ("Other/Unknown",
        // "Not Employed", etc.). We separate these out so the ranked list is
        // actual sectors and the unclassified remainder is a single footnote.
        const NON_INDUSTRY = new Set([
          'Unaffiliated / Non-employed',
          'Other/Unknown',
          'Other',
          'Unknown',
          'Not Employed',
        ]);
        const classified = processedFinance.industryBreakdown.filter(
          item => !NON_INDUSTRY.has(item.industry)
        );
        const unclassified = processedFinance.industryBreakdown.filter(item =>
          NON_INDUSTRY.has(item.industry)
        );
        const unattributedTotal = unclassified.reduce((sum, item) => sum + item.amount, 0);
        const analyzedTotal = processedFinance.industryBreakdown.reduce(
          (sum, item) => sum + item.amount,
          0
        );
        return {
          topIndustries: classified.map(item => ({
            industry: item.industry,
            amount: item.amount,
            percentage: item.percentage,
            contributionCount: item.count,
          })),
          analyzedTotal,
          unattributedTotal,
          metadata: {
            cycle: processedFinance.cycle,
            lastUpdated: processedFinance.lastUpdated,
          },
        };
      })()
    : null;

  return {
    finance,
    industries,
    voteFinance: wrapInsight(voteFinanceResult),
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
    // The upstream service caps cosponsored fetches at 500 bills (2 pages) for
    // performance. When that cap is hit, `cosponsoredCount` IS the cap, not
    // the rep's true cosponsorship total — flag it so the UI can render "500+"
    // instead of an exact number that misrepresents the record.
    const fetchedCosponsored = billsResponse.metadata.fetchedCosponsored ?? cosponsored.length;
    const COSPONSORED_PAGE_CAP = 500;
    bills = {
      sponsored,
      cosponsored,
      totalSponsored: billsResponse.metadata.sponsoredCount ?? sponsored.length,
      totalCosponsored: billsResponse.metadata.cosponsoredCount ?? cosponsored.length,
      cosponsoredCapped: fetchedCosponsored >= COSPONSORED_PAGE_CAP,
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
      type: b.type,
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

// ── Committee Members ─────────────────────────────────────────

export interface CommitteeMembersData {
  committee: Committee;
}

export async function fetchCommitteeMembersData(
  committeeId: string
): Promise<CommitteeMembersData | null> {
  const committee = await getCommitteeDataService(committeeId).catch(() => null);
  if (!committee) return null;
  return { committee };
}

// ── Committee Activity ────────────────────────────────────────

export interface CommitteeActivityData {
  meetings: CommitteeActivityMeeting[];
  bills: CommitteeActivityBill[];
  jurisdiction: string;
}

export async function fetchCommitteeActivityData(
  committeeId: string,
  chamber: 'House' | 'Senate' | 'Joint'
): Promise<CommitteeActivityData> {
  const [activity, committee] = await Promise.all([
    fetchCommitteeActivity(committeeId, chamber),
    getCommitteeDataService(committeeId).catch(() => null),
  ]);
  return {
    meetings: activity.meetings,
    bills: activity.bills,
    jurisdiction: committee?.jurisdiction ?? '',
  };
}

// ── Committee Lobbying ────────────────────────────────────────

export interface CommitteeLobbyingData {
  lobbying: LobbyingPipelineInsight | null;
}

export async function fetchCommitteeLobbyingData(
  committeeCode: string
): Promise<CommitteeLobbyingData> {
  const lobbying = await analyzeLobbyingPipeline(committeeCode).catch(() => null);
  return { lobbying };
}

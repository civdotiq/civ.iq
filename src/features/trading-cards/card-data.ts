/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Trading Card Data Fetching (Server-Side)
 *
 * Direct service imports for OG image generation.
 * All data from real government APIs - never fabricated.
 */

import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import logger from '@/lib/logging/simple-logger';
import type {
  ProfileCardData,
  MoneyCardData,
  VoteCardData,
  AlignmentCardData,
  LegislationCardData,
  CardBase,
} from './types';

/** Build common card base from representative data */
async function getCardBase(bioguideId: string): Promise<CardBase | null> {
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) return null;

  return {
    bioguideId: rep.bioguideId,
    name: rep.name,
    party: rep.party,
    state: rep.state,
    district: rep.district,
    chamber: rep.chamber,
    imageUrl: rep.imageUrl,
  };
}

/** Fetch profile card data */
export async function fetchProfileCardData(bioguideId: string): Promise<ProfileCardData | null> {
  try {
    const rep = await getEnhancedRepresentative(bioguideId);
    if (!rep) return null;

    // Fetch summary data from batch endpoint internally
    let billsSponsored: number | undefined;
    let totalRaised: number | undefined;
    let votesParticipated: number | undefined;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/representative/${bioguideId}/batch?summary=true`);
      if (res.ok) {
        const summary = await res.json();
        if (summary.success) {
          billsSponsored = summary.data?.billsSponsored;
          totalRaised = summary.data?.totalRaised;
          votesParticipated = summary.data?.votesParticipated;
        }
      }
    } catch {
      logger.warn('Failed to fetch summary for profile card', { bioguideId });
    }

    return {
      type: 'profile',
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district,
      chamber: rep.chamber,
      imageUrl: rep.imageUrl,
      billsSponsored,
      totalRaised,
      committees: rep.committees?.length,
      votesParticipated,
    };
  } catch (error) {
    logger.error('Failed to fetch profile card data', { bioguideId, error });
    return null;
  }
}

/** Get current election cycle */
function getCurrentCycle(): number {
  const year = new Date().getFullYear();
  return year % 2 === 0 ? year : year + 1;
}

/** Fetch money card data */
export async function fetchMoneyCardData(bioguideId: string): Promise<MoneyCardData | null> {
  try {
    const base = await getCardBase(bioguideId);
    if (!base) return null;

    const fecMapping = bioguideToFECMapping[bioguideId];
    if (!fecMapping) return null;

    const cycle = getCurrentCycle();
    const summary = await fecApiService.getFinancialSummary(fecMapping.fecId, cycle);
    if (!summary) return null;

    const totalRaised = summary.receipts || 0;
    const individualContributions = summary.individual_contributions || 0;
    const pacContributions = summary.other_political_committee_contributions || 0;

    const individualPercent =
      totalRaised > 0 ? Math.round((individualContributions / totalRaised) * 100) : 0;
    const pacPercent = totalRaised > 0 ? Math.round((pacContributions / totalRaised) * 100) : 0;

    // Get top industry from contributions
    let topIndustry: string | undefined;
    let topIndustryAmount: number | undefined;

    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/representative/${bioguideId}/finance`);
      if (res.ok) {
        const financeData = await res.json();
        const industries = financeData.industryBreakdown || financeData.industry_breakdown;
        if (industries && industries.length > 0) {
          topIndustry = industries[0].sector;
          topIndustryAmount = industries[0].amount;
        }
      }
    } catch {
      // Top industry is optional
    }

    return {
      ...base,
      type: 'money',
      totalRaised,
      individualPercent,
      pacPercent,
      topIndustry,
      topIndustryAmount,
      cycle,
    };
  } catch (error) {
    logger.error('Failed to fetch money card data', { bioguideId, error });
    return null;
  }
}

/** Fetch vote card data for a specific bill */
export async function fetchVoteCardData(
  bioguideId: string,
  billId: string
): Promise<VoteCardData | null> {
  try {
    const base = await getCardBase(bioguideId);
    if (!base) return null;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/representative/${bioguideId}/votes?limit=500`);
    if (!res.ok) return null;

    const votesData = await res.json();
    const votes = votesData.votes || [];

    // Find vote matching the bill ID
    const normalizedBillId = billId.toLowerCase().replace(/[^a-z0-9]/g, '');
    interface VoteRecord {
      bill?: { number?: string; title?: string };
      position?: string;
      date?: string;
      total?: { yes?: number; no?: number };
      party_breakdown?: {
        democratic?: { yes?: number; no?: number };
        republican?: { yes?: number; no?: number };
      };
    }
    const vote = votes.find((v: VoteRecord) => {
      const voteNumber = (v.bill?.number || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return voteNumber === normalizedBillId || voteNumber.includes(normalizedBillId);
    }) as VoteRecord | undefined;

    if (!vote || !vote.bill) return null;

    // Determine party breakdown for the representative's party
    const partyKey = base.party === 'Republican' ? 'republican' : 'democratic';
    const partyBreakdown = vote.party_breakdown?.[partyKey];

    return {
      ...base,
      type: 'vote',
      billId,
      billTitle: vote.bill.title || billId,
      billNumber: vote.bill.number || billId,
      position: vote.position || 'Unknown',
      voteDate: vote.date || '',
      partyYea: partyBreakdown?.yes,
      partyNay: partyBreakdown?.no,
      totalYea: vote.total?.yes,
      totalNay: vote.total?.no,
    };
  } catch (error) {
    logger.error('Failed to fetch vote card data', { bioguideId, billId, error });
    return null;
  }
}

/** Fetch alignment card data */
export async function fetchAlignmentCardData(
  bioguideId: string
): Promise<AlignmentCardData | null> {
  try {
    const base = await getCardBase(bioguideId);
    if (!base) return null;

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/representative/${bioguideId}/party-alignment`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.total_votes_analyzed) return null;

    return {
      ...base,
      type: 'alignment',
      partyAlignmentPercent: data.overall_alignment ?? 0,
      votesAgainstParty: data.votes_against_party ?? 0,
      totalVotes: data.total_votes_analyzed,
      peerAveragePercent: data.peer_average_alignment,
    };
  } catch (error) {
    logger.error('Failed to fetch alignment card data', { bioguideId, error });
    return null;
  }
}

/** Fetch legislation card data */
export async function fetchLegislationCardData(
  bioguideId: string
): Promise<LegislationCardData | null> {
  try {
    const rep = await getEnhancedRepresentative(bioguideId);
    if (!rep) return null;

    const base: CardBase = {
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district,
      chamber: rep.chamber,
      imageUrl: rep.imageUrl,
    };

    // Fetch bills data
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/representative/${bioguideId}/bills`);
    if (!res.ok) return null;

    const billsData = await res.json();
    const bills = billsData.bills || billsData.data?.bills || [];

    const billsSponsored = billsData.totalSponsored ?? bills.length;
    const billsEnacted = bills.filter(
      (b: { status?: string }) =>
        b.status?.toLowerCase().includes('enacted') || b.status?.toLowerCase().includes('law')
    ).length;

    // Derive focus areas from committees
    const focusAreas = deriveFocusAreas(rep.committees);

    return {
      ...base,
      type: 'legislation',
      billsSponsored,
      billsEnacted,
      focusAreas,
    };
  } catch (error) {
    logger.error('Failed to fetch legislation card data', { bioguideId, error });
    return null;
  }
}

/** Derive focus areas from committee names */
function deriveFocusAreas(committees?: Array<{ name: string }>): string[] {
  if (!committees || committees.length === 0) return [];

  const keywordMap: Record<string, string> = {
    'armed services': 'Defense',
    defense: 'Defense',
    veterans: 'Veterans',
    judiciary: 'Judiciary',
    finance: 'Finance',
    banking: 'Banking',
    budget: 'Budget',
    appropriations: 'Appropriations',
    energy: 'Energy',
    commerce: 'Commerce',
    agriculture: 'Agriculture',
    education: 'Education',
    'foreign relations': 'Foreign Relations',
    'foreign affairs': 'Foreign Affairs',
    intelligence: 'Intelligence',
    homeland: 'Homeland Security',
    health: 'Health',
    environment: 'Environment',
    transportation: 'Transportation',
    'small business': 'Small Business',
    science: 'Science',
    'natural resources': 'Natural Resources',
    oversight: 'Oversight',
    rules: 'Rules',
    'ways and means': 'Ways & Means',
  };

  const areas = new Set<string>();
  for (const committee of committees) {
    const lower = committee.name.toLowerCase();
    for (const [keyword, label] of Object.entries(keywordMap)) {
      if (lower.includes(keyword) && areas.size < 4) {
        areas.add(label);
        break;
      }
    }
  }

  return Array.from(areas);
}

/**
 * Fetch record summary card data (Incumbent Record Card OG image).
 *
 * Composes from the record-card feature so the image and the canonical
 * /record page share one data spec. Only sections with real data become
 * stats — an unavailable section is absent, never a zero.
 */
export async function fetchRecordSummaryCardData(
  bioguideId: string
): Promise<import('./types').RecordSummaryCardData | null> {
  const { getRecordCardData, termOrdinal } = await import(
    '@/features/record-card/record-card-data'
  );
  const data = await getRecordCardData(bioguideId);
  if (!data) return null;

  const { member, legislation, voting, money, districtMoney } = data;
  const fmtInt = (n: number) => n.toLocaleString('en-US');
  const fmtMoneyShort = (n: number) =>
    n >= 1_000_000_000
      ? `$${(n / 1_000_000_000).toFixed(2)}B`
      : n >= 1_000_000
        ? `$${(n / 1_000_000).toFixed(2)}M`
        : `$${Math.round(n / 1_000)}K`;
  const fmtPct = (n: number) => `${n.toFixed(1).replace(/\.0$/, '')}%`;

  const stats: import('./types').RecordCardStat[] = [];

  if (legislation) {
    stats.push({
      value: fmtInt(legislation.current.enacted),
      label: 'Enacted into law',
      baseline: legislation.firstTerm
        ? `advanced past committee: ${fmtInt(legislation.current.advancedPastCommittee)}`
        : `career: ${fmtInt(legislation.career.enacted)} · past committee: ${fmtInt(legislation.current.advancedPastCommittee)}`,
    });
    stats.push({
      value: fmtInt(legislation.current.introduced),
      label: 'Bills introduced',
      baseline: legislation.firstTerm
        ? `${fmtInt(legislation.current.cosponsored)} cosponsored (first term)`
        : `career: ${fmtInt(legislation.career.introduced)} · cosponsored: ${fmtInt(legislation.current.cosponsored)}`,
    });
  }

  if (voting) {
    stats.push({
      value: `${fmtInt(voting.stats.cast)}/${fmtInt(voting.stats.appearances)}`,
      label: 'Votes cast',
      baseline:
        voting.medianMissedPct !== null
          ? `${fmtPct(voting.stats.missedPct)} missed · chamber median ${fmtPct(voting.medianMissedPct)}`
          : `${fmtPct(voting.stats.missedPct)} missed`,
    });
    if (voting.stats.partyAlignmentPct !== null && voting.partyLabel) {
      stats.push({
        value: fmtPct(voting.stats.partyAlignmentPct),
        label: 'With party majority',
        baseline:
          voting.medianPartyAlignmentPct !== null
            ? `${member.chamber} ${voting.partyLabel} median ${fmtPct(voting.medianPartyAlignmentPct)}`
            : 'party-majority votes',
      });
    }
  }

  if (money) {
    stats.push({
      value: fmtMoneyShort(money.totalRaised),
      label: 'Raised this cycle',
      baseline:
        money.smallDonorPct !== null && money.pacPct !== null
          ? `${fmtPct(money.smallDonorPct)} small-donor · ${fmtPct(money.pacPct)} PAC`
          : `${money.cycle - 1}–${String(money.cycle).slice(2)} cycle`,
    });
  }

  if (districtMoney) {
    stats.push({
      value: fmtMoneyShort(districtMoney.totalSpending),
      label: 'District federal funds',
      baseline: `grants + contracts, FY ${districtMoney.fiscalYear}`,
    });
  } else if (money && money.inStatePct !== null && money.outOfStatePct !== null) {
    // Senators (no district-keyed spending): in-state money fills the slot
    stats.push({
      value: fmtPct(money.inStatePct),
      label: 'In-state money',
      baseline: `${fmtPct(money.outOfStatePct)} out-of-state`,
    });
  }

  if (stats.length === 0) return null;

  const asOfDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return {
    type: 'record',
    bioguideId: member.bioguideId,
    name: member.name,
    party: member.party,
    state: member.state,
    district: member.district,
    chamber: member.chamber,
    imageUrl: member.imageUrl,
    congress: member.currentCongress,
    inOfficeSince: member.inOfficeSince,
    termOrdinalLabel: termOrdinal(member.termNumber),
    stats: stats.slice(0, 6),
    sourcesLabel: `Congress.gov · FEC · USASpending · ${member.chamber === 'House' ? 'House Clerk' : 'Senate.gov'}`,
    asOfLabel: `as of ${asOfDate}`,
    recordUrl: `civdotiq.org/representative/${member.bioguideId}/record`,
  };
}

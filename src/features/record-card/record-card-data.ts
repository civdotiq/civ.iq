/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Record Card Data Composition (server-side)
 *
 * Assembles every section of the Incumbent Record Card from existing
 * services via direct imports — no internal HTTP. Each section resolves
 * independently and is null on failure so the UI renders its designed
 * empty state; a missing FEC filing must never surface as "$0".
 *
 * All values are facts from government records. Percentages are simple
 * shares of FEC-reported totals; comparisons come from chamber baselines
 * (see chamber-baselines.ts). No AI text on this card.
 */

import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import {
  getChamberBaselines,
  type ChamberBaselines,
  type MemberVoteStats,
} from '@/lib/intelligence/analyzers/chamber-baselines';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { aggregateFinanceDataFromAggregates } from '@/lib/fec/finance-aggregator';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { validateFECMapping } from '@/lib/api/finance-helpers';
import { getDistrictSpending, getStateSpendingTotal } from '@/lib/services/spending.service';
import logger from '@/lib/logging/simple-logger';
import { getLegislationRollup, type LegislationRollup } from './legislation-rollup';

// ── Types ────────────────────────────────────────────────────────────

export interface RecordCardMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  imageUrl?: string;
  /** First year of continuous service (earliest term start). */
  inOfficeSince: string | null;
  /** 1-based term count ("6th term"). */
  termNumber: number;
  /** Senate class (1–3) when known. */
  senateClass?: number;
  /** Next general election year for this seat, from term-end date math. */
  nextElectionYear: number | null;
  /** True when the seat is on the next general-election ballot. */
  onNextBallot: boolean;
  /** Election day (e.g. "Nov 3, 2026") for the next election year. */
  electionDayLabel: string | null;
  /** 'retired' etc. when congressional-vacancies data flags a status. */
  status?: string;
  statusDetail?: string;
  /** Main committees only; subcommittee assignments are counted, not listed. */
  committees: Array<{ name: string; id?: string }>;
  subcommitteeCount: number;
  currentCongress: number;
}

export interface VotingSection {
  /** This member's stats from the chamber sweep. */
  stats: MemberVoteStats;
  /** Roll calls analyzed (the member's personal denominator is stats.appearances). */
  rollCallsAnalyzed: number;
  fullCoverage: boolean;
  /** e.g. "119th Congress to date". */
  coverageLabel: string;
  medianMissedPct: number | null;
  /** Median alignment for this member's party. */
  medianPartyAlignmentPct: number | null;
  partyLabel: 'Democrat' | 'Republican' | null;
  dataAsOf: string;
  methodology: string;
}

export interface MoneySection {
  cycle: number;
  totalRaised: number;
  /** Dollar shares of totalRaised, 0–100; null when the input is missing. */
  smallDonorPct: number | null;
  pacPct: number | null;
  largeIndividualPct: number | null;
  inStatePct: number | null;
  outOfStatePct: number | null;
  topSectors: Array<{ sector: string; amount: number }>;
  fecCandidateId: string;
  dataAsOf: string;
}

export interface DistrictMoneySection {
  /** 'district' for House members; 'state' (statewide) for senators. */
  scope: 'district' | 'state';
  totalSpending: number;
  fiscalYear: number;
  /** True when the exact aggregate was unavailable (top-10 sum only). */
  approximate: boolean;
  /** District id ("MI-06") or state postal code ("MI") per scope. */
  areaId: string;
}

export interface KeyVote {
  voteId: string;
  date: string;
  question: string;
  position: string;
  result: string;
  /** Canonical bill slug for BillLink, e.g. "hr4312-119". */
  billId?: string;
  billNumber?: string;
  billTitle?: string;
}

/**
 * STOCK Act disclosure counts, mirroring the stock-trades tab's semantics:
 * parsed transactions and unparseable paper filings are never conflated.
 * Coverage is the House Clerk index for the last 5 years, not one Congress.
 */
export interface PtrSection {
  /** Individual transactions parsed from electronic PTR filings. */
  transactions: number;
  /** Paper (scanned) PTR filings that cannot be machine-read. */
  paperFilings: number;
  coverageYears: number;
}

export interface RecordCardData {
  member: RecordCardMember;
  legislation: LegislationRollup | null;
  voting: VotingSection | null;
  money: MoneySection | null;
  districtMoney: DistrictMoneySection | null;
  keyVotes: KeyVote[];
  /** null = lookup failed (omit the line); zeros are true absences. */
  ptr: PtrSection | null;
  generatedAt: string;
}

// ── Member framing ───────────────────────────────────────────────────

/** Federal election day: first Tuesday after the first Monday in November. */
export function electionDay(year: number): Date {
  const firstOfNov = new Date(Date.UTC(year, 10, 1));
  const dow = firstOfNov.getUTCDay(); // 0=Sun
  const firstMonday = 1 + ((8 - dow) % 7);
  return new Date(Date.UTC(year, 10, firstMonday + 1));
}

function ordinal(n: number): string {
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 === 1 && rem100 !== 11) return `${n}st`;
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`;
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`;
  return `${n}th`;
}

export function termOrdinal(termNumber: number): string {
  return `${ordinal(termNumber)} term`;
}

// ── Section fetchers (each fails to null, never to fake data) ────────

async function fetchVotingSection(
  bioguideId: string,
  chamber: 'House' | 'Senate',
  party: string
): Promise<VotingSection | null> {
  let baselines: ChamberBaselines | null = null;
  try {
    baselines = await getChamberBaselines(chamber);
  } catch (error) {
    logger.warn('Record card: baselines read failed', { bioguideId, error });
  }
  if (!baselines) return null;

  const stats = baselines.members[bioguideId];
  if (!stats) return null;

  const p = party.trim().toUpperCase();
  const partyLabel = p.startsWith('D') ? 'Democrat' : p.startsWith('R') ? 'Republican' : null;
  const medianPartyAlignmentPct =
    partyLabel === 'Democrat'
      ? baselines.medianAlignmentByParty.Democratic
      : partyLabel === 'Republican'
        ? baselines.medianAlignmentByParty.Republican
        : null;

  return {
    stats,
    rollCallsAnalyzed: baselines.rollCallsAnalyzed,
    fullCoverage: baselines.fullCoverage,
    coverageLabel: baselines.coverageLabel ?? '',
    medianMissedPct: baselines.medianMissedPct,
    medianPartyAlignmentPct,
    partyLabel,
    dataAsOf: baselines.dataAsOf,
    methodology: baselines.methodology,
  };
}

async function fetchMoneySection(bioguideId: string, state: string): Promise<MoneySection | null> {
  const mapping = validateFECMapping(bioguideId);
  if (!mapping.success) return null;
  const candidateId = mapping.mapping.fecId;

  const year = new Date().getFullYear();
  const cycle = year % 2 === 0 ? year : year + 1;

  try {
    const [finance, bySize] = await Promise.all([
      aggregateFinanceDataFromAggregates(candidateId, cycle, state),
      fecApiService.getContributionsBySize(candidateId, cycle).catch(() => null),
    ]);

    if (!finance || !finance.totalRaised || finance.totalRaised <= 0) return null;

    const total = finance.totalRaised;
    // FEC schedule_a/by_size: bucket floor 0 is the <=$200 small-donor bucket.
    const smallBucket = bySize?.find(b => b.size === 0)?.total ?? null;
    const smallDonorPct = smallBucket !== null ? (smallBucket / total) * 100 : null;
    const pacPct =
      typeof finance.pacContributions === 'number'
        ? (finance.pacContributions / total) * 100
        : null;
    const largeIndividualPct =
      smallBucket !== null && typeof finance.individualContributions === 'number'
        ? (Math.max(0, finance.individualContributions - smallBucket) / total) * 100
        : null;

    const home = finance.geographicBreakdown.find(g => g.isHomeState);
    const inStatePct = home ? home.percentage : null;
    const outOfStatePct = inStatePct !== null ? 100 - inStatePct : null;

    const topSectors = finance.industryBreakdown
      .slice(0, 3)
      .map(i => ({ sector: i.industry, amount: i.amount }));

    return {
      cycle,
      totalRaised: total,
      smallDonorPct,
      pacPct,
      largeIndividualPct,
      inStatePct,
      outOfStatePct,
      topSectors,
      fecCandidateId: candidateId,
      dataAsOf: finance.lastUpdated,
    };
  } catch (error) {
    logger.warn('Record card: money section failed', { bioguideId, error });
    return null;
  }
}

async function fetchDistrictMoneySection(
  state: string,
  district: string | undefined,
  chamber: 'House' | 'Senate'
): Promise<DistrictMoneySection | null> {
  const fiscalYear = new Date().getFullYear();

  // Senators: statewide place-of-performance total (all award types).
  if (chamber === 'Senate') {
    try {
      const stateTotal = await getStateSpendingTotal(state);
      if (!stateTotal || stateTotal.total <= 0) return null;
      return {
        scope: 'state',
        totalSpending: stateTotal.total,
        fiscalYear,
        approximate: false,
        areaId: state,
      };
    } catch (error) {
      logger.warn('Record card: state spending failed', { state, error });
      return null;
    }
  }

  if (!district) return null;

  try {
    const paddedDistrict = district.padStart(2, '0');
    const result = await getDistrictSpending(state, paddedDistrict);
    const aggregateTotal = result.aggregate?.total ?? null;
    const totalSpending = aggregateTotal ?? result.contractTotal + result.grantTotal;
    if (totalSpending <= 0) return null;

    return {
      scope: 'district',
      totalSpending,
      fiscalYear,
      approximate: aggregateTotal === null,
      areaId: `${state}-${paddedDistrict}`,
    };
  } catch (error) {
    logger.warn('Record card: district spending failed', { state, district, error });
    return null;
  }
}

async function fetchKeyVotes(
  bioguideId: string,
  chamber: 'House' | 'Senate',
  congress: number
): Promise<KeyVote[]> {
  try {
    const session = new Date().getFullYear() % 2 === 1 ? 1 : 2;
    // Senate reads come from the cheap mirrored corpus, so a deeper window
    // is free — and needed, since nomination votes (no bill) dominate the
    // Senate's recent roll calls and would starve the substantive filter.
    const votes =
      chamber === 'House'
        ? await batchVotingService.getHouseMemberVotes(bioguideId, congress, session, 20)
        : await batchVotingService.getSenateMemberVotes(bioguideId, congress, session, 60);

    // Rule-based selection, no editorial judgment: the member's most recent
    // substantive (Yea/Nay) roll calls attached to a bill, preferring final
    // passage questions over procedural rule votes.
    const substantive = votes.filter(
      v => (v.position === 'Yea' || v.position === 'Nay') && v.bill?.title
    );
    const passage = substantive.filter(v => /passage/i.test(v.question));
    const pool = passage.length >= 3 ? passage : substantive;
    return pool.slice(0, 3).map(v => ({
      voteId: v.voteId,
      date: v.date,
      question: v.question,
      position: v.position,
      result: v.result,
      billId: v.bill
        ? `${v.bill.type}${v.bill.number}-${v.bill.congress || congress}`.toLowerCase()
        : undefined,
      billNumber: v.bill ? `${v.bill.type} ${v.bill.number}` : undefined,
      billTitle: v.bill?.title,
    }));
  } catch (error) {
    logger.warn('Record card: key votes failed', { bioguideId, error });
    return [];
  }
}

// ── Assembly ─────────────────────────────────────────────────────────

/** Seat/ballot framing from term-end date math (election-year convention:
 *  term ending Jan 2027 → seat on the Nov 2026 ballot). */
export interface BallotStatus {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  nextElectionYear: number | null;
  onNextBallot: boolean;
  electionDayLabel: string | null;
  /** Vacancy-derived status ('active' unless the seat data says otherwise). */
  status?: string;
}

/** Lightweight ballot status for one member (powers the your-reps ballot box). */
export async function getMemberBallotStatus(bioguideId: string): Promise<BallotStatus | null> {
  const rep = await getEnhancedRepresentative(bioguideId.toUpperCase());
  if (!rep) return null;
  const framing = deriveBallotFraming(rep.currentTerm?.end ?? rep.terms?.[0]?.endYear ?? null);
  return {
    bioguideId: rep.bioguideId,
    name: rep.name,
    party: rep.party,
    state: rep.state,
    district: rep.district,
    chamber: rep.chamber,
    ...framing,
    status: rep.status,
  };
}

function deriveBallotFraming(currentTermEnd: string | null | undefined): {
  nextElectionYear: number | null;
  onNextBallot: boolean;
  electionDayLabel: string | null;
} {
  const endYear = currentTermEnd ? parseInt(String(currentTermEnd).slice(0, 4), 10) : NaN;
  const nextElectionYear = Number.isFinite(endYear) ? endYear - 1 : null;

  const yearNow = new Date().getFullYear();
  const nextGeneralYear = yearNow % 2 === 0 ? yearNow : yearNow + 1;
  const onNextBallot = nextElectionYear === nextGeneralYear;

  const electionDayLabel = nextElectionYear
    ? electionDay(nextElectionYear).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null;

  return { nextElectionYear, onNextBallot, electionDayLabel };
}

export async function getRecordCardData(bioguideId: string): Promise<RecordCardData | null> {
  const rep = await getEnhancedRepresentative(bioguideId.toUpperCase());
  if (!rep) return null;

  const currentCongress = getCurrentCongressNumber();
  const terms = rep.terms ?? [];
  // Terms are sorted most-recent-first; count only same-chamber terms so a
  // House-to-Senate member's Senate term number is honest.
  const chamberTerms = terms.filter(
    t => !t.chamber || t.chamber.toLowerCase().includes(rep.chamber.toLowerCase())
  );
  const inOfficeSince = chamberTerms[chamberTerms.length - 1]?.startYear ?? null;
  const termNumber = Math.max(1, chamberTerms.length);

  const { nextElectionYear, onNextBallot, electionDayLabel } = deriveBallotFraming(
    rep.currentTerm?.end ?? terms[0]?.endYear ?? null
  );

  // The committees array mixes main committees with subcommittee entries
  // whose name is a bare thomas code (e.g. "HSII06" — parent code + 2
  // digits). List mains; count subcommittees.
  const SUBCOMMITTEE_CODE = /^[A-Z]{4,5}\d{2}$/;
  const allCommittees = (rep.committees ?? []).map(c => ({
    name: c.name,
    id: ('id' in c ? (c as { id?: string }).id : undefined) ?? undefined,
  }));
  const mainCommittees = allCommittees.filter(c => !SUBCOMMITTEE_CODE.test(c.name.trim()));
  const subcommitteeCount = allCommittees.length - mainCommittees.length;

  const member: RecordCardMember = {
    bioguideId: rep.bioguideId,
    name: rep.name,
    party: rep.party,
    state: rep.state,
    district: rep.district,
    chamber: rep.chamber,
    imageUrl: rep.imageUrl,
    inOfficeSince,
    termNumber,
    senateClass: rep.currentTerm?.class,
    nextElectionYear,
    onNextBallot,
    electionDayLabel,
    status: rep.status,
    statusDetail: rep.statusDetail,
    committees: mainCommittees,
    subcommitteeCount,
    currentCongress,
  };

  const [legislation, voting, money, districtMoney, keyVotes, ptr] = await Promise.all([
    getLegislationRollup(rep.bioguideId),
    fetchVotingSection(rep.bioguideId, rep.chamber, rep.party),
    fetchMoneySection(rep.bioguideId, rep.state),
    fetchDistrictMoneySection(rep.state, rep.district, rep.chamber),
    fetchKeyVotes(rep.bioguideId, rep.chamber, currentCongress),
    fetchPtrSection(rep.bioguideId, rep.chamber),
  ]);

  return {
    member,
    legislation,
    voting,
    money,
    districtMoney,
    keyVotes,
    ptr,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * STOCK Act PTR counts (House Clerk disclosures; House members only).
 * Splits parsed transactions from paper-filing placeholders exactly as the
 * stock-trades tab does — conflating them inflated Dingell's count to 34
 * when the parseable number was far lower.
 */
async function fetchPtrSection(
  bioguideId: string,
  chamber: 'House' | 'Senate'
): Promise<PtrSection | null> {
  if (chamber !== 'House') return null;
  try {
    const { congressTradingMonitor } = await import('@/lib/data-sources/senate-disclosure-service');
    const trades = await congressTradingMonitor.getTradesForRepresentative(bioguideId);
    const paperFilings = trades.filter(t => t.isPaperFiling).length;
    return {
      transactions: trades.length - paperFilings,
      paperFilings,
      // CTM covers electronic filings from 2015 to present, not a 5-year window.
      coverageYears: new Date().getFullYear() - 2015 + 1,
    };
  } catch (error) {
    logger.warn('Record card: PTR lookup failed', { bioguideId, error });
    return null;
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Weekly digest assembler.
 *
 * Composes one DigestIssue for a complete ISO week from existing services:
 * roll-call votes (Senate corpus + House via Congress.gov), bills that had
 * floor/committee action, and the featured delegation's new FEC filings.
 * Only complete weeks assemble — a finished week is immutable, so issues
 * cache long. Sections that fail upstream are listed in `unavailable` and
 * render as "data unavailable" — never faked, never silently dropped.
 */

import { cachedFetch } from '@/lib/cache';
import { getRedisCache } from '@/lib/cache/redis-client';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import { attachVoteMeanings, attachCachedVoteMeanings } from './vote-meaning';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { isValidStateCode, getStateName } from '@/lib/data/us-states';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import type { StandardizedVote } from '@/features/representatives/services/batch-voting-service';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import logger from '@/lib/logging/simple-logger';
import { parseWeekId, isCompleteWeek } from './week';
import type {
  DigestBill,
  DigestDelegationMember,
  DigestFiling,
  DigestIssue,
  DigestVote,
} from './types';

/**
 * Canonical default state while the digest is Michigan-first (growth
 * strategy: MI beachhead before the 50-state wire-service rollout). Used
 * for the legacy `/digest/{week}` redirect and the email cron.
 */
export const DEFAULT_DIGEST_STATE = 'MI';
/**
 * States the warming cron pre-assembles each week so a real visitor never
 * eats the cold ~40s build. Michigan first: it populates the national
 * vote/bill/meaning caches every other state then reuses, so the rest only
 * pay their delegation + FEC lookups. This is the deliberate pilot set
 * (MI + high-population states); widen it as the rollout expands.
 */
export const DIGEST_WARM_STATES = [
  'MI',
  'CA',
  'TX',
  'FL',
  'NY',
  'PA',
  'IL',
  'OH',
  'GA',
  'NC',
] as const;
/** Finished weeks are immutable; cache the assembled issue for 30 days. */
const ISSUE_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_BILLS = 15;
/** Look further back in the vote list for older archive weeks. */
const VOTE_LOOKBACK_BASE = 60;
const VOTE_LOOKBACK_PER_WEEK = 30;
const VOTE_LOOKBACK_MAX = 250;

const BILL_SLUGS: Record<string, string> = {
  hr: 'house-bill',
  s: 'senate-bill',
  hjres: 'house-joint-resolution',
  sjres: 'senate-joint-resolution',
  hconres: 'house-concurrent-resolution',
  sconres: 'senate-concurrent-resolution',
  hres: 'house-resolution',
  sres: 'senate-resolution',
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function weeksAgo(weekStart: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - weekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)));
}

function toDigestVote(
  vote: StandardizedVote,
  delegation: DigestDelegationMember[],
  state: string
): DigestVote {
  const byBioguide = new Map(delegation.map(m => [m.bioguideId, m]));
  const delegationPositions = vote.memberVotes
    .filter(m => m.state === state)
    .map(m => ({
      bioguideId: m.bioguideId,
      name: m.name,
      party: m.party,
      district: byBioguide.get(m.bioguideId)?.district,
      position: m.position,
    }))
    .sort((a, b) => (a.district ?? '0').localeCompare(b.district ?? '0', 'en', { numeric: true }));

  return {
    voteId: vote.voteId,
    chamber: vote.chamber,
    date: vote.date,
    question: vote.question,
    result: vote.result,
    yeas: vote.totals.yea,
    nays: vote.totals.nay,
    bill: vote.bill
      ? {
          billId: `${vote.bill.congress}-${vote.bill.type.toLowerCase()}-${vote.bill.number}`,
          title: vote.bill.title,
        }
      : undefined,
    sourceUrl: vote.sourceUrl,
    delegationPositions,
  };
}

async function fetchWeekVotes(
  weekStart: Date,
  weekEnd: Date,
  delegation: DigestDelegationMember[],
  state: string
): Promise<{ votes: DigestVote[]; failed: boolean }> {
  const congress = getCurrentCongressNumber(weekStart);
  const session = weekEnd.getUTCFullYear() % 2 === 1 ? 1 : 2;
  const lookback = Math.min(
    VOTE_LOOKBACK_MAX,
    VOTE_LOOKBACK_BASE + VOTE_LOOKBACK_PER_WEEK * weeksAgo(weekStart, new Date())
  );

  const [houseResult, senateResult] = await Promise.allSettled([
    batchVotingService.getHouseChamberRollCalls(congress, session, lookback),
    batchVotingService.getSenateChamberRollCalls(congress, session, lookback),
  ]);

  const failed = houseResult.status === 'rejected' && senateResult.status === 'rejected';
  const all = [
    ...(houseResult.status === 'fulfilled' ? houseResult.value : []),
    ...(senateResult.status === 'fulfilled' ? senateResult.value : []),
  ];

  const votes = all
    .filter(v => {
      const t = new Date(v.date).getTime();
      return t >= weekStart.getTime() && t <= weekEnd.getTime();
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map(v => toDigestVote(v, delegation, state));

  return { votes, failed };
}

interface CongressBillListItem {
  number: string;
  title: string;
  type: string;
  congress: number;
  introducedDate?: string;
  latestAction?: { actionDate?: string; text?: string };
}

async function fetchWeekBills(
  weekStart: Date,
  weekEnd: Date
): Promise<{ bills: DigestBill[]; failed: boolean }> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return { bills: [], failed: true };

  const congress = getCurrentCongressNumber(weekStart);
  try {
    const url = `https://api.congress.gov/v3/bill/${congress}?limit=250&sort=updateDate+desc&format=json`;
    const response = await fetch(url, {
      headers: { 'X-API-Key': apiKey },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      logger.warn('Digest bills fetch failed', { status: response.status });
      return { bills: [], failed: true };
    }
    const json = (await response.json()) as { bills?: CongressBillListItem[] };

    const startIso = isoDate(weekStart);
    const endIso = isoDate(weekEnd);
    const bills = (json.bills ?? [])
      .filter(b => {
        const action = b.latestAction?.actionDate;
        return Boolean(action && action >= startIso && action <= endIso);
      })
      .slice(0, MAX_BILLS)
      .map(b => {
        const type = b.type.toLowerCase();
        const slug = BILL_SLUGS[type];
        return {
          billId: `${b.congress}-${type}-${b.number}`,
          congress: b.congress,
          type: b.type,
          number: b.number,
          title: b.title,
          latestActionDate: b.latestAction?.actionDate ?? '',
          latestActionText: b.latestAction?.text ?? '',
          introducedDate: b.introducedDate,
          congressDotGovUrl: slug
            ? `https://www.congress.gov/bill/${b.congress}th-congress/${slug}/${b.number}`
            : undefined,
        };
      });

    return { bills: await attachBillSummaries(bills), failed: false };
  } catch (error) {
    logger.warn('Digest bills fetch threw', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { bills: [], failed: true };
  }
}

/**
 * Attach plain-language summaries already cached by the summary pipeline
 * (keys are the canonical `${congress}-${type}-${number}` billId — verified
 * against live cache contents 2026-07-07). Read-only: bills without a
 * cached summary simply carry none — the digest never triggers generation.
 */
async function attachBillSummaries(bills: DigestBill[]): Promise<DigestBill[]> {
  if (bills.length === 0) return bills;
  try {
    const cacheIds = bills.map(b => b.billId);
    const summaries = await BillSummaryCache.getBatchSummaries(cacheIds);
    return bills.map((bill, i) => {
      const summary = summaries.get(cacheIds[i] ?? '');
      if (!summary?.whatItDoes) return bill;
      return {
        ...bill,
        aiSummary: {
          whatItDoes: summary.whatItDoes,
          confidence: summary.confidence,
          source: summary.source,
          lastUpdated: summary.lastUpdated,
        },
      };
    });
  } catch (error) {
    logger.warn('Digest bill summaries unavailable', {
      error: error instanceof Error ? error.message : String(error),
    });
    return bills;
  }
}

/**
 * Filings are a secondary section, so they must never dominate assembly.
 * Two guards: fetch in small concurrent waves (a 54-member delegation's
 * calls sit under the shared 60/min wall, so this is latency- not
 * rate-bound), and cap each call — normal FEC latency is well under a
 * second, but a call that hangs to the service's 30s timeout would stall
 * its whole wave, which is what turned a big-state cold load into ~68s.
 */
const FILING_FETCH_CONCURRENCY = 6;
const FILING_CALL_TIMEOUT_MS = 8000;

/** Resolve to `fallback` if `p` hasn't settled within `ms`; clears its timer. */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise(resolve => {
    const timer = setTimeout(() => resolve(fallback), ms);
    p.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}

async function fetchWeekFilings(
  weekStart: Date,
  weekEnd: Date,
  delegation: DigestDelegationMember[]
): Promise<{ filings: DigestFiling[]; failed: boolean }> {
  const start = isoDate(weekStart);
  const end = isoDate(weekEnd);
  // Only members we can map to an FEC id are worth a call.
  const targets = delegation.flatMap(member => {
    const fecId = getFECIdFromBioguide(member.bioguideId);
    return fecId ? [{ member, fecId }] : [];
  });

  const filings: DigestFiling[] = [];
  let errors = 0;

  for (let i = 0; i < targets.length; i += FILING_FETCH_CONCURRENCY) {
    const wave = targets.slice(i, i + FILING_FETCH_CONCURRENCY);
    const settled = await Promise.all(
      wave.map(async ({ member, fecId }) => {
        // null = call errored OR blew the per-call cap; either way, skip it.
        const records = await withTimeout(
          fecApiService.getFilingsByDateRange(fecId, start, end).catch(() => null),
          FILING_CALL_TIMEOUT_MS,
          null
        );
        return records ? { member, records } : null;
      })
    );
    for (const result of settled) {
      if (!result) {
        errors++;
        continue;
      }
      for (const record of result.records) {
        if (!record.receipt_date) continue;
        filings.push({
          fileNumber: record.file_number,
          committeeId: record.committee_id,
          committeeName: record.committee_name ?? undefined,
          bioguideId: result.member.bioguideId,
          memberName: result.member.name,
          party: result.member.party,
          chamber: result.member.chamber,
          formType: record.form_type ?? undefined,
          reportType: record.report_type_full ?? record.report_type ?? undefined,
          receiptDate: record.receipt_date,
          coverageStart: record.coverage_start_date ?? undefined,
          coverageEnd: record.coverage_end_date ?? undefined,
          totalReceipts: record.total_receipts ?? undefined,
          totalDisbursements: record.total_disbursements ?? undefined,
          fecUrl: `https://www.fec.gov/data/filings/?file_number=${record.file_number}`,
        });
      }
    }
  }

  filings.sort((a, b) => b.receiptDate.localeCompare(a.receiptDate));
  // Failed only when we couldn't reach FEC for anyone we tried.
  return { filings, failed: targets.length > 0 && errors === targets.length };
}

async function fetchDelegation(state: string): Promise<DigestDelegationMember[]> {
  const reps = await RepresentativesCoreService.getRepresentativesByState(state);
  return reps
    .map(r => ({
      bioguideId: r.bioguideId,
      name: r.name,
      party: r.party,
      chamber: r.chamber,
      district: r.district,
    }))
    .sort((a, b) => {
      if (a.chamber !== b.chamber) return a.chamber === 'Senate' ? -1 : 1;
      return (a.district ?? '0').localeCompare(b.district ?? '0', 'en', { numeric: true });
    });
}

function issueCacheKey(stateCode: string, weekId: string): string {
  return `digest:issue:v6:${stateCode}:${weekId}`;
}

/**
 * Read an already-assembled issue straight from cache — no upstream
 * assembly, so it's safe on fast/high-traffic surfaces (the digest index
 * hero) that must never pay the cold build. Returns null on a cache miss;
 * the warming cron keeps the featured week populated in production.
 */
export async function getCachedDigestIssue(
  state: string,
  weekId: string
): Promise<DigestIssue | null> {
  if (!isValidStateCode(state)) return null;
  const stateCode = state.toUpperCase();
  const range = parseWeekId(weekId);
  if (!range || !isCompleteWeek(weekId)) return null;

  const base = await getRedisCache()
    .get<DigestIssue>(issueCacheKey(stateCode, weekId))
    .catch(() => null);
  if (!base) return null;

  const votes = await attachCachedVoteMeanings(base.votes);
  return { ...base, votes };
}

/**
 * Assemble (or read from cache) the digest issue for one state and a
 * complete ISO week. Returns null for invalid state codes, malformed ids,
 * and weeks that haven't finished yet.
 *
 * The cached base carries no AI vote meanings — generating them means many
 * LLM calls, which on the render path blows the function timeout (a cold
 * week was a 504 in production). Instead the base assembles fast (votes,
 * bills, filings) and meanings are attached afterward: cache-only on the
 * render path, or generated when `generateMeanings` is set (the crons).
 * Meanings cache per-voteId for a year and are shared across states, so a
 * week generated once — by warming or the email cron — reads back instantly
 * for every state and every later visit.
 */
export async function getDigestIssue(
  state: string,
  weekId: string,
  opts: { generateMeanings?: boolean } = {}
): Promise<DigestIssue | null> {
  if (!isValidStateCode(state)) return null;
  const stateCode = state.toUpperCase();
  const stateName = getStateName(stateCode);
  if (!stateName) return null;

  const range = parseWeekId(weekId);
  if (!range || !isCompleteWeek(weekId)) return null;

  const base = await cachedFetch<DigestIssue | null>(
    // v6: base issue no longer bakes in AI meanings (attached at read time
    // from the national per-voteId cache). Vote-meaning and bill-summary
    // caches stay national — shared across every state, which is what keeps
    // per-state assembly cheap. Bump on shape changes to regenerate.
    issueCacheKey(stateCode, weekId),
    async () => {
      const delegation = await fetchDelegation(stateCode);
      if (delegation.length === 0) {
        // Without the delegation there is no issue worth publishing.
        logger.error('Digest assembly aborted — empty delegation', new Error('no delegation'), {
          state: stateCode,
        });
        return null;
      }

      const [voteResult, billResult, filingResult] = await Promise.all([
        fetchWeekVotes(range.start, range.end, delegation, stateCode),
        fetchWeekBills(range.start, range.end),
        fetchWeekFilings(range.start, range.end, delegation),
      ]);

      const unavailable: DigestIssue['unavailable'] = [];
      if (voteResult.failed) unavailable.push('votes');
      if (billResult.failed) unavailable.push('bills');
      if (filingResult.failed) unavailable.push('filings');

      // A fully-failed issue must not cache for 30 days — null is never
      // cached by cachedFetch, so the next request retries upstream.
      if (unavailable.length === 3) {
        logger.error('Digest assembly failed — all sections unavailable', new Error('all failed'));
        return null;
      }

      return {
        weekId,
        weekStart: range.start.toISOString(),
        weekEnd: range.end.toISOString(),
        state: stateCode,
        stateName,
        delegation,
        votes: voteResult.votes,
        bills: billResult.bills,
        filings: filingResult.filings,
        unavailable,
        generatedAt: new Date().toISOString(),
      };
    },
    ISSUE_TTL_SECONDS
  );

  if (!base) return null;

  // Attach meanings outside the base cache: generate (crons) or read-only
  // (render path). Either way each vote ends up with its cached meaning or
  // none, and the base issue stays reusable across states.
  const votes = opts.generateMeanings
    ? await attachVoteMeanings(base.votes)
    : await attachCachedVoteMeanings(base.votes);
  return { ...base, votes };
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Legislation Rollup (Incumbent Record Card, Section A)
 *
 * Computes bills introduced / cosponsored / enacted / advanced-past-committee,
 * split into the current Congress vs career, from the member's complete
 * Congress.gov legislation history. Statistics only — no AI involved.
 *
 * Classification uses the shared mapCongressStatus() on each bill's latest
 * action text. "Advanced past committee" counts bills whose latest action is
 * reported or further (passed a chamber, enacted) — with only the latest
 * action available, this monotone measure is the honest one: a bill that was
 * reported and later passed would otherwise drop out of a strict
 * "reported"-only count.
 *
 * Data caveats surfaced to the UI rather than hidden:
 * - The cosponsored fetch is capped at 5,000 bills; `cosponsoredSample`
 *   carries the exact API total so truncation is disclosed, never silent.
 * - The sponsored-legislation feed includes amendments; they are excluded
 *   here so "bills introduced" means bills and resolutions only.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
import { mapCongressStatus } from '@/lib/services/bill.service';
import {
  fetchAllMemberLegislation,
  type ProcessedBill,
} from '@/services/congress/optimized-congress.service';
import type { BillStatus } from '@/types/bill';

/** Redis TTL: 24h. Bill status moves slowly; the card shows dataAsOf. */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Bill and resolution types counted as "introduced" (amendments excluded). */
const BILL_TYPES = new Set(['HR', 'S', 'HJRES', 'SJRES', 'HCONRES', 'SCONRES', 'HRES', 'SRES']);

/** Statuses meaning the bill advanced beyond committee referral. */
const ADVANCED_STATUSES: ReadonlySet<BillStatus> = new Set<BillStatus>([
  'reported',
  'passed_house',
  'passed_senate',
  'passed_both',
  'enacted',
]);

export interface LegislationCounts {
  introduced: number;
  cosponsored: number;
  enacted: number;
  enactedFromSponsored: number;
  enactedFromCosponsored: number;
  advancedPastCommittee: number;
  advancedFromSponsored: number;
  advancedFromCosponsored: number;
}

/** A concrete enacted bill for the provenance popover ("View bill: …"). */
export interface EnactedBillExample {
  congress: number;
  type: string;
  number: string;
  title: string;
  /** The latest action text, e.g. "Became Public Law No: 119-24." */
  latestAction: string;
}

export interface LegislationRollup {
  bioguideId: string;
  currentCongress: number;
  current: LegislationCounts;
  career: LegislationCounts;
  /** True when current === career (first-term member): collapse columns. */
  firstTerm: boolean;
  /** Most recent enacted sponsored bill, if any — provenance link target. */
  enactedExample: EnactedBillExample | null;
  /** Truncation disclosure for the cosponsored status sample. */
  cosponsoredSample: {
    fetched: number;
    apiTotal: number;
    truncated: boolean;
  };
  dataAsOf: string;
}

function emptyCounts(): LegislationCounts {
  return {
    introduced: 0,
    cosponsored: 0,
    enacted: 0,
    enactedFromSponsored: 0,
    enactedFromCosponsored: 0,
    advancedPastCommittee: 0,
    advancedFromSponsored: 0,
    advancedFromCosponsored: 0,
  };
}

/** True for bills and resolutions; false for amendments and unknowns. */
export function isCountableBill(bill: Pick<ProcessedBill, 'type'>): boolean {
  return BILL_TYPES.has(bill.type.toUpperCase().replace(/\./g, '').replace(/\s/g, ''));
}

function tally(
  counts: LegislationCounts,
  status: BillStatus | null,
  relationship: 'sponsored' | 'cosponsored'
): void {
  if (relationship === 'sponsored') {
    counts.introduced++;
  } else {
    counts.cosponsored++;
  }

  if (!status) return;

  if (status === 'enacted') {
    counts.enacted++;
    if (relationship === 'sponsored') counts.enactedFromSponsored++;
    else counts.enactedFromCosponsored++;
  }

  if (ADVANCED_STATUSES.has(status)) {
    counts.advancedPastCommittee++;
    if (relationship === 'sponsored') counts.advancedFromSponsored++;
    else counts.advancedFromCosponsored++;
  }
}

/**
 * Pure rollup over a member's fetched legislation. Exported for tests.
 *
 * Career cosponsored count comes from `cosponsoredApiTotal` (exact, from the
 * API's pagination) rather than the possibly-truncated fetched list; status
 * breakdowns (enacted / advanced) necessarily come from the fetched sample.
 */
export function computeLegislationRollup(
  bioguideId: string,
  sponsored: ProcessedBill[],
  cosponsored: ProcessedBill[],
  cosponsoredApiTotal: number,
  currentCongress: number = getCurrentCongressNumber(),
  now: Date = new Date()
): LegislationRollup {
  const current = emptyCounts();
  const career = emptyCounts();

  const countableSponsored = sponsored.filter(isCountableBill);
  const countableCosponsored = cosponsored.filter(isCountableBill);

  let enactedExample: EnactedBillExample | null = null;
  let newestEnactedIntroduced = 0;

  for (const bill of countableSponsored) {
    const status = mapCongressStatus(bill.status);
    tally(career, status, 'sponsored');
    if (bill.congress === currentCongress) tally(current, status, 'sponsored');

    if (status === 'enacted') {
      // Keep the most recently introduced enacted bill as the example
      const introduced = new Date(bill.introducedDate).getTime() || 0;
      if (introduced >= newestEnactedIntroduced) {
        newestEnactedIntroduced = introduced;
        enactedExample = {
          congress: bill.congress,
          type: bill.type,
          number: bill.number,
          title: bill.title,
          latestAction: bill.lastAction,
        };
      }
    }
  }

  for (const bill of countableCosponsored) {
    const status = mapCongressStatus(bill.status);
    tally(career, status, 'cosponsored');
    if (bill.congress === currentCongress) tally(current, status, 'cosponsored');
  }

  // Career cosponsored count: trust the API's exact total over the sample.
  // apiTotal includes amendments the sample filters out, so never let the
  // reported career count drop below what we actually classified.
  career.cosponsored = Math.max(career.cosponsored, cosponsoredApiTotal);

  const truncated = cosponsored.length < cosponsoredApiTotal;

  const firstTerm =
    career.introduced === current.introduced &&
    career.cosponsored === current.cosponsored &&
    career.enacted === current.enacted;

  return {
    bioguideId,
    currentCongress,
    current,
    career,
    firstTerm,
    enactedExample,
    cosponsoredSample: {
      fetched: cosponsored.length,
      apiTotal: cosponsoredApiTotal,
      truncated,
    },
    dataAsOf: now.toISOString(),
  };
}

/**
 * Fetch + compute a member's legislation rollup, Redis-cached for 24h.
 * Returns null on upstream failure — callers render "Data unavailable",
 * never zeros.
 */
export async function getLegislationRollup(bioguideId: string): Promise<LegislationRollup | null> {
  const currentCongress = getCurrentCongressNumber();
  const cacheKey = `record-card:legislation-rollup:${bioguideId}:${currentCongress}`;

  const cached = await govCache.get<LegislationRollup>(cacheKey);
  if (cached) return cached;

  try {
    const history = await fetchAllMemberLegislation(bioguideId);
    const rollup = computeLegislationRollup(
      bioguideId,
      history.sponsored.bills,
      history.cosponsored.bills,
      history.cosponsored.apiTotal,
      currentCongress
    );

    await govCache.set(cacheKey, rollup, { ttl: CACHE_TTL_MS, source: 'congress.gov' });
    return rollup;
  } catch (error) {
    logger.error('Legislation rollup failed', error as Error, { bioguideId });
    return null;
  }
}

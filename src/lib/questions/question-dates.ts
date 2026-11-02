/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The two dates on a question page (/ask/{slug}/{id}; real-dates plan, PR 5).
 * Same rules as member profiles (profile-dates.ts), districts and committees:
 *
 * - Latest record: the newest dated fact the page shows, as its source dates
 *   it. Used for the visible line, the FAQPage JSON-LD dateModified and the
 *   sitemap's lastmod.
 * - Checked: when CIV.IQ fetched that data, as saved with it. Never the
 *   render time; left out when no time was saved.
 *
 * Each template reads its dates from the data it already loaded, so this adds
 * no upstream calls. Templates whose dates live only in per-entity caches
 * (campaign-contributions, bills-sponsored, stock-trades, committee-activity)
 * save them to a small key when the page renders; the sitemap reads those
 * keys back in one batch, so it lists exactly the date the page shows.
 */

import { cache } from '@/lib/cache';
import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';
import {
  chamberVoteDates,
  combineProfileDates,
  rosterChangedOn,
  type ProfileDatePart,
  type ProfileDates,
} from '@/features/representatives/services/profile-dates';
import { legislatorsFileCheckedAt } from '@/features/representatives/services/congress.service';
import { getCommitteeDates } from '@/lib/committees/committee-dates';
import type { PolicyAreaBills } from '@/lib/data-sources/bill-policy-areas/load';
import type { LdaAggregates } from '@/lib/data-sources/lda-corpus/types';
import type { StockTrade } from '@/types/stock-trades';

/** What getCorpusMeta() returns: the LDA corpus's build time and newest filing. */
export type CorpusMeta = Pick<LdaAggregates, 'quarters' | 'generatedAt' | 'latestFilingPosted'>;
import type {
  BillsSponsoredData,
  CampaignContributionsData,
  CommitteeActivityData,
} from './template-data-fetchers';

export type QuestionDates = ProfileDates;

const DAY = /^\d{4}-\d{2}-\d{2}/;

/** A timestamp that names its zone (Z or ±hh:mm); a bare one is wall-clock time. */
const ZONED = /(Z|[+-]\d{2}:?\d{2})$/i;

/**
 * The calendar day of a value: a bare date as is; a zoneless timestamp (FEC
 * receipt dates, Congress.gov meeting times) by the day its source wrote,
 * since the server's own zone (UTC on Vercel) says nothing about it; a zoned
 * timestamp by its day in Washington.
 */
export function dayOf(value: string | null | undefined): string | null {
  if (!value || !DAY.test(value)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  if (!ZONED.test(value)) return Number.isNaN(Date.parse(value)) ? null : value.slice(0, 10);
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function validTime(value: string | null | undefined): string | null {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** The newest YYYY-MM-DD among the values, or null. */
export function newestDay(values: Array<string | null | undefined>): string | null {
  return values
    .map(dayOf)
    .reduce<string | null>((a, b) => (b && (a === null || b > a) ? b : a), null);
}

const none = (source: ProfileDatePart['source']): ProfileDatePart => ({
  source,
  date: null,
  checkedAt: null,
});

// ── Per-template dates ─────────────────────────────────────────

/** voting-record: the chamber's newest roll call, as on the member's profile. */
export async function votingRecordDates(chamber: 'House' | 'Senate'): Promise<QuestionDates> {
  return combineProfileDates([await chamberVoteDates(chamber)]);
}

/** contact-info: when the member's roster entry last changed; Checked = the roster download. */
export async function contactInfoDates(bioguideId: string): Promise<QuestionDates> {
  return combineProfileDates([
    {
      source: 'roster',
      date: rosterChangedOn(bioguideId),
      checkedAt: await legislatorsFileCheckedAt().catch(() => null),
    },
  ]);
}

/**
 * campaign-contributions: the last day the FEC reports behind the totals
 * cover ("reports cover activity through"). Checked = when the stored industry
 * breakdown was built, the only FEC fetch time saved with this page's data.
 */
export function campaignContributionsDates(data: CampaignContributionsData): QuestionDates {
  return combineProfileDates([
    {
      source: 'fec',
      date: dayOf(data.finance?.coverageEndDate),
      checkedAt: validTime(data.industries?.metadata?.lastUpdated),
    },
  ]);
}

/** bills-sponsored: the newest introduction date among the member's bills; Checked = the stored list's fetch time. */
export function billsSponsoredDates(data: BillsSponsoredData): QuestionDates {
  return combineProfileDates([
    {
      source: 'bills',
      date: newestDay(data.bills.map(b => b.introducedDate)),
      checkedAt: validTime(data.fetchedAt),
    },
  ]);
}

/** stock-trades: the newest disclosure filing date (the disclosure is the record). */
export function stockTradesDates(trades: StockTrade[], checkedAt: string | null): QuestionDates {
  return combineProfileDates([
    {
      source: 'trades',
      date: newestDay(trades.map(t => t.filingDate)),
      checkedAt: validTime(checkedAt),
    },
  ]);
}

/** committee-members: the same dates as the committee's own page. */
export async function committeeMembersDates(committeeId: string): Promise<QuestionDates> {
  return getCommitteeDates(committeeId);
}

/** committee-activity: the newest hearing shown; Checked = when the saved hearing list was read. */
export function committeeActivityDates(data: CommitteeActivityData): QuestionDates {
  return combineProfileDates([
    {
      source: 'hearings',
      date: newestDay(data.meetings.map(m => m.date)),
      checkedAt: validTime(data.fetchedAt),
    },
  ]);
}

/** committee-lobbying: the newest filing in the LDA corpus; Checked = when the corpus was built. */
export function committeeLobbyingDates(meta: CorpusMeta | null): QuestionDates {
  if (!meta) return combineProfileDates([none('lobbying')]);
  return combineProfileDates([
    {
      source: 'lobbying',
      date: dayOf(meta.latestFilingPosted),
      checkedAt: validTime(meta.generatedAt),
    },
  ]);
}

/** topic-bills: the newest action among the corpus bills shown; Checked = when the corpus was built. */
export function topicBillsDates(bills: PolicyAreaBills | null): QuestionDates {
  if (!bills) return combineProfileDates([none('bills')]);
  return combineProfileDates([
    {
      source: 'bills',
      date: newestDay((bills.bills ?? []).map(b => b.latestActionDate ?? b.introducedDate)),
      checkedAt: validTime(bills.generatedAt),
    },
  ]);
}

// ── Saved page dates (for the sitemap) ─────────────────────────

/** Templates whose dates come from per-entity caches the sitemap can't read cheaply. */
export const SAVED_DATE_SLUGS = [
  'campaign-contributions',
  'bills-sponsored',
  'stock-trades',
  'committee-activity',
] as const;

export type SavedDateSlug = (typeof SAVED_DATE_SLUGS)[number];

export interface SavedQuestionDates {
  latestRecord: string | null;
  checkedAt: string | null;
}

/** A week: the data behind these pages is refetched daily or better. */
const SAVED_DATES_TTL = 7 * 24 * 60 * 60;

export function questionDatesKey(slug: SavedDateSlug, entityId: string): string {
  return `question:dates:v1:${slug}:${entityId.toUpperCase()}`;
}

/**
 * Save a page's dates beside its data. Fire-and-forget: the page never waits
 * on it or fails because of it. Nothing is saved when neither date is known.
 */
export function saveQuestionDates(
  slug: SavedDateSlug,
  entityId: string,
  dates: SavedQuestionDates
): void {
  if (!dates.latestRecord && !dates.checkedAt) return;
  const value: SavedQuestionDates = {
    latestRecord: dates.latestRecord,
    checkedAt: dates.checkedAt,
  };
  try {
    Promise.resolve(cache.set(questionDatesKey(slug, entityId), value, SAVED_DATES_TTL)).catch(
      () => {}
    );
  } catch {
    // Bookkeeping only.
  }
}

/** Saved dates for many pages of one template, by entity ID; one batch read. */
export async function readQuestionDates(
  slug: SavedDateSlug,
  entityIds: string[]
): Promise<Map<string, SavedQuestionDates>> {
  const result = new Map<string, SavedQuestionDates>();
  if (entityIds.length === 0) return result;
  try {
    const ids = entityIds.map(id => id.toUpperCase());
    const values = await getRedisCache().mget<SavedQuestionDates>(
      ids.map(id => questionDatesKey(slug, id))
    );
    values.forEach((value, i) => {
      const id = ids[i];
      if (id && value && typeof value === 'object') result.set(id, value);
    });
  } catch (error) {
    logger.warn('[QuestionDates] Saved dates unavailable', {
      slug,
      error: (error as Error).message,
    });
  }
  return result;
}

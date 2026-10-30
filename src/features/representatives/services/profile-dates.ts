/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The two dates on a federal member profile (real-dates plan, 2026-10-27):
 *
 * - Latest record: the newest dated fact the profile shows, as its source
 *   dates it. Used for the visible line, JSON-LD dateModified and the
 *   sitemap's lastmod.
 * - Checked: when CIV.IQ fetched that data, as saved with it. The oldest such
 *   time among the sources, so the line never claims more freshness than the
 *   stalest source has.
 *
 * Only dates already stored are read (one or two Redis reads, no upstream
 * calls). A date that isn't known is left out; neither is ever "now".
 *
 * Sources:
 * - Votes: the chamber's newest roll call (every member's vote list carries
 *   every roll call, "Not Voting" included). Senate: the Congressional Record
 *   freshness note (checked twice a day). House: the nightly chamber
 *   baselines build (newest roll call it read, and when it ran).
 * - Roster: when the member's congress-legislators entry last changed
 *   (src/data/member-roster-history.json). Its fetch time isn't saved, so it
 *   counts toward Latest record only.
 * - FEC: the newest report period in the stored finance summary ("filings
 *   through"), and when it was fetched. Only when it is already cached.
 *
 * Bills don't count yet: their latest action dates aren't stored.
 */

import logger from '@/lib/logging/simple-logger';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { getChamberBaselines } from '@/lib/intelligence/analyzers/chamber-baselines';
import { govCache } from '@/services/cache';
import rosterHistory from '@/data/member-roster-history.json';
import { getSenateVoteFreshness } from './senate-vote-freshness';

export type ProfileDateSource = 'votes' | 'roster' | 'fec';

export interface ProfileDatePart {
  source: ProfileDateSource;
  /** YYYY-MM-DD of the newest fact from this source, or null. */
  date: string | null;
  /** ISO time the data was fetched, as stored with it, or null when not saved. */
  checkedAt: string | null;
}

export interface ProfileDates {
  /** YYYY-MM-DD, or null when no source has a date. */
  latestRecord: string | null;
  /** ISO time, or null when no source saved one. */
  checkedAt: string | null;
  parts: ProfileDatePart[];
}

const DAY = /^\d{4}-\d{2}-\d{2}/;

/** The calendar day in Washington of a timestamp; a bare date as is. */
function dayOf(value: string | null | undefined): string | null {
  if (!value || !DAY.test(value)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const time = Date.parse(value);
  if (Number.isNaN(time)) return null;
  return new Date(time).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

function validTime(value: string | null | undefined): string | null {
  return value && !Number.isNaN(Date.parse(value)) ? value : null;
}

/** Newest date and oldest fetch time across the parts that have them. */
export function combineProfileDates(parts: ProfileDatePart[]): ProfileDates {
  const dates = parts.map(p => p.date).filter((d): d is string => !!d);
  const checks = parts.map(p => p.checkedAt).filter((c): c is string => !!c);
  return {
    latestRecord: dates.length ? dates.reduce((a, b) => (b > a ? b : a)) : null,
    checkedAt: checks.length
      ? checks.reduce((a, b) => (Date.parse(b) < Date.parse(a) ? b : a))
      : null,
    parts,
  };
}

/** When a member's roster entry last changed upstream, or null. */
export function rosterChangedOn(bioguideId: string): string | null {
  const members = (rosterHistory as { members: Record<string, { changedOn?: string }> }).members;
  return dayOf(members[bioguideId.toUpperCase()]?.changedOn);
}

/** The chamber's newest roll call, and when that vote list was confirmed. */
export async function chamberVoteDates(
  chamber: 'House' | 'Senate',
  congress: number = getCurrentCongressNumber()
): Promise<ProfileDatePart> {
  const none: ProfileDatePart = { source: 'votes', date: null, checkedAt: null };
  try {
    if (chamber === 'Senate') {
      const freshness = await getSenateVoteFreshness(congress);
      return {
        source: 'votes',
        date: dayOf(freshness?.latestVoteDate),
        checkedAt: validTime(freshness?.checkedAt),
      };
    }
    const baselines = await getChamberBaselines('House', congress);
    if (!baselines) return none;
    // dataAsOf falls back to the build time when no roll call carried a date.
    const date = baselines.dataAsOf === baselines.builtAt ? null : dayOf(baselines.dataAsOf);
    return { source: 'votes', date, checkedAt: validTime(baselines.builtAt) };
  } catch (error) {
    logger.warn('[ProfileDates] Vote dates unavailable', {
      chamber,
      error: (error as Error).message,
    });
    return none;
  }
}

interface StoredFinance {
  metadata?: { lastUpdated?: string; coverageEndDate?: string };
}

/** The stored FEC summary's report period end and fetch time, when cached. */
async function financeDates(bioguideId: string): Promise<ProfileDatePart> {
  try {
    const finance = await govCache.get<StoredFinance>(`batch-endpoint:${bioguideId}:finance`);
    return {
      source: 'fec',
      date: dayOf(finance?.metadata?.coverageEndDate),
      checkedAt: finance?.metadata?.coverageEndDate
        ? validTime(finance.metadata.lastUpdated)
        : null,
    };
  } catch {
    return { source: 'fec', date: null, checkedAt: null };
  }
}

/** A current member's profile dates. */
export async function getProfileDates(
  bioguideId: string,
  chamber: 'House' | 'Senate'
): Promise<ProfileDates> {
  const id = bioguideId.toUpperCase();
  const [votes, fec] = await Promise.all([chamberVoteDates(chamber), financeDates(id)]);
  return combineProfileDates([
    votes,
    { source: 'roster', date: rosterChangedOn(id), checkedAt: null },
    fec,
  ]);
}

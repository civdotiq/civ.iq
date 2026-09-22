/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Link builders for roll-call vote surfaces. Each returns null when a
 * target can't be built from the data in hand, so callers render plain
 * text instead of a link that 404s.
 */

import { parseBillSlug } from '@/lib/data/route-slugs';

/** Bioguide IDs are one uppercase letter + 6 digits (e.g. `A000383`).
 *  Senate LIS member IDs (`S440`) never match. */
const BIOGUIDE_ID = /^[A-Z]\d{6}$/;

export function isBioguideId(id: string | null | undefined): id is string {
  return typeof id === 'string' && BIOGUIDE_ID.test(id);
}

/** Senate LIS member IDs are `S` + 3 digits (e.g. `S440`). */
const LIS_ID = /^S\d{3}$/;

export function isLisMemberId(id: string | null | undefined): id is string {
  return typeof id === 'string' && LIS_ID.test(id);
}

/**
 * Internal `/bill/<congress>-<type>-<number>` href for a vote's measure, or
 * null when the measure is not a bill/resolution (nominations "PN12-1",
 * treaties) or the type/number are missing.
 */
export function billHrefForVote(
  congress: string | number,
  type: string | null | undefined,
  number: string | null | undefined
): string | null {
  if (!type || !number) return null;
  const typeSlug = type.toLowerCase().replace(/[^a-z]/g, '');
  const digits = number.replace(/[^\d]/g, '');
  if (!typeSlug || !digits) return null;
  const parsed = parseBillSlug(`${congress}-${typeSlug}-${digits}`);
  return parsed.kind === 'invalid' ? null : `/bill/${parsed.canonical}`;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * Congress.gov page for a presidential nomination ("PN12-1", "PN 121").
 * Partitioned nominations ("PN12-1") link to the parent nomination page,
 * which lists every partition. Null when the document isn't a nomination.
 */
export function nominationUrlForVote(
  congress: string | number,
  type: string | null | undefined,
  documentName: string | null | undefined
): string | null {
  const congressNum = typeof congress === 'number' ? congress : parseInt(congress, 10);
  if (!Number.isFinite(congressNum) || congressNum <= 0) return null;
  const name = (documentName ?? '').trim();
  const match = name.match(/^(?:PN\s*)?(\d+)(?:-\d+)?$/i);
  const isNomination = /^PN$/i.test(type ?? '') || /^PN/i.test(name);
  if (!isNomination || !match?.[1]) return null;
  return `https://www.congress.gov/nomination/${ordinal(congressNum)}-congress/${match[1]}`;
}

/**
 * Human-readable official record for a roll call, derived from its XML
 * source URL. The House Clerk serves no `.htm` beside its EVS XML; its
 * vote page is `/Votes/<year><roll>` (roll unpadded). senate.gov serves an
 * `.htm` next to each roll-call XML.
 */
export function officialVoteRecordUrl(xmlUrl: string | null | undefined): string | null {
  if (!xmlUrl) return null;
  const house = xmlUrl.match(/^https?:\/\/clerk\.house\.gov\/evs\/(\d{4})\/roll(\d+)\.xml$/i);
  if (house?.[1] && house[2]) {
    return `https://clerk.house.gov/Votes/${house[1]}${parseInt(house[2], 10)}`;
  }
  if (/^https?:\/\/www\.senate\.gov\/legislative\/LIS\/roll_call_votes\/.+\.xml$/i.test(xmlUrl)) {
    return xmlUrl.replace(/\.xml$/i, '.htm');
  }
  return null;
}

/**
 * `billHrefForVote` for a vote-detail record. Senate XML reports a bare
 * "Bill" (or nothing) when it has no type code; that falls back to the
 * chamber's plain bill type, as the vote pages always have.
 */
export function voteMeasureBillHref(
  congress: string | number,
  chamber: 'House' | 'Senate',
  type: string | null | undefined,
  number: string | null | undefined
): string | null {
  const effectiveType =
    type && type.toLowerCase() !== 'bill' ? type : chamber === 'House' ? 'hr' : 's';
  return billHrefForVote(congress, effectiveType, number);
}

/**
 * URL Builder Helpers - Centralized URL generation for consistent routing
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * This file provides type-safe URL builders to ensure consistent URL formats
 * across the entire application. All internal link generation should use these
 * helpers instead of inline template strings.
 *
 * CANONICAL URL FORMATS:
 * - Districts: /districts/MI-01, /districts/CA-AL, /districts/NY-STATE
 * - Representatives: /representative/K000367
 * - Bills: /bill/119-hr-1234
 * - Committees: /committee/HSAG
 * - State Legislature: /state-legislature/mi/legislator/angela-rigas-2a1a6b8f
 */

import {
  PERSON_ID_SUFFIX_LENGTH,
  personIdSuffix,
} from '@/lib/data-sources/openstates-people/people-corpus';
import { decodeBase64Url } from '@/lib/url-encoding';

// ============================================================================
// DISTRICT URLs
// ============================================================================

/**
 * Canonical district-ID slug produced by buildDistrictUrl.
 * Format: `${STATE_UPPER}-${NN|AL|STATE}` where numeric districts are zero-padded to 2 digits.
 */
export interface ParsedDistrictId {
  state: string;
  district: string;
  canonical: string;
}

/**
 * Normalize any accepted district-ID variant to the canonical form.
 *
 * Accepts:
 * - Hyphenated: `NY-8`, `NY-08`, `ny-8`, `ny-08`, `AK-AL`, `AK-al`, `NY-STATE`
 * - Non-hyphenated: `NY8`, `NY08`, `ny8`, `AKAL`
 *
 * Returns the parsed parts and the canonical slug (`NY-08`, `AK-AL`, `NY-STATE`),
 * or `null` if the input does not match any accepted shape.
 *
 * @example
 * canonicalizeDistrictId("NY-8")    // { state: "NY", district: "08", canonical: "NY-08" }
 * canonicalizeDistrictId("ny-08")   // { state: "NY", district: "08", canonical: "NY-08" }
 * canonicalizeDistrictId("NY8")     // { state: "NY", district: "08", canonical: "NY-08" }
 * canonicalizeDistrictId("AK-AL")   // { state: "AK", district: "AL", canonical: "AK-AL" }
 * canonicalizeDistrictId("XX-99")   // null
 */
export function canonicalizeDistrictId(districtId: string): ParsedDistrictId | null {
  const hyphenated = districtId.match(/^([A-Za-z]{2})-(\d{1,2}|AL|STATE)$/i);
  const nonHyphenated = !hyphenated ? districtId.match(/^([A-Za-z]{2})(\d{1,2}|AL)$/i) : null;
  const match = hyphenated ?? nonHyphenated;
  if (!match?.[1] || !match[2]) return null;

  const state = match[1].toUpperCase();
  const rawDistrict = match[2].toUpperCase();
  const district =
    rawDistrict === '0' || rawDistrict === '00'
      ? 'AL'
      : /^\d+$/.test(rawDistrict)
        ? rawDistrict.padStart(2, '0')
        : rawDistrict;

  return { state, district, canonical: `${state}-${district}` };
}

/**
 * Build a federal congressional district URL
 *
 * @param state - 2-letter state code (e.g., "MI", "CA")
 * @param district - District number, "AL" for at-large, or "STATE" for senators
 * @returns Canonical district URL (e.g., "/districts/MI-01", "/districts/AK-AL")
 *
 * @example
 * buildDistrictUrl("MI", "1")   // "/districts/MI-01"
 * buildDistrictUrl("MI", "12")  // "/districts/MI-12"
 * buildDistrictUrl("AK", "AL")  // "/districts/AK-AL"
 * buildDistrictUrl("CA")        // "/districts/CA-AL" (defaults to at-large)
 * buildDistrictUrl("NY", "STATE") // "/districts/NY-STATE" (for senators)
 */
export function buildDistrictUrl(state: string, district?: string | null): string {
  const normalizedState = state.toUpperCase();

  if (!district || district === 'STATE') {
    // For senators or unspecified districts
    return `/districts/${normalizedState}-${district || 'AL'}`;
  }

  // Handle at-large designations
  if (district === 'AL' || district === '00' || district === '0') {
    return `/districts/${normalizedState}-AL`;
  }

  // Pad single-digit districts to 2 digits
  const paddedDistrict = district.padStart(2, '0');
  return `/districts/${normalizedState}-${paddedDistrict}`;
}

/**
 * Build a district URL from a representative's data
 *
 * @param chamber - "House" or "Senate"
 * @param state - 2-letter state code
 * @param district - District number (for House members)
 * @returns Canonical district URL
 *
 * @example
 * buildDistrictUrlForRep("Senate", "NY")        // "/districts/NY-STATE"
 * buildDistrictUrlForRep("House", "MI", "12")   // "/districts/MI-12"
 * buildDistrictUrlForRep("House", "AK")         // "/districts/AK-AL"
 */
export function buildDistrictUrlForRep(
  chamber: 'House' | 'Senate' | string,
  state: string,
  district?: string | null
): string {
  if (chamber === 'Senate') {
    return buildDistrictUrl(state, 'STATE');
  }
  return buildDistrictUrl(state, district || 'AL');
}

// ============================================================================
// REPRESENTATIVE URLs
// ============================================================================

/**
 * Build a federal representative profile URL
 *
 * @param bioguideId - Bioguide ID (e.g., "K000367")
 * @param tab - Optional tab to link to (e.g., "bills", "votes")
 * @returns Representative profile URL
 *
 * @example
 * buildRepresentativeUrl("K000367")           // "/representative/K000367"
 * buildRepresentativeUrl("K000367", "bills")  // "/representative/K000367?tab=bills"
 */
export function buildRepresentativeUrl(bioguideId: string, tab?: string): string {
  const baseUrl = `/representative/${bioguideId}`;
  return tab ? `${baseUrl}?tab=${tab}` : baseUrl;
}

/**
 * Build a representative sub-page URL
 *
 * @param bioguideId - Bioguide ID
 * @param subPage - Sub-page name (e.g., "news", "contact", "committees")
 * @returns Representative sub-page URL
 *
 * @example
 * buildRepresentativeSubUrl("K000367", "news")  // "/representative/K000367/news"
 */
export function buildRepresentativeSubUrl(bioguideId: string, subPage: string): string {
  return `/representative/${bioguideId}/${subPage}`;
}

// ============================================================================
// BILL URLs
// ============================================================================

/**
 * Valid bill types for URL generation
 */
export type BillType = 'hr' | 's' | 'hjres' | 'sjres' | 'hconres' | 'sconres' | 'hres' | 'sres';

/**
 * Build a federal bill URL
 *
 * @param congress - Congress number (e.g., "119")
 * @param type - Bill type (e.g., "hr", "s", "H.R.")
 * @param number - Bill number (e.g., "1234")
 * @returns Canonical bill URL
 *
 * @example
 * buildBillUrl("119", "hr", "1234")    // "/bill/119-hr-1234"
 * buildBillUrl("119", "H.R.", "1234")  // "/bill/119-hr-1234"
 * buildBillUrl("119", "S.", "567")     // "/bill/119-s-567"
 */
export function buildBillUrl(
  congress: string | number,
  type: string,
  number: string | number
): string {
  // Normalize type: "H.R." -> "hr", "S." -> "s", etc.
  const normalizedType = type.toLowerCase().replace(/\./g, '');

  // Extract just digits from number (handles "1234" or "H.R. 1234")
  const cleanNumber = String(number).replace(/[^\d]/g, '');

  return `/bill/${congress}-${normalizedType}-${cleanNumber}`;
}

/**
 * Build a bill URL with chamber-aware fallback for unknown types
 *
 * @param congress - Congress number
 * @param type - Bill type (may be undefined)
 * @param number - Bill number
 * @param chamber - Chamber for fallback ("House" -> "hr", "Senate" -> "s")
 * @returns Canonical bill URL
 */
export function buildBillUrlWithFallback(
  congress: string | number,
  type: string | undefined | null,
  number: string | number,
  chamber: 'House' | 'Senate' | string
): string {
  const fallbackType = chamber === 'House' ? 'hr' : 's';
  const actualType = type || fallbackType;
  return buildBillUrl(congress, actualType, number);
}

// ============================================================================
// COMMITTEE URLs
// ============================================================================

/**
 * Build a committee URL
 *
 * @param committeeId - Committee ID (thomas_id or systemCode)
 * @returns Committee URL
 *
 * @example
 * buildCommitteeUrl("HSAG")    // "/committee/HSAG"
 * buildCommitteeUrl("hsag00")  // "/committee/hsag00"
 */
export function buildCommitteeUrl(committeeId: string): string {
  return `/committee/${committeeId}`;
}

// ============================================================================
// STATE LEGISLATURE URLs
// ============================================================================

/**
 * Build a state legislature URL
 *
 * @param state - 2-letter state code
 * @returns State legislature URL (lowercase state)
 *
 * @example
 * buildStateLegislatureUrl("MI")  // "/state-legislature/mi"
 */
export function buildStateLegislatureUrl(state: string): string {
  return `/state-legislature/${state.toLowerCase()}`;
}

/**
 * Readable URL segment for a state legislator: the name, ASCII-folded and
 * hyphenated, then the id suffix that actually identifies them. The name part
 * is decoration — the page resolves by suffix and 308s any other spelling
 * (a renamed member, a hand-typed link) to the current one.
 *
 * @example
 * stateLegislatorSlug("José Peña Jr.", "ocd-person/2a1a6b8f-1f9c-...")  // "jose-pena-jr-2a1a6b8f"
 */
export function stateLegislatorSlug(name: string, legislatorId: string): string {
  const namePart = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = personIdSuffix(legislatorId);
  return namePart ? `${namePart}-${suffix}` : suffix;
}

/**
 * Build a state legislator URL
 *
 * @param state - 2-letter state code
 * @param legislatorId - OpenStates legislator ID (`ocd-person/<uuid>`)
 * @param name - The legislator's display name
 *
 * @example
 * buildStateLegislatorUrl("MI", "ocd-person/2a1a6b8f-...", "Angela Rigas")
 * // "/state-legislature/mi/legislator/angela-rigas-2a1a6b8f"
 */
export function buildStateLegislatorUrl(state: string, legislatorId: string, name: string): string {
  return `/state-legislature/${state.toLowerCase()}/legislator/${stateLegislatorSlug(name, legislatorId)}`;
}

/** What a legislator URL segment identifies the member by. */
export type StateLegislatorParam = { kind: 'id'; id: string } | { kind: 'suffix'; suffix: string };

const OCD_PERSON_UUID =
  /^(?:ocd-person[-/])?([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
const SLUG_SUFFIX = new RegExp(`(?:^|-)([0-9a-f]{${PERSON_ID_SUFFIX_LENGTH}})$`, 'i');

/**
 * Read a legislator URL segment in any form a link has ever used: the readable
 * slug, the legacy base64 of `ocd-person/<uuid>`, or the raw id. Null means the
 * segment names nobody and the page should 404 without asking any API.
 */
export function parseStateLegislatorParam(segment: string): StateLegislatorParam | null {
  let value: string;
  try {
    value = decodeURIComponent(segment).trim();
  } catch {
    return null;
  }

  const raw = OCD_PERSON_UUID.exec(value);
  if (raw?.[1]) return { kind: 'id', id: `ocd-person/${raw[1].toLowerCase()}` };

  // Legacy links: base64url("ocd-person/<uuid>") always starts with "b2NkLXBlcnNvbi".
  if (value.startsWith('b2NkLXBlcnNvbi')) {
    let decoded = '';
    try {
      decoded = decodeBase64Url(value);
    } catch {
      return null;
    }
    const legacy = OCD_PERSON_UUID.exec(decoded);
    return legacy?.[1] ? { kind: 'id', id: `ocd-person/${legacy[1].toLowerCase()}` } : null;
  }

  const slug = SLUG_SUFFIX.exec(value);
  return slug?.[1] ? { kind: 'suffix', suffix: slug[1].toLowerCase() } : null;
}

/**
 * Build a state bill URL
 *
 * @param state - 2-letter state code
 * @param billId - State bill ID (may need encoding)
 * @returns State bill URL
 *
 * @example
 * buildStateBillUrl("MI", "HB-1234")  // "/state-bills/mi/HB-1234"
 */
export function buildStateBillUrl(state: string, billId: string): string {
  return `/state-bills/${state.toLowerCase()}/${encodeURIComponent(billId)}`;
}

// ============================================================================
// VOTE URLs
// ============================================================================

/**
 * Build a vote URL
 *
 * @param voteId - Vote ID (e.g., "119-2-h456")
 * @returns Vote URL
 *
 * @example
 * buildVoteUrl("119-2-h456")  // "/vote/119-2-h456"
 */
export function buildVoteUrl(voteId: string): string {
  return `/vote/${voteId}`;
}

// ============================================================================
// DELEGATION URLs
// ============================================================================

/**
 * Build a state delegation URL
 *
 * @param state - 2-letter state code
 * @returns Delegation URL (uppercase state — the canonical and sitemap form)
 *
 * @example
 * buildDelegationUrl("mi")  // "/delegation/MI"
 */
export function buildDelegationUrl(state: string): string {
  return `/delegation/${state.toUpperCase()}`;
}

// ============================================================================
// STATE DISTRICT URLs
// ============================================================================

/**
 * Build a state legislative district URL
 *
 * @param state - 2-letter state code
 * @param chamber - "upper" or "lower"
 * @param district - District identifier
 * @returns State district URL
 *
 * @example
 * buildStateDistrictUrl("MI", "lower", "12")  // "/state-districts/mi/lower/12"
 */
export function buildStateDistrictUrl(
  state: string,
  chamber: 'upper' | 'lower' | string,
  district: string
): string {
  return `/state-districts/${state.toLowerCase()}/${chamber}/${district}`;
}

// ============================================================================
// CANONICAL CASING
// ============================================================================

/** Routes whose first segment is a state code, and the case it is canonical in. */
const STATE_SEGMENT_CASE: Record<string, 'lower' | 'upper'> = {
  states: 'lower',
  'state-legislature': 'lower',
  'state-bills': 'lower',
  'state-districts': 'lower',
  delegation: 'upper',
};

/**
 * The canonical-case form of a path, or `null` when it is already canonical.
 *
 * Route params are matched case-insensitively downstream, so `/states/MI` and
 * `/states/mi` both served a 200 — two indexable copies of one page. Only the
 * ID segment is recased; anything after it (e.g. a base64 legislator ID) is
 * case-sensitive and left untouched.
 *
 * @example
 * canonicalCasePath("/representative/t000481")          // "/representative/T000481"
 * canonicalCasePath("/state-legislature/MI/committees") // "/state-legislature/mi/committees"
 * canonicalCasePath("/delegation/mi")                   // "/delegation/MI"
 * canonicalCasePath("/states/mi")                       // null
 */
export function canonicalCasePath(pathname: string): string | null {
  const rep = pathname.match(/^\/representative\/([A-Za-z]\d{6})(\/.*)?$/);
  if (rep?.[1]) {
    const upper = rep[1].toUpperCase();
    return upper === rep[1] ? null : `/representative/${upper}${rep[2] ?? ''}`;
  }

  const state = pathname.match(/^\/([a-z-]+)\/([A-Za-z]{2})(\/.*)?$/);
  const wanted = state?.[1] ? STATE_SEGMENT_CASE[state[1]] : undefined;
  if (!state?.[2] || !wanted) return null;
  const code = wanted === 'lower' ? state[2].toLowerCase() : state[2].toUpperCase();
  return code === state[2] ? null : `/${state[1]}/${code}${state[3] ?? ''}`;
}

/**
 * /results (any query) and /representatives?zip= / ?address= were the ZIP and
 * address lookup results pages. The plain /representatives directory stays.
 */
export function isRetiredLookupUrl(url: URL): boolean {
  if (/^\/results\/?$/.test(url.pathname)) return true;
  return (
    /^\/representatives\/?$/.test(url.pathname) &&
    (url.searchParams.has('zip') || url.searchParams.has('address'))
  );
}

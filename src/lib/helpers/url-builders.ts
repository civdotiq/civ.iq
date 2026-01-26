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
 * - State Legislature: /state-legislature/mi/legislator/abc123
 */

// ============================================================================
// DISTRICT URLs
// ============================================================================

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
 * Build a state legislator URL
 *
 * @param state - 2-letter state code
 * @param legislatorId - OpenStates legislator ID
 * @returns State legislator URL
 *
 * @example
 * buildStateLegislatorUrl("MI", "ocd-person/abc-123")  // "/state-legislature/mi/legislator/ocd-person/abc-123"
 */
export function buildStateLegislatorUrl(state: string, legislatorId: string): string {
  return `/state-legislature/${state.toLowerCase()}/legislator/${legislatorId}`;
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
 * @returns Delegation URL (lowercase state)
 *
 * @example
 * buildDelegationUrl("MI")  // "/delegation/mi"
 */
export function buildDelegationUrl(state: string): string {
  return `/delegation/${state.toLowerCase()}`;
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

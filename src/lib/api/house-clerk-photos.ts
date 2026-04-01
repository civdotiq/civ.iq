/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * House Clerk Photo Service — ziplook.house.gov official portraits
 *
 * The Office of the Clerk of the House publishes member photos via a
 * predictable URL pattern on ziplook.house.gov. This is a government-hosted,
 * actively maintained source that covers all 435 House members + delegates.
 *
 * URL pattern: https://ziplook.house.gov/zip/pictures/{state}{district}_{lastname}.jpg
 * Example:     https://ziplook.house.gov/zip/pictures/nh01_pappas.jpg
 *
 * Note: This source only covers House members, not Senators.
 */

import logger from '@/lib/logging/simple-logger';

const ZIPLOOK_BASE = 'https://ziplook.house.gov/zip/pictures';

/** State name → 2-letter abbreviation for URL construction */
const STATE_NAME_TO_ABBREV: Record<string, string> = {
  alabama: 'al',
  alaska: 'ak',
  arizona: 'az',
  arkansas: 'ar',
  california: 'ca',
  colorado: 'co',
  connecticut: 'ct',
  delaware: 'de',
  florida: 'fl',
  georgia: 'ga',
  hawaii: 'hi',
  idaho: 'id',
  illinois: 'il',
  indiana: 'in',
  iowa: 'ia',
  kansas: 'ks',
  kentucky: 'ky',
  louisiana: 'la',
  maine: 'me',
  maryland: 'md',
  massachusetts: 'ma',
  michigan: 'mi',
  minnesota: 'mn',
  mississippi: 'ms',
  missouri: 'mo',
  montana: 'mt',
  nebraska: 'ne',
  nevada: 'nv',
  'new hampshire': 'nh',
  'new jersey': 'nj',
  'new mexico': 'nm',
  'new york': 'ny',
  'north carolina': 'nc',
  'north dakota': 'nd',
  ohio: 'oh',
  oklahoma: 'ok',
  oregon: 'or',
  pennsylvania: 'pa',
  'rhode island': 'ri',
  'south carolina': 'sc',
  'south dakota': 'sd',
  tennessee: 'tn',
  texas: 'tx',
  utah: 'ut',
  vermont: 'vt',
  virginia: 'va',
  washington: 'wa',
  'west virginia': 'wv',
  wisconsin: 'wi',
  wyoming: 'wy',
  // Territories and DC
  'district of columbia': 'dc',
  'american samoa': 'as',
  guam: 'gu',
  'northern mariana islands': 'mp',
  'puerto rico': 'pr',
  'virgin islands': 'vi',
};

/**
 * Normalize a state identifier to its 2-letter lowercase abbreviation.
 * Accepts full state names ("New Hampshire") or abbreviations ("NH").
 */
function normalizeState(state: string): string | null {
  const lower = state.trim().toLowerCase();

  // Already a 2-letter abbreviation
  if (lower.length === 2 && /^[a-z]{2}$/.test(lower)) {
    return lower;
  }

  return STATE_NAME_TO_ABBREV[lower] ?? null;
}

/**
 * Extract the last name from a full name string.
 * Handles formats like "Pelosi, Nancy" and "Nancy Pelosi" and suffixes.
 */
function extractLastName(fullName: string): string | null {
  if (!fullName) return null;

  let lastName: string;

  if (fullName.includes(',')) {
    // "Pelosi, Nancy" format → take first part
    lastName = fullName.split(',')[0]?.trim() ?? '';
  } else {
    // "Nancy Pelosi" format → take last part
    const parts = fullName.trim().split(/\s+/);
    lastName = parts[parts.length - 1] ?? '';
  }

  // Remove common suffixes
  lastName = lastName.replace(/\s*(jr\.?|sr\.?|iii?|iv)$/i, '').trim();

  // Lowercase, remove non-alpha characters except hyphens
  lastName = lastName.toLowerCase().replace(/[^a-z-]/g, '');

  return lastName || null;
}

/**
 * Pad a district number to 2 digits (e.g., "1" → "01", "12" → "12").
 * At-large districts (0 or "at-large") become "00".
 */
function padDistrict(district: string | number | undefined): string {
  if (!district || district === '0' || district === 0) return '00';

  const num = typeof district === 'string' ? parseInt(district, 10) : district;
  if (isNaN(num)) return '00';

  return num.toString().padStart(2, '0');
}

/**
 * Generate a ziplook.house.gov photo URL for a House member.
 *
 * @param state - State name or 2-letter abbreviation
 * @param district - District number (1-53) or "0"/"at-large" for at-large
 * @param lastName - Member's last name (or full name — will extract last name)
 * @returns The ziplook URL, or null if inputs are invalid
 */
export function getHouseClerkPhotoUrl(
  state: string,
  district: string | number | undefined,
  lastName: string
): string | null {
  const stateAbbrev = normalizeState(state);
  if (!stateAbbrev) {
    logger.debug('House Clerk photo: invalid state', { state });
    return null;
  }

  const districtPadded = padDistrict(district);
  const name = extractLastName(lastName);
  if (!name) {
    logger.debug('House Clerk photo: could not extract last name', { lastName });
    return null;
  }

  // Pattern: {state}{district}_{lastname}.jpg
  return `${ZIPLOOK_BASE}/${stateAbbrev}${districtPadded}_${name}.jpg`;
}

/**
 * Validate that a ziplook.house.gov photo URL actually returns an image.
 * Uses a HEAD request with a short timeout.
 */
export async function validateHouseClerkPhoto(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civdotiq.org) Government Data Portal',
      },
    });

    clearTimeout(timeoutId);

    return response.ok && (response.headers.get('content-type')?.startsWith('image/') ?? false);
  } catch {
    return false;
  }
}

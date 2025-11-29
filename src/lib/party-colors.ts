/**
 * Unified party color utilities for consistent styling across the application.
 * Provides both Tailwind CSS classes and hex color values.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export type Party = 'democrat' | 'republican' | 'independent' | 'unknown';

/**
 * Party color configuration with both Tailwind classes and hex values.
 */
const PARTY_COLORS = {
  democrat: {
    text: 'text-blue-600',
    bg: 'bg-blue-100',
    hex: '#3B82F6',
    hexLight: '#DBEAFE',
  },
  republican: {
    text: 'text-red-600',
    bg: 'bg-red-100',
    hex: '#EF4444',
    hexLight: '#FEE2E2',
  },
  independent: {
    text: 'text-purple-600',
    bg: 'bg-purple-100',
    hex: '#8B5CF6',
    hexLight: '#EDE9FE',
  },
  unknown: {
    text: 'text-gray-600',
    bg: 'bg-gray-100',
    hex: '#6B7280',
    hexLight: '#F3F4F6',
  },
} as const;

/**
 * Normalize party string to standard Party type.
 */
function normalizeParty(party: string | null | undefined): Party {
  if (!party) return 'unknown';

  const normalized = party.toLowerCase().trim();

  // Democrat variations
  if (['democrat', 'democratic', 'd', 'dem'].includes(normalized)) {
    return 'democrat';
  }

  // Republican variations
  if (['republican', 'r', 'rep', 'gop'].includes(normalized)) {
    return 'republican';
  }

  // Independent variations
  if (['independent', 'i', 'ind'].includes(normalized)) {
    return 'independent';
  }

  return 'unknown';
}

/**
 * Get Tailwind text color class for a party.
 */
export function getPartyTextClass(party: string | null | undefined): string {
  return PARTY_COLORS[normalizeParty(party)].text;
}

/**
 * Get Tailwind background color class for a party.
 */
export function getPartyBgClass(party: string | null | undefined): string {
  return PARTY_COLORS[normalizeParty(party)].bg;
}

/**
 * Get hex color value for a party.
 */
export function getPartyHexColor(party: string | null | undefined): string {
  return PARTY_COLORS[normalizeParty(party)].hex;
}

/**
 * Get light hex color value for a party (for backgrounds).
 */
export function getPartyHexColorLight(party: string | null | undefined): string {
  return PARTY_COLORS[normalizeParty(party)].hexLight;
}

/**
 * Get all color values for a party.
 */
export function getPartyColors(party: string | null | undefined) {
  return PARTY_COLORS[normalizeParty(party)];
}

// Re-export for backward compatibility with existing imports
export { getPartyTextClass as getPartyColor };
export { getPartyBgClass as getPartyBgColor };

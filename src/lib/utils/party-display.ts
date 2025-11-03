/**
 * Utility functions for displaying party information consistently across the UI
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Now uses centralized congressional constants for consistency
 */

import {
  getPartyInfo,
  getPartyColors as getPartyColorsFromConstants,
} from '../data/congressional-constants';

export type PartyColor = {
  bg: string;
  text: string;
};

/**
 * Get standardized party colors for UI badges/chips
 * Uses centralized congressional constants
 */
export function getPartyColors(party: string): PartyColor {
  const colors = getPartyColorsFromConstants(party);
  return { bg: colors.bg, text: colors.text };
}

/**
 * Format party name for display (just return the party as-is)
 * This preserves the actual party name from the API
 */
export function formatPartyName(party: string): string {
  return party;
}

/**
 * Expand party abbreviation to full name
 * Uses centralized congressional constants
 */
export function expandPartyAbbreviation(party: string): string {
  const partyInfo = getPartyInfo(party);
  return partyInfo.name;
}

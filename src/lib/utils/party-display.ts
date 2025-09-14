/**
 * Utility functions for displaying party information consistently across the UI
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export type PartyColor = {
  bg: string;
  text: string;
};

/**
 * Get standardized party colors for UI badges/chips
 */
export function getPartyColors(party: string): PartyColor {
  const normalizedParty = party.toLowerCase();

  if (normalizedParty === 'democrat' || normalizedParty === 'd') {
    return { bg: 'bg-blue-100', text: 'text-blue-800' };
  }

  if (normalizedParty === 'independent') {
    return { bg: 'bg-purple-100', text: 'text-purple-800' };
  }

  // Default to Republican for 'R', 'Republican', or anything else
  return { bg: 'bg-red-100', text: 'text-red-800' };
}

/**
 * Format party name for display (just return the party as-is)
 * This preserves the actual party name from the API
 */
export function formatPartyName(party: string): string {
  return party;
}

/**
 * Legacy function to handle old 'D'/'R' format
 * @deprecated Use the actual party names from API instead
 */
export function expandPartyAbbreviation(party: string): string {
  switch (party) {
    case 'D':
      return 'Democrat';
    case 'R':
      return 'Republican';
    case 'I':
      return 'Independent';
    default:
      return party; // Return as-is for full names
  }
}

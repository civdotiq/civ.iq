/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Citizen-friendly sector display names.
 *
 * IndustrySector enum values (e.g. "Misc Business", "Ideology/Single-Issue")
 * are database-facing identifiers. This map provides plain-language names
 * that make sense to someone who isn't a campaign finance researcher.
 */

const SECTOR_DISPLAY_NAMES: Record<string, string> = {
  Agribusiness: 'Agriculture & Food',
  'Communications/Electronics': 'Technology & Media',
  Construction: 'Construction & Building',
  Defense: 'Defense & Military',
  'Energy/Natural Resources': 'Energy & Natural Resources',
  'Finance/Insurance/Real Estate': 'Finance & Real Estate',
  Health: 'Healthcare',
  'Lawyers/Lobbyists': 'Legal & Lobbying',
  Transportation: 'Transportation',
  'Misc Business': 'General Business',
  Labor: 'Labor & Workers',
  'Ideology/Single-Issue': 'Advocacy & Nonprofits',
  Other: 'Other',
};

/** Returns a citizen-friendly name for a sector, falling back to the raw value. */
export function displaySector(sector: string): string {
  return SECTOR_DISPLAY_NAMES[sector] ?? sector;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * SIC Code to IndustrySector Mapping
 *
 * Maps Standard Industrial Classification (SIC) code ranges to the
 * IndustrySector enum from src/lib/fec/industry-taxonomy.ts.
 *
 * SIC codes are 4-digit numbers organized into divisions:
 *   0100-0999: Agriculture, Forestry, Fishing
 *   1000-1499: Mining
 *   1500-1799: Construction
 *   2000-3999: Manufacturing
 *   4000-4999: Transportation, Communications, Utilities
 *   5000-5199: Wholesale Trade
 *   5200-5999: Retail Trade
 *   6000-6799: Finance, Insurance, Real Estate
 *   7000-8999: Services
 *   9100-9999: Public Administration
 *
 * Some ranges are further subdivided to match the OpenSecrets-style
 * 13-sector model used across CIV.IQ.
 */

import { IndustrySector } from './industry-taxonomy.js';

/**
 * A range entry: inclusive start and end SIC codes mapped to a sector.
 * Ranges are checked in order — first match wins, so more specific
 * ranges must come before broader ones.
 */
interface SicRange {
  start: number;
  end: number;
  sector: IndustrySector;
}

/**
 * Ordered list of SIC code ranges mapped to IndustrySector.
 * More specific ranges precede broader ones.
 */
const SIC_RANGES: SicRange[] = [
  // Agriculture, Forestry, Fishing (0100-0999)
  { start: 100, end: 999, sector: IndustrySector.AGRIBUSINESS },

  // Mining (1000-1499) — Energy/Natural Resources
  { start: 1000, end: 1499, sector: IndustrySector.ENERGY_NATURAL_RESOURCES },

  // Construction (1500-1799)
  { start: 1500, end: 1799, sector: IndustrySector.CONSTRUCTION },

  // Manufacturing — Food products (2000-2099) → Agribusiness
  { start: 2000, end: 2099, sector: IndustrySector.AGRIBUSINESS },

  // Manufacturing — Tobacco, Textiles, Wood, Paper, Printing (2100-2799) → Misc Business
  { start: 2100, end: 2799, sector: IndustrySector.MISC_BUSINESS },

  // Manufacturing — Chemicals, Pharmaceuticals (2800-2899) → Health
  { start: 2800, end: 2899, sector: IndustrySector.HEALTH },

  // Manufacturing — Petroleum refining, Rubber, Plastics (2900-3099) → Energy
  { start: 2900, end: 3099, sector: IndustrySector.ENERGY_NATURAL_RESOURCES },

  // Manufacturing — Stone, Clay, Glass, Primary Metals, Fabricated Metals (3100-3499) → Misc Business
  { start: 3100, end: 3499, sector: IndustrySector.MISC_BUSINESS },

  // Manufacturing — Industrial machinery, Computers (3500-3599) → Communications/Electronics
  { start: 3500, end: 3599, sector: IndustrySector.COMMUNICATIONS_ELECTRONICS },

  // Manufacturing — Electronic components, Semiconductors (3600-3699) → Communications/Electronics
  { start: 3600, end: 3699, sector: IndustrySector.COMMUNICATIONS_ELECTRONICS },

  // Manufacturing — Transportation equipment (3700-3799) → Transportation
  { start: 3700, end: 3719, sector: IndustrySector.TRANSPORTATION },

  // Manufacturing — Aircraft, Guided missiles, Space vehicles (3720-3799) → Defense
  { start: 3720, end: 3799, sector: IndustrySector.DEFENSE },

  // Manufacturing — Instruments, Medical devices (3800-3899) → Health
  { start: 3800, end: 3899, sector: IndustrySector.HEALTH },

  // Manufacturing — Misc manufacturing (3900-3999) → Misc Business
  { start: 3900, end: 3999, sector: IndustrySector.MISC_BUSINESS },

  // Transportation — Railroad, Trucking, Water, Air (4000-4599) → Transportation
  { start: 4000, end: 4599, sector: IndustrySector.TRANSPORTATION },

  // Transportation — Pipelines (4600-4699) → Energy
  { start: 4600, end: 4699, sector: IndustrySector.ENERGY_NATURAL_RESOURCES },

  // Communications — Telephone, Radio, TV, Cable (4700-4899) → Communications/Electronics
  { start: 4700, end: 4899, sector: IndustrySector.COMMUNICATIONS_ELECTRONICS },

  // Utilities — Electric, Gas, Water, Sanitary (4900-4999) → Energy
  { start: 4900, end: 4999, sector: IndustrySector.ENERGY_NATURAL_RESOURCES },

  // Wholesale Trade (5000-5199) → Misc Business
  { start: 5000, end: 5199, sector: IndustrySector.MISC_BUSINESS },

  // Retail Trade (5200-5999) → Misc Business
  { start: 5200, end: 5999, sector: IndustrySector.MISC_BUSINESS },

  // Finance, Insurance, Real Estate (6000-6797)
  { start: 6000, end: 6797, sector: IndustrySector.FINANCE_INSURANCE_REAL_ESTATE },

  // Services — Hotels, Personal services (7000-7299) → Misc Business
  { start: 7000, end: 7299, sector: IndustrySector.MISC_BUSINESS },

  // Services — Business services, Computer programming (7300-7399) → Communications/Electronics
  { start: 7300, end: 7399, sector: IndustrySector.COMMUNICATIONS_ELECTRONICS },

  // Services — Auto repair, Misc repair, Entertainment (7400-7999) → Misc Business
  { start: 7400, end: 7999, sector: IndustrySector.MISC_BUSINESS },

  // Services — Health services (8000-8099) → Health
  { start: 8000, end: 8099, sector: IndustrySector.HEALTH },

  // Services — Legal services (8100-8199) → Lawyers & Lobbyists
  { start: 8100, end: 8199, sector: IndustrySector.LAWYERS_LOBBYISTS },

  // Services — Education (8200-8299) → Ideology/Single-Issue
  { start: 8200, end: 8299, sector: IndustrySector.IDEOLOGY_SINGLE_ISSUE },

  // Services — Social services, Museums, Membership orgs (8300-8699) → Ideology/Single-Issue
  { start: 8300, end: 8699, sector: IndustrySector.IDEOLOGY_SINGLE_ISSUE },

  // Services — Engineering, Accounting, Research, Management (8700-8999) → Misc Business
  { start: 8700, end: 8999, sector: IndustrySector.MISC_BUSINESS },

  // Public Administration (9100-9999) → Other
  { start: 9100, end: 9999, sector: IndustrySector.OTHER },
];

/**
 * Reverse lookup: given an IndustrySector, return all SIC code ranges that map to it.
 * Returns an empty array if no ranges match.
 */
export function sectorToSicRanges(sector: IndustrySector): { start: number; end: number }[] {
  return SIC_RANGES.filter(r => r.sector === sector).map(({ start, end }) => ({ start, end }));
}

/**
 * Resolve a 4-digit SIC code string to an IndustrySector.
 * Returns null if the code is invalid or falls outside all known ranges.
 */
export function sicToSector(sicCode: string): IndustrySector | null {
  const code = parseInt(sicCode, 10);
  if (isNaN(code) || code < 100 || code > 9999) {
    return null;
  }

  for (const range of SIC_RANGES) {
    if (code >= range.start && code <= range.end) {
      return range.sector;
    }
  }

  return null;
}

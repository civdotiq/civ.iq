/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Committee Alias Table
 *
 * Static lookup table mapping LDA `government_entities` free-text strings
 * to known committee codes and agency slugs. Generated from the 29 entries
 * in ALL_COMMITTEE_MAPPINGS.
 *
 * For each committee, aliases include:
 * - Full formal: "senate committee on finance" → SSFI
 * - Prefixed short: "senate finance" → SSFI
 * - Just name: "finance" with chamber context
 *
 * For agencies, aliases map to USAspending slugs:
 * - "department of energy" → "department-of-energy"
 * - "epa" → "environmental-protection-agency"
 */

import { ALL_COMMITTEE_MAPPINGS, type AgencyInfo } from './committee-agency-map.js';

// ── Committee Aliases ────────────────────────────────────────────────

function buildCommitteeAliases(): Map<string, string> {
  const aliases = new Map<string, string>();

  for (const mapping of ALL_COMMITTEE_MAPPINGS) {
    const code = mapping.committeeCode;
    const name = mapping.committeeName.toLowerCase();
    const chamber = mapping.chamber.toLowerCase();

    // Full formal: "senate committee on finance"
    aliases.set(`${chamber} committee on ${name}`, code);

    // Prefixed short: "senate finance" / "house armed services"
    aliases.set(`${chamber} ${name}`, code);

    // With "committee" suffix: "senate finance committee"
    aliases.set(`${chamber} ${name} committee`, code);

    // "committee on X" with chamber prefix
    aliases.set(`${chamber} committee on ${name}`, code);

    // "U.S. Senate Committee on ..." / "U.S. House Committee on ..."
    aliases.set(`u.s. ${chamber} committee on ${name}`, code);

    // Just "Committee on X" (ambiguous but useful for resolution)
    aliases.set(`committee on ${name}`, code);

    // Handle multi-word committee names with variants
    // "Energy and Commerce" → "house energy and commerce committee"
    if (name.includes(' and ')) {
      // Also store without "and" for fuzzy matching
      const parts = name.split(' and ');
      if (parts.length === 2 && parts[0] && parts[1]) {
        aliases.set(`${chamber} ${parts[0].trim()} committee`, code);
      }
    }

    // Handle common abbreviations in committee names
    if (name === 'armed services') {
      aliases.set(`${chamber} armed services`, code);
    }
    if (name === 'energy and commerce') {
      aliases.set(`${chamber} energy committee`, code);
      aliases.set(`${chamber} commerce committee`, code);
    }
    if (name === 'ways and means') {
      aliases.set(`${chamber} ways and means`, code);
    }
    if (name === 'health, education, labor, and pensions') {
      aliases.set(`${chamber} help committee`, code);
      aliases.set(`${chamber} health committee`, code);
    }
    if (name === 'homeland security and governmental affairs') {
      aliases.set(`${chamber} homeland security`, code);
      aliases.set(`${chamber} governmental affairs`, code);
    }
    if (name === 'banking, housing, and urban affairs') {
      aliases.set(`${chamber} banking committee`, code);
      aliases.set(`${chamber} banking`, code);
    }
    if (name === 'commerce, science, and transportation') {
      aliases.set(`${chamber} commerce`, code);
      aliases.set(`${chamber} science committee`, code);
    }
    if (name === 'agriculture, nutrition, and forestry') {
      aliases.set(`${chamber} agriculture`, code);
    }
    if (name === 'small business and entrepreneurship') {
      aliases.set(`${chamber} small business`, code);
    }
    if (name === 'environment and public works') {
      aliases.set(`${chamber} environment`, code);
      aliases.set(`${chamber} public works`, code);
    }
    if (name === 'energy and natural resources') {
      aliases.set(`${chamber} energy`, code);
      aliases.set(`${chamber} natural resources`, code);
    }
    if (name === 'oversight and government reform') {
      aliases.set(`${chamber} oversight`, code);
      aliases.set(`${chamber} government reform`, code);
    }
    if (name === 'science, space, and technology') {
      aliases.set(`${chamber} science`, code);
      aliases.set(`${chamber} space`, code);
    }
    if (name === 'transportation and infrastructure') {
      aliases.set(`${chamber} transportation`, code);
      aliases.set(`${chamber} infrastructure`, code);
    }
    if (name === 'education and workforce') {
      aliases.set(`${chamber} education`, code);
      aliases.set(`${chamber} workforce`, code);
    }
  }

  return aliases;
}

// ── Agency Aliases ───────────────────────────────────────────────────

function buildAgencyAliases(): Map<string, string> {
  const aliases = new Map<string, string>();
  const seenSlugs = new Set<string>();

  for (const mapping of ALL_COMMITTEE_MAPPINGS) {
    for (const agency of mapping.agencies) {
      if (seenSlugs.has(agency.slug)) continue;
      seenSlugs.add(agency.slug);

      addAgencyAliases(aliases, agency);
    }
  }

  return aliases;
}

function addAgencyAliases(aliases: Map<string, string>, agency: AgencyInfo): void {
  const slug = agency.slug;

  // Full name: "department of energy"
  aliases.set(agency.name.toLowerCase(), slug);

  // Abbreviation: "doe", "epa"
  if (agency.abbreviation) {
    aliases.set(agency.abbreviation.toLowerCase(), slug);
  }

  // Without "Department of": "energy" → may be too ambiguous, skip
  // But "the" variants: "the department of energy"
  if (agency.name.toLowerCase().startsWith('department of')) {
    aliases.set(`the ${agency.name.toLowerCase()}`, slug);
    aliases.set(`u.s. ${agency.name.toLowerCase()}`, slug);
  }

  // Special known abbreviation variants
  const specialAliases: Record<string, string[]> = {
    'department-of-defense': ['dod', 'the pentagon', 'pentagon'],
    'department-of-veterans-affairs': ['the va', 'veterans administration'],
    'department-of-health-and-human-services': ['dhhs'],
    'environmental-protection-agency': ['the epa', 'us epa', 'u.s. epa'],
    'department-of-the-treasury': [
      'the treasury',
      'treasury department',
      'irs',
      'internal revenue service',
    ],
    'department-of-justice': ['the doj', 'doj'],
    'department-of-homeland-security': ['the dhs'],
    'department-of-the-interior': ['the doi', 'interior department'],
    'securities-and-exchange-commission': ['the sec'],
    'federal-communications-commission': ['the fcc'],
    'federal-trade-commission': ['the ftc'],
    'small-business-administration': ['the sba'],
    'office-of-management-and-budget': ['the omb'],
    'office-of-personnel-management': ['the opm'],
    'national-aeronautics-and-space-administration': ['nasa'],
    'national-science-foundation': ['the nsf'],
    'national-oceanic-and-atmospheric-administration': ['noaa'],
    'federal-reserve-system': ['the fed', 'federal reserve board', 'federal reserve'],
    'department-of-energy': ['the doe'],
    'department-of-state': ['state department', 'the state department'],
    'department-of-education': ['the ed', 'dept of education', 'dept. of education'],
    'department-of-labor': ['the dol', 'labor department'],
    'department-of-transportation': ['the dot', 'transportation department'],
    'department-of-agriculture': ['the usda'],
    'department-of-commerce': ['commerce department'],
    'department-of-housing-and-urban-development': ['the hud'],
    'agency-for-international-development': ['usaid'],
    'army-corps-of-engineers': ['usace', 'corps of engineers', 'army corps'],
    'general-services-administration': ['the gsa'],
  };

  const extra = specialAliases[slug];
  if (extra) {
    for (const alias of extra) {
      aliases.set(alias.toLowerCase(), slug);
    }
  }
}

// ── Exports ──────────────────────────────────────────────────────────

/** Map from normalized alias string → committee code */
export const COMMITTEE_ALIASES: Map<string, string> = buildCommitteeAliases();

/** Map from normalized alias string → agency slug */
export const AGENCY_ALIASES: Map<string, string> = buildAgencyAliases();

/** Get all committee alias names for Fuse.js search collection. */
export function getAllCommitteeAliasNames(): string[] {
  return Array.from(COMMITTEE_ALIASES.keys());
}

/**
 * Policy Area Mapping
 *
 * Maps Congress.gov policyArea strings to related data domains:
 * committee topics, industry sectors, agency slugs, and Federal Register keywords.
 *
 * This enables cross-domain joins: given a bill's policyArea, find related
 * spending agencies, campaign finance sectors, committee oversight areas,
 * and Federal Register documents.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { IndustrySector } from '@/lib/fec/industry-taxonomy';

export interface PolicyAreaMapping {
  policyArea: string;
  topics: string[];
  industrySectors: IndustrySector[];
  agencySlugs: string[];
  federalRegisterKeywords: string[];
}

/**
 * All known Congress.gov policyArea values mapped to related data domains.
 *
 * - topics: match CommitteeMapping.topics from committee-agency-map.ts
 * - industrySectors: match IndustrySector enum from industry-taxonomy.ts
 * - agencySlugs: match AgencyInfo.slug from committee-agency-map.ts
 * - federalRegisterKeywords: for filtering Federal Register documents
 */
const POLICY_AREA_MAPPINGS: PolicyAreaMapping[] = [
  {
    policyArea: 'Agriculture and Food',
    topics: ['agriculture', 'farming', 'food', 'nutrition', 'rural'],
    industrySectors: [IndustrySector.AGRIBUSINESS],
    agencySlugs: ['department-of-agriculture'],
    federalRegisterKeywords: ['agriculture', 'farm', 'food safety', 'usda', 'nutrition', 'crop'],
  },
  {
    policyArea: 'Animals',
    topics: ['wildlife', 'agriculture'],
    industrySectors: [IndustrySector.AGRIBUSINESS],
    agencySlugs: ['department-of-the-interior', 'department-of-agriculture'],
    federalRegisterKeywords: ['animal', 'wildlife', 'endangered species', 'fish and wildlife'],
  },
  {
    policyArea: 'Armed Forces and National Security',
    topics: ['defense', 'military', 'national security', 'veterans'],
    industrySectors: [IndustrySector.DEFENSE],
    agencySlugs: ['department-of-defense', 'department-of-veterans-affairs'],
    federalRegisterKeywords: ['defense', 'military', 'armed forces', 'pentagon', 'veterans'],
  },
  {
    policyArea: 'Arts, Culture, Religion',
    topics: ['education'],
    industrySectors: [IndustrySector.IDEOLOGY_SINGLE_ISSUE],
    agencySlugs: [],
    federalRegisterKeywords: ['arts', 'culture', 'humanities', 'museum'],
  },
  {
    policyArea: 'Civil Rights and Liberties, Minority Issues',
    topics: ['judiciary', 'civil rights'],
    industrySectors: [IndustrySector.LAWYERS_LOBBYISTS, IndustrySector.IDEOLOGY_SINGLE_ISSUE],
    agencySlugs: ['department-of-justice'],
    federalRegisterKeywords: [
      'civil rights',
      'discrimination',
      'equal opportunity',
      'voting rights',
    ],
  },
  {
    policyArea: 'Commerce',
    topics: ['commerce', 'small business', 'entrepreneurs'],
    industrySectors: [IndustrySector.MISC_BUSINESS],
    agencySlugs: ['department-of-commerce', 'small-business-administration'],
    federalRegisterKeywords: ['commerce', 'trade', 'business', 'consumer protection'],
  },
  {
    policyArea: 'Congress',
    topics: ['government operations'],
    industrySectors: [],
    agencySlugs: [],
    federalRegisterKeywords: ['congress', 'legislative'],
  },
  {
    policyArea: 'Crime and Law Enforcement',
    topics: ['judiciary', 'justice', 'crime'],
    industrySectors: [IndustrySector.LAWYERS_LOBBYISTS],
    agencySlugs: ['department-of-justice'],
    federalRegisterKeywords: ['crime', 'law enforcement', 'criminal', 'fbi', 'doj'],
  },
  {
    policyArea: 'Economics and Public Finance',
    topics: ['appropriations', 'budget', 'spending', 'fiscal', 'taxes'],
    industrySectors: [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE],
    agencySlugs: ['department-of-the-treasury', 'office-of-management-and-budget'],
    federalRegisterKeywords: ['budget', 'fiscal', 'treasury', 'debt', 'economic'],
  },
  {
    policyArea: 'Education',
    topics: ['education', 'schools'],
    industrySectors: [IndustrySector.IDEOLOGY_SINGLE_ISSUE],
    agencySlugs: ['department-of-education'],
    federalRegisterKeywords: ['education', 'school', 'student', 'higher education', 'title ix'],
  },
  {
    policyArea: 'Emergency Management',
    topics: ['homeland security', 'emergency'],
    industrySectors: [IndustrySector.DEFENSE],
    agencySlugs: ['department-of-homeland-security'],
    federalRegisterKeywords: ['emergency', 'fema', 'disaster', 'preparedness'],
  },
  {
    policyArea: 'Energy',
    topics: ['energy', 'natural resources'],
    industrySectors: [IndustrySector.ENERGY_NATURAL_RESOURCES],
    agencySlugs: ['department-of-energy'],
    federalRegisterKeywords: ['energy', 'nuclear', 'renewable', 'oil', 'gas', 'electricity'],
  },
  {
    policyArea: 'Environmental Protection',
    topics: ['environment', 'climate', 'clean air', 'clean water'],
    industrySectors: [IndustrySector.ENERGY_NATURAL_RESOURCES],
    agencySlugs: ['environmental-protection-agency'],
    federalRegisterKeywords: [
      'environmental',
      'epa',
      'pollution',
      'clean air',
      'clean water',
      'climate',
    ],
  },
  {
    policyArea: 'Families',
    topics: ['education', 'health'],
    industrySectors: [IndustrySector.HEALTH],
    agencySlugs: ['department-of-health-and-human-services'],
    federalRegisterKeywords: ['family', 'child', 'welfare', 'domestic violence'],
  },
  {
    policyArea: 'Finance and Financial Sector',
    topics: ['banking', 'finance', 'securities'],
    industrySectors: [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE],
    agencySlugs: [
      'department-of-the-treasury',
      'securities-and-exchange-commission',
      'federal-reserve-system',
    ],
    federalRegisterKeywords: ['financial', 'banking', 'securities', 'credit', 'dodd-frank'],
  },
  {
    policyArea: 'Foreign Trade and International Finance',
    topics: ['taxes', 'trade', 'tariffs'],
    industrySectors: [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE],
    agencySlugs: ['department-of-the-treasury', 'department-of-commerce'],
    federalRegisterKeywords: ['trade', 'tariff', 'import', 'export', 'customs'],
  },
  {
    policyArea: 'Government Operations and Politics',
    topics: ['government operations', 'oversight', 'federal workforce'],
    industrySectors: [IndustrySector.OTHER],
    agencySlugs: ['general-services-administration', 'office-of-personnel-management'],
    federalRegisterKeywords: ['government', 'federal employee', 'procurement', 'opm', 'gsa'],
  },
  {
    policyArea: 'Health',
    topics: ['health', 'public health'],
    industrySectors: [IndustrySector.HEALTH],
    agencySlugs: ['department-of-health-and-human-services'],
    federalRegisterKeywords: [
      'health',
      'medicare',
      'medicaid',
      'cdc',
      'fda',
      'nih',
      'public health',
    ],
  },
  {
    policyArea: 'Housing and Community Development',
    topics: ['housing', 'urban development'],
    industrySectors: [IndustrySector.CONSTRUCTION, IndustrySector.FINANCE_INSURANCE_REAL_ESTATE],
    agencySlugs: ['department-of-housing-and-urban-development'],
    federalRegisterKeywords: ['housing', 'hud', 'urban', 'community development', 'mortgage'],
  },
  {
    policyArea: 'Immigration',
    topics: ['immigration', 'homeland security', 'border'],
    industrySectors: [IndustrySector.LAWYERS_LOBBYISTS],
    agencySlugs: ['department-of-homeland-security', 'department-of-justice'],
    federalRegisterKeywords: ['immigration', 'visa', 'border', 'asylum', 'citizenship'],
  },
  {
    policyArea: 'International Affairs',
    topics: ['foreign policy', 'diplomacy', 'international', 'treaties'],
    industrySectors: [IndustrySector.DEFENSE],
    agencySlugs: ['department-of-state', 'agency-for-international-development'],
    federalRegisterKeywords: ['foreign', 'diplomatic', 'international', 'treaty', 'sanctions'],
  },
  {
    policyArea: 'Labor and Employment',
    topics: ['labor', 'workforce', 'employment'],
    industrySectors: [IndustrySector.LABOR],
    agencySlugs: ['department-of-labor'],
    federalRegisterKeywords: ['labor', 'employment', 'wage', 'osha', 'worker', 'union'],
  },
  {
    policyArea: 'Law',
    topics: ['judiciary', 'courts', 'justice'],
    industrySectors: [IndustrySector.LAWYERS_LOBBYISTS],
    agencySlugs: ['department-of-justice'],
    federalRegisterKeywords: ['judicial', 'court', 'legal', 'attorney general'],
  },
  {
    policyArea: 'Native Americans',
    topics: ['native americans', 'tribal'],
    industrySectors: [],
    agencySlugs: ['department-of-the-interior'],
    federalRegisterKeywords: [
      'tribal',
      'native american',
      'indian affairs',
      'bureau of indian affairs',
    ],
  },
  {
    policyArea: 'Public Lands and Natural Resources',
    topics: ['public lands', 'wildlife', 'water', 'energy'],
    industrySectors: [IndustrySector.ENERGY_NATURAL_RESOURCES],
    agencySlugs: ['department-of-the-interior'],
    federalRegisterKeywords: [
      'public lands',
      'national park',
      'blm',
      'forest',
      'minerals',
      'wildlife',
    ],
  },
  {
    policyArea: 'Science, Technology, Communications',
    topics: ['science', 'technology', 'telecommunications', 'research'],
    industrySectors: [IndustrySector.COMMUNICATIONS_ELECTRONICS],
    agencySlugs: [
      'national-aeronautics-and-space-administration',
      'national-science-foundation',
      'federal-communications-commission',
    ],
    federalRegisterKeywords: ['science', 'technology', 'fcc', 'broadband', 'spectrum', 'research'],
  },
  {
    policyArea: 'Social Sciences and History',
    topics: ['education'],
    industrySectors: [IndustrySector.IDEOLOGY_SINGLE_ISSUE],
    agencySlugs: [],
    federalRegisterKeywords: ['social science', 'history', 'smithsonian'],
  },
  {
    policyArea: 'Social Welfare',
    topics: ['health', 'education', 'labor'],
    industrySectors: [IndustrySector.HEALTH, IndustrySector.IDEOLOGY_SINGLE_ISSUE],
    agencySlugs: ['department-of-health-and-human-services'],
    federalRegisterKeywords: ['social security', 'welfare', 'snap', 'medicaid', 'poverty'],
  },
  {
    policyArea: 'Sports and Recreation',
    topics: [],
    industrySectors: [IndustrySector.MISC_BUSINESS],
    agencySlugs: ['department-of-the-interior'],
    federalRegisterKeywords: ['sports', 'recreation', 'national park'],
  },
  {
    policyArea: 'Taxation',
    topics: ['taxes', 'trade', 'fiscal'],
    industrySectors: [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE],
    agencySlugs: ['department-of-the-treasury'],
    federalRegisterKeywords: ['tax', 'irs', 'revenue', 'deduction', 'credit'],
  },
  {
    policyArea: 'Transportation and Public Works',
    topics: ['transportation', 'infrastructure', 'highways', 'aviation'],
    industrySectors: [IndustrySector.TRANSPORTATION, IndustrySector.CONSTRUCTION],
    agencySlugs: ['department-of-transportation', 'army-corps-of-engineers'],
    federalRegisterKeywords: ['transportation', 'highway', 'aviation', 'rail', 'faa', 'dot'],
  },
  {
    policyArea: 'Water Resources Development',
    topics: ['water', 'infrastructure', 'environment'],
    industrySectors: [IndustrySector.CONSTRUCTION],
    agencySlugs: ['army-corps-of-engineers', 'environmental-protection-agency'],
    federalRegisterKeywords: ['water', 'flood', 'dam', 'waterway', 'corps of engineers'],
  },
];

/** Lookup index keyed by normalized policyArea name */
const policyAreaIndex = new Map<string, PolicyAreaMapping>(
  POLICY_AREA_MAPPINGS.map(m => [m.policyArea.toLowerCase(), m])
);

/**
 * Get the full mapping for a given policyArea string.
 * Case-insensitive match against Congress.gov policyArea values.
 */
export function getPolicyAreaMapping(policyArea: string): PolicyAreaMapping | null {
  return policyAreaIndex.get(policyArea.toLowerCase()) ?? null;
}

/**
 * Get agency slugs (USAspending format) related to a policyArea.
 */
export function getAgencySlugsForPolicyArea(policyArea: string): string[] {
  return getPolicyAreaMapping(policyArea)?.agencySlugs ?? [];
}

/**
 * Get committee topics related to a policyArea.
 */
export function getTopicsForPolicyArea(policyArea: string): string[] {
  return getPolicyAreaMapping(policyArea)?.topics ?? [];
}

/**
 * Get industry sectors (FEC classification) related to a policyArea.
 */
export function getIndustrySectorsForPolicyArea(policyArea: string): IndustrySector[] {
  return getPolicyAreaMapping(policyArea)?.industrySectors ?? [];
}

/**
 * Get all policyAreas whose industrySectors include the given sector.
 * Reverse lookup: from sector → policyAreas that map to it.
 */
export function getPolicyAreasForSector(sector: IndustrySector): string[] {
  return POLICY_AREA_MAPPINGS.filter(m => m.industrySectors.includes(sector)).map(
    m => m.policyArea
  );
}

/**
 * Get all known policyArea strings.
 */
export function getAllPolicyAreas(): string[] {
  return POLICY_AREA_MAPPINGS.map(m => m.policyArea);
}

/**
 * Map committee topics to IndustrySector values using policy-area-map.
 * A committee topic matches a policy area if the topic appears in that
 * policy area's topic list. The policy area's industrySectors are then
 * attributed to the committee.
 */
export function getJurisdictionSectorsForTopics(committeeTopics: string[]): IndustrySector[] {
  const sectors = new Set<IndustrySector>();

  for (const mapping of POLICY_AREA_MAPPINGS) {
    const hasOverlap = committeeTopics.some(topic =>
      mapping.topics.some(t => t.toLowerCase() === topic.toLowerCase())
    );

    if (hasOverlap) {
      for (const sector of mapping.industrySectors) {
        sectors.add(sector);
      }
    }
  }

  return Array.from(sectors);
}

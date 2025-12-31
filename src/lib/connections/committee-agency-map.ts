/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Committee to Agency Mapping
 *
 * Maps congressional committees to the federal agencies they oversee.
 * This enables hypertext connections between representatives (via their
 * committee assignments) and relevant federal spending, regulations,
 * and executive actions.
 *
 * The civic insight: A citizen looking at their representative should
 * understand what agencies that rep has oversight of, and therefore
 * what spending/regulations are relevant to them.
 */

export interface AgencyInfo {
  name: string;
  slug: string; // USAspending agency slug
  abbreviation: string;
  keywords: string[]; // For matching Federal Register documents
}

export interface CommitteeMapping {
  committeeCode: string;
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  agencies: AgencyInfo[];
  topics: string[]; // For matching hearings and comment periods
}

/**
 * House committee mappings
 */
export const HOUSE_COMMITTEE_MAPPINGS: CommitteeMapping[] = [
  {
    committeeCode: 'HSAS',
    committeeName: 'Armed Services',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Defense',
        slug: 'department-of-defense',
        abbreviation: 'DOD',
        keywords: ['defense', 'military', 'armed forces', 'pentagon'],
      },
      {
        name: 'Department of Veterans Affairs',
        slug: 'department-of-veterans-affairs',
        abbreviation: 'VA',
        keywords: ['veterans', 'va '],
      },
    ],
    topics: ['defense', 'military', 'national security', 'veterans'],
  },
  {
    committeeCode: 'HSJU',
    committeeName: 'Judiciary',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Justice',
        slug: 'department-of-justice',
        abbreviation: 'DOJ',
        keywords: ['justice', 'attorney general', 'fbi', 'doj'],
      },
      {
        name: 'Federal Trade Commission',
        slug: 'federal-trade-commission',
        abbreviation: 'FTC',
        keywords: ['ftc', 'antitrust', 'consumer protection'],
      },
    ],
    topics: ['judiciary', 'justice', 'immigration', 'antitrust', 'civil rights'],
  },
  {
    committeeCode: 'HSIF',
    committeeName: 'Energy and Commerce',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Energy',
        slug: 'department-of-energy',
        abbreviation: 'DOE',
        keywords: ['energy', 'doe'],
      },
      {
        name: 'Environmental Protection Agency',
        slug: 'environmental-protection-agency',
        abbreviation: 'EPA',
        keywords: ['epa', 'environmental', 'pollution', 'clean air', 'clean water'],
      },
      {
        name: 'Department of Health and Human Services',
        slug: 'department-of-health-and-human-services',
        abbreviation: 'HHS',
        keywords: ['health', 'hhs', 'medicare', 'medicaid', 'cdc', 'fda'],
      },
      {
        name: 'Federal Communications Commission',
        slug: 'federal-communications-commission',
        abbreviation: 'FCC',
        keywords: ['fcc', 'communications', 'broadband', 'telecom'],
      },
    ],
    topics: ['energy', 'health', 'environment', 'telecommunications', 'commerce'],
  },
  {
    committeeCode: 'HSAP',
    committeeName: 'Appropriations',
    chamber: 'House',
    agencies: [
      {
        name: 'Office of Management and Budget',
        slug: 'office-of-management-and-budget',
        abbreviation: 'OMB',
        keywords: ['omb', 'budget', 'appropriations'],
      },
    ],
    topics: ['appropriations', 'budget', 'spending', 'fiscal'],
  },
  {
    committeeCode: 'HSBA',
    committeeName: 'Financial Services',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of the Treasury',
        slug: 'department-of-the-treasury',
        abbreviation: 'Treasury',
        keywords: ['treasury', 'irs', 'financial'],
      },
      {
        name: 'Securities and Exchange Commission',
        slug: 'securities-and-exchange-commission',
        abbreviation: 'SEC',
        keywords: ['sec', 'securities', 'stocks', 'exchange'],
      },
      {
        name: 'Federal Reserve',
        slug: 'federal-reserve-system',
        abbreviation: 'Fed',
        keywords: ['federal reserve', 'fed', 'monetary'],
      },
    ],
    topics: ['banking', 'finance', 'housing', 'insurance', 'securities'],
  },
  {
    committeeCode: 'HSAG',
    committeeName: 'Agriculture',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Agriculture',
        slug: 'department-of-agriculture',
        abbreviation: 'USDA',
        keywords: ['agriculture', 'usda', 'farm', 'food'],
      },
    ],
    topics: ['agriculture', 'farming', 'food', 'rural', 'nutrition'],
  },
  {
    committeeCode: 'HSPW',
    committeeName: 'Transportation and Infrastructure',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Transportation',
        slug: 'department-of-transportation',
        abbreviation: 'DOT',
        keywords: ['transportation', 'dot', 'highway', 'aviation', 'rail'],
      },
      {
        name: 'Army Corps of Engineers',
        slug: 'army-corps-of-engineers',
        abbreviation: 'USACE',
        keywords: ['corps of engineers', 'waterways', 'flood'],
      },
    ],
    topics: ['transportation', 'infrastructure', 'highways', 'aviation', 'water'],
  },
  {
    committeeCode: 'HSWM',
    committeeName: 'Ways and Means',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of the Treasury',
        slug: 'department-of-the-treasury',
        abbreviation: 'Treasury',
        keywords: ['treasury', 'irs', 'tax'],
      },
      {
        name: 'Social Security Administration',
        slug: 'social-security-administration',
        abbreviation: 'SSA',
        keywords: ['social security', 'ssa', 'retirement'],
      },
    ],
    topics: ['taxes', 'trade', 'social security', 'medicare', 'tariffs'],
  },
  {
    committeeCode: 'HSED',
    committeeName: 'Education and Workforce',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Education',
        slug: 'department-of-education',
        abbreviation: 'ED',
        keywords: ['education', 'schools', 'students'],
      },
      {
        name: 'Department of Labor',
        slug: 'department-of-labor',
        abbreviation: 'DOL',
        keywords: ['labor', 'workers', 'employment', 'osha'],
      },
    ],
    topics: ['education', 'labor', 'workforce', 'schools', 'employment'],
  },
  {
    committeeCode: 'HSFA',
    committeeName: 'Foreign Affairs',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of State',
        slug: 'department-of-state',
        abbreviation: 'State',
        keywords: ['state department', 'foreign', 'diplomatic', 'embassy'],
      },
      {
        name: 'USAID',
        slug: 'agency-for-international-development',
        abbreviation: 'USAID',
        keywords: ['usaid', 'foreign aid', 'development'],
      },
    ],
    topics: ['foreign policy', 'diplomacy', 'international', 'treaties'],
  },
  {
    committeeCode: 'HSHM',
    committeeName: 'Homeland Security',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Homeland Security',
        slug: 'department-of-homeland-security',
        abbreviation: 'DHS',
        keywords: ['homeland', 'dhs', 'border', 'tsa', 'fema', 'ice', 'customs'],
      },
    ],
    topics: ['homeland security', 'border', 'terrorism', 'cybersecurity', 'emergency'],
  },
  {
    committeeCode: 'HSII',
    committeeName: 'Natural Resources',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of the Interior',
        slug: 'department-of-the-interior',
        abbreviation: 'DOI',
        keywords: ['interior', 'parks', 'lands', 'wildlife', 'blm'],
      },
    ],
    topics: ['public lands', 'native americans', 'water', 'wildlife', 'energy'],
  },
  {
    committeeCode: 'HSGO',
    committeeName: 'Oversight and Government Reform',
    chamber: 'House',
    agencies: [
      {
        name: 'General Services Administration',
        slug: 'general-services-administration',
        abbreviation: 'GSA',
        keywords: ['gsa', 'government', 'federal buildings'],
      },
      {
        name: 'Office of Personnel Management',
        slug: 'office-of-personnel-management',
        abbreviation: 'OPM',
        keywords: ['opm', 'federal employees', 'personnel'],
      },
    ],
    topics: ['government operations', 'oversight', 'federal workforce', 'dc'],
  },
  {
    committeeCode: 'HSSM',
    committeeName: 'Small Business',
    chamber: 'House',
    agencies: [
      {
        name: 'Small Business Administration',
        slug: 'small-business-administration',
        abbreviation: 'SBA',
        keywords: ['sba', 'small business', 'entrepreneurs'],
      },
    ],
    topics: ['small business', 'entrepreneurs', 'contracting'],
  },
  {
    committeeCode: 'HSVR',
    committeeName: 'Veterans Affairs',
    chamber: 'House',
    agencies: [
      {
        name: 'Department of Veterans Affairs',
        slug: 'department-of-veterans-affairs',
        abbreviation: 'VA',
        keywords: ['veterans', 'va ', 'military'],
      },
    ],
    topics: ['veterans', 'va healthcare', 'benefits', 'military families'],
  },
  {
    committeeCode: 'HSSY',
    committeeName: 'Science, Space, and Technology',
    chamber: 'House',
    agencies: [
      {
        name: 'NASA',
        slug: 'national-aeronautics-and-space-administration',
        abbreviation: 'NASA',
        keywords: ['nasa', 'space', 'aerospace'],
      },
      {
        name: 'National Science Foundation',
        slug: 'national-science-foundation',
        abbreviation: 'NSF',
        keywords: ['nsf', 'science', 'research'],
      },
      {
        name: 'NOAA',
        slug: 'national-oceanic-and-atmospheric-administration',
        abbreviation: 'NOAA',
        keywords: ['noaa', 'weather', 'ocean', 'climate'],
      },
    ],
    topics: ['science', 'space', 'technology', 'research', 'innovation'],
  },
];

/**
 * Senate committee mappings
 */
export const SENATE_COMMITTEE_MAPPINGS: CommitteeMapping[] = [
  {
    committeeCode: 'SSAS',
    committeeName: 'Armed Services',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Defense',
        slug: 'department-of-defense',
        abbreviation: 'DOD',
        keywords: ['defense', 'military', 'armed forces', 'pentagon'],
      },
    ],
    topics: ['defense', 'military', 'national security'],
  },
  {
    committeeCode: 'SSJU',
    committeeName: 'Judiciary',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Justice',
        slug: 'department-of-justice',
        abbreviation: 'DOJ',
        keywords: ['justice', 'attorney general', 'fbi', 'doj'],
      },
    ],
    topics: ['judiciary', 'courts', 'nominations', 'immigration', 'crime'],
  },
  {
    committeeCode: 'SSFI',
    committeeName: 'Finance',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of the Treasury',
        slug: 'department-of-the-treasury',
        abbreviation: 'Treasury',
        keywords: ['treasury', 'irs', 'tax'],
      },
      {
        name: 'Centers for Medicare & Medicaid Services',
        slug: 'department-of-health-and-human-services',
        abbreviation: 'CMS',
        keywords: ['medicare', 'medicaid', 'cms'],
      },
    ],
    topics: ['taxes', 'trade', 'medicare', 'medicaid', 'social security'],
  },
  {
    committeeCode: 'SSAP',
    committeeName: 'Appropriations',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Office of Management and Budget',
        slug: 'office-of-management-and-budget',
        abbreviation: 'OMB',
        keywords: ['omb', 'budget', 'appropriations'],
      },
    ],
    topics: ['appropriations', 'budget', 'spending'],
  },
  {
    committeeCode: 'SSCM',
    committeeName: 'Commerce, Science, and Transportation',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Commerce',
        slug: 'department-of-commerce',
        abbreviation: 'Commerce',
        keywords: ['commerce', 'trade', 'census'],
      },
      {
        name: 'Federal Communications Commission',
        slug: 'federal-communications-commission',
        abbreviation: 'FCC',
        keywords: ['fcc', 'communications', 'broadband'],
      },
      {
        name: 'NASA',
        slug: 'national-aeronautics-and-space-administration',
        abbreviation: 'NASA',
        keywords: ['nasa', 'space'],
      },
    ],
    topics: ['commerce', 'transportation', 'science', 'telecommunications'],
  },
  {
    committeeCode: 'SSFR',
    committeeName: 'Foreign Relations',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of State',
        slug: 'department-of-state',
        abbreviation: 'State',
        keywords: ['state department', 'foreign', 'diplomatic'],
      },
    ],
    topics: ['foreign policy', 'treaties', 'diplomacy', 'international'],
  },
  {
    committeeCode: 'SSHR',
    committeeName: 'Health, Education, Labor, and Pensions',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Health and Human Services',
        slug: 'department-of-health-and-human-services',
        abbreviation: 'HHS',
        keywords: ['health', 'hhs', 'cdc', 'fda', 'nih'],
      },
      {
        name: 'Department of Education',
        slug: 'department-of-education',
        abbreviation: 'ED',
        keywords: ['education', 'schools'],
      },
      {
        name: 'Department of Labor',
        slug: 'department-of-labor',
        abbreviation: 'DOL',
        keywords: ['labor', 'workers', 'osha'],
      },
    ],
    topics: ['health', 'education', 'labor', 'pensions', 'public health'],
  },
  {
    committeeCode: 'SSEG',
    committeeName: 'Energy and Natural Resources',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Energy',
        slug: 'department-of-energy',
        abbreviation: 'DOE',
        keywords: ['energy', 'doe', 'nuclear'],
      },
      {
        name: 'Department of the Interior',
        slug: 'department-of-the-interior',
        abbreviation: 'DOI',
        keywords: ['interior', 'lands', 'parks'],
      },
    ],
    topics: ['energy', 'natural resources', 'public lands', 'water'],
  },
  {
    committeeCode: 'SSEV',
    committeeName: 'Environment and Public Works',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Environmental Protection Agency',
        slug: 'environmental-protection-agency',
        abbreviation: 'EPA',
        keywords: ['epa', 'environmental', 'pollution'],
      },
      {
        name: 'Army Corps of Engineers',
        slug: 'army-corps-of-engineers',
        abbreviation: 'USACE',
        keywords: ['corps of engineers', 'infrastructure'],
      },
    ],
    topics: ['environment', 'infrastructure', 'climate', 'clean air', 'clean water'],
  },
  {
    committeeCode: 'SSGA',
    committeeName: 'Homeland Security and Governmental Affairs',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Homeland Security',
        slug: 'department-of-homeland-security',
        abbreviation: 'DHS',
        keywords: ['homeland', 'dhs', 'border', 'fema'],
      },
      {
        name: 'Office of Personnel Management',
        slug: 'office-of-personnel-management',
        abbreviation: 'OPM',
        keywords: ['opm', 'federal employees'],
      },
    ],
    topics: ['homeland security', 'government operations', 'oversight'],
  },
  {
    committeeCode: 'SSBK',
    committeeName: 'Banking, Housing, and Urban Affairs',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of the Treasury',
        slug: 'department-of-the-treasury',
        abbreviation: 'Treasury',
        keywords: ['treasury', 'financial'],
      },
      {
        name: 'Department of Housing and Urban Development',
        slug: 'department-of-housing-and-urban-development',
        abbreviation: 'HUD',
        keywords: ['hud', 'housing', 'urban'],
      },
      {
        name: 'Securities and Exchange Commission',
        slug: 'securities-and-exchange-commission',
        abbreviation: 'SEC',
        keywords: ['sec', 'securities'],
      },
    ],
    topics: ['banking', 'housing', 'finance', 'urban development'],
  },
  {
    committeeCode: 'SSVA',
    committeeName: 'Veterans Affairs',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Veterans Affairs',
        slug: 'department-of-veterans-affairs',
        abbreviation: 'VA',
        keywords: ['veterans', 'va '],
      },
    ],
    topics: ['veterans', 'va healthcare', 'benefits'],
  },
  {
    committeeCode: 'SSAF',
    committeeName: 'Agriculture, Nutrition, and Forestry',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Department of Agriculture',
        slug: 'department-of-agriculture',
        abbreviation: 'USDA',
        keywords: ['agriculture', 'usda', 'farm', 'food'],
      },
    ],
    topics: ['agriculture', 'nutrition', 'forestry', 'farming'],
  },
  {
    committeeCode: 'SSSB',
    committeeName: 'Small Business and Entrepreneurship',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Small Business Administration',
        slug: 'small-business-administration',
        abbreviation: 'SBA',
        keywords: ['sba', 'small business'],
      },
    ],
    topics: ['small business', 'entrepreneurs', 'contracting'],
  },
  {
    committeeCode: 'SSIA',
    committeeName: 'Indian Affairs',
    chamber: 'Senate',
    agencies: [
      {
        name: 'Bureau of Indian Affairs',
        slug: 'department-of-the-interior',
        abbreviation: 'BIA',
        keywords: ['indian affairs', 'tribal', 'native american'],
      },
    ],
    topics: ['native americans', 'tribal', 'indian affairs'],
  },
];

/**
 * All committee mappings combined
 */
export const ALL_COMMITTEE_MAPPINGS: CommitteeMapping[] = [
  ...HOUSE_COMMITTEE_MAPPINGS,
  ...SENATE_COMMITTEE_MAPPINGS,
];

/**
 * Get agencies for a committee by name (fuzzy match)
 */
export function getAgenciesForCommittee(committeeName: string): AgencyInfo[] {
  const normalizedName = committeeName.toLowerCase();

  for (const mapping of ALL_COMMITTEE_MAPPINGS) {
    if (
      normalizedName.includes(mapping.committeeName.toLowerCase()) ||
      mapping.committeeName.toLowerCase().includes(normalizedName)
    ) {
      return mapping.agencies;
    }
  }

  return [];
}

/**
 * Get topics for a committee by name (fuzzy match)
 */
export function getTopicsForCommittee(committeeName: string): string[] {
  const normalizedName = committeeName.toLowerCase();

  for (const mapping of ALL_COMMITTEE_MAPPINGS) {
    if (
      normalizedName.includes(mapping.committeeName.toLowerCase()) ||
      mapping.committeeName.toLowerCase().includes(normalizedName)
    ) {
      return mapping.topics;
    }
  }

  return [];
}

/**
 * Get all agencies for multiple committees
 */
export function getAgenciesForCommittees(committeeNames: string[]): AgencyInfo[] {
  const agencyMap = new Map<string, AgencyInfo>();

  for (const name of committeeNames) {
    const agencies = getAgenciesForCommittee(name);
    for (const agency of agencies) {
      agencyMap.set(agency.slug, agency);
    }
  }

  return Array.from(agencyMap.values());
}

/**
 * Get all topics for multiple committees
 */
export function getTopicsForCommittees(committeeNames: string[]): string[] {
  const topicSet = new Set<string>();

  for (const name of committeeNames) {
    const topics = getTopicsForCommittee(name);
    for (const topic of topics) {
      topicSet.add(topic);
    }
  }

  return Array.from(topicSet);
}

/**
 * Major cities by state for local government connections
 */
export const STATE_MAJOR_CITIES: Record<string, string[]> = {
  IL: ['chicago'],
  WA: ['seattle'],
  MA: ['boston'],
  CO: ['denver'],
  TX: ['austin'],
  OR: ['portland'],
  CA: ['oakland'],
  MN: ['minneapolis'],
  PA: ['philadelphia'],
  MI: ['detroit'],
};

/**
 * Get Legistar-supported cities for a state
 */
export function getCitiesForState(stateCode: string): string[] {
  return STATE_MAJOR_CITIES[stateCode.toUpperCase()] || [];
}

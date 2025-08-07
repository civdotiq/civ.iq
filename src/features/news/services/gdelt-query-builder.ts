/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

/**
 * Advanced GDELT Query Builder for representative-specific news
 * Builds sophisticated queries using representative metadata
 */

// Policy area to GDELT V2 theme mapping
export const POLICY_TO_V2THEMES: Record<string, string[]> = {
  // Economic themes
  Economy: [
    'ECON_STOCKMARKET',
    'ECON_INFLATION',
    'ECON_TAXATION',
    'ECON_TRADE',
    'ECON_UNEMPLOYMENT',
  ],
  Budget: ['ECON_FISCAL', 'GOV_BUDGET', 'ECON_DEBT', 'TAX_BUDGET'],
  Finance: ['ECON_BANKING', 'ECON_FINANCE', 'ECON_MONETARY', 'FINANCIAL_CRISIS'],
  Trade: ['ECON_TRADE', 'TRADE_AGREEMENT', 'TARIFF', 'ECON_EXPORT', 'ECON_IMPORT'],

  // Healthcare themes
  Healthcare: [
    'HEALTH_PANDEMIC',
    'SOC_HEALTHCARE',
    'HEALTH_MEDICAL',
    'HEALTH_PUBLIC',
    'MEDICAL_RESEARCH',
  ],
  'Public Health': ['HEALTH_PUBLIC', 'HEALTH_DISEASE', 'HEALTH_VACCINE', 'HEALTH_EPIDEMIC'],
  Medicare: ['MEDICARE', 'MEDICAID', 'HEALTH_INSURANCE', 'HEALTH_ELDERLY'],

  // Environmental themes
  Environment: ['ENV_CLIMATECHANGE', 'ENV_CARBONCAPTURE', 'ENV_POLLUTION', 'ENV_CONSERVATION'],
  'Climate Change': ['ENV_CLIMATECHANGE', 'ENV_GLOBALWARMING', 'ENV_CARBON', 'ENV_EMISSIONS'],
  Energy: ['ENERGY_RENEWABLE', 'ENERGY_NUCLEAR', 'ENERGY_OIL', 'ENERGY_GAS', 'ENERGY_SOLAR'],

  // Defense and security
  Defense: ['MIL_DEFENSE', 'MIL_MILITARY', 'MIL_VETERANS', 'NATIONAL_SECURITY'],
  'National Security': ['NATIONAL_SECURITY', 'TERRORISM', 'CYBERSECURITY', 'INTELLIGENCE'],
  Veterans: ['MIL_VETERANS', 'VETERANS_AFFAIRS', 'VETERANS_BENEFITS'],

  // Social issues
  Education: ['EDU_EDUCATION', 'EDU_HIGHERED', 'EDU_K12', 'EDU_STUDENTS', 'EDU_TEACHERS'],
  Immigration: ['IMMIGRATION', 'BORDER_SECURITY', 'REFUGEES', 'ASYLUM', 'DEPORTATION'],
  'Civil Rights': ['CIVIL_RIGHTS', 'DISCRIMINATION', 'EQUALITY', 'VOTING_RIGHTS'],
  Crime: ['CRIME', 'LAW_ENFORCEMENT', 'CRIMINAL_JUSTICE', 'POLICE_REFORM'],

  // Infrastructure and transportation
  Infrastructure: ['INFRASTRUCTURE', 'TRANSPORTATION', 'BRIDGES', 'ROADS', 'PUBLIC_WORKS'],
  Transportation: ['TRANSPORT_AIR', 'TRANSPORT_RAIL', 'TRANSPORT_ROAD', 'TRANSPORT_MARITIME'],

  // Technology
  Technology: ['TECH_INTERNET', 'TECH_AI', 'TECH_CYBERSECURITY', 'TECH_PRIVACY', 'TECH_INNOVATION'],
  Science: ['SCI_RESEARCH', 'SCI_SPACE', 'SCI_MEDICINE', 'SCI_TECHNOLOGY'],

  // Agriculture
  Agriculture: ['AGRI_FARMING', 'AGRI_FOOD', 'AGRI_CROPS', 'RURAL_DEVELOPMENT'],

  // Foreign policy
  'Foreign Relations': ['FOREIGN_POLICY', 'DIPLOMACY', 'INTERNATIONAL_RELATIONS', 'FOREIGN_AID'],
  'International Affairs': ['INTERNATIONAL', 'UNITED_NATIONS', 'NATO', 'FOREIGN_AFFAIRS'],
};

// Committee focus area to theme mapping
export const COMMITTEE_TO_THEMES: Record<string, string[]> = {
  appropriations: ['GOV_BUDGET', 'ECON_FISCAL', 'GOV_SPENDING'],
  'armed services': ['MIL_DEFENSE', 'MIL_MILITARY', 'NATIONAL_SECURITY'],
  banking: ['ECON_BANKING', 'ECON_FINANCE', 'FINANCIAL_REGULATION'],
  budget: ['GOV_BUDGET', 'ECON_FISCAL', 'TAX_BUDGET'],
  commerce: ['ECON_TRADE', 'BUSINESS', 'CONSUMER_PROTECTION'],
  education: ['EDU_EDUCATION', 'EDU_HIGHERED', 'EDU_K12'],
  energy: ['ENERGY', 'ENV_ENERGY', 'ENERGY_RENEWABLE'],
  environment: ['ENV_CLIMATECHANGE', 'ENV_POLLUTION', 'ENV_CONSERVATION'],
  finance: ['ECON_TAXATION', 'ECON_FINANCE', 'TAX_POLICY'],
  foreign: ['FOREIGN_POLICY', 'DIPLOMACY', 'INTERNATIONAL_RELATIONS'],
  health: ['HEALTH_PUBLIC', 'SOC_HEALTHCARE', 'HEALTH_MEDICAL'],
  homeland: ['NATIONAL_SECURITY', 'BORDER_SECURITY', 'TERRORISM'],
  intelligence: ['INTELLIGENCE', 'NATIONAL_SECURITY', 'CYBERSECURITY'],
  judiciary: ['JUSTICE', 'LAW', 'CIVIL_RIGHTS'],
  science: ['SCI_RESEARCH', 'TECH_INNOVATION', 'SCI_TECHNOLOGY'],
  transportation: ['INFRASTRUCTURE', 'TRANSPORTATION', 'PUBLIC_WORKS'],
  veterans: ['MIL_VETERANS', 'VETERANS_AFFAIRS', 'VETERANS_BENEFITS'],
  'ways and means': ['ECON_TAXATION', 'TRADE', 'SOC_SECURITY'],
};

interface QueryBuilderOptions {
  includeHistorical?: boolean;
  includeOpEds?: boolean;
  timespan?: string;
  focusLocal?: boolean;
  includeSpanish?: boolean;
}

export class GDELTQueryBuilder {
  private queries: string[] = [];
  private themes: Set<string> = new Set();
  private representative: EnhancedRepresentative;
  private options: QueryBuilderOptions;

  constructor(representative: EnhancedRepresentative, options: QueryBuilderOptions = {}) {
    this.representative = representative;
    this.options = {
      includeHistorical: false,
      includeOpEds: false,
      timespan: '24h',
      focusLocal: false,
      includeSpanish: false,
      ...options,
    };
  }

  /**
   * Add name-based queries with title variations and aliases
   */
  addNameQuery(fullName?: string, officialTitle?: string, aliases?: string[]): this {
    const rep = this.representative;
    const name = fullName || rep.fullName?.official || rep.name;

    // Extract name components
    const lastName = rep.fullName?.last || rep.lastName;
    const nickname = rep.fullName?.nickname;

    // Build name variations
    const nameVariations: string[] = [];

    // Full official name
    if (name) {
      nameVariations.push(`"${name}"`);
    }

    // Title + Last Name (most common in news)
    if (officialTitle && lastName) {
      nameVariations.push(`"${officialTitle} ${lastName}"`);
    } else if (lastName) {
      const title = rep.chamber === 'Senate' ? 'Senator' : 'Representative';
      nameVariations.push(`"${title} ${lastName}"`);
      nameVariations.push(`"${title === 'Senator' ? 'Sen.' : 'Rep.'} ${lastName}"`);
    }

    // Nickname variations
    if (nickname && lastName) {
      nameVariations.push(`"${nickname} ${lastName}"`);
    }

    // Include any provided aliases
    if (aliases) {
      aliases.forEach(alias => nameVariations.push(`"${alias}"`));
    }

    // Create OR query with all variations
    if (nameVariations.length > 0) {
      this.queries.push(`(${nameVariations.join(' OR ')})`);
    }

    logger.debug('Added name queries', {
      bioguideId: rep.bioguideId,
      nameVariations,
      operation: 'gdelt_query_builder_name',
    });

    return this;
  }

  /**
   * Add geographic scope filters
   */
  addGeographicScope(state?: string, district?: string): this {
    const stateToUse = state || this.representative.state;
    const districtToUse = district || this.representative.district;

    const geoTerms: string[] = [];

    // State-level filtering
    if (stateToUse) {
      geoTerms.push(`state:${stateToUse}`);

      // Add full state name for better matching
      const stateNames: Record<string, string> = {
        AL: 'Alabama',
        AK: 'Alaska',
        AZ: 'Arizona',
        AR: 'Arkansas',
        CA: 'California',
        CO: 'Colorado',
        CT: 'Connecticut',
        DE: 'Delaware',
        FL: 'Florida',
        GA: 'Georgia',
        HI: 'Hawaii',
        ID: 'Idaho',
        IL: 'Illinois',
        IN: 'Indiana',
        IA: 'Iowa',
        KS: 'Kansas',
        KY: 'Kentucky',
        LA: 'Louisiana',
        ME: 'Maine',
        MD: 'Maryland',
        MA: 'Massachusetts',
        MI: 'Michigan',
        MN: 'Minnesota',
        MS: 'Mississippi',
        MO: 'Missouri',
        MT: 'Montana',
        NE: 'Nebraska',
        NV: 'Nevada',
        NH: 'New Hampshire',
        NJ: 'New Jersey',
        NM: 'New Mexico',
        NY: 'New York',
        NC: 'North Carolina',
        ND: 'North Dakota',
        OH: 'Ohio',
        OK: 'Oklahoma',
        OR: 'Oregon',
        PA: 'Pennsylvania',
        RI: 'Rhode Island',
        SC: 'South Carolina',
        SD: 'South Dakota',
        TN: 'Tennessee',
        TX: 'Texas',
        UT: 'Utah',
        VT: 'Vermont',
        VA: 'Virginia',
        WA: 'Washington',
        WV: 'West Virginia',
        WI: 'Wisconsin',
        WY: 'Wyoming',
        DC: 'Washington DC',
      };

      const stateName = stateNames[stateToUse];
      if (stateName) {
        geoTerms.push(`"${stateName}"`);
      }
    }

    // District-level filtering for House members
    if (districtToUse && this.representative.chamber === 'House') {
      const districtNum = districtToUse.replace(/^0+/, ''); // Remove leading zeros
      geoTerms.push(
        `("${districtNum} district" OR "district ${districtNum}" OR "${districtNum}th district" OR "${districtNum}st district" OR "${districtNum}nd district" OR "${districtNum}rd district")`
      );
    }

    // Add location context
    geoTerms.push('country:US');

    if (geoTerms.length > 0) {
      this.queries.push(`(${geoTerms.join(' AND ')})`);
    }

    return this;
  }

  /**
   * Add organizational context (chamber-specific terms)
   */
  addOrganizationalContext(chamber?: 'House' | 'Senate'): this {
    const chamberToUse = chamber || this.representative.chamber;

    const orgTerms: string[] = [];

    if (chamberToUse === 'Senate') {
      orgTerms.push('(Senate OR Senator OR "U.S. Senate" OR "United States Senate")');
    } else {
      orgTerms.push(
        '(House OR Representative OR Congress OR "U.S. House" OR "House of Representatives")'
      );
    }

    // Add general Congressional terms
    orgTerms.push('(Congress OR Congressional OR Capitol OR "Capitol Hill")');

    this.queries.push(`(${orgTerms.join(' OR ')})`);

    return this;
  }

  /**
   * Add committee-based filtering
   */
  addCommitteeFilters(committees?: string[]): this {
    const committeesToUse = committees || this.representative.committees?.map(c => c.name) || [];

    if (committeesToUse.length === 0) return this;

    const committeeTerms: string[] = [];
    const committeeThemes: string[] = [];

    committeesToUse.forEach(committee => {
      // Add committee name
      committeeTerms.push(`"${committee}"`);

      // Extract key words and map to themes
      const lowerCommittee = committee.toLowerCase();
      Object.entries(COMMITTEE_TO_THEMES).forEach(([key, themes]) => {
        if (lowerCommittee.includes(key)) {
          themes.forEach(theme => {
            this.themes.add(theme);
            committeeThemes.push(theme);
          });
        }
      });
    });

    if (committeeTerms.length > 0) {
      this.queries.push(`(${committeeTerms.join(' OR ')})`);
    }

    logger.debug('Added committee filters', {
      bioguideId: this.representative.bioguideId,
      committees: committeesToUse,
      themesAdded: committeeThemes,
      operation: 'gdelt_query_builder_committees',
    });

    return this;
  }

  /**
   * Add policy theme filters based on legislative focus
   */
  addPolicyThemes(policyAreas?: string[]): this {
    if (!policyAreas || policyAreas.length === 0) return this;

    const policyTerms: string[] = [];

    policyAreas.forEach(area => {
      // Add the policy area as a search term
      policyTerms.push(`"${area}"`);

      // Map to V2 themes
      const themes = POLICY_TO_V2THEMES[area];
      if (themes) {
        themes.forEach(theme => this.themes.add(theme));
      }
    });

    if (policyTerms.length > 0) {
      this.queries.push(`(${policyTerms.join(' OR ')})`);
    }

    return this;
  }

  /**
   * Add specific legislation keywords
   */
  addLegislationKeywords(bills?: string[]): this {
    if (!bills || bills.length === 0) return this;

    const billTerms: string[] = [];

    bills.forEach(bill => {
      // Add bill number variations
      billTerms.push(`"${bill}"`);

      // Add common variations (e.g., "H.R. 1234" -> "HR 1234", "HR1234")
      const normalized = bill.replace(/\./g, '');
      billTerms.push(`"${normalized}"`);
      billTerms.push(`"${normalized.replace(/ /g, '')}"`);
    });

    if (billTerms.length > 0) {
      this.queries.push(`(${billTerms.join(' OR ')})`);
    }

    return this;
  }

  /**
   * Use proximity search for related terms
   */
  useProximitySearch(terms: string[], windowSize: number = 15): this {
    if (terms.length < 2) return this;

    // GDELT supports proximity via near() operator
    const proximityQuery = `near(${windowSize}, ${terms.map(t => `"${t}"`).join(', ')})`;
    this.queries.push(proximityQuery);

    return this;
  }

  /**
   * Add party-specific context
   */
  addPartyContext(): this {
    const party = this.representative.party;
    if (!party) return this;

    const partyTerms: string[] = [];

    if (party.includes('Democrat')) {
      partyTerms.push('(Democrat OR Democratic OR "Democratic Party" OR DNC)');
    } else if (party.includes('Republican')) {
      partyTerms.push('(Republican OR GOP OR "Republican Party" OR RNC)');
    } else if (party.includes('Independent')) {
      partyTerms.push('(Independent OR "Independent Party" OR nonpartisan)');
    }

    if (partyTerms.length > 0) {
      this.queries.push(partyTerms.join(' OR '));
    }

    return this;
  }

  /**
   * Add leadership role context
   */
  addLeadershipContext(): this {
    const leadershipRoles = this.representative.leadershipRoles;
    if (!leadershipRoles || leadershipRoles.length === 0) return this;

    const leadershipTerms: string[] = [];

    leadershipRoles.forEach(role => {
      leadershipTerms.push(`"${role.title}"`);

      // Add common leadership terms
      if (role.title.toLowerCase().includes('speaker')) {
        leadershipTerms.push('"Speaker of the House"');
      } else if (role.title.toLowerCase().includes('leader')) {
        leadershipTerms.push('"Majority Leader" OR "Minority Leader"');
      } else if (role.title.toLowerCase().includes('whip')) {
        leadershipTerms.push('"Majority Whip" OR "Minority Whip"');
      }
    });

    if (leadershipTerms.length > 0) {
      this.queries.push(`(${leadershipTerms.join(' OR ')})`);
    }

    return this;
  }

  /**
   * Add temporal context (recent events, election cycles)
   */
  addTemporalContext(eventType?: 'election' | 'legislation' | 'hearing'): this {
    const temporalTerms: string[] = [];

    if (eventType === 'election') {
      temporalTerms.push('(election OR campaign OR "running for" OR reelection OR primary)');
    } else if (eventType === 'legislation') {
      temporalTerms.push('(vote OR voting OR "passed" OR "introduced" OR "sponsored" OR bill)');
    } else if (eventType === 'hearing') {
      temporalTerms.push('(hearing OR testimony OR committee OR investigation OR inquiry)');
    }

    if (temporalTerms.length > 0) {
      this.queries.push(temporalTerms.join(' OR '));
    }

    return this;
  }

  /**
   * Build the final GDELT query string
   */
  build(): string {
    // Combine all query components with AND
    let finalQuery = this.queries.join(' AND ');

    // Add theme filter if themes were collected
    if (this.themes.size > 0) {
      const themeList = Array.from(this.themes).join(',');
      finalQuery += ` theme:${themeList}`;
    }

    // Add language filter
    if (!this.options.includeSpanish) {
      finalQuery += ' lang:english';
    }

    // Add source country filter for local focus
    if (this.options.focusLocal) {
      finalQuery += ' sourcecountry:US';
    }

    logger.info('Built GDELT query', {
      bioguideId: this.representative.bioguideId,
      queryLength: finalQuery.length,
      componentCount: this.queries.length,
      themeCount: this.themes.size,
      operation: 'gdelt_query_builder_complete',
    });

    return finalQuery;
  }

  /**
   * Get the collected themes for separate use
   */
  getThemes(): string[] {
    return Array.from(this.themes);
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.queries = [];
    this.themes.clear();
    return this;
  }
}

/**
 * Helper function to create optimized queries from representative data
 */
export function buildOptimizedGDELTQuery(
  representative: EnhancedRepresentative,
  options?: QueryBuilderOptions
): string[] {
  // Query 1: Most specific - Name + State + Recent legislative context
  const query1 = new GDELTQueryBuilder(representative, options)
    .addNameQuery()
    .addGeographicScope()
    .addOrganizationalContext()
    .addTemporalContext('legislation')
    .build();

  // Query 2: Committee-focused with policy themes
  const query2 = new GDELTQueryBuilder(representative, options)
    .addNameQuery()
    .addCommitteeFilters()
    .addPolicyThemes(extractPolicyAreas(representative))
    .build();

  // Query 3: Leadership and party context (if applicable)
  const query3 = new GDELTQueryBuilder(representative, options)
    .addNameQuery()
    .addPartyContext()
    .addLeadershipContext()
    .addGeographicScope()
    .build();

  // Query 4: Broader search with proximity
  const lastName = representative.fullName?.last || representative.lastName;
  const query4 = new GDELTQueryBuilder(representative, options)
    .useProximitySearch([lastName, representative.state, 'Congress'], 20)
    .addOrganizationalContext()
    .build();

  return [query1, query2, query3, query4].filter(q => q.length > 0);
}

/**
 * Extract policy areas from representative data
 */
function extractPolicyAreas(representative: EnhancedRepresentative): string[] {
  const policyAreas: Set<string> = new Set();

  // Extract from committee names
  representative.committees?.forEach(committee => {
    const name = committee.name.toLowerCase();
    if (name.includes('health')) policyAreas.add('Healthcare');
    if (name.includes('education')) policyAreas.add('Education');
    if (name.includes('energy')) policyAreas.add('Energy');
    if (name.includes('commerce')) policyAreas.add('Economy');
    if (name.includes('defense') || name.includes('armed')) policyAreas.add('Defense');
    if (name.includes('foreign')) policyAreas.add('Foreign Relations');
    if (name.includes('judiciary')) policyAreas.add('Crime');
    if (name.includes('science')) policyAreas.add('Science');
    if (name.includes('transport')) policyAreas.add('Infrastructure');
    if (name.includes('agriculture')) policyAreas.add('Agriculture');
    if (name.includes('veterans')) policyAreas.add('Veterans');
    if (name.includes('intelligence')) policyAreas.add('National Security');
    if (name.includes('environment')) policyAreas.add('Environment');
    if (name.includes('finance') || name.includes('banking')) policyAreas.add('Finance');
  });

  return Array.from(policyAreas);
}

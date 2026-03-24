import { describe, it, expect } from 'vitest';
import {
  // Industry taxonomy
  IndustrySector,
  categorizeContribution,
  categorizePACByName,
  // Committee-agency map
  HOUSE_COMMITTEE_MAPPINGS,
  SENATE_COMMITTEE_MAPPINGS,
  ALL_COMMITTEE_MAPPINGS,
  getAgenciesForCommittee,
  getTopicsForCommittee,
  getCommitteesForAgency,
  // Committee aliases
  COMMITTEE_ALIASES,
  getAllCommitteeAliasNames,
  // Lobbying resolver
  resolveGovernmentEntity,
  resolveFilingEntities,
  getResolvedCommittees,
  // SIC sector map
  sicToSector,
  // LDA issue map
  LDA_ISSUE_POLICY_MAP,
  getLDAIssueLabel,
  getPolicyAreasForLDAIssue,
  getAllLDAIssueCodes,
  // Bioguide-FEC mapping
  getFECIdFromBioguide,
  hasFECMapping,
  getBioguideFromFEC,
  getMappingStats,
} from '../index';

// ── Industry Taxonomy ────────────────────────────────────────────────

describe('IndustrySector enum', () => {
  it('has 13 sectors', () => {
    const values = Object.values(IndustrySector);
    expect(values).toHaveLength(13);
  });

  it('includes expected sector values', () => {
    expect(IndustrySector.DEFENSE).toBe('Defense');
    expect(IndustrySector.HEALTH).toBe('Health');
    expect(IndustrySector.ENERGY_NATURAL_RESOURCES).toBe('Energy/Natural Resources');
    expect(IndustrySector.FINANCE_INSURANCE_REAL_ESTATE).toBe('Finance/Insurance/Real Estate');
  });
});

describe('categorizeContribution', () => {
  it('categorizes a defense contractor by employer', () => {
    const result = categorizeContribution('LOCKHEED MARTIN', 'ENGINEER');
    expect(result.sector).toBe(IndustrySector.DEFENSE);
    expect(result.confidence).toBe('high');
    expect(result.matchSource).toBe('employer');
  });

  it('categorizes a hospital employee by employer', () => {
    const result = categorizeContribution('JOHNS HOPKINS HOSPITAL', 'NURSE');
    expect(result.sector).toBe(IndustrySector.HEALTH);
  });

  it('categorizes by occupation when employer is generic', () => {
    const result = categorizeContribution('SELF-EMPLOYED', 'ATTORNEY');
    expect(result.sector).toBe(IndustrySector.LAWYERS_LOBBYISTS);
    expect(result.matchSource).toBe('occupation');
  });

  it('returns Other for unrecognizable employer/occupation', () => {
    const result = categorizeContribution('ACME WIDGETS', 'WIDGET MAKER');
    expect(result.sector).toBe(IndustrySector.OTHER);
  });

  it('handles empty strings', () => {
    const result = categorizeContribution('', '');
    expect(result.sector).toBe(IndustrySector.OTHER);
  });
});

describe('categorizePACByName', () => {
  it('categorizes a defense PAC', () => {
    const result = categorizePACByName('RAYTHEON COMPANY PAC');
    expect(result.sector).toBe(IndustrySector.DEFENSE);
  });

  it('categorizes a labor PAC', () => {
    const result = categorizePACByName('AFL-CIO PAC');
    expect(result.sector).toBe(IndustrySector.LABOR);
  });

  it('returns Other for unknown PAC', () => {
    const result = categorizePACByName('OBSCURE FRIENDS PAC');
    expect(result.sector).toBe(IndustrySector.OTHER);
  });
});

// ── Committee-Agency Map ─────────────────────────────────────────────

describe('committee-agency map', () => {
  it('has House committee mappings', () => {
    expect(HOUSE_COMMITTEE_MAPPINGS.length).toBeGreaterThan(5);
    expect(HOUSE_COMMITTEE_MAPPINGS.every(m => m.chamber === 'House')).toBe(true);
  });

  it('has Senate committee mappings', () => {
    expect(SENATE_COMMITTEE_MAPPINGS.length).toBeGreaterThan(5);
    expect(SENATE_COMMITTEE_MAPPINGS.every(m => m.chamber === 'Senate')).toBe(true);
  });

  it('ALL_COMMITTEE_MAPPINGS includes both chambers', () => {
    expect(ALL_COMMITTEE_MAPPINGS.length).toBe(
      HOUSE_COMMITTEE_MAPPINGS.length + SENATE_COMMITTEE_MAPPINGS.length
    );
  });

  it('each mapping has required fields', () => {
    for (const m of ALL_COMMITTEE_MAPPINGS) {
      expect(m.committeeCode).toBeTruthy();
      expect(m.committeeName).toBeTruthy();
      expect(['House', 'Senate', 'Joint']).toContain(m.chamber);
      expect(m.agencies.length).toBeGreaterThan(0);
      expect(m.topics.length).toBeGreaterThan(0);
    }
  });
});

describe('getAgenciesForCommittee', () => {
  it('returns agencies for a known committee name', () => {
    // Function takes committee NAME, not code — does string matching
    const agencies = getAgenciesForCommittee('Armed Services');
    expect(agencies.length).toBeGreaterThan(0);
    expect(agencies.some(a => a.slug === 'department-of-defense')).toBe(true);
  });

  it('returns empty array for unknown committee name', () => {
    expect(getAgenciesForCommittee('Galactic Federation')).toEqual([]);
  });
});

describe('getTopicsForCommittee', () => {
  it('returns topics for a known committee name', () => {
    const topics = getTopicsForCommittee('Armed Services');
    expect(topics.length).toBeGreaterThan(0);
    expect(topics).toContain('defense');
  });

  it('returns empty array for unknown committee', () => {
    expect(getTopicsForCommittee('ZZZZ')).toEqual([]);
  });
});

describe('getCommitteesForAgency', () => {
  it('finds committees overseeing DOD', () => {
    const committees = getCommitteesForAgency('department-of-defense');
    expect(committees.length).toBeGreaterThan(0);
    expect(committees.some(c => c.committeeCode === 'HSAS')).toBe(true);
  });

  it('returns empty for unknown agency', () => {
    expect(getCommitteesForAgency('fake-agency')).toEqual([]);
  });
});

// ── Committee Aliases ────────────────────────────────────────────────

describe('COMMITTEE_ALIASES', () => {
  it('is a Map with entries', () => {
    expect(COMMITTEE_ALIASES).toBeInstanceOf(Map);
    expect(COMMITTEE_ALIASES.size).toBeGreaterThan(20);
  });

  it('resolves formal committee names', () => {
    expect(COMMITTEE_ALIASES.get('senate armed services')).toBe('SSAS');
    expect(COMMITTEE_ALIASES.get('house judiciary')).toBe('HSJU');
  });

  it('getAllCommitteeAliasNames returns strings', () => {
    const names = getAllCommitteeAliasNames();
    expect(names.length).toBeGreaterThan(20);
    expect(typeof names[0]).toBe('string');
  });
});

// ── Lobbying Committee Resolver ──────────────────────────────────────

describe('resolveGovernmentEntity', () => {
  it('resolves noise entities', () => {
    const result = resolveGovernmentEntity('U.S. Congress');
    expect(result.type).toBe('noise');
    expect(result.confidence).toBe(0);
  });

  it('filters blank strings as noise', () => {
    expect(resolveGovernmentEntity('').type).toBe('noise');
    expect(resolveGovernmentEntity('  ').type).toBe('noise');
  });

  it('resolves exact committee alias match', () => {
    const result = resolveGovernmentEntity('Senate Armed Services');
    expect(result.type).toBe('committee');
    expect(result.committeeCode).toBe('SSAS');
    expect(result.confidence).toBe(1.0);
  });

  it('resolves exact agency alias match', () => {
    const result = resolveGovernmentEntity('Department of Energy');
    expect(result.type).toBe('agency');
    expect(result.agencySlug).toBeTruthy();
    expect(result.confidence).toBe(1.0);
  });

  it('returns unresolved for unknown entities', () => {
    const result = resolveGovernmentEntity('Galactic Federation of Planets');
    expect(result.type).toBe('unresolved');
    expect(result.confidence).toBe(0);
  });

  it('preserves raw text in result', () => {
    const result = resolveGovernmentEntity('Senate Armed Services');
    expect(result.rawText).toBe('Senate Armed Services');
  });
});

describe('resolveFilingEntities', () => {
  it('resolves an array of entities', () => {
    const results = resolveFilingEntities([
      'Senate Armed Services',
      'U.S. Congress',
      'Unknown Entity',
    ]);
    expect(results).toHaveLength(3);
    expect(results[0]!.type).toBe('committee');
    expect(results[1]!.type).toBe('noise');
    expect(results[2]!.type).toBe('unresolved');
  });
});

describe('getResolvedCommittees', () => {
  it('extracts committees from resolved entities', () => {
    const resolutions = resolveFilingEntities(['Senate Armed Services', 'House Judiciary']);
    const committees = getResolvedCommittees(resolutions);
    expect(committees.length).toBe(2);
    expect(committees.some(c => c.committeeCode === 'SSAS')).toBe(true);
    expect(committees.some(c => c.committeeCode === 'HSJU')).toBe(true);
  });

  it('derives committees from agency resolutions', () => {
    const resolutions = resolveFilingEntities(['Department of Defense']);
    const committees = getResolvedCommittees(resolutions);
    // DOD oversight should include Armed Services committees
    expect(committees.length).toBeGreaterThan(0);
    // Agency-derived committees have reduced confidence
    expect(committees.every(c => c.confidence <= 0.9)).toBe(true);
  });

  it('deduplicates committee codes taking highest confidence', () => {
    const resolutions = resolveFilingEntities([
      'Senate Armed Services',
      'Senate Armed Services Committee',
    ]);
    const committees = getResolvedCommittees(resolutions);
    const ssasCodes = committees.filter(c => c.committeeCode === 'SSAS');
    expect(ssasCodes).toHaveLength(1);
  });
});

// ── SIC Sector Map ───────────────────────────────────────────────────

describe('sicToSector', () => {
  it('maps agriculture SIC codes to Agribusiness', () => {
    expect(sicToSector('0100')).toBe(IndustrySector.AGRIBUSINESS);
    expect(sicToSector('0999')).toBe(IndustrySector.AGRIBUSINESS);
  });

  it('maps mining SIC codes to Energy/Natural Resources', () => {
    expect(sicToSector('1000')).toBe(IndustrySector.ENERGY_NATURAL_RESOURCES);
  });

  it('maps construction SIC codes to Construction', () => {
    expect(sicToSector('1500')).toBe(IndustrySector.CONSTRUCTION);
  });

  it('maps banking SIC codes to Finance', () => {
    expect(sicToSector('6000')).toBe(IndustrySector.FINANCE_INSURANCE_REAL_ESTATE);
  });

  it('returns a sector or null for edge-case SIC codes', () => {
    // Empty and non-numeric should return null
    expect(sicToSector('')).toBeNull();
    expect(sicToSector('abcd')).toBeNull();
    // 9999 may map to a sector (public administration range) — just verify it returns a string or null
    const result = sicToSector('9999');
    if (result !== null) {
      expect(Object.values(IndustrySector)).toContain(result);
    }
  });
});

// ── LDA Issue Policy Map ─────────────────────────────────────────────

describe('LDA issue mapping', () => {
  it('exports the mapping object', () => {
    expect(LDA_ISSUE_POLICY_MAP).toBeDefined();
    expect(Object.keys(LDA_ISSUE_POLICY_MAP).length).toBeGreaterThan(20);
  });

  it('getLDAIssueLabel returns labels for known codes', () => {
    expect(getLDAIssueLabel('DEF')).toBe('Defense');
    expect(getLDAIssueLabel('HCR')).toBe('Health Issues');
    expect(getLDAIssueLabel('AGR')).toBe('Agriculture');
  });

  it('getLDAIssueLabel returns the code itself for unknown codes', () => {
    // Unknown codes fall through to returning the raw code
    expect(getLDAIssueLabel('ZZZ')).toBe('ZZZ');
  });

  it('getPolicyAreasForLDAIssue returns policy areas', () => {
    const areas = getPolicyAreasForLDAIssue('DEF');
    expect(areas).not.toBeNull();
    expect(areas!.length).toBeGreaterThan(0);
    expect(areas!.some(a => a.includes('Security') || a.includes('Defense'))).toBe(true);
  });

  it('getAllLDAIssueCodes returns all codes', () => {
    const codes = getAllLDAIssueCodes();
    expect(codes.length).toBeGreaterThan(20);
    expect(codes).toContain('DEF');
    expect(codes).toContain('HCR');
  });
});

// ── Bioguide-FEC Mapping ─────────────────────────────────────────────

describe('bioguide-FEC mapping', () => {
  it('getMappingStats returns counts', () => {
    const stats = getMappingStats();
    expect(stats.totalMappings).toBeGreaterThan(400); // 537 members expected
    expect(stats.houseMembers).toBeGreaterThan(200);
    expect(stats.senateMembers).toBeGreaterThan(50);
  });

  it('hasFECMapping returns true for known members', () => {
    // Nancy Pelosi's bioguide ID
    expect(hasFECMapping('P000197')).toBe(true);
  });

  it('hasFECMapping returns false for unknown IDs', () => {
    expect(hasFECMapping('ZZZZZZ')).toBe(false);
  });

  it('getFECIdFromBioguide returns FEC ID for known members', () => {
    const fecId = getFECIdFromBioguide('P000197');
    expect(fecId).not.toBeNull();
    expect(fecId!.length).toBeGreaterThan(0);
  });

  it('getFECIdFromBioguide returns null for unknown members', () => {
    expect(getFECIdFromBioguide('ZZZZZZ')).toBeNull();
  });

  it('getBioguideFromFEC does reverse lookup', () => {
    const fecId = getFECIdFromBioguide('P000197');
    if (fecId) {
      const bioguide = getBioguideFromFEC(fecId);
      expect(bioguide).toBe('P000197');
    }
  });
});

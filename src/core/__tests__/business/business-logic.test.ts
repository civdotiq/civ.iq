/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Business Logic Tests
 *
 * Test-driven development for pure business functions:
 * - Data transformation logic
 * - Validation rules
 * - Business calculations
 * - Edge case handling
 */

import { describe, it, expect } from '@jest/globals';

// Mock data structures for testing
interface Representative {
  bioguideId: string;
  name: string;
  party?: string;
  state?: string;
  district?: string;
  terms?: Term[];
  committees?: Committee[];
}

interface Term {
  type: 'rep' | 'sen';
  start: string;
  end: string;
  state: string;
  district?: string;
  party: string;
}

interface Committee {
  code: string;
  name: string;
  type: 'standing' | 'joint' | 'select';
  subcommittees?: string[];
}

interface VotingRecord {
  question: string;
  vote_cast: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  date: string;
  chamber: 'house' | 'senate';
  result: 'Passed' | 'Failed';
}

// Business logic functions to test
class RepresentativeBusinessLogic {
  /**
   * Calculate years of service based on terms
   */
  static calculateYearsOfService(terms: Term[]): number {
    if (!terms || terms.length === 0) return 0;

    let totalDays = 0;

    for (const term of terms) {
      const startDate = new Date(term.start);
      const endDate = term.end ? new Date(term.end) : new Date();
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      totalDays += Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return Math.round((totalDays / 365.25) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Determine current chamber based on most recent term
   */
  static getCurrentChamber(terms: Term[]): 'house' | 'senate' | null {
    if (!terms || terms.length === 0) return null;

    // Sort by start date descending to get most recent
    const sortedTerms = [...terms].sort(
      (a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()
    );

    const mostRecentTerm = sortedTerms[0];
    if (!mostRecentTerm) return null;

    return mostRecentTerm.type === 'rep' ? 'house' : 'senate';
  }

  /**
   * Check if representative is currently serving
   */
  static isCurrentlyServing(terms: Term[]): boolean {
    if (!terms || terms.length === 0) return false;

    const now = new Date();
    return terms.some(term => {
      const startDate = new Date(term.start);
      // If no end date, assume currently serving
      const endDate = term.end ? new Date(term.end) : new Date('9999-12-31');
      return startDate <= now && now <= endDate;
    });
  }

  /**
   * Get committee leadership roles
   */
  static getCommitteeLeadershipRoles(committees: Committee[]): string[] {
    if (!committees || committees.length === 0) return [];

    // This is simplified - in real implementation would check for chair/ranking member roles
    return committees
      .filter(committee => committee.type === 'standing')
      .map(committee => committee.name)
      .slice(0, 3); // Limit to top 3 for demo
  }

  /**
   * Calculate voting participation rate
   */
  static calculateVotingParticipation(votes: VotingRecord[]): number {
    if (!votes || votes.length === 0) return 0;

    const participatedVotes = votes.filter(vote => vote.vote_cast !== 'Not Voting').length;

    return Math.round((participatedVotes / votes.length) * 100 * 10) / 10;
  }

  /**
   * Get party line voting percentage
   */
  static calculatePartyLineVoting(votes: VotingRecord[], party: string): number {
    if (!votes || votes.length === 0 || !party) return 0;

    // This is simplified - real implementation would need party position data
    // For demo, assume party line based on vote result and party affiliation
    const partyVotes = votes.filter(vote => {
      if (vote.vote_cast === 'Not Voting' || vote.vote_cast === 'Present') return false;

      // Simplified logic: Democrats vote Yea on passed bills, Republicans vote Nay
      if (party === 'Democratic') {
        return (
          (vote.vote_cast === 'Yea' && vote.result === 'Passed') ||
          (vote.vote_cast === 'Nay' && vote.result === 'Failed')
        );
      } else if (party === 'Republican') {
        return (
          (vote.vote_cast === 'Nay' && vote.result === 'Passed') ||
          (vote.vote_cast === 'Yea' && vote.result === 'Failed')
        );
      }
      return false;
    });

    return Math.round((partyVotes.length / votes.length) * 100 * 10) / 10;
  }

  /**
   * Validate bioguide ID format
   */
  static isValidBioguideId(bioguideId: string): boolean {
    if (!bioguideId || typeof bioguideId !== 'string') return false;

    // Bioguide IDs are typically 6-7 characters: Letter + 6 digits
    const pattern = /^[A-Z]\d{6}$/;
    return pattern.test(bioguideId);
  }

  /**
   * Format representative name for display
   */
  static formatRepresentativeName(rep: Representative): string {
    if (!rep || !rep.name) return '';

    const chamber = this.getCurrentChamber(rep.terms || []);
    const title = chamber === 'senate' ? 'Sen.' : 'Rep.';

    return `${title} ${rep.name}`;
  }

  /**
   * Get state abbreviation from full name
   */
  static getStateAbbreviation(stateName: string): string | null {
    if (!stateName) return null;

    const stateMap: Record<string, string> = {
      Alabama: 'AL',
      Alaska: 'AK',
      Arizona: 'AZ',
      Arkansas: 'AR',
      California: 'CA',
      Colorado: 'CO',
      Connecticut: 'CT',
      Delaware: 'DE',
      Florida: 'FL',
      Georgia: 'GA',
      Hawaii: 'HI',
      Idaho: 'ID',
      Illinois: 'IL',
      Indiana: 'IN',
      Iowa: 'IA',
      Kansas: 'KS',
      Kentucky: 'KY',
      Louisiana: 'LA',
      Maine: 'ME',
      Maryland: 'MD',
      Massachusetts: 'MA',
      Michigan: 'MI',
      Minnesota: 'MN',
      Mississippi: 'MS',
      Missouri: 'MO',
      Montana: 'MT',
      Nebraska: 'NE',
      Nevada: 'NV',
      'New Hampshire': 'NH',
      'New Jersey': 'NJ',
      'New Mexico': 'NM',
      'New York': 'NY',
      'North Carolina': 'NC',
      'North Dakota': 'ND',
      Ohio: 'OH',
      Oklahoma: 'OK',
      Oregon: 'OR',
      Pennsylvania: 'PA',
      'Rhode Island': 'RI',
      'South Carolina': 'SC',
      'South Dakota': 'SD',
      Tennessee: 'TN',
      Texas: 'TX',
      Utah: 'UT',
      Vermont: 'VT',
      Virginia: 'VA',
      Washington: 'WA',
      'West Virginia': 'WV',
      Wisconsin: 'WI',
      Wyoming: 'WY',
    };

    return stateMap[stateName] || null;
  }
}

describe('Business Logic Tests', () => {
  describe('Service Years Calculation', () => {
    it('should calculate years of service correctly for single term', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: '2021-01-03',
          end: '2023-01-03',
          state: 'CA',
          district: '12',
          party: 'Democratic',
        },
      ];

      const years = RepresentativeBusinessLogic.calculateYearsOfService(terms);
      expect(years).toBeCloseTo(2.0, 1);
    });

    it('should calculate years of service for multiple terms', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: '2019-01-03',
          end: '2021-01-03',
          state: 'CA',
          party: 'Democratic',
        },
        {
          type: 'rep',
          start: '2021-01-03',
          end: '2023-01-03',
          state: 'CA',
          party: 'Democratic',
        },
      ];

      const years = RepresentativeBusinessLogic.calculateYearsOfService(terms);
      expect(years).toBeCloseTo(4.0, 1);
    });

    it('should handle current serving term without end date', () => {
      const terms: Term[] = [
        {
          type: 'sen',
          start: '2021-01-03',
          end: '', // Currently serving
          state: 'MN',
          party: 'Democratic',
        },
      ];

      const years = RepresentativeBusinessLogic.calculateYearsOfService(terms);
      expect(years).toBeGreaterThan(3); // Should be over 3 years
    });

    it('should return 0 for empty terms array', () => {
      const years = RepresentativeBusinessLogic.calculateYearsOfService([]);
      expect(years).toBe(0);
    });
  });

  describe('Chamber Determination', () => {
    it('should identify House representative correctly', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: '2021-01-03',
          end: '',
          state: 'TX',
          district: '1',
          party: 'Republican',
        },
      ];

      const chamber = RepresentativeBusinessLogic.getCurrentChamber(terms);
      expect(chamber).toBe('house');
    });

    it('should identify Senate representative correctly', () => {
      const terms: Term[] = [
        {
          type: 'sen',
          start: '2019-01-03',
          end: '',
          state: 'VT',
          party: 'Independent',
        },
      ];

      const chamber = RepresentativeBusinessLogic.getCurrentChamber(terms);
      expect(chamber).toBe('senate');
    });

    it('should return most recent chamber for mixed terms', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: '2015-01-03',
          end: '2019-01-03',
          state: 'MN',
          party: 'Democratic',
        },
        {
          type: 'sen',
          start: '2019-01-03',
          end: '',
          state: 'MN',
          party: 'Democratic',
        },
      ];

      const chamber = RepresentativeBusinessLogic.getCurrentChamber(terms);
      expect(chamber).toBe('senate');
    });

    it('should return null for empty terms', () => {
      const chamber = RepresentativeBusinessLogic.getCurrentChamber([]);
      expect(chamber).toBeNull();
    });
  });

  describe('Current Service Status', () => {
    it('should identify currently serving representative', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: '2021-01-03',
          end: '', // No end date = currently serving
          state: 'CA',
          party: 'Democratic',
        },
      ];

      const serving = RepresentativeBusinessLogic.isCurrentlyServing(terms);
      expect(serving).toBe(true);
    });

    it('should identify former representative', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: '2019-01-03',
          end: '2021-01-03',
          state: 'CA',
          party: 'Democratic',
        },
      ];

      const serving = RepresentativeBusinessLogic.isCurrentlyServing(terms);
      expect(serving).toBe(false);
    });

    it('should return false for empty terms', () => {
      const serving = RepresentativeBusinessLogic.isCurrentlyServing([]);
      expect(serving).toBe(false);
    });
  });

  describe('Voting Statistics', () => {
    it('should calculate voting participation correctly', () => {
      const votes: VotingRecord[] = [
        {
          question: 'Bill 1',
          vote_cast: 'Yea',
          date: '2023-01-15',
          chamber: 'house',
          result: 'Passed',
        },
        {
          question: 'Bill 2',
          vote_cast: 'Nay',
          date: '2023-01-16',
          chamber: 'house',
          result: 'Failed',
        },
        {
          question: 'Bill 3',
          vote_cast: 'Not Voting',
          date: '2023-01-17',
          chamber: 'house',
          result: 'Passed',
        },
        {
          question: 'Bill 4',
          vote_cast: 'Present',
          date: '2023-01-18',
          chamber: 'house',
          result: 'Passed',
        },
      ];

      const participation = RepresentativeBusinessLogic.calculateVotingParticipation(votes);
      expect(participation).toBe(50.0); // 2 out of 4 participated (Not Voting excluded)
    });

    it('should handle 100% participation', () => {
      const votes: VotingRecord[] = [
        {
          question: 'Bill 1',
          vote_cast: 'Yea',
          date: '2023-01-15',
          chamber: 'senate',
          result: 'Passed',
        },
        {
          question: 'Bill 2',
          vote_cast: 'Nay',
          date: '2023-01-16',
          chamber: 'senate',
          result: 'Failed',
        },
      ];

      const participation = RepresentativeBusinessLogic.calculateVotingParticipation(votes);
      expect(participation).toBe(100.0);
    });

    it('should return 0 for empty votes', () => {
      const participation = RepresentativeBusinessLogic.calculateVotingParticipation([]);
      expect(participation).toBe(0);
    });
  });

  describe('Input Validation', () => {
    it('should validate correct bioguide ID format', () => {
      expect(RepresentativeBusinessLogic.isValidBioguideId('K000367')).toBe(true);
      expect(RepresentativeBusinessLogic.isValidBioguideId('S000033')).toBe(true);
      expect(RepresentativeBusinessLogic.isValidBioguideId('A000001')).toBe(true);
    });

    it('should reject invalid bioguide ID formats', () => {
      expect(RepresentativeBusinessLogic.isValidBioguideId('invalid')).toBe(false);
      expect(RepresentativeBusinessLogic.isValidBioguideId('K00036')).toBe(false); // Too short
      expect(RepresentativeBusinessLogic.isValidBioguideId('K0003678')).toBe(false); // Too long
      expect(RepresentativeBusinessLogic.isValidBioguideId('1000367')).toBe(false); // No letter
      expect(RepresentativeBusinessLogic.isValidBioguideId('')).toBe(false);
      expect(RepresentativeBusinessLogic.isValidBioguideId(null as unknown as string)).toBe(false);
    });
  });

  describe('Data Formatting', () => {
    it('should format representative name with correct title', () => {
      const houseRep: Representative = {
        bioguideId: 'A000001',
        name: 'John Smith',
        party: 'Democratic',
        state: 'CA',
        terms: [{ type: 'rep', start: '2021-01-03', end: '', state: 'CA', party: 'Democratic' }],
      };

      const formatted = RepresentativeBusinessLogic.formatRepresentativeName(houseRep);
      expect(formatted).toBe('Rep. John Smith');
    });

    it('should format senator name with correct title', () => {
      const senator: Representative = {
        bioguideId: 'K000367',
        name: 'Amy Klobuchar',
        party: 'Democratic',
        state: 'MN',
        terms: [{ type: 'sen', start: '2007-01-03', end: '', state: 'MN', party: 'Democratic' }],
      };

      const formatted = RepresentativeBusinessLogic.formatRepresentativeName(senator);
      expect(formatted).toBe('Sen. Amy Klobuchar');
    });

    it('should handle missing name gracefully', () => {
      const rep: Representative = {
        bioguideId: 'A000001',
        name: '',
        terms: [],
      };

      const formatted = RepresentativeBusinessLogic.formatRepresentativeName(rep);
      expect(formatted).toBe('');
    });
  });

  describe('State Name Conversion', () => {
    it('should convert full state names to abbreviations', () => {
      expect(RepresentativeBusinessLogic.getStateAbbreviation('California')).toBe('CA');
      expect(RepresentativeBusinessLogic.getStateAbbreviation('New York')).toBe('NY');
      expect(RepresentativeBusinessLogic.getStateAbbreviation('Texas')).toBe('TX');
      expect(RepresentativeBusinessLogic.getStateAbbreviation('Minnesota')).toBe('MN');
    });

    it('should return null for invalid state names', () => {
      expect(RepresentativeBusinessLogic.getStateAbbreviation('Invalid State')).toBeNull();
      expect(RepresentativeBusinessLogic.getStateAbbreviation('')).toBeNull();
      expect(
        RepresentativeBusinessLogic.getStateAbbreviation(null as unknown as string)
      ).toBeNull();
    });

    it('should handle case sensitivity', () => {
      // Note: Current implementation is case-sensitive, this test documents the behavior
      expect(RepresentativeBusinessLogic.getStateAbbreviation('california')).toBeNull();
      expect(RepresentativeBusinessLogic.getStateAbbreviation('CALIFORNIA')).toBeNull();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined inputs gracefully', () => {
      expect(RepresentativeBusinessLogic.calculateYearsOfService(null as unknown as Term[])).toBe(
        0
      );
      expect(
        RepresentativeBusinessLogic.getCurrentChamber(undefined as unknown as Term[])
      ).toBeNull();
      expect(RepresentativeBusinessLogic.isCurrentlyServing(null as unknown as Term[])).toBe(false);
      expect(
        RepresentativeBusinessLogic.calculateVotingParticipation(
          undefined as unknown as VotingRecord[]
        )
      ).toBe(0);
    });

    it('should handle invalid date formats in terms', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: 'invalid-date',
          end: '2023-01-03',
          state: 'CA',
          party: 'Democratic',
        },
      ];

      // Should not throw error, may return 0 or handle gracefully
      expect(() => RepresentativeBusinessLogic.calculateYearsOfService(terms)).not.toThrow();
    });

    it('should handle empty committee arrays', () => {
      const roles = RepresentativeBusinessLogic.getCommitteeLeadershipRoles([]);
      expect(roles).toEqual([]);
    });

    it('should handle malformed representative objects', () => {
      const malformedRep = {} as Representative;
      const formatted = RepresentativeBusinessLogic.formatRepresentativeName(malformedRep);
      expect(formatted).toBe('');
    });
  });

  describe('Business Rule Validation', () => {
    it('should enforce term date consistency', () => {
      const terms: Term[] = [
        {
          type: 'rep',
          start: '2023-01-03', // Start after end
          end: '2021-01-03',
          state: 'CA',
          party: 'Democratic',
        },
      ];

      // Business logic should handle invalid date ranges
      const years = RepresentativeBusinessLogic.calculateYearsOfService(terms);
      expect(years).toBeGreaterThanOrEqual(0); // Should not return negative
    });

    it('should validate party affiliation consistency', () => {
      const votes: VotingRecord[] = [
        {
          question: 'Bill 1',
          vote_cast: 'Yea',
          date: '2023-01-15',
          chamber: 'house',
          result: 'Passed',
        },
      ];

      // Test with various party affiliations
      const demPartyLine = RepresentativeBusinessLogic.calculatePartyLineVoting(
        votes,
        'Democratic'
      );
      const repPartyLine = RepresentativeBusinessLogic.calculatePartyLineVoting(
        votes,
        'Republican'
      );
      const indPartyLine = RepresentativeBusinessLogic.calculatePartyLineVoting(
        votes,
        'Independent'
      );

      expect(typeof demPartyLine).toBe('number');
      expect(typeof repPartyLine).toBe('number');
      expect(typeof indPartyLine).toBe('number');
      expect(demPartyLine).toBeGreaterThanOrEqual(0);
      expect(repPartyLine).toBeGreaterThanOrEqual(0);
      expect(indPartyLine).toBeGreaterThanOrEqual(0);
    });
  });
});

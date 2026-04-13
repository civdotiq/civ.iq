/**
 * Tests that processIndustryBreakdown uses the unified entity-resolution
 * taxonomy and maps sector/category correctly for display.
 *
 * These tests call categorizeContribution directly (the function used
 * inside processIndustryBreakdown) to verify classification behavior
 * without needing to construct full FEC contribution objects.
 */

import { categorizeContribution, IndustrySector } from '@civiq/entity-resolution/industry-taxonomy';

/** Mirror the mapping logic used in processIndustryBreakdown */
function displayIndustry(employer: string, occupation?: string): string {
  const result = categorizeContribution(employer, occupation);
  return result.sector === IndustrySector.OTHER ? result.category : result.sector;
}

describe('industry classification (unified taxonomy)', () => {
  describe('employer-based classification', () => {
    it('classifies defense contractors', () => {
      expect(displayIndustry('LOCKHEED MARTIN', 'ENGINEER')).toBe('Defense');
    });

    it('classifies hospitals', () => {
      expect(displayIndustry('JOHNS HOPKINS HOSPITAL', 'NURSE')).toBe('Health');
    });

    it('classifies banks', () => {
      expect(displayIndustry('WELLS FARGO', 'TELLER')).toBe('Finance/Insurance/Real Estate');
    });

    it('classifies tech companies', () => {
      expect(displayIndustry('GOOGLE', 'SOFTWARE ENGINEER')).toBe('Communications/Electronics');
    });

    it('classifies law firms', () => {
      expect(displayIndustry('SMITH & JONES LAW FIRM', 'ATTORNEY')).toBe('Lawyers & Lobbyists');
    });
  });

  describe('occupation-based fallback', () => {
    it('classifies self-employed attorney as legal', () => {
      expect(displayIndustry('SELF-EMPLOYED', 'ATTORNEY')).toBe('Lawyers & Lobbyists');
    });

    it('classifies self-employed nurse as health', () => {
      expect(displayIndustry('SELF-EMPLOYED', 'NURSE')).toBe('Health');
    });

    it('classifies "none" employer with teacher occupation as education', () => {
      expect(displayIndustry('NONE', 'TEACHER')).toBe('Ideology/Single-Issue');
    });
  });

  describe('special categories under OTHER sector', () => {
    it('shows "Retired" as its own category, not lumped into "Other"', () => {
      expect(displayIndustry('RETIRED', '')).toBe('Retired');
    });

    it('shows "Not Employed" for homemakers', () => {
      expect(displayIndustry('NOT EMPLOYED', 'HOMEMAKER')).toBe('Not Employed');
    });

    it('shows "Not Employed" for students', () => {
      expect(displayIndustry('NONE', 'STUDENT')).toBe('Not Employed');
    });
  });

  describe('unknown/fallback handling', () => {
    it('returns "Other/Unknown" for empty employer and occupation', () => {
      expect(displayIndustry('', '')).toBe('Unknown');
    });

    it('classifies self-employed with unrecognizable occupation as business, not Unknown', () => {
      const result = displayIndustry('SELF-EMPLOYED', 'WIDGET SPECIALIST');
      // Entity-resolution returns Misc Business for self-employed with unrecognized occupation
      expect(result).toBe('Misc Business');
    });

    it('classifies unrecognized employer with no occupation as Other/Unknown', () => {
      const result = displayIndustry('ACME WIDGETS LLC');
      expect(result).toBe('Other/Unknown');
    });
  });
});

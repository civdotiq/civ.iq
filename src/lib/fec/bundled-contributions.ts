/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { structuredLogger } from '@/lib/logging/logger';
import { industryCategorizer } from './industry-categorizer';

/**
 * Bundled Contributions Analysis
 * Links individual employee contributions with associated PAC contributions
 * to show the true total influence of organizations
 */

export interface BundledContributor {
  name: string;
  normalizedName: string;
  employeeTotal: number;
  employeeCount: number;
  pacTotal: number;
  pacCount: number;
  combined: number;
  sector: string;
  subsidiaries?: string[];
  relatedCommittees?: Array<{
    name: string;
    type: string;
    amount: number;
  }>;
}

export interface ContributionRecord {
  contributor_name: string;
  contributor_employer?: string;
  contribution_receipt_amount: number;
  contribution_receipt_date: string;
  committee_name: string;
  committee_id?: string;
  receipt_type?: string;
  memo_text?: string;
}

export interface PACRecord {
  committee_name: string;
  committee_id: string;
  contribution_receipt_amount: number;
  contribution_receipt_date: string;
  committee_type?: string;
  connected_organization?: string;
}

// Common company-to-PAC mappings
const COMPANY_PAC_MAPPINGS: Record<string, string[]> = {
  // Technology
  alphabet: ['google inc pac', 'alphabet inc pac'],
  google: ['google inc pac', 'alphabet inc pac'],
  microsoft: ['microsoft corporation pac', 'microsoft pac'],
  amazon: ['amazon.com inc pac', 'amazon pac'],
  apple: ['apple inc pac'],
  meta: ['meta platforms inc pac', 'facebook inc pac'],
  facebook: ['meta platforms inc pac', 'facebook inc pac'],
  tesla: ['tesla inc pac'],
  nvidia: ['nvidia corporation pac'],
  intel: ['intel corporation pac'],
  oracle: ['oracle corporation pac'],
  salesforce: ['salesforce.com inc pac'],

  // Finance
  jpmorgan: ['jpmorgan chase & co pac', 'chase manhattan corporation pac'],
  chase: ['jpmorgan chase & co pac', 'chase manhattan corporation pac'],
  'goldman sachs': ['goldman sachs group inc pac'],
  'morgan stanley': ['morgan stanley pac'],
  'bank of america': ['bank of america corporation pac', 'bofa pac'],
  'wells fargo': ['wells fargo & company pac'],
  blackrock: ['blackrock inc pac'],
  vanguard: ['vanguard group pac'],
  fidelity: ['fidelity investments pac'],

  // Healthcare
  pfizer: ['pfizer inc pac'],
  'johnson & johnson': ['johnson & johnson pac', 'j&j pac'],
  merck: ['merck & co inc pac'],
  unitedhealth: ['unitedhealth group incorporated pac'],
  anthem: ['anthem inc pac'],
  aetna: ['aetna inc pac'],

  // Energy
  exxon: ['exxon mobil corporation pac', 'exxonmobil pac'],
  chevron: ['chevron corporation pac'],
  conocophillips: ['conocophillips pac'],
  bp: ['bp america inc pac'],
  shell: ['shell oil company pac'],

  // Defense
  lockheed: ['lockheed martin corporation pac'],
  boeing: ['boeing company pac'],
  raytheon: ['raytheon company pac', 'rtx corporation pac'],
  northrop: ['northrop grumman corporation pac'],
  'general dynamics': ['general dynamics corporation pac'],

  // Manufacturing
  'general electric': ['general electric company pac', 'ge pac'],
  caterpillar: ['caterpillar inc pac'],
  '3m': ['3m company pac'],
  ford: ['ford motor company pac'],
  'general motors': ['general motors company pac', 'gm pac'],

  // Media
  disney: ['walt disney company pac'],
  comcast: ['comcast corporation pac'],
  warner: ['warner media pac', 'time warner inc pac'],

  // Retail
  walmart: ['wal-mart stores inc pac', 'walmart inc pac'],
  target: ['target corporation pac'],
  'home depot': ['home depot inc pac'],
};

// PAC type identification patterns
const PAC_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\bpac\b/i, type: 'PAC' },
  { pattern: /political action committee/i, type: 'PAC' },
  { pattern: /\bsuper pac\b/i, type: 'Super PAC' },
  { pattern: /\bindependent expenditure/i, type: 'Super PAC' },
  { pattern: /\b527\b/i, type: '527 Organization' },
  { pattern: /\bssf\b/i, type: 'Leadership PAC' },
  { pattern: /leadership/i, type: 'Leadership PAC' },
  { pattern: /\bllc\b/i, type: 'LLC' },
];

export class BundledContributionsAnalyzer {
  private companyEmployeeMap: Map<string, Set<string>> = new Map();
  private pacCache: Map<string, PACRecord[]> = new Map();

  /**
   * Normalize company names for PAC matching
   */
  private normalizeCompanyName(name: string): string {
    return industryCategorizer
      .normalizeEmployer(name)
      .toLowerCase()
      .replace(/\s+(inc|corp|corporation|company|co|ltd|llc|lp)$/i, '')
      .trim();
  }

  /**
   * Find related PACs for a given company
   */
  private findRelatedPACs(companyName: string): string[] {
    const normalized = this.normalizeCompanyName(companyName);

    // Check direct mappings first
    const directMapping = COMPANY_PAC_MAPPINGS[normalized];
    if (directMapping) {
      return directMapping;
    }

    // Generate potential PAC names
    const potentialPACs: string[] = [];
    const baseNames = [companyName, normalized];

    for (const baseName of baseNames) {
      potentialPACs.push(
        `${baseName} pac`,
        `${baseName} political action committee`,
        `${baseName} inc pac`,
        `${baseName} corp pac`,
        `${baseName} corporation pac`,
        `${baseName} company pac`
      );
    }

    return potentialPACs;
  }

  /**
   * Determine if a committee is a PAC and what type
   */
  private identifyPACType(committeeName: string): { isPac: boolean; type: string | null } {
    const lowerName = committeeName.toLowerCase();

    for (const { pattern, type } of PAC_TYPE_PATTERNS) {
      if (pattern.test(lowerName)) {
        return { isPac: true, type };
      }
    }

    return { isPac: false, type: null };
  }

  /**
   * Calculate similarity between two committee names
   */
  private calculateNameSimilarity(name1: string, name2: string): number {
    const n1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const n2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (n1 === n2) return 1.0;
    if (n1.includes(n2) || n2.includes(n1)) return 0.8;

    // Simple Jaccard similarity using character bigrams
    const getBigrams = (str: string): Set<string> => {
      const bigrams = new Set<string>();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.slice(i, i + 2));
      }
      return bigrams;
    };

    const bigrams1 = getBigrams(n1);
    const bigrams2 = getBigrams(n2);

    const intersection = new Set([...bigrams1].filter(x => bigrams2.has(x)));
    const union = new Set([...bigrams1, ...bigrams2]);

    return intersection.size / union.size;
  }

  /**
   * Match PAC contributions to employee contributions
   */
  private matchPACsToEmployers(
    individualContribs: ContributionRecord[],
    pacContribs: PACRecord[]
  ): Map<string, { employer: string; pacs: PACRecord[] }> {
    const matches = new Map<string, { employer: string; pacs: PACRecord[] }>();

    // Group individual contributions by employer
    const employerGroups = new Map<string, ContributionRecord[]>();
    for (const contrib of individualContribs) {
      const employer = contrib.contributor_employer || 'Individual/Unemployed';
      const normalizedEmployer = this.normalizeCompanyName(employer);

      if (!employerGroups.has(normalizedEmployer)) {
        employerGroups.set(normalizedEmployer, []);
      }
      employerGroups.get(normalizedEmployer)!.push(contrib);
    }

    // For each employer, find matching PACs
    for (const [normalizedEmployer, contribs] of employerGroups) {
      const originalEmployer = contribs[0].contributor_employer || 'Individual/Unemployed';
      const relatedPACs = this.findRelatedPACs(originalEmployer);
      const matchedPACs: PACRecord[] = [];

      // Find PACs that match this employer
      for (const pacContrib of pacContribs) {
        const pacName = pacContrib.committee_name.toLowerCase();
        const { isPac } = this.identifyPACType(pacName);

        if (!isPac) continue;

        // Check for direct matches
        let isMatch = false;
        for (const relatedPAC of relatedPACs) {
          if (
            pacName.includes(relatedPAC.toLowerCase()) ||
            this.calculateNameSimilarity(pacName, relatedPAC) > 0.7
          ) {
            isMatch = true;
            break;
          }
        }

        // Check for employer name similarity
        if (!isMatch && this.calculateNameSimilarity(pacName, normalizedEmployer) > 0.6) {
          isMatch = true;
        }

        if (isMatch) {
          matchedPACs.push(pacContrib);
        }
      }

      if (matchedPACs.length > 0) {
        matches.set(normalizedEmployer, {
          employer: originalEmployer,
          pacs: matchedPACs,
        });
      }
    }

    structuredLogger.info('Matched PACs to employers', {
      employersProcessed: employerGroups.size,
      pacsMatched: matches.size,
      totalPACContribs: pacContribs.length,
      operation: 'pac_employer_matching',
    });

    return matches;
  }

  /**
   * Analyze all contributions and create bundled view
   */
  analyzeBundledContributions(
    individualContribs: ContributionRecord[],
    pacContribs: PACRecord[]
  ): BundledContributor[] {
    const pacMatches = this.matchPACsToEmployers(individualContribs, pacContribs);
    const bundledMap = new Map<string, BundledContributor>();

    // Process individual contributions grouped by employer
    const employerTotals = new Map<string, { total: number; count: number; employer: string }>();

    for (const contrib of individualContribs) {
      const employer = contrib.contributor_employer || 'Individual/Unemployed';
      const normalizedEmployer = this.normalizeCompanyName(employer);
      const amount = contrib.contribution_receipt_amount || 0;

      if (!employerTotals.has(normalizedEmployer)) {
        employerTotals.set(normalizedEmployer, { total: 0, count: 0, employer });
      }

      const totals = employerTotals.get(normalizedEmployer)!;
      totals.total += amount;
      totals.count += 1;
    }

    // Create bundled contributors
    for (const [normalizedEmployer, totals] of employerTotals) {
      const sector = industryCategorizer.categorizeEmployer(totals.employer);
      const pacMatch = pacMatches.get(normalizedEmployer);

      let pacTotal = 0;
      let pacCount = 0;
      const relatedCommittees: Array<{ name: string; type: string; amount: number }> = [];

      if (pacMatch) {
        for (const pac of pacMatch.pacs) {
          const amount = pac.contribution_receipt_amount || 0;
          pacTotal += amount;
          pacCount += 1;

          const { type } = this.identifyPACType(pac.committee_name);
          relatedCommittees.push({
            name: pac.committee_name,
            type: type || 'PAC',
            amount,
          });
        }
      }

      const bundledContributor: BundledContributor = {
        name: totals.employer,
        normalizedName: normalizedEmployer,
        employeeTotal: totals.total,
        employeeCount: totals.count,
        pacTotal,
        pacCount,
        combined: totals.total + pacTotal,
        sector: sector.name,
        relatedCommittees: relatedCommittees.length > 0 ? relatedCommittees : undefined,
      };

      bundledMap.set(normalizedEmployer, bundledContributor);
    }

    // Convert to array and sort by combined total
    const result = Array.from(bundledMap.values())
      .filter(contributor => contributor.combined > 0)
      .sort((a, b) => b.combined - a.combined);

    structuredLogger.info('Completed bundled contributions analysis', {
      totalContributors: result.length,
      withPACContributions: result.filter(c => c.pacTotal > 0).length,
      totalCombinedAmount: result.reduce((sum, c) => sum + c.combined, 0),
      operation: 'bundled_contributions_analysis',
    });

    return result;
  }

  /**
   * Get top bundled contributors by sector
   */
  getTopBundledContributorsBySector(
    bundledContributors: BundledContributor[],
    topN: number = 5
  ): Record<string, BundledContributor[]> {
    const bySector = new Map<string, BundledContributor[]>();

    for (const contributor of bundledContributors) {
      if (!bySector.has(contributor.sector)) {
        bySector.set(contributor.sector, []);
      }
      bySector.get(contributor.sector)!.push(contributor);
    }

    const result: Record<string, BundledContributor[]> = {};
    for (const [sector, contributors] of bySector) {
      result[sector] = contributors.sort((a, b) => b.combined - a.combined).slice(0, topN);
    }

    return result;
  }

  /**
   * Calculate bundling statistics
   */
  getBundlingStatistics(bundledContributors: BundledContributor[]): {
    totalContributors: number;
    withPACContributions: number;
    totalEmployeeAmount: number;
    totalPACAmount: number;
    totalCombinedAmount: number;
    averageBundlingRatio: number;
    topBundledPercentage: number;
  } {
    const totalContributors = bundledContributors.length;
    const withPACContributions = bundledContributors.filter(c => c.pacTotal > 0).length;

    const totalEmployeeAmount = bundledContributors.reduce((sum, c) => sum + c.employeeTotal, 0);
    const totalPACAmount = bundledContributors.reduce((sum, c) => sum + c.pacTotal, 0);
    const totalCombinedAmount = totalEmployeeAmount + totalPACAmount;

    const bundlingRatios = bundledContributors
      .filter(c => c.employeeTotal > 0)
      .map(c => c.pacTotal / c.employeeTotal);

    const averageBundlingRatio =
      bundlingRatios.length > 0
        ? bundlingRatios.reduce((sum, ratio) => sum + ratio, 0) / bundlingRatios.length
        : 0;

    // Top 10 contributors' percentage of total
    const top10Amount = bundledContributors.slice(0, 10).reduce((sum, c) => sum + c.combined, 0);

    const topBundledPercentage =
      totalCombinedAmount > 0 ? (top10Amount / totalCombinedAmount) * 100 : 0;

    return {
      totalContributors,
      withPACContributions,
      totalEmployeeAmount,
      totalPACAmount,
      totalCombinedAmount,
      averageBundlingRatio,
      topBundledPercentage,
    };
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.companyEmployeeMap.clear();
    this.pacCache.clear();
  }
}

// Export singleton instance
export const bundledContributionsAnalyzer = new BundledContributionsAnalyzer();

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';

/**
 * Industry Categorization System for FEC Campaign Finance Data
 * Maps employer strings to industry sectors with normalization and fuzzy matching
 */

export interface IndustrySector {
  name: string;
  category:
    | 'Tech'
    | 'Finance'
    | 'Healthcare'
    | 'Energy'
    | 'Defense'
    | 'Agriculture'
    | 'Manufacturing'
    | 'Media'
    | 'Legal'
    | 'Education'
    | 'Real Estate'
    | 'Transportation'
    | 'Retail'
    | 'Labor'
    | 'Other';
  subcategory?: string;
}

export interface EmployerMapping {
  pattern: RegExp;
  sector: IndustrySector;
  aliases?: string[];
}

export interface ContributionsBySector {
  sector: string;
  amount: number;
  percentage: number;
  count: number;
  topEmployers: Array<{
    name: string;
    normalizedName: string;
    amount: number;
    count: number;
  }>;
}

// Comprehensive employer-to-industry mappings
const EMPLOYER_MAPPINGS: EmployerMapping[] = [
  // Technology Sector
  {
    pattern: /\b(google|alphabet)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'Internet/Software' },
    aliases: ['Google Inc', 'Alphabet Inc', 'Google LLC'],
  },
  {
    pattern: /\b(microsoft|msft)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'Software' },
    aliases: ['Microsoft Corporation', 'Microsoft Corp'],
  },
  {
    pattern: /\b(apple|aapl)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'Hardware/Software' },
    aliases: ['Apple Inc', 'Apple Computer'],
  },
  {
    pattern: /\b(amazon|amzn)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'E-commerce/Cloud' },
    aliases: ['Amazon.com Inc', 'Amazon Web Services', 'AWS'],
  },
  {
    pattern: /\b(meta|facebook|fb)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'Social Media' },
    aliases: ['Meta Platforms Inc', 'Facebook Inc'],
  },
  {
    pattern: /\b(tesla|spacex)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'Electric Vehicles/Space' },
    aliases: ['Tesla Inc', 'Space Exploration Technologies'],
  },
  {
    pattern: /\b(nvidia|intel|amd|qualcomm)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'Semiconductors' },
  },
  {
    pattern: /\b(salesforce|oracle|sap|adobe)\b/i,
    sector: { name: 'Technology', category: 'Tech', subcategory: 'Enterprise Software' },
  },

  // Financial Services
  {
    pattern: /\b(jpmorgan|chase|jp morgan)\b/i,
    sector: { name: 'Financial Services', category: 'Finance', subcategory: 'Banking' },
    aliases: ['JPMorgan Chase & Co', 'Chase Bank'],
  },
  {
    pattern: /\b(goldman|goldman sachs)\b/i,
    sector: { name: 'Financial Services', category: 'Finance', subcategory: 'Investment Banking' },
    aliases: ['Goldman Sachs Group'],
  },
  {
    pattern: /\b(morgan stanley)\b/i,
    sector: { name: 'Financial Services', category: 'Finance', subcategory: 'Investment Banking' },
  },
  {
    pattern: /\b(bank of america|bofa|merrill)\b/i,
    sector: { name: 'Financial Services', category: 'Finance', subcategory: 'Banking' },
    aliases: ['Bank of America Corp', 'Merrill Lynch'],
  },
  {
    pattern: /\b(wells fargo)\b/i,
    sector: { name: 'Financial Services', category: 'Finance', subcategory: 'Banking' },
  },
  {
    pattern: /\b(blackrock|vanguard|fidelity)\b/i,
    sector: { name: 'Financial Services', category: 'Finance', subcategory: 'Asset Management' },
  },
  {
    pattern: /\b(aig|prudential|metlife)\b/i,
    sector: { name: 'Financial Services', category: 'Finance', subcategory: 'Insurance' },
  },

  // Healthcare & Pharmaceuticals
  {
    pattern: /\b(pfizer|johnson|j&j|merck|abbott|bristol)\b/i,
    sector: { name: 'Healthcare', category: 'Healthcare', subcategory: 'Pharmaceuticals' },
  },
  {
    pattern: /\b(unitedhealth|anthem|aetna|cigna|humana)\b/i,
    sector: { name: 'Healthcare', category: 'Healthcare', subcategory: 'Insurance' },
  },
  {
    pattern: /\b(hospital|medical center|health system|clinic)\b/i,
    sector: { name: 'Healthcare', category: 'Healthcare', subcategory: 'Healthcare Services' },
  },
  {
    pattern: /\b(mayo clinic|cleveland clinic|kaiser)\b/i,
    sector: { name: 'Healthcare', category: 'Healthcare', subcategory: 'Healthcare Services' },
  },

  // Energy Sector
  {
    pattern: /\b(exxon|mobil|chevron|conocophillips|bp|shell)\b/i,
    sector: { name: 'Energy', category: 'Energy', subcategory: 'Oil & Gas' },
  },
  {
    pattern: /\b(duke energy|pge|southern company|nextera|dominion)\b/i,
    sector: { name: 'Energy', category: 'Energy', subcategory: 'Utilities' },
  },
  {
    pattern: /\b(first solar|sunpower|enphase|tesla energy)\b/i,
    sector: { name: 'Energy', category: 'Energy', subcategory: 'Renewable Energy' },
  },

  // Defense & Aerospace
  {
    pattern: /\b(lockheed|boeing|raytheon|northrop|general dynamics)\b/i,
    sector: {
      name: 'Defense & Aerospace',
      category: 'Defense',
      subcategory: 'Defense Contractors',
    },
  },
  {
    pattern: /\b(honeywell|l3harris|bae systems)\b/i,
    sector: { name: 'Defense & Aerospace', category: 'Defense', subcategory: 'Defense Technology' },
  },

  // Manufacturing
  {
    pattern: /\b(general electric|ge|caterpillar|3m|honeywell)\b/i,
    sector: { name: 'Manufacturing', category: 'Manufacturing', subcategory: 'Industrial' },
  },
  {
    pattern: /\b(ford|general motors|gm|chrysler|stellantis)\b/i,
    sector: { name: 'Manufacturing', category: 'Manufacturing', subcategory: 'Automotive' },
  },

  // Media & Entertainment
  {
    pattern: /\b(disney|comcast|warner|netflix|paramount)\b/i,
    sector: { name: 'Media & Entertainment', category: 'Media', subcategory: 'Entertainment' },
  },
  {
    pattern: /\b(nyt|washington post|wall street|wsj|cnn|fox)\b/i,
    sector: { name: 'Media & Entertainment', category: 'Media', subcategory: 'News Media' },
  },

  // Legal Services
  {
    pattern: /\b(law firm|attorney|legal|lawyer)\b/i,
    sector: { name: 'Legal Services', category: 'Legal', subcategory: 'Law Firms' },
  },
  {
    pattern: /\b(baker mckenzie|latham|skadden|kirkland|white case)\b/i,
    sector: { name: 'Legal Services', category: 'Legal', subcategory: 'Big Law' },
  },

  // Education
  {
    pattern: /\b(university|college|school|harvard|stanford|mit)\b/i,
    sector: { name: 'Education', category: 'Education', subcategory: 'Higher Education' },
  },

  // Real Estate
  {
    pattern: /\b(real estate|realty|properties|development|construction)\b/i,
    sector: { name: 'Real Estate', category: 'Real Estate', subcategory: 'Real Estate Services' },
  },

  // Transportation
  {
    pattern: /\b(fedex|ups|delta|american airlines|southwest|uber|lyft)\b/i,
    sector: {
      name: 'Transportation',
      category: 'Transportation',
      subcategory: 'Transportation Services',
    },
  },

  // Retail
  {
    pattern: /\b(walmart|target|costco|home depot|lowes)\b/i,
    sector: { name: 'Retail', category: 'Retail', subcategory: 'General Retail' },
  },

  // Labor Organizations
  {
    pattern: /\b(union|afl-cio|teamsters|seiu|uaw|ufcw)\b/i,
    sector: { name: 'Labor Organizations', category: 'Labor', subcategory: 'Labor Unions' },
  },

  // Agriculture
  {
    pattern: /\b(monsanto|cargill|archer daniels|adm|tyson|agriculture)\b/i,
    sector: { name: 'Agriculture', category: 'Agriculture', subcategory: 'Agriculture & Food' },
  },
];

// Common employer normalization patterns
const NORMALIZATION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\s+(inc|corp|corporation|company|co|ltd|llc|lp)\.?$/i, replacement: '' },
  { pattern: /\s+&\s+/g, replacement: ' & ' },
  { pattern: /\s{2,}/g, replacement: ' ' },
  { pattern: /[.,\-_]+$/g, replacement: '' },
  { pattern: /^the\s+/i, replacement: '' },
];

export class IndustryCategorizer {
  private employerCache: Map<string, IndustrySector | null> = new Map();
  private normalizedEmployerCache: Map<string, string> = new Map();

  /**
   * Normalize employer name for better matching
   */
  normalizeEmployer(employer: string): string {
    if (!employer || typeof employer !== 'string') {
      return 'Unknown';
    }

    // Check cache first
    const cached = this.normalizedEmployerCache.get(employer);
    if (cached) {
      return cached;
    }

    let normalized = employer.trim();

    // Apply normalization patterns
    for (const { pattern, replacement } of NORMALIZATION_PATTERNS) {
      normalized = normalized.replace(pattern, replacement);
    }

    normalized = normalized.trim();

    // Cache the result
    this.normalizedEmployerCache.set(employer, normalized);

    return normalized || 'Unknown';
  }

  /**
   * Categorize employer into industry sector
   */
  categorizeEmployer(employer: string): IndustrySector {
    if (!employer || typeof employer !== 'string') {
      return { name: 'Other', category: 'Other' };
    }

    // Check cache first
    const cached = this.employerCache.get(employer);
    if (cached) {
      return cached;
    }

    const normalized = this.normalizeEmployer(employer);

    // Try to find matching pattern
    for (const mapping of EMPLOYER_MAPPINGS) {
      if (mapping.pattern.test(normalized) || mapping.pattern.test(employer)) {
        logger.debug('Matched employer to sector', {
          employer,
          normalized,
          sector: mapping.sector.name,
          pattern: mapping.pattern.source,
          operation: 'employer_categorization',
        });

        this.employerCache.set(employer, mapping.sector);
        return mapping.sector;
      }
    }

    // Check aliases
    for (const mapping of EMPLOYER_MAPPINGS) {
      if (mapping.aliases) {
        for (const alias of mapping.aliases) {
          if (
            normalized.toLowerCase().includes(alias.toLowerCase()) ||
            employer.toLowerCase().includes(alias.toLowerCase())
          ) {
            this.employerCache.set(employer, mapping.sector);
            return mapping.sector;
          }
        }
      }
    }

    // Default to Other
    const defaultSector = { name: 'Other', category: 'Other' as const };
    this.employerCache.set(employer, defaultSector);
    return defaultSector;
  }

  /**
   * Calculate fuzzy match score between two strings
   */
  private getFuzzyMatchScore(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) return 0.8;

    // Simple Levenshtein-based similarity
    const maxLen = Math.max(s1.length, s2.length);
    const distance = this.levenshteinDistance(s1, s2);
    return 1.0 - distance / maxLen;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(0));

    for (let i = 0; i <= str1.length; i++) matrix[0]![i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j]![0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j]![i] = Math.min(
          matrix[j]![i - 1]! + 1, // deletion
          matrix[j - 1]![i]! + 1, // insertion
          matrix[j - 1]![i - 1]! + indicator // substitution
        );
      }
    }

    return matrix[str2.length]![str1.length]!;
  }

  /**
   * Process contributions and group by industry sector
   */
  categorizeContributions(
    contributions: Array<{
      contributor_employer?: string;
      contribution_receipt_amount: number;
      contributor_name: string;
    }>
  ): ContributionsBySector[] {
    const sectorMap = new Map<
      string,
      {
        sector: IndustrySector;
        amount: number;
        count: number;
        employers: Map<string, { normalizedName: string; amount: number; count: number }>;
      }
    >();

    let totalAmount = 0;

    // Process each contribution
    for (const contrib of contributions) {
      const employer = contrib.contributor_employer || 'Individual/Unemployed';
      const amount = contrib.contribution_receipt_amount || 0;
      const sector = this.categorizeEmployer(employer);
      const normalizedEmployer = this.normalizeEmployer(employer);

      totalAmount += amount;

      // Initialize sector if not exists
      if (!sectorMap.has(sector.name)) {
        sectorMap.set(sector.name, {
          sector,
          amount: 0,
          count: 0,
          employers: new Map(),
        });
      }

      const sectorData = sectorMap.get(sector.name)!;
      sectorData.amount += amount;
      sectorData.count += 1;

      // Track employers within sector
      if (!sectorData.employers.has(normalizedEmployer)) {
        sectorData.employers.set(normalizedEmployer, {
          normalizedName: normalizedEmployer,
          amount: 0,
          count: 0,
        });
      }

      const employerData = sectorData.employers.get(normalizedEmployer)!;
      employerData.amount += amount;
      employerData.count += 1;
    }

    // Convert to array format with percentages
    const result: ContributionsBySector[] = Array.from(sectorMap.entries())
      .map(([sectorName, data]) => ({
        sector: sectorName,
        amount: data.amount,
        percentage: totalAmount > 0 ? (data.amount / totalAmount) * 100 : 0,
        count: data.count,
        topEmployers: Array.from(data.employers.values())
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 5)
          .map(emp => ({
            name: emp.normalizedName,
            normalizedName: emp.normalizedName,
            amount: emp.amount,
            count: emp.count,
          })),
      }))
      .sort((a, b) => b.amount - a.amount);

    logger.info('Categorized contributions by industry', {
      totalContributions: contributions.length,
      totalAmount,
      sectorsFound: result.length,
      topSector: result[0]?.sector,
      operation: 'contribution_categorization',
    });

    return result;
  }

  /**
   * Get sector statistics
   */
  getSectorStats(): { totalMappings: number; sectorCounts: Record<string, number> } {
    const sectorCounts: Record<string, number> = {};

    for (const mapping of EMPLOYER_MAPPINGS) {
      const category = mapping.sector.category;
      sectorCounts[category] = (sectorCounts[category] || 0) + 1;
    }

    return {
      totalMappings: EMPLOYER_MAPPINGS.length,
      sectorCounts,
    };
  }

  /**
   * Clear caches (for testing/memory management)
   */
  clearCache(): void {
    this.employerCache.clear();
    this.normalizedEmployerCache.clear();
  }
}

// Export singleton instance
export const industryCategorizer = new IndustryCategorizer();

// Types are already exported above, no need to re-export

/**
 * GDELT Query Builder V2 - Google News Style Multi-Dimensional Search
 * Phase 1: Foundation & Query Intelligence
 *
 * This enhanced query builder creates multi-dimensional search strategies
 * similar to Google News topic discovery, but focused on civic intelligence.
 */

import { EnhancedRepresentative } from '@/types/representative';
import logger from '@/lib/logging/simple-logger';

/**
 * Search dimension types for comprehensive news coverage
 */
export enum SearchDimension {
  IDENTITY = 'identity', // Direct name mentions
  GEOGRAPHIC = 'geographic', // State, district, city coverage
  COMMITTEE = 'committee', // Committee-related news
  POLICY = 'policy', // Policy areas and bills
  TEMPORAL = 'temporal', // Current events context
  LEADERSHIP = 'leadership', // Leadership roles
  PARTY = 'party', // Party-related coverage
  CROSS_REF = 'cross_reference', // Related representatives
}

/**
 * Topic search strategy for multi-dimensional queries
 */
export interface TopicSearchStrategy {
  dimensions: Record<SearchDimension, string[]>;
  weights: Record<SearchDimension, number>;
  timeframe: 'realtime' | '24h' | '7d' | '30d';
  geography: 'local' | 'state' | 'national' | 'all';
}

/**
 * Individual search query with metadata
 */
export interface SearchQuery {
  dimension: SearchDimension;
  query: string;
  weight: number;
  isRequired: boolean;
  searchType: 'exact' | 'proximity' | 'contextual';
}

/**
 * Query cluster for parallel execution
 */
export interface QueryCluster {
  primaryQuery: SearchQuery;
  supportingQueries: SearchQuery[];
  expectedResultCount: number;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Performance metrics for query execution
 */
export interface QueryPerformanceMetrics {
  dimension: SearchDimension;
  queryTime: number;
  resultCount: number;
  relevanceScore: number;
  cacheHit: boolean;
}

/**
 * Enhanced GDELT Query Builder V2
 */
export class GDELTQueryBuilderV2 {
  private static readonly GDELT_BASE_URL = 'https://api.gdeltproject.org/api/v2/doc/doc';

  // Weight configuration for different search dimensions
  private static readonly DEFAULT_WEIGHTS: Record<SearchDimension, number> = {
    [SearchDimension.IDENTITY]: 1.0, // Highest priority
    [SearchDimension.TEMPORAL]: 0.9, // Very high for current events
    [SearchDimension.COMMITTEE]: 0.8, // High for committee work
    [SearchDimension.POLICY]: 0.7, // Important for policy coverage
    [SearchDimension.GEOGRAPHIC]: 0.6, // Medium for regional news
    [SearchDimension.LEADERSHIP]: 0.6, // Medium for leadership roles
    [SearchDimension.PARTY]: 0.5, // Lower for party coverage
    [SearchDimension.CROSS_REF]: 0.4, // Lowest for related reps
  };

  /**
   * Generate multi-dimensional search strategy for a representative
   */
  public static generateSearchStrategy(
    representative: EnhancedRepresentative,
    options: {
      timeframe?: 'realtime' | '24h' | '7d' | '30d';
      geography?: 'local' | 'state' | 'national' | 'all';
      focusDimensions?: SearchDimension[];
    } = {}
  ): TopicSearchStrategy {
    const strategy: TopicSearchStrategy = {
      dimensions: this.buildSearchDimensions(representative),
      weights: { ...this.DEFAULT_WEIGHTS },
      timeframe: options.timeframe || '7d',
      geography: options.geography || 'all',
    };

    // Adjust weights based on focus dimensions
    if (options.focusDimensions) {
      options.focusDimensions.forEach(dim => {
        strategy.weights[dim] = Math.min(strategy.weights[dim] * 1.5, 1.0);
      });
    }

    logger.info('Generated search strategy', {
      component: 'GDELTQueryBuilderV2',
      metadata: {
        representative: representative.bioguideId,
        dimensionCount: Object.keys(strategy.dimensions).length,
        totalTerms: Object.values(strategy.dimensions).flat().length,
      },
    });

    return strategy;
  }

  /**
   * Build search dimensions from representative data
   */
  private static buildSearchDimensions(
    representative: EnhancedRepresentative
  ): Record<SearchDimension, string[]> {
    const dimensions: Record<SearchDimension, string[]> = {
      [SearchDimension.IDENTITY]: this.buildIdentityTerms(representative),
      [SearchDimension.GEOGRAPHIC]: this.buildGeographicTerms(representative),
      [SearchDimension.COMMITTEE]: this.buildCommitteeTerms(representative),
      [SearchDimension.POLICY]: this.buildPolicyTerms(representative),
      [SearchDimension.TEMPORAL]: this.buildTemporalTerms(representative),
      [SearchDimension.LEADERSHIP]: this.buildLeadershipTerms(representative),
      [SearchDimension.PARTY]: this.buildPartyTerms(representative),
      [SearchDimension.CROSS_REF]: this.buildCrossReferenceTerms(representative),
    };

    // Filter out empty dimensions
    Object.keys(dimensions).forEach(key => {
      const dim = key as SearchDimension;
      if (dimensions[dim].length === 0) {
        delete dimensions[dim];
      }
    });

    return dimensions;
  }

  /**
   * Build identity search terms (name variations)
   */
  private static buildIdentityTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];

    // Full name variations
    terms.push(`"${rep.firstName} ${rep.lastName}"`);
    terms.push(`"${rep.chamber === 'Senate' ? 'Senator' : 'Rep.'} ${rep.lastName}"`);

    // Formal titles
    if (rep.chamber === 'Senate') {
      terms.push(`"Senator ${rep.firstName} ${rep.lastName}"`);
      terms.push(`"Sen. ${rep.lastName}"`);
    } else {
      terms.push(`"Representative ${rep.firstName} ${rep.lastName}"`);
      terms.push(`"Rep. ${rep.lastName}"`);
      terms.push(`"Congressman ${rep.lastName}"`);
      if (rep.gender === 'F') {
        terms.push(`"Congresswoman ${rep.lastName}"`);
      }
    }

    // Nickname variations if available
    if (rep.nickname) {
      terms.push(`"${rep.nickname} ${rep.lastName}"`);
    }

    return terms;
  }

  /**
   * Build geographic search terms
   */
  private static buildGeographicTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];

    // State-level terms
    terms.push(`"${rep.state} ${rep.chamber}"`);
    terms.push(`"${rep.state} delegation"`);

    // District-specific for House members
    if (rep.chamber === 'House' && rep.district) {
      terms.push(`"${rep.state}-${rep.district}"`);
      terms.push(`"${rep.state} ${this.getOrdinal(parseInt(rep.district))} district"`);
      terms.push(`"congressional district ${rep.district}" ${rep.state}`);
    }

    // Regional terms
    const region = this.getRegion(rep.state);
    if (region) {
      terms.push(`${region} congress`);
      terms.push(`${region} politics`);
    }

    return terms;
  }

  /**
   * Build committee search terms
   */
  private static buildCommitteeTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];

    if (rep.committees && rep.committees.length > 0) {
      rep.committees.forEach(committee => {
        // Full committee name
        terms.push(`"${committee.name}"`);

        // Common abbreviations
        if (committee.name.includes('Judiciary')) {
          terms.push('"Senate Judiciary"');
          terms.push('"House Judiciary"');
        }

        // With role context
        if (committee.title && committee.title !== 'Member') {
          terms.push(`"${committee.title}" "${committee.name}"`);
        }
      });
    }

    return terms;
  }

  /**
   * Build policy-related search terms
   */
  private static buildPolicyTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];

    // Based on committee assignments, infer policy areas
    if (rep.committees) {
      rep.committees.forEach(committee => {
        const policyAreas = this.getPolicyAreasFromCommittee(committee.name);
        terms.push(...policyAreas);
      });
    }

    // Add general policy terms based on party and chamber
    if (rep.party === 'Democrat') {
      terms.push('climate change legislation', 'healthcare reform', 'voting rights');
    } else if (rep.party === 'Republican') {
      terms.push('border security', 'tax reform', 'energy independence');
    }

    return [...new Set(terms)]; // Remove duplicates
  }

  /**
   * Build temporal/current events search terms
   */
  private static buildTemporalTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();

    // Current session terms
    terms.push(`119th Congress`);
    terms.push(`${currentMonth} ${currentYear} congress`);

    // Seasonal legislative priorities
    const season = this.getCurrentLegislativeSeason();
    if (season === 'budget') {
      terms.push('appropriations', 'federal budget', 'spending bill');
    } else if (season === 'elections') {
      terms.push('midterm elections', 'campaign', 're-election');
    }

    return terms;
  }

  /**
   * Build leadership-related search terms
   */
  private static buildLeadershipTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];

    // Check for leadership positions in committees
    if (rep.committees) {
      rep.committees.forEach(committee => {
        if (committee.title === 'Chair' || committee.title === 'Ranking Member') {
          terms.push(`"${committee.title}" ${rep.lastName}`);
          terms.push(`${committee.name} "${committee.title}"`);
        }
      });
    }

    // Party leadership roles (would need additional data)
    if (rep.leadershipRole) {
      terms.push(`"${rep.leadershipRole}"`);
    }

    return terms;
  }

  /**
   * Build party-related search terms
   */
  private static buildPartyTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];

    terms.push(`${rep.party} ${rep.chamber}`);
    terms.push(`${rep.state} ${rep.party}`);

    if (rep.party === 'Democrat') {
      terms.push('Democratic caucus', 'Democratic agenda');
    } else if (rep.party === 'Republican') {
      terms.push('GOP conference', 'Republican agenda');
    }

    return terms;
  }

  /**
   * Build cross-reference terms for related representatives
   */
  private static buildCrossReferenceTerms(rep: EnhancedRepresentative): string[] {
    const terms: string[] = [];

    // State delegation references
    terms.push(`${rep.state} senators`);
    if (rep.chamber === 'House') {
      terms.push(`${rep.state} representatives`);
    }

    // Bipartisan pairs (would need additional data)
    // Committee colleagues (would need additional data)

    return terms;
  }

  /**
   * Create query clusters for parallel execution
   */
  public static createQueryClusters(
    strategy: TopicSearchStrategy,
    maxClustersPerDimension: number = 3
  ): QueryCluster[] {
    const clusters: QueryCluster[] = [];

    Object.entries(strategy.dimensions).forEach(([dimension, terms]) => {
      const dim = dimension as SearchDimension;
      const weight = strategy.weights[dim];

      // Create primary cluster for this dimension
      const primaryTerms = terms.slice(0, maxClustersPerDimension);
      if (primaryTerms.length > 0) {
        clusters.push({
          primaryQuery: {
            dimension: dim,
            query: this.buildGDELTQuery(primaryTerms, strategy.timeframe),
            weight,
            isRequired: weight >= 0.8,
            searchType: 'exact',
          },
          supportingQueries: terms
            .slice(maxClustersPerDimension, maxClustersPerDimension * 2)
            .map(term => ({
              dimension: dim,
              query: this.buildGDELTQuery([term], strategy.timeframe),
              weight: weight * 0.7,
              isRequired: false,
              searchType: 'contextual',
            })),
          expectedResultCount: Math.floor(100 * weight),
          priority: weight >= 0.8 ? 'high' : weight >= 0.5 ? 'medium' : 'low',
        });
      }
    });

    // Sort clusters by priority
    return clusters.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Build GDELT API query string
   */
  private static buildGDELTQuery(terms: string[], timeframe: string): string {
    const query = terms.join(' OR ');
    const mode = 'artlist';
    const format = 'json';
    const timespan = this.getTimespan(timeframe);

    return `${this.GDELT_BASE_URL}?query=${encodeURIComponent(query)}&mode=${mode}&format=${format}&timespan=${timespan}&maxrecords=100&sort=hybridrel`;
  }

  /**
   * Helper: Get timespan for GDELT API
   */
  private static getTimespan(timeframe: string): string {
    switch (timeframe) {
      case 'realtime':
        return '15min';
      case '24h':
        return '1day';
      case '7d':
        return '7days';
      case '30d':
        return '30days';
      default:
        return '7days';
    }
  }

  /**
   * Helper: Get ordinal suffix for numbers
   */
  private static getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /**
   * Helper: Get region from state
   */
  private static getRegion(state: string): string | null {
    const regions: Record<string, string[]> = {
      Northeast: ['ME', 'NH', 'VT', 'MA', 'RI', 'CT', 'NY', 'PA', 'NJ'],
      Southeast: [
        'DE',
        'MD',
        'DC',
        'VA',
        'WV',
        'NC',
        'SC',
        'GA',
        'FL',
        'KY',
        'TN',
        'MS',
        'AL',
        'LA',
        'AR',
      ],
      Midwest: ['OH', 'IN', 'MI', 'IL', 'MO', 'WI', 'MN', 'IA', 'KS', 'NE', 'SD', 'ND'],
      Southwest: ['TX', 'OK', 'NM', 'AZ'],
      West: ['CO', 'WY', 'MT', 'ID', 'WA', 'OR', 'UT', 'NV', 'CA', 'AK', 'HI'],
    };

    for (const [region, states] of Object.entries(regions)) {
      if (states.includes(state)) return region;
    }
    return null;
  }

  /**
   * Helper: Get policy areas from committee name
   */
  private static getPolicyAreasFromCommittee(committeeName: string): string[] {
    const policyMap: Record<string, string[]> = {
      Judiciary: ['judicial nominations', 'criminal justice', 'immigration law', 'antitrust'],
      Finance: ['tax policy', 'healthcare', 'social security', 'trade'],
      'Armed Services': ['defense spending', 'military', 'national security', 'veterans'],
      'Foreign Relations': ['foreign policy', 'diplomacy', 'international trade', 'treaties'],
      Agriculture: ['farm bill', 'rural development', 'food stamps', 'agricultural subsidies'],
      Banking: ['financial regulation', 'housing', 'economic policy', 'consumer protection'],
      Energy: ['energy policy', 'climate change', 'renewable energy', 'oil and gas'],
      Education: ['education funding', 'student loans', 'workforce development', 'schools'],
      Health: ['healthcare reform', 'Medicare', 'Medicaid', 'public health', 'FDA'],
      Intelligence: [
        'intelligence oversight',
        'cybersecurity',
        'surveillance',
        'national security',
      ],
    };

    for (const [key, policies] of Object.entries(policyMap)) {
      if (committeeName.toLowerCase().includes(key.toLowerCase())) {
        return policies;
      }
    }

    return [];
  }

  /**
   * Helper: Get current legislative season
   */
  private static getCurrentLegislativeSeason(): 'budget' | 'elections' | 'regular' {
    const month = new Date().getMonth();
    if (month >= 8 && month <= 11) return 'budget';
    if (month >= 4 && month <= 6) return 'elections';
    return 'regular';
  }

  /**
   * Measure query performance
   */
  public static measurePerformance(
    dimension: SearchDimension,
    startTime: number,
    resultCount: number,
    cacheHit: boolean = false
  ): QueryPerformanceMetrics {
    const queryTime = Date.now() - startTime;

    return {
      dimension,
      queryTime,
      resultCount,
      relevanceScore: this.calculateRelevanceScore(dimension, resultCount, queryTime),
      cacheHit,
    };
  }

  /**
   * Calculate relevance score based on dimension and results
   */
  private static calculateRelevanceScore(
    dimension: SearchDimension,
    resultCount: number,
    queryTime: number
  ): number {
    const weight = this.DEFAULT_WEIGHTS[dimension];
    const speedScore = Math.max(0, 1 - queryTime / 5000); // Faster is better
    const volumeScore = Math.min(1, resultCount / 50); // More results is better, up to 50

    return weight * 0.5 + speedScore * 0.25 + volumeScore * 0.25;
  }

  /**
   * Optimize query strategy based on performance metrics
   */
  public static optimizeStrategy(
    strategy: TopicSearchStrategy,
    metrics: QueryPerformanceMetrics[]
  ): TopicSearchStrategy {
    const optimized = { ...strategy };

    // Adjust weights based on performance
    metrics.forEach(metric => {
      if (metric.relevanceScore < 0.3) {
        // Reduce weight for poor performing dimensions
        optimized.weights[metric.dimension] *= 0.8;
      } else if (metric.relevanceScore > 0.8) {
        // Increase weight for high performing dimensions
        optimized.weights[metric.dimension] = Math.min(
          1.0,
          optimized.weights[metric.dimension] * 1.2
        );
      }
    });

    logger.info('Optimized search strategy based on performance', {
      component: 'GDELTQueryBuilderV2',
      metadata: {
        originalWeights: strategy.weights,
        optimizedWeights: optimized.weights,
        metricsCount: metrics.length,
      },
    });

    return optimized;
  }
}

export default GDELTQueryBuilderV2;

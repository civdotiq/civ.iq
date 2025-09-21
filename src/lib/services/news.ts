/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * News Service - Enhanced news aggregation with GDELT integration
 *
 * Provides comprehensive news coverage for districts, representatives, and committees
 * using the Advanced GDELT Service with GEO API, television coverage, and trending analysis.
 */

import { AdvancedGDELTService } from './gdelt/AdvancedGDELTService';
import { BaseRepresentative } from '@/types/representative';
import { GDELTResponse, GDELTArticle } from '@/types/gdelt';
import { calculateLocalImpactScore } from '@/features/news/services/gdelt-api';
import logger from '@/lib/logging/simple-logger';

// Initialize the advanced GDELT service
const advancedGDELTService = new AdvancedGDELTService({
  timeout: 30000,
  retryAttempts: 3,
  retryDelayMs: 1000,
});

export interface DistrictNewsResponse {
  articles: GDELTArticle[];
  totalResults: number;
  district: {
    state: string;
    number: string;
    cities?: string[];
  };
  dataSource: 'gdelt-advanced' | 'fallback';
  features: {
    geoTargeted: boolean;
    localIssues: boolean;
    stateCapital: boolean;
  };
}

export interface CommitteeNewsResponse {
  articles: GDELTArticle[];
  totalResults: number;
  committees: Array<{ name: string; type?: 'committee' | 'subcommittee' }>;
  dataSource: 'gdelt-advanced' | 'fallback';
}

export interface AdvancedNewsResponse extends GDELTResponse {
  representative: BaseRepresentative;
  district: {
    state: string;
    number: string;
    cities?: string[];
  };
  committees: Array<{ name: string; type?: 'committee' | 'subcommittee' }>;
  features: {
    geoTargeted: boolean;
    committeeCoverage: boolean;
    televisionCoverage: boolean;
    trendingAnalysis: boolean;
  };
}

/**
 * Get district-specific news using advanced GDELT GEO API
 */
export async function getDistrictNews(
  state: string,
  districtNumber: number,
  limit: number = 20
): Promise<DistrictNewsResponse> {
  try {
    // Create a representative for the district (we'll need representative data for better results)
    const mockRepresentative: BaseRepresentative = {
      bioguideId: `${state}-${districtNumber}`,
      name: `Representative for ${state}-${districtNumber}`,
      firstName: 'Representative',
      lastName: `${state}-${districtNumber}`,
      state,
      district: districtNumber.toString(),
      party: 'Unknown',
      chamber: 'House' as const,
      title: 'Representative',
      terms: [
        {
          congress: '119',
          startYear: '2025',
          endYear: '2027',
          chamber: 'House',
          party: 'Unknown',
          state,
          district: districtNumber.toString(),
        },
      ],
    };

    const district = {
      state: state.toUpperCase(),
      number: districtNumber.toString(),
      cities: getDistrictCities(state.toUpperCase(), districtNumber),
    };

    const result = await advancedGDELTService.fetchDistrictNews(mockRepresentative, district, {
      includeLocalIssues: true,
      radiusKm: 50,
      includeStateCapital: true,
      minPopulation: 10000,
    });

    if (result.data) {
      const limitedArticles = result.data.slice(0, limit);

      return {
        articles: limitedArticles,
        totalResults: limitedArticles.length,
        district,
        dataSource: 'gdelt-advanced',
        features: {
          geoTargeted: true,
          localIssues: true,
          stateCapital: true,
        },
      };
    } else {
      // Fallback response
      return {
        articles: [],
        totalResults: 0,
        district,
        dataSource: 'fallback',
        features: {
          geoTargeted: false,
          localIssues: false,
          stateCapital: false,
        },
      };
    }
  } catch (error) {
    logger.error('District news fetch error', error as Error, {
      operation: 'getDistrictNews',
      state,
      districtNumber,
    });

    return {
      articles: [],
      totalResults: 0,
      district: {
        state: state.toUpperCase(),
        number: districtNumber.toString(),
      },
      dataSource: 'fallback',
      features: {
        geoTargeted: false,
        localIssues: false,
        stateCapital: false,
      },
    };
  }
}

/**
 * Get committee-specific news
 */
export async function getCommitteeNews(
  committees: Array<{ name: string; type?: 'committee' | 'subcommittee' }>,
  limit: number = 20
): Promise<CommitteeNewsResponse> {
  try {
    const result = await advancedGDELTService.fetchCommitteeNews(committees, {
      includeSubcommittees: true,
      includeRelatedBills: true,
      timeframe: '14days',
    });

    if (result.data) {
      const limitedArticles = result.data.slice(0, limit);

      return {
        articles: limitedArticles,
        totalResults: limitedArticles.length,
        committees,
        dataSource: 'gdelt-advanced',
      };
    } else {
      return {
        articles: [],
        totalResults: 0,
        committees,
        dataSource: 'fallback',
      };
    }
  } catch (error) {
    logger.error('Committee news fetch error', error as Error, {
      operation: 'getCommitteeNews',
      committees: committees.map(c => c.name),
    });

    return {
      articles: [],
      totalResults: 0,
      committees,
      dataSource: 'fallback',
    };
  }
}

/**
 * Get comprehensive advanced news for a representative
 */
export async function getAdvancedRepresentativeNews(
  representative: BaseRepresentative,
  committees: Array<{ name: string; type?: 'committee' | 'subcommittee' }> = [],
  options: {
    includeTelevision?: boolean;
    includeTrending?: boolean;
    includeDistrict?: boolean;
    limit?: number;
  } = {}
): Promise<AdvancedNewsResponse> {
  try {
    const limit = options.limit ?? 30;
    const district = {
      state: representative.state,
      number: representative.district || '1',
      cities: getDistrictCities(representative.state, parseInt(representative.district || '1')),
    };

    const result = await advancedGDELTService.fetchAdvancedNews(
      representative,
      district,
      committees,
      {
        includeTelevision: options.includeTelevision ?? true,
        trendingThreshold: 3,
        includeImages: true,
        minTone: undefined, // Include all tones
        maxTone: undefined,
      }
    );

    if (result.data) {
      const limitedArticles = result.data.articles ? result.data.articles.slice(0, limit) : [];

      // Add local impact scores to each article
      const articlesWithLocalImpact = limitedArticles.map(article => ({
        ...article,
        localImpact: calculateLocalImpactScore(
          article,
          representative.name,
          representative.state,
          representative.district || '1'
        ),
      }));

      return {
        ...result.data,
        articles: articlesWithLocalImpact,
        representative,
        district,
        committees,
        features: {
          geoTargeted: options.includeDistrict ?? true,
          committeeCoverage: committees.length > 0,
          televisionCoverage: options.includeTelevision ?? true,
          trendingAnalysis: options.includeTrending ?? true,
        },
        metadata: {
          ...result.data.metadata,
          totalResults: articlesWithLocalImpact.length,
        },
      };
    } else {
      // Fallback response
      return {
        articles: [],
        television: [],
        trending: [],
        representative,
        district,
        committees,
        features: {
          geoTargeted: false,
          committeeCoverage: false,
          televisionCoverage: false,
          trendingAnalysis: false,
        },
        metadata: {
          totalResults: 0,
          timespan: '7days',
          theme: 'GENERAL_GOVERNMENT',
        },
      };
    }
  } catch (error) {
    logger.error('Advanced representative news fetch error', error as Error, {
      operation: 'getAdvancedRepresentativeNews',
      bioguideId: representative.bioguideId,
      committeesCount: committees.length,
    });

    return {
      articles: [],
      television: [],
      trending: [],
      representative,
      district: {
        state: representative.state,
        number: representative.district || '1',
      },
      committees,
      features: {
        geoTargeted: false,
        committeeCoverage: false,
        televisionCoverage: false,
        trendingAnalysis: false,
      },
      metadata: {
        totalResults: 0,
        timespan: '7days',
        theme: 'GENERAL_GOVERNMENT',
      },
    };
  }
}

/**
 * Get major cities for a congressional district (simplified mapping)
 */
function getDistrictCities(state: string, districtNumber: number): string[] {
  // This is a simplified mapping - in a real implementation, this would come from a comprehensive database
  const districtCityMap: Record<string, Record<number, string[]>> = {
    TX: {
      1: ['Marshall', 'Longview', 'Tyler'],
      2: ['Huntsville', 'Conroe', 'Spring'],
      3: ['Plano', 'McKinney', 'Allen'],
      21: ['San Antonio', 'New Braunfels'],
      // Add more as needed
    },
    CA: {
      1: ['Eureka', 'Redding', 'Chico'],
      12: ['San Francisco', 'Daly City'],
      34: ['Los Angeles', 'Hollywood'],
      // Add more as needed
    },
    NY: {
      1: ['Brookhaven', 'Islip', 'Babylon'],
      14: ['Bronx', 'Mount Vernon'],
      // Add more as needed
    },
    // Add more states as needed
  };

  return districtCityMap[state]?.[districtNumber] || [];
}

/**
 * Clear GDELT cache (useful for testing and manual refresh)
 */
export function clearNewsCache(): void {
  advancedGDELTService.clearCache();
}

/**
 * Get cache statistics for monitoring
 */
export function getNewsCacheStats() {
  return advancedGDELTService.getCacheStats();
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Advanced GDELT Service - Extended GDELT API Integration
 *
 * Extends the base GDELT service with advanced features:
 * - District-specific GEO API queries
 * - Committee-related news tracking
 * - Television coverage integration
 * - Trending topic detection
 */

import {
  GDELTArticle,
  GDELTResponse,
  GDELTError,
  GDELTErrorType,
  GDELTAdvancedOptions,
  GDELTTelevisionMention,
  GDELTTrendingTopic,
  Result,
} from '@/types/gdelt';
import { BaseRepresentative } from '@/types/representative';
import { GDELTService, GDELTServiceOptions } from './GDELTService';

export interface DistrictNewsOptions {
  readonly includeLocalIssues?: boolean;
  readonly radiusKm?: number;
  readonly includeStateCapital?: boolean;
  readonly minPopulation?: number;
}

export interface CommitteeNewsOptions {
  readonly includeSubcommittees?: boolean;
  readonly includeRelatedBills?: boolean;
  readonly timeframe?: string; // e.g., '30days', '7days'
}

export interface TelevisionCoverageOptions {
  readonly networks?: readonly string[]; // CNN, Fox, MSNBC, etc.
  readonly minDuration?: number; // Minimum mention duration in seconds
  readonly includeTranscripts?: boolean;
}

export interface TrendingAnalysisOptions {
  readonly minMentions?: number;
  readonly trendingWindow?: string; // Time window for trending analysis
  readonly compareToBaseline?: boolean;
}

export class AdvancedGDELTService extends GDELTService {
  constructor(options: GDELTServiceOptions = {}) {
    super(options);
  }

  /**
   * Fetch district-specific news using GDELT GEO API
   */
  async fetchDistrictNews(
    representative: BaseRepresentative,
    district: { state: string; number: string; cities?: string[] },
    options: DistrictNewsOptions = {}
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    const _radiusKm = options.radiusKm ?? 50; // For future GEO API implementation
    const includeLocalIssues = options.includeLocalIssues ?? true;

    try {
      // Build location-based queries
      const locationQueries: string[] = [];

      // Add major cities in the district
      if (district.cities && district.cities.length > 0) {
        district.cities.forEach(city => {
          if (city.length >= 3) {
            // GDELT minimum query length
            locationQueries.push(`"${city}" ${district.state}`);
          }
        });
      }

      // Add district-specific query
      const districtQuery = `"${district.state} ${district.number}th district"`;
      locationQueries.push(districtQuery);

      // Include state capital if requested
      if (options.includeStateCapital) {
        const stateCapitals: Record<string, string> = {
          AL: 'Montgomery',
          AK: 'Juneau',
          AZ: 'Phoenix',
          AR: 'Little Rock',
          CA: 'Sacramento',
          CO: 'Denver',
          CT: 'Hartford',
          DE: 'Dover',
          FL: 'Tallahassee',
          GA: 'Atlanta',
          HI: 'Honolulu',
          ID: 'Boise',
          IL: 'Springfield',
          IN: 'Indianapolis',
          IA: 'Des Moines',
          KS: 'Topeka',
          KY: 'Frankfort',
          LA: 'Baton Rouge',
          ME: 'Augusta',
          MD: 'Annapolis',
          MA: 'Boston',
          MI: 'Lansing',
          MN: 'Saint Paul',
          MS: 'Jackson',
          MO: 'Jefferson City',
          MT: 'Helena',
          NE: 'Lincoln',
          NV: 'Carson City',
          NH: 'Concord',
          NJ: 'Trenton',
          NM: 'Santa Fe',
          NY: 'Albany',
          NC: 'Raleigh',
          ND: 'Bismarck',
          OH: 'Columbus',
          OK: 'Oklahoma City',
          OR: 'Salem',
          PA: 'Harrisburg',
          RI: 'Providence',
          SC: 'Columbia',
          SD: 'Pierre',
          TN: 'Nashville',
          TX: 'Austin',
          UT: 'Salt Lake City',
          VT: 'Montpelier',
          VA: 'Richmond',
          WA: 'Olympia',
          WV: 'Charleston',
          WI: 'Madison',
          WY: 'Cheyenne',
        };

        const capital = stateCapitals[district.state];
        if (capital) {
          locationQueries.push(`"${capital}" ${district.state}`);
        }
      }

      // Execute geo-based searches
      const geoResults: GDELTArticle[] = [];

      for (const locationQuery of locationQueries) {
        // Note: GEO API parameters would be used with GDELT's advanced API access

        const result = await this.fetchArticles(locationQuery, {
          timespan: '7days',
          maxrecords: 25,
          theme: 'GENERAL_GOVERNMENT',
        });

        if (result.data) {
          geoResults.push(...result.data);
        }
      }

      // Add local issues if requested
      if (includeLocalIssues) {
        const localIssueQueries = [
          `"local government" ${district.state}`,
          `"city council" ${district.state}`,
          `"county commissioner" ${district.state}`,
          `"infrastructure" ${district.state}`,
          `"education funding" ${district.state}`,
        ];

        for (const issueQuery of localIssueQueries) {
          const result = await this.fetchArticles(issueQuery, {
            timespan: '14days',
            maxrecords: 10,
          });

          if (result.data) {
            geoResults.push(...result.data);
          }
        }
      }

      // Deduplicate and sort by relevance
      const uniqueArticles = this.deduplicateArticles(geoResults);

      return { data: uniqueArticles };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'District news fetch failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Fetch committee-related news
   */
  async fetchCommitteeNews(
    committees: Array<{ name: string; type?: 'committee' | 'subcommittee' }>,
    options: CommitteeNewsOptions = {}
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    const timeframe = options.timeframe ?? '14days';
    const includeSubcommittees = options.includeSubcommittees ?? true;

    try {
      const committeeResults: GDELTArticle[] = [];

      for (const committee of committees) {
        // Skip subcommittees if not requested
        if (committee.type === 'subcommittee' && !includeSubcommittees) {
          continue;
        }

        // Build committee-specific queries
        const committeeQueries = [
          `"${committee.name}"`,
          `"${committee.name}" Congress`,
          `"${committee.name}" hearing`,
          `"${committee.name}" markup`,
        ];

        for (const query of committeeQueries) {
          const result = await this.fetchArticles(query, {
            timespan: timeframe,
            maxrecords: 15,
            theme: 'GENERAL_GOVERNMENT',
          });

          if (result.data) {
            committeeResults.push(...result.data);
          }
        }
      }

      const uniqueArticles = this.deduplicateArticles(committeeResults);
      return { data: uniqueArticles };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Committee news fetch failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Fetch television coverage (simulated - GDELT TV API requires special access)
   */
  async fetchTelevisionCoverage(
    representative: BaseRepresentative,
    _options: TelevisionCoverageOptions = {}
  ): Promise<Result<GDELTTelevisionMention[], GDELTError>> {
    // Note: GDELT Television API requires special access and different endpoints
    // This is a simulation of what the TV coverage API would return

    try {
      // In a real implementation, this would query GDELT's TV API
      // For now, we'll search for TV-related articles as a proxy
      const tvQueries = [
        `"${representative.name}" television interview`,
        `"${representative.name}" CNN`,
        `"${representative.name}" Fox News`,
        `"${representative.name}" MSNBC`,
        `"${representative.name}" Sunday show`,
      ];

      const tvMentions: GDELTTelevisionMention[] = [];

      for (const query of tvQueries) {
        const result = await this.fetchArticles(query, {
          timespan: '7days',
          maxrecords: 10,
        });

        if (result.data) {
          // Convert articles to TV mentions (simulation)
          result.data.forEach(article => {
            const station = this.extractTVStation(article.domain || '');
            if (station) {
              tvMentions.push({
                station,
                datetime: article.seendate,
                snippet: article.title || '',
                tone: article.tone ?? undefined,
                mentionContext: 'interview', // Simulated
              });
            }
          });
        }
      }

      return { data: tvMentions };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'TV coverage fetch failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Analyze trending topics related to a representative
   */
  async analyzeTrendingTopics(
    representative: BaseRepresentative,
    options: TrendingAnalysisOptions = {}
  ): Promise<Result<GDELTTrendingTopic[], GDELTError>> {
    const minMentions = options.minMentions ?? 5;
    const trendingWindow = options.trendingWindow ?? '7days';

    try {
      // Fetch recent articles to analyze trending topics
      const result = await this.fetchMemberArticles(representative, {
        timespan: trendingWindow,
        maxrecords: 100,
      });

      if (!result.data) {
        return result as Result<GDELTTrendingTopic[], GDELTError>;
      }

      // Analyze article titles and content for trending topics
      const topicCounts = new Map<string, number>();
      const topicDates = new Map<string, string[]>();

      result.data.forEach(article => {
        if (article.title) {
          const keywords = this.extractKeywords(article.title);
          keywords.forEach(keyword => {
            topicCounts.set(keyword, (topicCounts.get(keyword) || 0) + 1);
            if (!topicDates.has(keyword)) {
              topicDates.set(keyword, []);
            }
            topicDates.get(keyword)!.push(article.seendate);
          });
        }
      });

      // Calculate trending scores and filter by minimum mentions
      const trendingTopics: GDELTTrendingTopic[] = [];

      topicCounts.forEach((count, topic) => {
        if (count >= minMentions) {
          const dates = topicDates.get(topic) || [];
          const peakDate = this.findPeakDate(dates);
          const trendScore = this.calculateTrendScore(count, dates);

          trendingTopics.push({
            topic,
            mentionCount: count,
            trendScore,
            timeframe: trendingWindow,
            peakDate,
            associatedEvents: [], // Could be enhanced with event detection
          });
        }
      });

      // Sort by trend score
      trendingTopics.sort((a, b) => b.trendScore - a.trendScore);

      return { data: trendingTopics };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Trending analysis failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * Combined advanced news fetch with all features
   */
  async fetchAdvancedNews(
    representative: BaseRepresentative,
    district: { state: string; number: string; cities?: string[] },
    committees: Array<{ name: string; type?: 'committee' | 'subcommittee' }>,
    options: GDELTAdvancedOptions = {}
  ): Promise<Result<GDELTResponse, GDELTError>> {
    try {
      const [memberArticles, districtNews, committeeNews, tvCoverage, trendingTopics] =
        await Promise.allSettled([
          this.fetchMemberArticles(representative),
          this.fetchDistrictNews(representative, district),
          this.fetchCommitteeNews(committees),
          options.includeTelevision
            ? this.fetchTelevisionCoverage(representative)
            : Promise.resolve({ data: [] }),
          this.analyzeTrendingTopics(representative),
        ]);

      // Combine all successful results
      const allArticles: GDELTArticle[] = [];

      if (memberArticles.status === 'fulfilled' && memberArticles.value.data) {
        allArticles.push(...memberArticles.value.data);
      }

      if (districtNews.status === 'fulfilled' && districtNews.value.data) {
        allArticles.push(...districtNews.value.data);
      }

      if (committeeNews.status === 'fulfilled' && committeeNews.value.data) {
        allArticles.push(...committeeNews.value.data);
      }

      const television =
        tvCoverage.status === 'fulfilled' && tvCoverage.value.data ? tvCoverage.value.data : [];

      const trending =
        trendingTopics.status === 'fulfilled' && trendingTopics.value.data
          ? trendingTopics.value.data
          : [];

      // Deduplicate articles and apply filters
      const uniqueArticles = this.deduplicateArticles(allArticles);
      const filteredArticles = this.applyAdvancedFilters(uniqueArticles, options);

      const response: GDELTResponse = {
        articles: filteredArticles,
        television,
        trending,
        metadata: {
          totalResults: filteredArticles.length,
          timespan: '7days',
          theme: 'GENERAL_GOVERNMENT',
        },
      };

      return { data: response };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Advanced news fetch failed',
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  // Private helper methods

  private deduplicateArticles(articles: GDELTArticle[]): GDELTArticle[] {
    const seen = new Set<string>();
    return articles.filter(article => {
      const key = article.url || article.title || '';
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private extractTVStation(domain: string): string | null {
    const tvStations: Record<string, string> = {
      'cnn.com': 'CNN',
      'foxnews.com': 'Fox News',
      'msnbc.com': 'MSNBC',
      'abcnews.go.com': 'ABC News',
      'cbsnews.com': 'CBS News',
      'nbcnews.com': 'NBC News',
      'pbs.org': 'PBS',
      'c-span.org': 'C-SPAN',
    };

    for (const [domainPattern, station] of Object.entries(tvStations)) {
      if (domain.includes(domainPattern)) {
        return station;
      }
    }

    return null;
  }

  private extractKeywords(title: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(
        word =>
          ![
            'this',
            'that',
            'with',
            'from',
            'they',
            'have',
            'will',
            'been',
            'said',
            'says',
          ].includes(word)
      );

    // Return top keywords
    return words.slice(0, 5);
  }

  private findPeakDate(dates: string[]): string | undefined {
    if (dates.length === 0) return undefined;

    // Group by date and find the date with most mentions
    const dateCounts = new Map<string, number>();
    dates.forEach(date => {
      const dateOnly = date.split('T')[0]; // Get just the date part
      if (dateOnly) {
        dateCounts.set(dateOnly, (dateCounts.get(dateOnly) || 0) + 1);
      }
    });

    let maxCount = 0;
    let peakDate = '';
    dateCounts.forEach((count, date) => {
      if (count > maxCount) {
        maxCount = count;
        peakDate = date;
      }
    });

    return peakDate;
  }

  private calculateTrendScore(count: number, dates: string[]): number {
    // Simple trend score calculation
    // In a real implementation, this would be more sophisticated
    const recency = this.calculateRecencyScore(dates);
    const volume = Math.log(count + 1);
    return recency * volume;
  }

  private calculateRecencyScore(dates: string[]): number {
    if (dates.length === 0) return 0;

    const now = new Date();
    const recentDates = dates.filter(date => {
      const articleDate = new Date(date);
      const daysDiff = (now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 2; // Recent means within 2 days
    });

    return recentDates.length / dates.length;
  }

  private applyAdvancedFilters(
    articles: GDELTArticle[],
    options: GDELTAdvancedOptions
  ): GDELTArticle[] {
    let filtered = articles;

    // Apply tone filters
    if (options.minTone !== undefined || options.maxTone !== undefined) {
      filtered = filtered.filter(article => {
        if (article.tone === null || article.tone === undefined) return true;

        if (options.minTone !== undefined && article.tone < options.minTone) return false;
        if (options.maxTone !== undefined && article.tone > options.maxTone) return false;

        return true;
      });
    }

    // Apply source filters
    if (options.sources && options.sources.length > 0) {
      filtered = filtered.filter(article => {
        if (!article.domain) return false;
        return options.sources!.some(source => article.domain!.includes(source));
      });
    }

    // Apply exclude sources filter
    if (options.excludeSources && options.excludeSources.length > 0) {
      filtered = filtered.filter(article => {
        if (!article.domain) return true;
        return !options.excludeSources!.some(source => article.domain!.includes(source));
      });
    }

    // Filter for images if requested
    if (options.includeImages) {
      filtered = filtered.filter(article => article.socialimage);
    }

    return filtered;
  }
}

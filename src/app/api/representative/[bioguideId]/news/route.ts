/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import {
  normalizeGDELTArticle,
  fetchGDELTNews,
  calculateLocalImpactScore,
} from '@/features/news/services/gdelt-api';
import { getAdvancedRepresentativeNews } from '@/lib/services/news';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

export const dynamic = 'force-dynamic';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
  localImpact?: {
    score: number;
    localRelevance: 'high' | 'medium' | 'low';
    factors: string[];
  };
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'gdelt' | 'cached' | 'fallback';
  cacheStatus?: string;
  pagination?: {
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    totalPages: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '15');
  const page = parseInt(searchParams.get('page') || '1');
  const enableAdvanced = searchParams.get('advanced') === 'true';
  const includeTelevision = searchParams.get('tv') === 'true';
  const includeTrending = searchParams.get('trending') === 'true';

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  // Use advanced GDELT service if requested
  if (enableAdvanced) {
    try {
      // Get representative info for advanced news
      const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);

      if (!repResponse.ok) {
        throw new Error('Representative not found');
      }

      const repData = await repResponse.json();
      const representative = repData.representative as EnhancedRepresentative;

      // Extract committees from representative data
      const committees =
        representative.committees?.map(committee => ({
          name: committee.name,
          type: 'committee' as const,
        })) || [];

      const advancedNews = await getAdvancedRepresentativeNews(representative, committees, {
        includeTelevision,
        includeTrending,
        includeDistrict: true,
        limit,
      });

      return NextResponse.json({
        ...advancedNews,
        cacheStatus: 'Advanced GDELT integration with GEO, TV, and trending analysis',
      });
    } catch (error) {
      logger.error(
        'Advanced news API error',
        error as Error,
        {
          bioguideId,
          operation: 'advanced_news_api_error',
        },
        request
      );

      // Fall back to standard news if advanced fails
    }
  }

  try {
    // Use cached fetch with 30-minute TTL as specified in project docs
    const cacheKey = `news-${bioguideId}-${limit}-${page}-v4`; // v4 to include expanded district mappings
    const TTL_30_MINUTES = 30 * 60; // 30 minutes in seconds

    const newsData = await cachedFetch(
      cacheKey,
      async (): Promise<NewsResponse> => {
        // First, get representative info for search optimization
        let representative;
        try {
          const repResponse = await fetch(
            `${request.nextUrl.origin}/api/representative/${bioguideId}`
          );

          if (repResponse.ok) {
            const repData = await repResponse.json();
            const enhancedRep = repData.representative as EnhancedRepresentative;

            // Extract the correct fields from the API response
            // Handle both BaseRepresentative and EnhancedRepresentative structures
            const fullName = enhancedRep.fullName
              ? `${enhancedRep.fullName.first} ${enhancedRep.fullName.last}`
              : enhancedRep.name;

            representative = {
              ...enhancedRep,
              name: fullName || `${enhancedRep.firstName} ${enhancedRep.lastName}`,
              state: enhancedRep.state,
              district: enhancedRep.district,
              party: enhancedRep.party,
              bioguideId: enhancedRep.bioguideId || bioguideId,
              chamber: enhancedRep.chamber,
            };

            // Validate we have the minimum required data
            if (!representative.name || representative.name.includes('undefined')) {
              throw new Error('Invalid representative data - missing name');
            }
          } else {
            throw new Error('Representative not found');
          }
        } catch (error) {
          logger.warn(
            'Could not fetch representative info, using fallback',
            {
              bioguideId,
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: 'representative_info_fallback',
            },
            request
          );

          // Use sample news articles when representative info unavailable
          representative = {
            name: 'Representative',
            state: 'US',
            district: '1',
            party: 'Unknown',
            bioguideId: bioguideId,
            chamber: 'House',
          };
        }

        logger.info(
          'Fetching news for representative',
          {
            bioguideId,
            representativeName: representative.name,
            state: representative.state,
            operation: 'news_fetch',
          },
          request
        );

        // Use simpler, more effective queries that actually return results
        // Build simple but effective search terms
        const simpleName =
          representative.name || `${representative.firstName} ${representative.lastName}`;
        const lastName = representative.lastName || representative.name?.split(' ').pop() || '';
        const state = representative.state || '';

        // Create multiple simple queries that are more likely to return results
        // GDELT requires keywords to be at least 3 characters, so we need to use full state names
        const stateNameMap: Record<string, string> = {
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
        };

        const fullStateName = stateNameMap[state] || state;

        const searchTerms = [
          // Simple full name search
          simpleName,
          // Last name with full state name (not abbreviation)
          fullStateName && fullStateName.length >= 3 ? `${lastName} ${fullStateName}` : lastName,
          // Name with title
          representative.chamber === 'Senate'
            ? `Senator ${lastName}`
            : `Representative ${lastName}`,
        ].filter(term => term && term.trim().length > 0);

        logger.info(
          'Generated optimized search terms',
          {
            bioguideId,
            searchTerms,
            searchTermsCount: searchTerms.length,
            state,
            fullStateName,
            lastName,
            simpleName,
            operation: 'news_search_terms_generation',
          },
          request
        );

        // Calculate pagination offset
        const offset = (page - 1) * limit;

        // Fetch news from GDELT with intelligent deduplication
        // Fetch extra articles to account for pagination and deduplication
        const totalNeeded = offset + limit;
        const articlesPerTerm = Math.ceil((totalNeeded * 1.5) / searchTerms.length); // Fetch more to account for deduplication
        let totalDuplicatesRemoved = 0;

        const fetchPromises = searchTerms.map(async (searchTerm, _index) => {
          try {
            // Use simple fetchGDELTNews for better results
            const gdeltArticles = await fetchGDELTNews(searchTerm, articlesPerTerm);
            return gdeltArticles.map(article => normalizeGDELTArticle(article));
          } catch (error) {
            logger.error(
              `Error fetching GDELT news for term: ${searchTerm}`,
              error as Error,
              {
                bioguideId,
                searchTerm,
                operation: 'gdelt_news_fetch_error',
              },
              request
            );
            return [];
          }
        });

        const results = await Promise.all(fetchPromises);
        const flattenedArticles = results.flat();

        // Apply advanced clustering to group related stories
        const { newsClusteringService } = await import('@/features/news/utils/news-clustering');
        const clusteringResult = newsClusteringService.clusterNews(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          flattenedArticles.map((article: any) => ({
            url: article.url,
            title: article.title,
            seendate: article.publishedDate,
            domain: article.domain || new URL(article.url).hostname,
            socialimage: article.imageUrl,
            language: article.language || 'en',
          })),
          {
            maxClusters: 5,
            minClusterSize: 2,
            titleSimilarityThreshold: 0.75,
            timespanHours: 48,
          }
        );

        // Convert clusters back to articles, keeping primary articles
        const clusteredArticles = clusteringResult.clusters
          .map(cluster => {
            const primaryArticle = flattenedArticles.find(
              (a: unknown) => (a as { url: string }).url === cluster.primaryArticle.url
            );
            const articleData = primaryArticle as Record<string, unknown>;
            return {
              ...articleData,
              relatedStories: cluster.relatedArticles.length,
              sources: cluster.sources.join(', '),
              category: cluster.category,
              importance: cluster.importance,
            };
          })
          .filter(Boolean);

        // Add unclustered articles
        const unclusteredArticles = clusteringResult.unclustered
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map(unclustered => flattenedArticles.find((a: any) => a.url === unclustered.url))
          .filter(Boolean);

        const finalArticles = [...clusteredArticles, ...unclusteredArticles];

        // Apply quality filters and final deduplication to the clustered articles
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const qualityFilteredArticles = finalArticles.filter((article: unknown) => {
          const articleData = article as {
            publishedDate: string;
            language: string;
            title: string;
            domain: string;
          };
          const articleDate = new Date(articleData.publishedDate);

          return (
            articleData.language === 'English' &&
            articleData.title.length > 15 &&
            articleData.title.length < 300 &&
            articleDate >= thirtyDaysAgo &&
            !articleData.title.toLowerCase().includes('404') &&
            !articleData.title.toLowerCase().includes('error') &&
            !articleData.domain.includes('facebook.com') &&
            !articleData.domain.includes('twitter.com')
          );
        });

        // Final cross-term deduplication using enhanced system
        const { deduplicateEnhancedNews } = await import(
          '@/features/news/services/enhanced-deduplication'
        );
        const { articles: finalDeduplicatedArticles, stats: finalStats } = deduplicateEnhancedNews(
          qualityFilteredArticles.map((article: unknown) => {
            const articleData = article as {
              url: string;
              title: string;
              publishedDate: string;
              domain: string;
              imageUrl?: string;
              language: string;
            };
            return {
              url: articleData.url,
              title: articleData.title,
              seendate: articleData.publishedDate,
              domain: articleData.domain,
              socialimage: articleData.imageUrl,
              language: articleData.language,
            };
          }),
          {
            titleSimilarityThreshold: 0.9,
            maxArticlesPerDomain: 1,
            preserveNewestArticles: true,
          }
        );

        totalDuplicatesRemoved += finalStats.duplicatesRemoved;

        // Convert back and sort by date (most recent first)
        const uniqueArticles = finalDeduplicatedArticles.map(article => {
          // Calculate local impact score for geographic relevance
          const localImpact = calculateLocalImpactScore(
            {
              title: article.title,
              url: article.url,
              domain: article.domain,
              seendate: article.seendate,
              socialimage: article.socialimage,
              language: article.language || 'English',
              sourcecountry: 'US',
            },
            representative.name,
            representative.state,
            representative.district
          );

          logger.info('✅ Calculated local impact score', {
            articleTitle: article.title.slice(0, 50),
            representativeName: representative.name,
            state: representative.state,
            district: representative.district,
            localImpact,
            operation: 'local_impact_calculation',
          });

          return {
            title: article.title,
            url: article.url,
            publishedDate: article.seendate,
            domain: article.domain,
            imageUrl: article.socialimage,
            language: article.language || 'English',
            source:
              (
                qualityFilteredArticles.find(
                  (orig: unknown) => (orig as { url: string }).url === article.url
                ) as { source?: string }
              )?.source || article.domain,
            localImpact,
          };
        });

        const sortedArticles = uniqueArticles
          .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
          .slice(offset, offset + limit);

        // Log deduplication statistics
        logger.info(
          'News deduplication completed',
          {
            bioguideId,
            originalCount: flattenedArticles.length,
            afterQualityFilter: qualityFilteredArticles.length,
            totalDuplicatesRemoved,
            finalCount: sortedArticles.length,
            operation: 'news_deduplication_complete',
          },
          request
        );

        // Log when no real articles are found - return empty instead of sample data
        if (sortedArticles.length === 0) {
          logger.info('No GDELT articles found, returning empty result', {
            bioguideId,
            representativeName: representative.name,
            searchTerms: searchTerms.length,
            searchTermsUsed: searchTerms,
          });
        }

        const totalArticlesBeforePagination = uniqueArticles.length;

        return {
          articles: sortedArticles,
          totalResults: totalArticlesBeforePagination,
          searchTerms,
          dataSource: sortedArticles.length > 0 ? 'gdelt' : 'fallback',
          pagination: {
            currentPage: page,
            limit: limit,
            hasNextPage: offset + limit < totalArticlesBeforePagination,
            totalPages: Math.ceil(totalArticlesBeforePagination / limit),
          },
        };
      },
      TTL_30_MINUTES
    );

    // Return empty result when no real news is available
    if (newsData.articles.length === 0) {
      logger.info('No real news data available from GDELT', {
        bioguideId,
      });

      const emptyResponse: NewsResponse = {
        articles: [],
        totalResults: 0,
        searchTerms: newsData.searchTerms,
        dataSource: 'gdelt',
        cacheStatus: 'No news articles currently available for this representative',
        pagination: {
          currentPage: page,
          limit: limit,
          hasNextPage: false,
          totalPages: 0,
        },
      };

      return NextResponse.json(emptyResponse);
    }

    // Add cache status to response
    const response: NewsResponse = {
      ...newsData,
      cacheStatus: 'Live news data',
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      'News API Error',
      error as Error,
      {
        bioguideId,
        operation: 'news_api_error',
      },
      request
    );

    // Comprehensive error response with fallback
    const errorResponse: NewsResponse = {
      articles: [],
      totalResults: 0,
      searchTerms: [],
      dataSource: 'fallback',
      cacheStatus: 'API temporarily unavailable',
      pagination: {
        currentPage: page,
        limit: limit,
        hasNextPage: false,
        totalPages: 0,
      },
    };

    return NextResponse.json(errorResponse, { status: 200 }); // Return 200 to avoid breaking UI
  }
}

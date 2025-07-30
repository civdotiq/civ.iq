/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import {
  generateOptimizedSearchTerms,
  fetchGDELTNewsWithDeduplication,
  normalizeGDELTArticle,
  fetchGDELTNews,
} from '@/features/news/services/gdelt-api';
import { buildOptimizedGDELTQuery } from '@/features/news/services/gdelt-query-builder';
import { structuredLogger } from '@/lib/logging/logger';
import type { EnhancedRepresentative } from '@/types/representative';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'gdelt' | 'cached' | 'fallback';
  cacheStatus?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '15');

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    // Use cached fetch with 30-minute TTL as specified in project docs
    const cacheKey = `news-${bioguideId}-${limit}`;
    const TTL_30_MINUTES = 30 * 60 * 1000;

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
          structuredLogger.warn(
            'Could not fetch representative info, using fallback',
            {
              bioguideId,
              error: error instanceof Error ? error.message : 'Unknown error',
              operation: 'representative_info_fallback',
            },
            request
          );

          // Don't use generic fallback - return empty results instead
          return {
            articles: [],
            totalResults: 0,
            searchTerms: [],
            dataSource: 'fallback',
            cacheStatus: 'Unable to fetch representative information',
          };
        }

        structuredLogger.info(
          'Fetching news for representative',
          {
            bioguideId,
            representativeName: representative.name,
            state: representative.state,
            operation: 'news_fetch',
          },
          request
        );

        // Try enhanced query builder if we have full representative data
        let searchTerms: string[];
        const useEnhancedQueries = searchParams.get('enhanced') !== 'false';

        if (useEnhancedQueries && representative.committees) {
          // Use advanced query builder with full metadata
          searchTerms = buildOptimizedGDELTQuery(representative as EnhancedRepresentative, {
            focusLocal: true,
            timespan: '24h',
          });
        } else {
          // Fallback to basic search terms
          searchTerms = generateOptimizedSearchTerms(
            representative.name,
            representative.state,
            representative.district
          );
        }

        structuredLogger.debug(
          'Generated optimized search terms',
          {
            bioguideId,
            searchTerms,
            searchTermsCount: searchTerms.length,
            operation: 'news_search_terms_generation',
          },
          request
        );

        // Fetch news from GDELT with intelligent deduplication
        const articlesPerTerm = Math.ceil((limit * 1.5) / searchTerms.length); // Fetch more to account for deduplication
        let totalDuplicatesRemoved = 0;

        const fetchPromises = searchTerms.map(async (searchTerm, _index) => {
          try {
            // Use raw fetchGDELTNews for enhanced queries (already include themes)
            // Use deduplication wrapper for basic queries
            if (useEnhancedQueries && representative.committees) {
              const gdeltArticles = await fetchGDELTNews(searchTerm, articlesPerTerm);
              return gdeltArticles.map(article => normalizeGDELTArticle(article));
            } else {
              const { articles: gdeltArticles, stats } = await fetchGDELTNewsWithDeduplication(
                searchTerm,
                articlesPerTerm,
                {
                  titleSimilarityThreshold: 0.85,
                  maxArticlesPerDomain: 2,
                  enableDomainClustering: true,
                }
              );

              totalDuplicatesRemoved += stats.duplicatesRemoved;

              // Normalize articles
              return gdeltArticles.map(article => normalizeGDELTArticle(article));
            }
          } catch (error) {
            structuredLogger.error(
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

        // Final cross-term deduplication
        const { deduplicateNews } = await import('@/features/news/utils/news-deduplication');
        const { articles: finalDeduplicatedArticles, stats: finalStats } = deduplicateNews(
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
        const uniqueArticles = finalDeduplicatedArticles.map(article => ({
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
        }));

        const sortedArticles = uniqueArticles
          .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
          .slice(0, limit);

        // Log deduplication statistics
        structuredLogger.info(
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

        return {
          articles: sortedArticles,
          totalResults: sortedArticles.length,
          searchTerms,
          dataSource: sortedArticles.length > 0 ? 'gdelt' : 'fallback',
        };
      },
      TTL_30_MINUTES
    );

    // If no real articles found, provide relevant fallback mock data
    if (newsData.articles.length === 0) {
      const representative = newsData.searchTerms[0]?.includes('Senator')
        ? { name: `Senator for ${bioguideId}`, state: 'State', isSenator: true }
        : { name: `Representative ${bioguideId}`, state: 'State', isSenator: false };

      const mockArticles: NewsArticle[] = [
        {
          title: `[SAMPLE] ${representative.name} Addresses Key Legislative Priorities`,
          url: '#',
          source: 'Sample - Congressional Quarterly',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          language: 'English',
          domain: 'sample-cq.com',
          summary:
            'SAMPLE NEWS: Legislative update on current priorities and upcoming votes. This is sample content shown when real news data is unavailable.',
        },
        {
          title: `[SAMPLE] Committee Hearing on Infrastructure Investment`,
          url: '#',
          source: 'Sample - Government Affairs Daily',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
          language: 'English',
          domain: 'sample-govaffairs.com',
          summary:
            'SAMPLE NEWS: Congressional committee discusses infrastructure funding proposals. This is sample content shown when real news data is unavailable.',
        },
        {
          title: `[SAMPLE] Bipartisan Support for Healthcare Policy Reform`,
          url: '#',
          source: 'Sample - Policy Review',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
          language: 'English',
          domain: 'sample-policyreview.com',
          summary:
            'SAMPLE NEWS: Cross-party collaboration on healthcare policy initiatives. This is sample content shown when real news data is unavailable.',
        },
      ];

      const fallbackResponse: NewsResponse = {
        articles: mockArticles,
        totalResults: mockArticles.length,
        searchTerms: newsData.searchTerms,
        dataSource: 'fallback',
        cacheStatus: 'No live news available - showing clearly labeled sample content',
      };

      return NextResponse.json(fallbackResponse);
    }

    // Add cache status to response
    const response: NewsResponse = {
      ...newsData,
      cacheStatus: 'Live news data',
    };

    return NextResponse.json(response);
  } catch (error) {
    structuredLogger.error(
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
    };

    return NextResponse.json(errorResponse, { status: 200 }); // Return 200 to avoid breaking UI
  }
}

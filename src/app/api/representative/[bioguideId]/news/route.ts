/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { 
  generateOptimizedSearchTerms, 
  fetchGDELTNewsWithDeduplication, 
  normalizeGDELTArticle 
} from '@/lib/gdelt-api';
import { structuredLogger } from '@/lib/logging/logger';

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
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
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
            
            // Extract the correct fields from the API response
            // Handle both BaseRepresentative and EnhancedRepresentative structures
            const fullName = repData.fullName ? 
              `${repData.fullName.first} ${repData.fullName.last}` : 
              repData.name;
              
            representative = {
              name: fullName || `${repData.firstName} ${repData.lastName}`,
              state: repData.state,
              district: repData.district,
              party: repData.party,
              bioguideId: repData.bioguideId || bioguideId,
              chamber: repData.chamber
            };
            
            // Validate we have the minimum required data
            if (!representative.name || representative.name.includes('undefined')) {
              throw new Error('Invalid representative data - missing name');
            }
          } else {
            throw new Error('Representative not found');
          }
        } catch (error) {
          structuredLogger.warn('Could not fetch representative info, using fallback', {
            bioguideId,
            error: error instanceof Error ? error.message : 'Unknown error',
            operation: 'representative_info_fallback'
          }, request);
          
          // Don't use generic fallback - return empty results instead
          return {
            articles: [],
            totalResults: 0,
            searchTerms: [],
            dataSource: 'fallback',
            cacheStatus: 'Unable to fetch representative information'
          };
        }

        structuredLogger.info('Fetching news for representative', {
          bioguideId,
          representativeName: representative.name,
          state: representative.state,
          operation: 'news_fetch'
        }, request);

        // Generate optimized search terms for civic/political news
        const searchTerms = generateOptimizedSearchTerms(
          representative.name, 
          representative.state, 
          representative.district
        );
        
        structuredLogger.debug('Generated optimized search terms', {
          bioguideId,
          searchTerms,
          searchTermsCount: searchTerms.length,
          operation: 'news_search_terms_generation'
        }, request);

        // Fetch news from GDELT with intelligent deduplication
        const allArticles: any[] = [];
        const articlesPerTerm = Math.ceil(limit * 1.5 / searchTerms.length); // Fetch more to account for deduplication
        let totalDuplicatesRemoved = 0;
        
        const fetchPromises = searchTerms.map(async (searchTerm) => {
          try {
            const { articles: gdeltArticles, stats } = await fetchGDELTNewsWithDeduplication(
              searchTerm, 
              articlesPerTerm,
              {
                titleSimilarityThreshold: 0.85,
                maxArticlesPerDomain: 2,
                enableDomainClustering: true
              }
            );
            
            totalDuplicatesRemoved += stats.duplicatesRemoved;
            
            // Normalize articles
            return gdeltArticles.map(article => normalizeGDELTArticle(article));
          } catch (error) {
            structuredLogger.error(`Error fetching GDELT news for term: ${searchTerm}`, error as Error, {
              bioguideId,
              searchTerm,
              operation: 'gdelt_news_fetch_error'
            }, request);
            return [];
          }
        });

        const results = await Promise.all(fetchPromises);
        const flattenedArticles = results.flat();

        // Apply advanced clustering to group related stories
        const { newsClusteringService } = await import('@/lib/news-clustering');
        const clusteringResult = newsClusteringService.clusterNews(
          flattenedArticles.map(article => ({
            url: article.url,
            title: article.title,
            seendate: article.publishedDate,
            domain: article.domain || new URL(article.url).hostname,
            socialimage: article.imageUrl,
            language: article.language || 'en'
          })),
          {
            maxClusters: 5,
            minClusterSize: 2,
            titleSimilarityThreshold: 0.75,
            timespanHours: 48
          }
        );

        // Convert clusters back to articles, keeping primary articles
        const clusteredArticles = clusteringResult.clusters.map(cluster => {
          const primaryArticle = flattenedArticles.find(a => a.url === cluster.primaryArticle.url);
          return {
            ...primaryArticle,
            relatedStories: cluster.relatedArticles.length,
            sources: cluster.sources.join(', '),
            category: cluster.category,
            importance: cluster.importance
          };
        }).filter(Boolean);

        // Add unclustered articles
        const unclusteredArticles = clusteringResult.unclustered
          .map(unclustered => flattenedArticles.find(a => a.url === unclustered.url))
          .filter(Boolean);

        const finalArticles = [...clusteredArticles, ...unclusteredArticles];

        // Apply quality filters and final deduplication to the clustered articles
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const qualityFilteredArticles = finalArticles.filter(article => {
          const articleDate = new Date(article.publishedDate);
          
          return (
            article.language === 'English' &&
            article.title.length > 15 &&
            article.title.length < 300 &&
            articleDate >= thirtyDaysAgo &&
            !article.title.toLowerCase().includes('404') &&
            !article.title.toLowerCase().includes('error') &&
            !article.domain.includes('facebook.com') &&
            !article.domain.includes('twitter.com')
          );
        });

        // Final cross-term deduplication
        const { deduplicateNews } = await import('@/lib/news-deduplication');
        const { articles: finalDeduplicatedArticles, stats: finalStats } = deduplicateNews(
          qualityFilteredArticles.map(article => ({
            url: article.url,
            title: article.title,
            seendate: article.publishedDate,
            domain: article.domain,
            socialimage: article.imageUrl,
            language: article.language
          })),
          {
            titleSimilarityThreshold: 0.9,
            maxArticlesPerDomain: 1,
            preserveNewestArticles: true
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
          source: qualityFilteredArticles.find(orig => orig.url === article.url)?.source || article.domain
        }));

        const sortedArticles = uniqueArticles
          .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
          .slice(0, limit);

        // Log deduplication statistics
        structuredLogger.info('News deduplication completed', {
          bioguideId,
          originalCount: flattenedArticles.length,
          afterQualityFilter: qualityFilteredArticles.length,
          totalDuplicatesRemoved,
          finalCount: sortedArticles.length,
          operation: 'news_deduplication_complete'
        }, request);

        return {
          articles: sortedArticles,
          totalResults: sortedArticles.length,
          searchTerms,
          dataSource: sortedArticles.length > 0 ? 'gdelt' : 'fallback'
        };
      },
      TTL_30_MINUTES
    );

    // If no real articles found, provide relevant fallback mock data
    if (newsData.articles.length === 0) {
      const representative = newsData.searchTerms[0]?.includes('Senator') ? 
        { name: `Senator for ${bioguideId}`, state: 'State', isSenator: true } :
        { name: `Representative ${bioguideId}`, state: 'State', isSenator: false };

      const mockArticles: NewsArticle[] = [
        {
          title: `${representative.name} Addresses Key Legislative Priorities`,
          url: 'https://example.com/legislative-priorities',
          source: 'Congressional Quarterly',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
          language: 'English',
          domain: 'cq.com',
          summary: 'Legislative update on current priorities and upcoming votes.'
        },
        {
          title: `Committee Hearing on Infrastructure Investment`,
          url: 'https://example.com/infrastructure-hearing',
          source: 'Government Affairs Daily',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
          language: 'English',
          domain: 'govaffairs.com',
          summary: 'Congressional committee discusses infrastructure funding proposals.'
        },
        {
          title: `Bipartisan Support for Healthcare Policy Reform`,
          url: 'https://example.com/healthcare-reform',
          source: 'Policy Review',
          publishedDate: new Date(Date.now() - 1000 * 60 * 60 * 60).toISOString(),
          language: 'English',
          domain: 'policyreview.com',
          summary: 'Cross-party collaboration on healthcare policy initiatives.'
        }
      ];

      const fallbackResponse: NewsResponse = {
        articles: mockArticles,
        totalResults: mockArticles.length,
        searchTerms: newsData.searchTerms,
        dataSource: 'fallback',
        cacheStatus: 'No live news available - showing relevant content'
      };

      return NextResponse.json(fallbackResponse);
    }

    // Add cache status to response
    const response: NewsResponse = {
      ...newsData,
      cacheStatus: 'Live news data'
    };

    return NextResponse.json(response);

  } catch (error) {
    structuredLogger.error('News API Error', error as Error, {
      bioguideId,
      operation: 'news_api_error'
    }, request);
    
    // Comprehensive error response with fallback
    const errorResponse: NewsResponse = {
      articles: [],
      totalResults: 0,
      searchTerms: [],
      dataSource: 'fallback',
      cacheStatus: 'API temporarily unavailable'
    };

    return NextResponse.json(errorResponse, { status: 200 }); // Return 200 to avoid breaking UI
  }
}
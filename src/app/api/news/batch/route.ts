/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import {
  withValidationAndSecurity as _withValidationAndSecurity,
  ValidatedRequest,
} from '@/lib/validation/middleware';
import { BaseValidator } from '@/lib/validation/schemas';
import { withErrorHandling } from '@/lib/error-handling/error-handler';
import { structuredLogger } from '@/lib/logging/logger';
import { performanceMonitor } from '@/utils/performance';
import {
  generateOptimizedSearchTerms,
  fetchGDELTNewsWithDeduplication,
} from '@/features/news/services/gdelt-api';

interface BatchNewsRequest {
  bioguideIds: string[];
  limit?: number;
}

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

interface RepresentativeNews {
  bioguideId: string;
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'gdelt' | 'cached' | 'fallback';
  error?: string;
}

// Validate batch news request
const validateBatchNewsRequest = (
  data: unknown
): { isValid: boolean; errors: string[]; sanitized?: BatchNewsRequest } => {
  const errors: string[] = [];

  const typedData = data as BatchNewsRequest;
  if (!typedData.bioguideIds || !Array.isArray(typedData.bioguideIds)) {
    errors.push('bioguideIds must be an array');
    return { isValid: false, errors };
  }

  if (typedData.bioguideIds.length === 0) {
    errors.push('bioguideIds array cannot be empty');
    return { isValid: false, errors };
  }

  if (typedData.bioguideIds.length > 20) {
    errors.push('bioguideIds array cannot contain more than 20 items for news batch requests');
    return { isValid: false, errors };
  }

  // Validate each bioguide ID
  const validatedIds: string[] = [];
  for (const id of typedData.bioguideIds) {
    const validation = BaseValidator.validateString(id, 'bioguideId', {
      required: true,
      minLength: 7,
      maxLength: 7,
      pattern: /^[A-Z]\d{6}$/,
    });

    if (!validation.isValid) {
      errors.push(`Invalid bioguideId: ${id}`);
    } else {
      validatedIds.push(validation.data!);
    }
  }

  // Validate limit if provided
  let limit = 10; // default
  if (typedData.limit !== undefined) {
    const limitValidation = BaseValidator.validateNumber(typedData.limit, 'limit', {
      min: 1,
      max: 50,
    });

    if (!limitValidation.isValid) {
      errors.push('limit must be a number between 1 and 50');
    } else {
      limit = limitValidation.data!;
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: { bioguideIds: validatedIds, limit },
  };
};

async function fetchRepresentativeInfo(bioguideId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/representative/${bioguideId}`
    );
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    structuredLogger.warn('Could not fetch representative info for news', {
      bioguideId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Fallback data
  return {
    name: `Representative ${bioguideId}`,
    state: 'Unknown',
    district: null,
    bioguideId,
  };
}

async function fetchNewsForRepresentative(
  bioguideId: string,
  limit: number
): Promise<RepresentativeNews> {
  try {
    const cacheKey = `news-batch-${bioguideId}-${limit}`;
    const TTL_30_MINUTES = 30 * 60 * 1000;

    const result = await cachedFetch(
      cacheKey,
      async (): Promise<RepresentativeNews> => {
        // Get representative info
        const representative = await fetchRepresentativeInfo(bioguideId);

        // Generate search terms
        const searchTerms = generateOptimizedSearchTerms(
          representative.name,
          representative.state,
          representative.district
        );

        // Fetch news with deduplication
        const _allArticles: NewsArticle[] = [];
        const articlesPerTerm = Math.ceil((limit * 1.2) / searchTerms.length); // Fetch slightly more for deduplication

        const newsPromises = searchTerms.map(async searchTerm => {
          try {
            const { articles } = await fetchGDELTNewsWithDeduplication(
              searchTerm,
              articlesPerTerm,
              {
                titleSimilarityThreshold: 0.85,
                maxArticlesPerDomain: 2,
                enableDomainClustering: true,
              }
            );

            return articles.map(article => ({
              title: article.title,
              url: article.url,
              source: article.domain,
              publishedDate: article.seendate,
              language: article.language,
              imageUrl: article.socialimage,
              domain: article.domain,
            }));
          } catch (error) {
            structuredLogger.error(`Error fetching news for term: ${searchTerm}`, error as Error, {
              bioguideId,
              searchTerm,
            });
            return [];
          }
        });

        const newsResults = await Promise.all(newsPromises);
        const flattenedArticles = newsResults.flat();

        // Apply final deduplication and quality filters
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const qualityFilteredArticles = flattenedArticles.filter(article => {
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

        // Remove URL duplicates
        const seenUrls = new Set<string>();
        const uniqueArticles = qualityFilteredArticles.filter(article => {
          if (seenUrls.has(article.url)) {
            return false;
          }
          seenUrls.add(article.url);
          return true;
        });

        // Sort by date and limit
        const sortedArticles = uniqueArticles
          .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
          .slice(0, limit);

        return {
          bioguideId,
          articles: sortedArticles,
          totalResults: sortedArticles.length,
          searchTerms,
          dataSource: sortedArticles.length > 0 ? 'gdelt' : 'fallback',
        };
      },
      TTL_30_MINUTES
    );

    return result;
  } catch (error) {
    structuredLogger.error(`Error fetching news for representative ${bioguideId}`, error as Error, {
      bioguideId,
      operation: 'batch_news_fetch_error',
    });

    return {
      bioguideId,
      articles: [],
      totalResults: 0,
      searchTerms: [],
      dataSource: 'fallback',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function handleBatchNewsRequest(
  request: ValidatedRequest<BatchNewsRequest>
): Promise<NextResponse> {
  const { bioguideIds, limit = 10 } = request.validatedBody!;

  try {
    performanceMonitor.startTimer('batch-news-fetch', {
      count: bioguideIds.length,
      limit,
      operation: 'batch_news',
    });

    structuredLogger.info(
      'Processing batch news request',
      {
        totalIds: bioguideIds.length,
        limit,
        operation: 'batch_news_start',
      },
      request
    );

    // Fetch news for all representatives in parallel with concurrency limit
    const concurrencyLimit = 5;
    const results: Record<string, RepresentativeNews> = {};

    // Process in smaller batches to avoid overwhelming GDELT API
    const batches = [];
    for (let i = 0; i < bioguideIds.length; i += concurrencyLimit) {
      batches.push(bioguideIds.slice(i, i + concurrencyLimit));
    }

    for (const batch of batches) {
      const batchPromises = batch.map(bioguideId => fetchNewsForRepresentative(bioguideId, limit));

      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach(result => {
        results[result.bioguideId] = result;
      });

      // Small delay between batches to be respectful to GDELT API
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const duration = performanceMonitor.endTimer('batch-news-fetch');

    const successCount = Object.values(results).filter(r => !r.error).length;
    const errorCount = bioguideIds.length - successCount;
    const totalArticles = Object.values(results).reduce((sum, r) => sum + r.articles.length, 0);

    structuredLogger.info(
      'Batch news request completed',
      {
        totalRequested: bioguideIds.length,
        successCount,
        errorCount,
        totalArticles,
        duration,
        operation: 'batch_news_complete',
      },
      request
    );

    return NextResponse.json({
      results,
      metadata: {
        totalRequested: bioguideIds.length,
        successCount,
        errorCount,
        totalArticles,
        timestamp: new Date().toISOString(),
        dataSource: 'gdelt',
      },
    });
  } catch (error) {
    performanceMonitor.endTimer('batch-news-fetch');

    structuredLogger.error(
      'Batch news request failed',
      error as Error,
      {
        bioguideIds: bioguideIds.slice(0, 5), // Log first 5 for debugging
        operation: 'batch_news_error',
      },
      request
    );

    return NextResponse.json(
      {
        error: 'Failed to fetch news batch',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Export POST handler
export async function POST(request: NextRequest) {
  try {
    // Custom validation for the batch request
    const rawBody = await request.json();
    const validation = validateBatchNewsRequest(rawBody);

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Add validated data to request
    const validatedRequest = request as ValidatedRequest<BatchNewsRequest>;
    validatedRequest.validatedBody = validation.sanitized;

    return withErrorHandling(handleBatchNewsRequest)(validatedRequest);
  } catch (error) {
    structuredLogger.error('POST batch news handler error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateOptimizedSearchTerms,
  fetchGDELTNews,
  normalizeGDELTArticle,
} from '@/features/news/services/gdelt-api';
import { structuredLogger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || 'Gary Peters Michigan Senator';
  const testType = searchParams.get('type') || 'basic'; // basic, optimized, or comprehensive

  try {
    structuredLogger.info(
      'Testing GDELT API',
      {
        query,
        testType,
        operation: 'gdelt_test',
      },
      request
    );

    if (testType === 'basic') {
      // Basic direct test
      const articles = await fetchGDELTNews(query, 5);

      return NextResponse.json({
        success: true,
        testType: 'basic',
        query,
        articlesFound: articles.length,
        articles: articles.map(normalizeGDELTArticle),
        message: 'Direct GDELT API test completed',
      });
    } else if (testType === 'optimized') {
      // Test optimized search terms
      const searchTerms = generateOptimizedSearchTerms(query, 'Michigan', undefined);
      const allArticles = [];

      for (const term of searchTerms) {
        try {
          const articles = await fetchGDELTNews(term, 3);
          allArticles.push(...articles.map(normalizeGDELTArticle));
        } catch (error) {
          structuredLogger.error(
            `Failed to fetch GDELT data for term: ${term}`,
            error as Error,
            {
              searchTerm: term,
              operation: 'gdelt_fetch_optimized',
            },
            request
          );
        }
      }

      // Remove duplicates
      const seenUrls = new Set();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uniqueArticles = allArticles.filter((article: any) => {
        if (seenUrls.has(article.url)) return false;
        seenUrls.add(article.url);
        return true;
      });

      return NextResponse.json({
        success: true,
        testType: 'optimized',
        query,
        searchTerms,
        articlesFound: uniqueArticles.length,
        articles: uniqueArticles.slice(0, 10),
        message: 'Optimized search terms test completed',
      });
    } else {
      // Comprehensive test with error handling
      const startTime = Date.now();
      const results = {
        searchTerms: [],
        articles: [],
        errors: [],
        timing: {},
      };

      try {
        // Generate search terms
        const searchTerms = generateOptimizedSearchTerms(query, 'Michigan', undefined);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (results as any).searchTerms = searchTerms;

        // Test each search term
        for (const term of searchTerms) {
          const termStart = Date.now();
          try {
            const articles = await fetchGDELTNews(term, 2);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (results as any).articles.push(...articles.map(normalizeGDELTArticle));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (results as any).timing[term] = Date.now() - termStart;
          } catch (error) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (results as any).errors.push({
              term,
              error: error instanceof Error ? error.message : String(error),
              timing: Date.now() - termStart,
            });
          }
        }

        // Remove duplicates
        const seenUrls = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        results.articles = results.articles.filter((article: any) => {
          if (seenUrls.has(article.url)) return false;
          seenUrls.add(article.url);
          return true;
        });

        return NextResponse.json({
          success: true,
          testType: 'comprehensive',
          query,
          totalTime: Date.now() - startTime,
          articlesFound: results.articles.length,
          errorsCount: results.errors.length,
          results,
          message: 'Comprehensive GDELT test completed',
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          testType: 'comprehensive',
          query,
          error: error instanceof Error ? error.message : String(error),
          partialResults: results,
          message: 'Comprehensive test failed with partial results',
        });
      }
    }
  } catch (error) {
    structuredLogger.error(
      'GDELT Test Error',
      error as Error,
      {
        query,
        testType,
        operation: 'gdelt_test_complete_failure',
      },
      request
    );
    return NextResponse.json({
      success: false,
      query,
      testType,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      message: 'GDELT test failed completely',
    });
  }
}

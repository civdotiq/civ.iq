/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { getRedisCache, type RedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';
import rssFeedMap from '@/config/rss-feed-map.json';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

interface SimpleNewsArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  socialimage?: string | null;
}

interface RSSFeedEntry {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  enclosure?: {
    url?: string;
    type?: string;
  };
}

interface AggregationResult {
  bioguideId: string;
  name: string;
  articlesProcessed: number;
  articlesStored: number;
  errors: string[];
  processingTime: number;
  feedsSkipped: number;
  feedsProcessed: number;
}

interface FeedMetadata {
  etag?: string;
  lastModified?: string;
  lastFetch?: string;
}

interface FeedHealthStatus {
  url: string;
  status: 'OK' | 'FAILED';
  lastCheck: string;
  lastSuccess?: string;
  errorMessage?: string;
  httpStatus?: number;
  consecutiveFailures: number;
}

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail'],
  },
});

async function updateFeedHealth(
  feedUrl: string,
  status: 'OK' | 'FAILED',
  cache: RedisCache,
  errorMessage?: string,
  httpStatus?: number
): Promise<void> {
  const healthKey = `feed_health:${Buffer.from(feedUrl).toString('base64')}`;
  const now = new Date().toISOString();

  // Get existing health status
  const existing: FeedHealthStatus | null = await cache.get(healthKey);

  const healthStatus: FeedHealthStatus = {
    url: feedUrl,
    status,
    lastCheck: now,
    lastSuccess: status === 'OK' ? now : existing?.lastSuccess,
    errorMessage: status === 'FAILED' ? errorMessage : undefined,
    httpStatus,
    consecutiveFailures: status === 'FAILED' ? (existing?.consecutiveFailures || 0) + 1 : 0,
  };

  // Store health status with 7-day TTL
  await cache.set(healthKey, healthStatus, 7 * 24 * 60 * 60);

  // Log health issues
  if (status === 'FAILED') {
    logger.warn(`Feed health issue: ${feedUrl}`, {
      consecutiveFailures: healthStatus.consecutiveFailures,
      errorMessage,
      httpStatus,
    });
  }
}

async function processRSSFeedWithCaching(
  feedUrl: string,
  cache: RedisCache
): Promise<{ articles: SimpleNewsArticle[]; wasSkipped: boolean }> {
  try {
    // Get cached metadata for this feed
    const metadataKey = `feed_meta:${Buffer.from(feedUrl).toString('base64')}`;
    const cachedMetadata: FeedMetadata | null = await cache.get(metadataKey);

    // Prepare headers for conditional requests
    const headers: Record<string, string> = {
      'User-Agent': 'CivicIntelligenceHub/1.0 (RSS Aggregator)',
    };

    if (cachedMetadata?.etag) {
      headers['If-None-Match'] = cachedMetadata.etag;
    }
    if (cachedMetadata?.lastModified) {
      headers['If-Modified-Since'] = cachedMetadata.lastModified;
    }

    // Make conditional request
    const response = await fetch(feedUrl, { headers });

    // If 304 Not Modified, skip processing
    if (response.status === 304) {
      logger.info(`Feed unchanged, skipping: ${feedUrl}`);
      return { articles: [], wasSkipped: true };
    }

    if (!response.ok) {
      logger.error(`HTTP error ${response.status} for feed: ${feedUrl}`);
      await updateFeedHealth(feedUrl, 'FAILED', cache, `HTTP ${response.status}`, response.status);
      return { articles: [], wasSkipped: false };
    }

    // Get the feed content and parse it
    const feedContent = await response.text();
    const feed = await parser.parseString(feedContent);

    // Store new metadata
    const newMetadata: FeedMetadata = {
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined,
      lastFetch: new Date().toISOString(),
    };
    await cache.set(metadataKey, newMetadata, 86400); // Cache for 24 hours

    const articles: SimpleNewsArticle[] = [];

    for (const item of feed.items) {
      const rssItem = item as RSSFeedEntry;

      if (!rssItem.title || !rssItem.link) {
        continue;
      }

      // Extract domain from URL
      let domain: string;
      try {
        domain = new URL(rssItem.link).hostname;
      } catch {
        continue; // Skip invalid URLs
      }

      // Parse date or use current date
      let seendate: string;
      try {
        seendate = rssItem.pubDate
          ? new Date(rssItem.pubDate).toISOString()
          : new Date().toISOString();
      } catch {
        seendate = new Date().toISOString();
      }

      // Extract social image from various RSS fields
      let socialimage: string | null = null;
      if (rssItem.enclosure?.url && rssItem.enclosure?.type?.startsWith('image/')) {
        socialimage = rssItem.enclosure.url;
      }

      const article: SimpleNewsArticle = {
        url: rssItem.link,
        title: rssItem.title.trim(),
        seendate,
        domain,
        socialimage,
      };

      articles.push(article);
    }

    // Mark feed as healthy on successful processing
    await updateFeedHealth(feedUrl, 'OK', cache, undefined, response.status);

    return { articles, wasSkipped: false };
  } catch (error) {
    logger.error(`Failed to process RSS feed: ${feedUrl}`, error as Error);
    await updateFeedHealth(feedUrl, 'FAILED', cache, (error as Error).message);
    return { articles: [], wasSkipped: false };
  }
}

async function deduplicateArticlesWithPersistence(
  articles: SimpleNewsArticle[],
  cache: RedisCache
): Promise<SimpleNewsArticle[]> {
  const deduplicated: SimpleNewsArticle[] = [];
  const newUrls: string[] = [];

  // Check each article URL against the cache
  for (const article of articles) {
    const urlKey = `processed:${Buffer.from(article.url).toString('base64')}`;
    const alreadyProcessed = await cache.exists(urlKey);

    if (!alreadyProcessed) {
      deduplicated.push(article);
      newUrls.push(article.url);
    }
  }

  // Add new URLs to the cache with 30-day TTL
  const promises = newUrls.map(url => {
    const urlKey = `processed:${Buffer.from(url).toString('base64')}`;
    return cache.set(urlKey, true, 30 * 24 * 60 * 60); // 30 days
  });

  if (promises.length > 0) {
    await Promise.all(promises);
  }

  return deduplicated;
}

function filterAndSortArticles(
  articles: SimpleNewsArticle[],
  maxArticles: number = 50
): SimpleNewsArticle[] {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filter out old articles and basic quality checks
  const filtered = articles.filter(article => {
    const articleDate = new Date(article.seendate);
    return (
      articleDate >= thirtyDaysAgo &&
      article.title.length > 10 &&
      article.title.length < 300 &&
      !article.title.toLowerCase().includes('404') &&
      !article.title.toLowerCase().includes('error') &&
      article.url.startsWith('http')
    );
  });

  // Sort by date (most recent first) and limit
  return filtered
    .sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime())
    .slice(0, maxArticles);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // Verify this is a legitimate cron request
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logger.info('Starting RSS news aggregation cron job');

  const results: AggregationResult[] = [];
  const cache = getRedisCache();

  try {
    // Process each representative in the RSS feed map
    for (const [bioguideId, config] of Object.entries(rssFeedMap)) {
      const processingStartTime = Date.now();
      const errors: string[] = [];

      logger.info(`Processing RSS feeds for ${config.name} (${bioguideId})`);

      try {
        // Fetch all RSS feeds in parallel with caching
        const feedPromises = config.feeds.map(feedUrl =>
          processRSSFeedWithCaching(feedUrl, cache).catch(error => {
            errors.push(`Feed ${feedUrl}: ${error.message}`);
            return { articles: [], wasSkipped: false };
          })
        );

        const feedResults = await Promise.allSettled(feedPromises);

        // Flatten all articles from all feeds and count skipped feeds
        const allArticles: SimpleNewsArticle[] = [];
        let feedsSkipped = 0;
        let feedsProcessed = 0;

        feedResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allArticles.push(...result.value.articles);
            if (result.value.wasSkipped) {
              feedsSkipped++;
            } else {
              feedsProcessed++;
            }
          } else {
            errors.push(`Feed ${config.feeds[index]}: ${result.reason}`);
            feedsProcessed++; // Count as processed even if failed
          }
        });

        // Deduplicate and filter articles with persistence
        const deduplicatedArticles = await deduplicateArticlesWithPersistence(allArticles, cache);
        const finalArticles = filterAndSortArticles(deduplicatedArticles);

        // Store in Redis with key format: news:BIOGUIDE_ID
        const cacheKey = `news:${bioguideId}`;
        const cacheSuccess = await cache.set(cacheKey, finalArticles, 3600); // 1 hour TTL

        const processingTime = Date.now() - processingStartTime;

        results.push({
          bioguideId,
          name: config.name,
          articlesProcessed: allArticles.length,
          articlesStored: finalArticles.length,
          errors,
          processingTime,
          feedsSkipped,
          feedsProcessed,
        });

        if (cacheSuccess) {
          logger.info(`Successfully cached ${finalArticles.length} articles for ${config.name}`, {
            bioguideId,
            articlesCount: finalArticles.length,
            processingTime,
          });
        } else {
          logger.error(`Failed to cache articles for ${config.name}`, { bioguideId });
        }
      } catch (error) {
        const processingTime = Date.now() - processingStartTime;
        errors.push(`General processing error: ${(error as Error).message}`);

        results.push({
          bioguideId,
          name: config.name,
          articlesProcessed: 0,
          articlesStored: 0,
          errors,
          processingTime,
          feedsSkipped: 0,
          feedsProcessed: 0,
        });

        logger.error(`Failed to process RSS feeds for ${config.name}`, error as Error, {
          bioguideId,
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const summary = {
      totalRepresentatives: Object.keys(rssFeedMap).length,
      successfulProcessing: results.filter(r => r.errors.length === 0).length,
      totalArticlesStored: results.reduce((sum, r) => sum + r.articlesStored, 0),
      totalProcessingTime: totalTime,
      results,
    };

    logger.info('RSS aggregation cron job completed', summary);

    return NextResponse.json({
      success: true,
      message: 'RSS aggregation completed successfully',
      ...summary,
    });
  } catch (error) {
    const totalTime = Date.now() - startTime;

    logger.error('RSS aggregation cron job failed', error as Error, {
      totalTime,
      resultsBeforeFailure: results.length,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'RSS aggregation failed',
        message: (error as Error).message,
        partialResults: results,
        totalTime,
      },
      { status: 500 }
    );
  }
}

// Allow GET requests for testing/manual triggering
export async function GET(request: NextRequest) {
  // Only allow in development or with proper authentication
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Forward to POST handler for manual testing
  return POST(request);
}

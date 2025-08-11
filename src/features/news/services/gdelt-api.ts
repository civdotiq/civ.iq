/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// GDELT API utility with proper error handling, rate limiting, and retry logic
import logger from '@/lib/logging/simple-logger';
import {
  deduplicateNews,
  type NewsArticle,
  type DuplicationStats,
  type DeduplicationOptions,
} from '@/features/news/utils/news-deduplication';

interface GDELTArticle {
  url: string;
  urlmobile?: string;
  title: string;
  seendate: string;
  socialimage?: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GDELTResponse {
  articles?: GDELTArticle[];
}

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

class GDELTAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'GDELTAPIError';
  }
}

// Rate limiting: Track API calls to respect GDELT's usage guidelines
class RateLimiter {
  private calls: number[] = [];
  private readonly maxCallsPerMinute = 30; // Conservative limit for GDELT

  canMakeCall(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove calls older than 1 minute
    this.calls = this.calls.filter(timestamp => timestamp > oneMinuteAgo);

    return this.calls.length < this.maxCallsPerMinute;
  }

  recordCall(): void {
    this.calls.push(Date.now());
  }

  getWaitTime(): number {
    if (this.canMakeCall()) return 0;

    const oldestCall = Math.min(...this.calls);
    const waitTime = 60000 - (Date.now() - oldestCall);
    return Math.max(waitTime, 0);
  }
}

const rateLimiter = new RateLimiter();

// Sleep utility for delays
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

// Exponential backoff retry logic
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, baseDelay: 1000, maxDelay: 10000 }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on non-retryable errors
      if (error instanceof GDELTAPIError && !error.retryable) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === options.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(options.baseDelay * Math.pow(2, attempt), options.maxDelay);

      logger.warn(`GDELT API retry attempt ${attempt + 1}`, {
        attempt: attempt + 1,
        maxRetries: options.maxRetries,
        delay,
        error: error instanceof Error ? error.message : String(error),
        operation: 'gdelt_api_retry',
      });
      await sleep(delay);
    }
  }

  throw lastError!;
}

// Enhanced search term generation with better civic/political focus
export function generateOptimizedSearchTerms(
  representativeName: string,
  state: string,
  district?: string
): string[] {
  // Validate inputs - if no name provided, return empty array to avoid generic searches
  if (
    !representativeName ||
    typeof representativeName !== 'string' ||
    representativeName.trim() === ''
  ) {
    logger.warn('No representative name provided for GDELT search', {
      operation: 'gdelt_search_validation',
    });
    return [];
  }

  if (!state || typeof state !== 'string' || state.trim() === '') {
    logger.warn('No state provided for GDELT search', {
      operation: 'gdelt_search_validation',
    });
    state = ''; // Will still search but without state context
  }

  // Clean the representative name - extract just the name part
  const fullName = representativeName.trim();
  const cleanName = fullName
    .replace(/^(Rep\.|Representative|Senator|Sen\.)\s+/, '')
    .replace(/,.*$/, '')
    .replace(/\s*\([^)]*\)\s*/g, '') // Remove party affiliation like (D) or (R)
    .trim();

  const searchTerms: string[] = [];

  // For more specific searches, also extract last name only
  const nameParts = cleanName.split(' ');
  const lastName = nameParts[nameParts.length - 1];

  // Start with broader searches that are more likely to have results
  // Then add more specific terms

  // 1. Simple name search (most likely to have results)
  searchTerms.push(`"${cleanName}"`);

  if (district) {
    // House Representative specific searches
    // 2. Name with state for Representatives
    if (state) {
      searchTerms.push(`"${cleanName}" "${state}"`);
    }

    // 3. Representative title with name (simplified - no OR statements)
    searchTerms.push(`"Representative ${cleanName}"`);
    searchTerms.push(`"Rep. ${cleanName}"`);

    // 4. Name with Congress context (simplified - no parentheses)
    searchTerms.push(`"${cleanName}" Congress`);
  } else {
    // Senator specific searches
    // 2. Senator title with name (simplified - no OR statements)
    searchTerms.push(`"Senator ${cleanName}"`);
    searchTerms.push(`"Sen. ${cleanName}"`);

    // 3. Name with state for Senators
    if (state) {
      searchTerms.push(`"${cleanName}" "${state}"`);
    }

    // 4. Name with Senate context
    searchTerms.push(`"${cleanName}" Senate`);
  }

  // Add fallback with just last name if we have a multi-word name
  if (lastName && lastName !== cleanName && lastName.length > 3) {
    searchTerms.push(`"${lastName}"`);
  }

  logger.debug(`Generated search terms for ${fullName}`, {
    searchTerms,
    operation: 'gdelt_search_terms',
  });

  // Return top 4 most relevant search terms, starting with broadest
  return searchTerms.slice(0, 4);
}

// Main GDELT API fetch function with comprehensive error handling and deduplication
export async function fetchGDELTNewsWithDeduplication(
  searchTerm: string,
  maxRecords: number = 10,
  deduplicationOptions?: Partial<DeduplicationOptions>
): Promise<{ articles: GDELTArticle[]; stats: DuplicationStats }> {
  const rawArticles = await fetchGDELTNews(searchTerm, Math.min(maxRecords * 2, 50)); // Fetch more to account for deduplication

  // Convert GDELT articles to NewsArticle format for deduplication
  const newsArticles: NewsArticle[] = rawArticles.map(article => ({
    url: article.url,
    title: article.title,
    seendate: article.seendate,
    domain: article.domain,
    socialimage: article.socialimage,
    urlmobile: article.urlmobile,
    language: article.language,
    sourcecountry: article.sourcecountry,
  }));

  // Apply deduplication
  const { articles: deduplicatedArticles, stats } = deduplicateNews(newsArticles, {
    enableUrlDeduplication: true,
    enableTitleSimilarity: true,
    enableDomainClustering: true,
    maxArticlesPerDomain: 2,
    titleSimilarityThreshold: 0.85,
    logDuplicates: true,
    ...deduplicationOptions,
  });

  // Convert back to GDELT format and limit to requested count
  const finalArticles: GDELTArticle[] = deduplicatedArticles.slice(0, maxRecords).map(article => ({
    url: article.url,
    urlmobile: article.urlmobile,
    title: article.title,
    seendate: article.seendate,
    socialimage: article.socialimage,
    domain: article.domain,
    language: article.language || 'English',
    sourcecountry: article.sourcecountry || 'US',
  }));

  // Log deduplication results
  logger.info('GDELT news deduplication completed', {
    searchTerm: searchTerm.slice(0, 50),
    originalCount: stats.originalCount,
    duplicatesRemoved: stats.duplicatesRemoved,
    finalCount: stats.finalCount,
    requestedCount: maxRecords,
    actualReturned: finalArticles.length,
    operation: 'gdelt_news_deduplication',
  });

  return { articles: finalArticles, stats };
}

// Original function without deduplication (for backward compatibility)
export async function fetchGDELTNews(
  searchTerm: string,
  maxRecords: number = 10
): Promise<GDELTArticle[]> {
  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    const waitTime = rateLimiter.getWaitTime();
    if (waitTime > 0) {
      logger.warn('GDELT API rate limited', {
        waitTime,
        operation: 'gdelt_rate_limit',
      });
      await sleep(waitTime);
    }
  }

  // Try different timespans with fallback: 24h -> 7d -> 30d
  const timespans = ['24h', '7d', '30d'];

  for (const timespan of timespans) {
    try {
      const result = await fetchGDELTNewsWithTimespan(searchTerm, maxRecords, timespan);
      if (result.length > 0) {
        logger.info('GDELT news found with timespan', {
          searchTerm: searchTerm.slice(0, 50),
          timespan,
          articleCount: result.length,
          operation: 'gdelt_timespan_success',
        });
        return result;
      }
    } catch (error) {
      logger.warn('GDELT fetch failed for timespan, trying next', {
        searchTerm: searchTerm.slice(0, 50),
        timespan,
        error: error instanceof Error ? error.message : String(error),
        operation: 'gdelt_timespan_fallback',
      });
    }
  }

  logger.warn('All GDELT timespans failed', {
    searchTerm: searchTerm.slice(0, 50),
    timespansAttempted: timespans,
    operation: 'gdelt_all_timespans_failed',
  });

  return [];
}

// Helper function for single timespan fetch
async function fetchGDELTNewsWithTimespan(
  searchTerm: string,
  maxRecords: number,
  timespan: string
): Promise<GDELTArticle[]> {
  return retryWithBackoff(async () => {
    const encodedQuery = encodeURIComponent(searchTerm);

    // Use GDELT DOC 2.0 API with enhanced parameters and comprehensive theme filtering
    const themes = [
      'GENERAL_GOVERNMENT',
      'POLITICAL_PROCESS',
      'POLITICAL_CANDIDATE',
      'ELECTORAL_POLITICS',
      'POLITICAL_ISSUES',
      'GOVERNMENT_TRANSPARENCY',
      'POLITICAL_CORRUPTION',
      'CONGRESSIONAL_POLITICS',
      'GOVERNMENT_LEGISLATION',
      'POLITICAL_COMMUNICATIONS',
    ].join(',');

    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=${maxRecords}&format=json&sort=socialimage&timespan=${timespan}&theme=${themes}&contenttype=NEWS&dedupresults=true`;

    logger.info('Fetching GDELT news with specific timespan', {
      searchTerm: searchTerm.slice(0, 100),
      maxRecords,
      timespan,
      operation: 'gdelt_news_fetch',
      url: url.slice(0, 200),
    });

    const headers = {
      'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
      Accept: 'application/json',
      'Cache-Control': 'no-cache',
      'Accept-Encoding': 'gzip, deflate',
    };

    rateLimiter.recordCall();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        cache: 'no-store',
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Log external API call
      logger.info('GDELT API call completed', {
        service: 'GDELT',
        operation: 'fetchNews',
        duration,
        success: response.ok,
        searchTerm: searchTerm.slice(0, 50),
        maxRecords,
        statusCode: response.status,
        timespan,
      });

      if (!response.ok) {
        const isRetryable = response.status >= 500 || response.status === 429;
        throw new GDELTAPIError(
          `GDELT API error: ${response.status} ${response.statusText}`,
          response.status,
          isRetryable
        );
      }

      // Check content type before parsing
      const contentType = response.headers.get('content-type');
      const isJSON = contentType && contentType.includes('application/json');

      const text = await response.text();

      if (!text || text.trim() === '') {
        logger.warn('Empty response from GDELT API', {
          searchTerm: searchTerm.slice(0, 50),
          operation: 'gdelt_empty_response',
        });
        return [];
      }

      // Log non-JSON responses for debugging
      if (!isJSON) {
        logger.warn('GDELT API returned non-JSON response', {
          searchTerm: searchTerm.slice(0, 50),
          contentType,
          responseStart: text.slice(0, 200),
          operation: 'gdelt_non_json_response',
        });

        // Check if it's an HTML error page
        if (text.trim().startsWith('<')) {
          throw new GDELTAPIError('GDELT API returned HTML error page', undefined, false);
        }
      }

      let data: GDELTResponse;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        logger.error('Failed to parse GDELT JSON response', parseError as Error, {
          searchTerm: searchTerm.slice(0, 50),
          contentType,
          responseStart: text.slice(0, 200),
          operation: 'gdelt_json_parse_error',
        });
        throw new GDELTAPIError('Invalid JSON response from GDELT API', undefined, false);
      }

      const articles = data.articles || [];
      logger.info('GDELT articles retrieved', {
        searchTerm: searchTerm.slice(0, 50),
        articleCount: articles.length,
        operation: 'gdelt_articles_retrieved',
        duration,
      });

      // Filter for English articles and basic quality checks
      const filteredArticles = articles.filter(
        article =>
          article.language === 'English' &&
          article.title &&
          article.url &&
          article.domain &&
          article.title.length > 10 &&
          !article.title.toLowerCase().includes('404') &&
          !article.title.toLowerCase().includes('error')
      );

      return filteredArticles;
    } catch (error) {
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;

      // Log failed external API call
      logger.error('GDELT API call failed', {
        service: 'GDELT',
        operation: 'fetchNews',
        duration,
        success: false,
        searchTerm: searchTerm.slice(0, 50),
        maxRecords,
        timespan,
        error: error instanceof Error ? error.message : String(error),
      });

      if (error instanceof Error && error.name === 'AbortError') {
        throw new GDELTAPIError('GDELT API request timeout', undefined, true);
      }

      throw error;
    }
  });
}

// Clean and normalize article data
export function normalizeGDELTArticle(article: GDELTArticle): unknown {
  return {
    title: cleanTitle(article.title),
    url: article.url,
    source: extractSourceName(article.domain),
    publishedDate: normalizeDate(article.seendate),
    language: article.language,
    imageUrl: article.socialimage || undefined,
    domain: article.domain,
  };
}

// Helper function to clean article titles
function cleanTitle(title: string): string {
  return title
    .replace(/\s*-\s*[^-]*$/, '') // Remove trailing " - Source Name"
    .replace(/\|\s*[^|]*$/, '') // Remove trailing "| Source Name"
    .replace(/\s*\.\.\.$/, '') // Remove trailing "..."
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .slice(0, 200); // Reasonable title length limit
}

// Helper function to extract clean source names
function extractSourceName(domain: string): string {
  const domainMap: { [key: string]: string } = {
    'cnn.com': 'CNN',
    'foxnews.com': 'Fox News',
    'reuters.com': 'Reuters',
    'apnews.com': 'Associated Press',
    'npr.org': 'NPR',
    'washingtonpost.com': 'Washington Post',
    'nytimes.com': 'New York Times',
    'wsj.com': 'Wall Street Journal',
    'politico.com': 'Politico',
    'thehill.com': 'The Hill',
    'usatoday.com': 'USA Today',
    'nbcnews.com': 'NBC News',
    'abcnews.go.com': 'ABC News',
    'cbsnews.com': 'CBS News',
    'bloomberg.com': 'Bloomberg',
    'axios.com': 'Axios',
    'rollcall.com': 'Roll Call',
    'congress.gov': 'Congress.gov',
    'govexec.com': 'Government Executive',
  };

  const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
  const domainPart = cleanDomain.split('.')[0];
  return (
    domainMap[cleanDomain] ||
    (domainPart
      ? domainPart
          .replace(/[-_]/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      : cleanDomain)
  );
}

// Normalize date format from GDELT
function normalizeDate(dateString: string): string {
  if (!dateString || typeof dateString !== 'string') {
    return new Date().toISOString();
  }

  try {
    // Handle different GDELT date formats
    if (dateString.includes('T') && dateString.includes('Z')) {
      // Format: 20250709T193000Z
      const cleanDate = dateString.replace(/T(\d{6})Z/, 'T$1:00:00Z');
      // Insert colons: 20250709T193000Z -> 2025-07-09T19:30:00Z
      const year = cleanDate.slice(0, 4);
      const month = cleanDate.slice(4, 6);
      const day = cleanDate.slice(6, 8);
      const time = cleanDate.slice(9, 15); // HHMMSS
      const hour = time.slice(0, 2) || '00';
      const minute = time.slice(2, 4) || '00';
      const second = time.slice(4, 6) || '00';

      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      const date = new Date(isoString);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date components: ${isoString}`);
      }

      return date.toISOString();
    } else if (dateString.length >= 8) {
      // Traditional format: YYYYMMDDHHMMSS
      const year = dateString.slice(0, 4);
      const month = dateString.slice(4, 6);
      const day = dateString.slice(6, 8);
      const hour = dateString.slice(8, 10) || '00';
      const minute = dateString.slice(10, 12) || '00';
      const second = dateString.slice(12, 14) || '00';

      // Validate components
      if (parseInt(month) < 1 || parseInt(month) > 12) {
        throw new Error(`Invalid month: ${month}`);
      }
      if (parseInt(day) < 1 || parseInt(day) > 31) {
        throw new Error(`Invalid day: ${day}`);
      }
      if (parseInt(hour) > 23) {
        throw new Error(`Invalid hour: ${hour}`);
      }
      if (parseInt(minute) > 59) {
        throw new Error(`Invalid minute: ${minute}`);
      }
      if (parseInt(second) > 59) {
        throw new Error(`Invalid second: ${second}`);
      }

      const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
      const date = new Date(isoString);

      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${isoString}`);
      }

      return date.toISOString();
    } else {
      // Try direct parsing for other formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        throw new Error(`Unable to parse date: ${dateString}`);
      }
      return date.toISOString();
    }
  } catch (error) {
    logger.error('Error parsing GDELT date', error as Error, {
      dateString,
      dateStringLength: dateString.length,
      operation: 'gdelt_date_parse_error',
    });
  }

  // Fallback to current time if parsing fails
  return new Date().toISOString();
}

/**
 * Enhanced GDELT Real-time News Monitoring
 */

interface GDELTEvent {
  globalEventId: string;
  dateAdded: string;
  sourceUrl: string;
  actor1Name: string;
  actor1CountryCode: string;
  actor2Name: string;
  actor2CountryCode: string;
  eventCode: string;
  eventBaseCode: string;
  eventRootCode: string;
  quadClass: number;
  goldsteinScale: number;
  numMentions: number;
  numSources: number;
  avgTone: number;
  actionGeoCountryCode: string;
  actionGeoStateName: string;
  actionGeoCityName: string;
  actionGeoLat: number;
  actionGeoLong: number;
}

interface GDELTTrend {
  term: string;
  count: number;
  trend: 'rising' | 'falling' | 'stable';
  percentChange: number;
  timeframe: string;
}

interface GDELTRealTimeStream {
  lastUpdate: string;
  articles: unknown[];
  events: GDELTEvent[];
  trends: GDELTTrend[];
  alerts: Array<{
    type: 'breaking' | 'trending' | 'crisis';
    message: string;
    timestamp: string;
    urgency: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Fetch real-time GDELT event stream
 */
export async function fetchGDELTRealTimeEvents(
  keywords: string[],
  timeframe: '15min' | '1hour' | '6hour' | '24hour' = '1hour'
): Promise<GDELTEvent[]> {
  if (!rateLimiter.canMakeCall()) {
    const waitTime = rateLimiter.getWaitTime();
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  return retryWithBackoff(async () => {
    const queryTerms = keywords.map(k => encodeURIComponent(k)).join(' OR ');

    // Use GDELT GEO 2.0 API for real-time events
    const url = `https://api.gdeltproject.org/api/v2/geo/geo?query=${queryTerms}&mode=pointdata&format=json&timespan=${timeframe}&output=json`;

    logger.info('Fetching GDELT real-time events', {
      keywords,
      timeframe,
      operation: 'gdelt_realtime_events_fetch',
    });

    rateLimiter.recordCall();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new GDELTAPIError(
        `GDELT GEO API error: ${response.status} ${response.statusText}`,
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();
    return data.events || [];
  });
}

/**
 * Fetch trending political topics from GDELT
 */
export async function fetchGDELTTrends(
  category: 'politics' | 'government' | 'congress' | 'elections' = 'politics',
  timeframe: '1hour' | '6hour' | '24hour' = '6hour'
): Promise<GDELTTrend[]> {
  if (!rateLimiter.canMakeCall()) {
    const waitTime = rateLimiter.getWaitTime();
    if (waitTime > 0) {
      await sleep(waitTime);
    }
  }

  return retryWithBackoff(async () => {
    const categoryQueries = {
      politics: 'politics OR political OR politician OR campaign',
      government: 'government OR federal OR agency OR department',
      congress: 'congress OR senate OR house OR representative OR senator',
      elections: 'election OR voting OR ballot OR candidate',
    };

    const query = encodeURIComponent(categoryQueries[category]);

    // Use GDELT TV 2.0 API for trending analysis
    const url = `https://api.gdeltproject.org/api/v2/tv/tv?query=${query}&mode=timelinevol&format=json&timespan=${timeframe}`;

    logger.info('Fetching GDELT trends', {
      category,
      timeframe,
      operation: 'gdelt_trends_fetch',
    });

    rateLimiter.recordCall();

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new GDELTAPIError(
        `GDELT TV API error: ${response.status} ${response.statusText}`,
        response.status,
        response.status >= 500
      );
    }

    const data = await response.json();

    // Process timeline data into trends
    const timeline = data.timeline || [];
    return processTrendData(timeline, category);
  });
}

/**
 * Get comprehensive real-time GDELT data stream
 */
export async function getGDELTRealTimeStream(
  representativeName: string,
  state: string,
  district?: string
): Promise<GDELTRealTimeStream> {
  const searchTerms = generateOptimizedSearchTerms(representativeName, state, district);
  const keywords = [representativeName, state];

  try {
    // Fetch all data in parallel
    const [articlesWithStats, events, trends] = await Promise.all([
      // Recent articles with deduplication
      Promise.all(searchTerms.map(term => fetchGDELTNewsWithDeduplication(term, 5))).then(
        results => {
          // Combine all articles and their stats
          const allArticles = results.flatMap(r => r.articles);
          const _combinedStats = results.reduce(
            (acc, r) => ({
              originalCount: acc.originalCount + r.stats.originalCount,
              duplicatesRemoved: acc.duplicatesRemoved + r.stats.duplicatesRemoved,
              finalCount: acc.finalCount + r.stats.finalCount,
              duplicatesDetected: [...acc.duplicatesDetected, ...r.stats.duplicatesDetected],
            }),
            {
              originalCount: 0,
              duplicatesRemoved: 0,
              finalCount: 0,
              duplicatesDetected: [] as {
                method: string;
                originalIndex: number;
                duplicateIndex: number;
                similarity: number;
              }[],
            }
          );

          // Final deduplication across search terms
          const { articles: finalArticles } = deduplicateNews(
            allArticles.map(article => ({
              url: article.url,
              title: article.title,
              seendate: article.seendate,
              domain: article.domain,
              socialimage: article.socialimage,
              urlmobile: article.urlmobile,
              language: article.language,
              sourcecountry: article.sourcecountry,
            })),
            { maxArticlesPerDomain: 1, titleSimilarityThreshold: 0.9 }
          );

          return finalArticles.slice(0, 10).map(article => ({
            url: article.url,
            urlmobile: article.urlmobile,
            title: article.title,
            seendate: article.seendate,
            socialimage: article.socialimage,
            domain: article.domain,
            language: article.language || 'English',
            sourcecountry: article.sourcecountry || 'US',
          })) as GDELTArticle[];
        }
      ),

      // Real-time events
      fetchGDELTRealTimeEvents(keywords, '6hour'),

      // Trending topics
      fetchGDELTTrends('politics', '6hour'),
    ]);

    // Generate alerts based on data
    const alerts = generateAlerts(articlesWithStats, events, trends, representativeName);

    return {
      lastUpdate: new Date().toISOString(),
      articles: articlesWithStats.map((article: GDELTArticle) => normalizeGDELTArticle(article)),
      events: events.slice(0, 20),
      trends: trends.slice(0, 10),
      alerts,
    };
  } catch (error) {
    logger.error('Error fetching GDELT real-time stream', error as Error, {
      representativeName,
      state,
      district,
      operation: 'gdelt_realtime_stream_error',
    });

    // Return empty stream on error
    return {
      lastUpdate: new Date().toISOString(),
      articles: [],
      events: [],
      trends: [],
      alerts: [
        {
          type: 'crisis',
          message: 'News data temporarily unavailable',
          timestamp: new Date().toISOString(),
          urgency: 'low',
        },
      ],
    };
  }
}

/**
 * Monitor for breaking news about a representative
 */
export async function monitorBreakingNews(
  representativeName: string,
  state: string,
  lastCheckTime: string
): Promise<
  Array<{
    article: unknown;
    urgency: 'low' | 'medium' | 'high';
    category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
  }>
> {
  const searchTerms = generateOptimizedSearchTerms(representativeName, state);
  const breakingNews: Array<{
    article: unknown;
    urgency: 'low' | 'medium' | 'high';
    category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
  }> = [];

  try {
    // Fetch deduplicated articles for all search terms
    const results = await Promise.all(
      searchTerms.map(term => fetchGDELTNewsWithDeduplication(term, 5))
    );

    // Combine and deduplicate across all terms
    const allArticles = results.flatMap(r => r.articles);
    const { articles: deduplicatedArticles } = deduplicateNews(
      allArticles.map(article => ({
        url: article.url,
        title: article.title,
        seendate: article.seendate,
        domain: article.domain,
        socialimage: article.socialimage,
        urlmobile: article.urlmobile,
        language: article.language,
        sourcecountry: article.sourcecountry,
      })),
      { titleSimilarityThreshold: 0.9, maxArticlesPerDomain: 2 }
    );

    // Filter for articles since last check
    const recentArticles = deduplicatedArticles.filter(
      article => new Date(normalizeDate(article.seendate)) > new Date(lastCheckTime)
    );

    for (const article of recentArticles) {
      const gdeltArticle: GDELTArticle = {
        url: article.url,
        urlmobile: article.urlmobile,
        title: article.title,
        seendate: article.seendate,
        socialimage: article.socialimage,
        domain: article.domain,
        language: article.language || 'English',
        sourcecountry: article.sourcecountry || 'US',
      };

      const normalized = normalizeGDELTArticle(gdeltArticle);
      const normalizedData = normalized as { title: string; source: string };
      const analysis = analyzeNewsUrgency(normalizedData.title, normalizedData.source);

      if (analysis.urgency !== 'low') {
        breakingNews.push({
          article: normalized,
          urgency: analysis.urgency,
          category: analysis.category,
        });
      }
    }

    // Sort by urgency and recency
    return breakingNews
      .sort((a, b) => {
        const urgencyWeight: { [key: string]: number } = { high: 3, medium: 2, low: 1 };
        return (urgencyWeight[b.urgency] || 0) - (urgencyWeight[a.urgency] || 0);
      })
      .slice(0, 10);
  } catch (error) {
    logger.error('Error monitoring breaking news', error as Error, {
      representativeName,
      state,
      operation: 'gdelt_breaking_news_error',
    });
    return [];
  }
}

/**
 * Process trend data from GDELT timeline
 */
function processTrendData(timeline: unknown[], _category: string): GDELTTrend[] {
  if (!timeline || timeline.length === 0) return [];

  const trends: GDELTTrend[] = [];
  const termCounts = new Map<string, number[]>();

  // Aggregate mentions over time
  timeline.forEach((entry: unknown) => {
    const entryData = entry as { terms?: Array<{ term: string; count?: number }> };
    const terms = entryData.terms || [];
    terms.forEach(term => {
      if (!termCounts.has(term.term)) {
        termCounts.set(term.term, []);
      }
      termCounts.get(term.term)!.push(term.count || 0);
    });
  });

  // Calculate trends
  termCounts.forEach((counts, term) => {
    if (counts.length < 2) return;

    const recent = counts.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const previous = counts.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;

    const percentChange = previous > 0 ? ((recent - previous) / previous) * 100 : 0;

    let trend: 'rising' | 'falling' | 'stable' = 'stable';
    if (percentChange > 20) trend = 'rising';
    else if (percentChange < -20) trend = 'falling';

    trends.push({
      term,
      count: Math.round(recent),
      trend,
      percentChange: Math.round(percentChange * 100) / 100,
      timeframe: '6 hours',
    });
  });

  return trends
    .filter(trend => trend.count > 5) // Filter low-volume terms
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

/**
 * Generate alerts based on GDELT data
 */
function generateAlerts(
  articles: unknown[],
  events: GDELTEvent[],
  trends: GDELTTrend[],
  representativeName: string
): Array<{
  type: 'breaking' | 'trending' | 'crisis';
  message: string;
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
}> {
  const alerts: Array<{
    type: 'breaking' | 'trending' | 'crisis';
    message: string;
    timestamp: string;
    urgency: 'low' | 'medium' | 'high';
  }> = [];
  const now = new Date().toISOString();

  // Check for breaking news
  const recentArticles = articles.filter((article: unknown) => {
    const articleData = article as { publishedDate: string };
    const articleTime = new Date(articleData.publishedDate);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return articleTime > hourAgo;
  });

  if (recentArticles.length > 3) {
    alerts.push({
      type: 'breaking',
      message: `${recentArticles.length} recent news articles about ${representativeName}`,
      timestamp: now,
      urgency: 'medium',
    });
  }

  // Check for trending topics
  const risingTrends = trends.filter(trend => trend.trend === 'rising' && trend.percentChange > 50);
  if (risingTrends.length > 0 && risingTrends[0]) {
    alerts.push({
      type: 'trending',
      message: `Trending: ${risingTrends[0].term} (+${risingTrends[0].percentChange}%)`,
      timestamp: now,
      urgency: 'low',
    });
  }

  // Check for high-volume events
  const significantEvents = events.filter(
    event => event.numMentions > 10 && Math.abs(event.goldsteinScale) > 5
  );

  if (significantEvents.length > 0) {
    alerts.push({
      type: 'crisis',
      message: `${significantEvents.length} significant political events detected`,
      timestamp: now,
      urgency: 'high',
    });
  }

  return alerts.slice(0, 5);
}

/**
 * Analyze news urgency and categorization
 */
function analyzeNewsUrgency(
  title: string,
  source: string
): {
  urgency: 'low' | 'medium' | 'high';
  category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
} {
  const titleLower = title.toLowerCase();

  // High urgency keywords
  const highUrgencyTerms = [
    'breaking',
    'urgent',
    'resign',
    'scandal',
    'investigation',
    'indicted',
    'arrested',
    'charged',
    'impeach',
    'emergency',
  ];

  // Medium urgency keywords
  const mediumUrgencyTerms = [
    'announces',
    'proposes',
    'introduces',
    'votes',
    'passes',
    'opposes',
    'supports',
    'committee',
    'hearing',
    'debate',
  ];

  // Category keywords
  const categoryKeywords = {
    legislation: ['bill', 'vote', 'law', 'legislation', 'amendment', 'act'],
    scandal: ['scandal', 'investigation', 'ethics', 'corruption', 'fraud'],
    election: ['election', 'campaign', 'candidate', 'primary', 'ballot'],
    policy: ['policy', 'budget', 'healthcare', 'immigration', 'climate'],
  };

  let urgency: 'low' | 'medium' | 'high' = 'low';
  let category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other' = 'other';

  // Determine urgency
  if (highUrgencyTerms.some(term => titleLower.includes(term))) {
    urgency = 'high';
  } else if (mediumUrgencyTerms.some(term => titleLower.includes(term))) {
    urgency = 'medium';
  }

  // Determine category
  for (const [cat, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => titleLower.includes(keyword))) {
      category = cat as 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
      break;
    }
  }

  // Boost urgency for trusted sources
  const trustedSources = ['Reuters', 'Associated Press', 'NPR', 'Congress.gov'];
  if (trustedSources.includes(source) && urgency === 'low') {
    urgency = 'medium';
  }

  return { urgency, category };
}

// Export new functions
export type { GDELTEvent, GDELTTrend, GDELTRealTimeStream };

// GDELT API utility with proper error handling, rate limiting, and retry logic
import { structuredLogger } from '@/lib/logging/logger';
import { deduplicateNews, type NewsArticle, type DuplicationStats, type DeduplicationOptions } from '@/lib/news-deduplication';

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
  constructor(message: string, public statusCode?: number, public retryable: boolean = false) {
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
      const delay = Math.min(
        options.baseDelay * Math.pow(2, attempt),
        options.maxDelay
      );
      
      structuredLogger.warn(`GDELT API retry attempt ${attempt + 1}`, {
        attempt: attempt + 1,
        maxRetries: options.maxRetries,
        delay,
        error: error.message,
        operation: 'gdelt_api_retry'
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
  // Clean the representative name
  const cleanName = representativeName
    .replace(/^(Rep\.|Representative|Senator|Sen\.)\s+/, '')
    .replace(/,.*$/, '')
    .trim();

  const searchTerms: string[] = [];
  
  // Primary exact name searches with civic context
  searchTerms.push(`"${cleanName}" AND (Congress OR Senate OR House OR Representative OR legislation)`);
  
  if (district) {
    // House representative specific terms
    searchTerms.push(`"${cleanName}" AND "${state}" AND "district" AND (bill OR vote OR committee)`);
    searchTerms.push(`"Representative ${cleanName}" AND "${state}"`);
  } else {
    // Senate specific terms
    searchTerms.push(`"Senator ${cleanName}" AND "${state}" AND (bill OR amendment OR hearing)`);
    searchTerms.push(`"${cleanName}" AND "Senate" AND "${state}"`);
  }

  // Add broader civic terms (limit to most relevant)
  searchTerms.push(`"${cleanName}" AND (politics OR government OR policy)`);

  return searchTerms.slice(0, 3); // Limit to 3 most effective terms
}

// Main GDELT API fetch function with comprehensive error handling and deduplication
export async function fetchGDELTNewsWithDeduplication(
  searchTerm: string, 
  maxRecords: number = 10,
  deduplicationOptions?: Partial<DeduplicationOptions>
): Promise<{ articles: GDELTArticle[], stats: DuplicationStats }> {
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
    sourcecountry: article.sourcecountry
  }));

  // Apply deduplication
  const { articles: deduplicatedArticles, stats } = deduplicateNews(newsArticles, {
    enableUrlDeduplication: true,
    enableTitleSimilarity: true,
    enableDomainClustering: true,
    maxArticlesPerDomain: 2,
    titleSimilarityThreshold: 0.85,
    logDuplicates: true,
    ...deduplicationOptions
  });

  // Convert back to GDELT format and limit to requested count
  const finalArticles: GDELTArticle[] = deduplicatedArticles
    .slice(0, maxRecords)
    .map(article => ({
      url: article.url,
      urlmobile: article.urlmobile,
      title: article.title,
      seendate: article.seendate,
      socialimage: article.socialimage,
      domain: article.domain,
      language: article.language || 'English',
      sourcecountry: article.sourcecountry || 'US'
    }));

  // Log deduplication results
  structuredLogger.info('GDELT news deduplication completed', {
    searchTerm: searchTerm.slice(0, 50),
    originalCount: stats.originalCount,
    duplicatesRemoved: stats.duplicatesRemoved,
    finalCount: stats.finalCount,
    requestedCount: maxRecords,
    actualReturned: finalArticles.length,
    operation: 'gdelt_news_deduplication'
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
      structuredLogger.warn('GDELT API rate limited', {
        waitTime,
        operation: 'gdelt_rate_limit'
      });
      await sleep(waitTime);
    }
  }

  return retryWithBackoff(async () => {
    const encodedQuery = encodeURIComponent(searchTerm);
    
    // Use GDELT DOC 2.0 API with enhanced parameters
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=${maxRecords}&format=json&sort=datedesc&timespan=30d&theme=GENERAL_GOVERNMENT,POLITICAL_PROCESS,POLITICAL_CANDIDATE`;
    
    structuredLogger.info('Fetching GDELT news', {
      searchTerm: searchTerm.slice(0, 50),
      maxRecords,
      operation: 'gdelt_news_fetch'
    });
    
    const headers = {
      'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Accept-Encoding': 'gzip, deflate'
    };
    
    rateLimiter.recordCall();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      const duration = Date.now() - startTime;
      
      // Log external API call
      structuredLogger.externalApi('GDELT', 'fetchNews', duration, response.ok, {
        searchTerm: searchTerm.slice(0, 50),
        maxRecords,
        statusCode: response.status
      });
      
      if (!response.ok) {
        const isRetryable = response.status >= 500 || response.status === 429;
        throw new GDELTAPIError(
          `GDELT API error: ${response.status} ${response.statusText}`,
          response.status,
          isRetryable
        );
      }
      
      const text = await response.text();
      
      if (!text || text.trim() === '') {
        structuredLogger.warn('Empty response from GDELT API', {
          searchTerm: searchTerm.slice(0, 50),
          operation: 'gdelt_empty_response'
        });
        return [];
      }
      
      let data: GDELTResponse;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        structuredLogger.error('Failed to parse GDELT JSON response', parseError, {
          searchTerm: searchTerm.slice(0, 50),
          operation: 'gdelt_json_parse_error'
        });
        throw new GDELTAPIError('Invalid JSON response from GDELT API', undefined, false);
      }
      
      const articles = data.articles || [];
      structuredLogger.info('GDELT articles retrieved', {
        searchTerm: searchTerm.slice(0, 50),
        articleCount: articles.length,
        operation: 'gdelt_articles_retrieved',
        duration
      });
      
      // Filter for English articles and basic quality checks
      const filteredArticles = articles.filter(article => 
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
      structuredLogger.externalApi('GDELT', 'fetchNews', duration, false, {
        searchTerm: searchTerm.slice(0, 50),
        maxRecords,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (error.name === 'AbortError') {
        throw new GDELTAPIError('GDELT API request timeout', undefined, true);
      }
      
      throw error;
    }
  });
}

// Clean and normalize article data
export function normalizeGDELTArticle(article: GDELTArticle): any {
  return {
    title: cleanTitle(article.title),
    url: article.url,
    source: extractSourceName(article.domain),
    publishedDate: normalizeDate(article.seendate),
    language: article.language,
    imageUrl: article.socialimage || undefined,
    domain: article.domain
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
    'govexec.com': 'Government Executive'
  };

  const cleanDomain = domain.replace(/^www\./, '').toLowerCase();
  return domainMap[cleanDomain] || 
         cleanDomain.split('.')[0]
           .replace(/[-_]/g, ' ')
           .split(' ')
           .map(word => word.charAt(0).toUpperCase() + word.slice(1))
           .join(' ');
}

// Normalize date format from GDELT
function normalizeDate(dateString: string): string {
  try {
    // GDELT dates are in format: YYYYMMDDHHMMSS
    if (dateString.length >= 8) {
      const year = dateString.slice(0, 4);
      const month = dateString.slice(4, 6);
      const day = dateString.slice(6, 8);
      const hour = dateString.slice(8, 10) || '00';
      const minute = dateString.slice(10, 12) || '00';
      
      const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
      return date.toISOString();
    }
  } catch (error) {
    structuredLogger.error('Error parsing GDELT date', error, {
      dateString,
      operation: 'gdelt_date_parse_error'
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
  articles: GDELTArticle[];
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
    
    structuredLogger.info('Fetching GDELT real-time events', {
      keywords,
      timeframe,
      operation: 'gdelt_realtime_events_fetch'
    });
    
    rateLimiter.recordCall();
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache'
      },
      cache: 'no-store'
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
      elections: 'election OR voting OR ballot OR candidate'
    };

    const query = encodeURIComponent(categoryQueries[category]);
    
    // Use GDELT TV 2.0 API for trending analysis
    const url = `https://api.gdeltproject.org/api/v2/tv/tv?query=${query}&mode=timelinevol&format=json&timespan=${timeframe}`;
    
    structuredLogger.info('Fetching GDELT trends', {
      category,
      timeframe,
      operation: 'gdelt_trends_fetch'
    });
    
    rateLimiter.recordCall();
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
        'Accept': 'application/json'
      },
      cache: 'no-store'
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
      Promise.all(searchTerms.map(term => fetchGDELTNewsWithDeduplication(term, 5)))
        .then(results => {
          // Combine all articles and their stats
          const allArticles = results.flatMap(r => r.articles);
          const combinedStats = results.reduce((acc, r) => ({
            originalCount: acc.originalCount + r.stats.originalCount,
            duplicatesRemoved: acc.duplicatesRemoved + r.stats.duplicatesRemoved,
            finalCount: acc.finalCount + r.stats.finalCount,
            duplicatesDetected: [...acc.duplicatesDetected, ...r.stats.duplicatesDetected]
          }), {
            originalCount: 0,
            duplicatesRemoved: 0,
            finalCount: 0,
            duplicatesDetected: []
          });
          
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
              sourcecountry: article.sourcecountry
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
            sourcecountry: article.sourcecountry || 'US'
          }));
        }),
      
      // Real-time events
      fetchGDELTRealTimeEvents(keywords, '6hour'),
      
      // Trending topics
      fetchGDELTTrends('politics', '6hour')
    ]);

    // Generate alerts based on data
    const alerts = generateAlerts(articlesWithStats, events, trends, representativeName);

    return {
      lastUpdate: new Date().toISOString(),
      articles: articlesWithStats.map(normalizeGDELTArticle),
      events: events.slice(0, 20),
      trends: trends.slice(0, 10),
      alerts
    };

  } catch (error) {
    structuredLogger.error('Error fetching GDELT real-time stream', error, {
      representativeName,
      state,
      district,
      operation: 'gdelt_realtime_stream_error'
    });
    
    // Return empty stream on error
    return {
      lastUpdate: new Date().toISOString(),
      articles: [],
      events: [],
      trends: [],
      alerts: [{
        type: 'crisis',
        message: 'News data temporarily unavailable',
        timestamp: new Date().toISOString(),
        urgency: 'low'
      }]
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
): Promise<Array<{
  article: any;
  urgency: 'low' | 'medium' | 'high';
  category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
}>> {
  const searchTerms = generateOptimizedSearchTerms(representativeName, state);
  const breakingNews: any[] = [];

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
        sourcecountry: article.sourcecountry
      })),
      { titleSimilarityThreshold: 0.9, maxArticlesPerDomain: 2 }
    );
    
    // Filter for articles since last check
    const recentArticles = deduplicatedArticles.filter(article => 
      new Date(normalizeDate(article.seendate)) > new Date(lastCheckTime)
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
        sourcecountry: article.sourcecountry || 'US'
      };
      
      const normalized = normalizeGDELTArticle(gdeltArticle);
      const analysis = analyzeNewsUrgency(normalized.title, normalized.source);
      
      if (analysis.urgency !== 'low') {
        breakingNews.push({
          article: normalized,
          urgency: analysis.urgency,
          category: analysis.category
        });
      }
    }

    // Sort by urgency and recency
    return breakingNews
      .sort((a, b) => {
        const urgencyWeight = { high: 3, medium: 2, low: 1 };
        return urgencyWeight[b.urgency] - urgencyWeight[a.urgency];
      })
      .slice(0, 10);

  } catch (error) {
    structuredLogger.error('Error monitoring breaking news', error, {
      representativeName,
      state,
      operation: 'gdelt_breaking_news_error'
    });
    return [];
  }
}

/**
 * Process trend data from GDELT timeline
 */
function processTrendData(timeline: any[], category: string): GDELTTrend[] {
  if (!timeline || timeline.length === 0) return [];

  const trends: GDELTTrend[] = [];
  const termCounts = new Map<string, number[]>();

  // Aggregate mentions over time
  timeline.forEach((entry: any) => {
    const terms = entry.terms || [];
    terms.forEach((term: any) => {
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
      timeframe: '6 hours'
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
  articles: any[],
  events: GDELTEvent[],
  trends: GDELTTrend[],
  representativeName: string
): Array<{
  type: 'breaking' | 'trending' | 'crisis';
  message: string;
  timestamp: string;
  urgency: 'low' | 'medium' | 'high';
}> {
  const alerts: any[] = [];
  const now = new Date().toISOString();

  // Check for breaking news
  const recentArticles = articles.filter(article => {
    const articleTime = new Date(article.publishedDate);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return articleTime > hourAgo;
  });

  if (recentArticles.length > 3) {
    alerts.push({
      type: 'breaking',
      message: `${recentArticles.length} recent news articles about ${representativeName}`,
      timestamp: now,
      urgency: 'medium'
    });
  }

  // Check for trending topics
  const risingTrends = trends.filter(trend => trend.trend === 'rising' && trend.percentChange > 50);
  if (risingTrends.length > 0) {
    alerts.push({
      type: 'trending',
      message: `Trending: ${risingTrends[0].term} (+${risingTrends[0].percentChange}%)`,
      timestamp: now,
      urgency: 'low'
    });
  }

  // Check for high-volume events
  const significantEvents = events.filter(event => 
    event.numMentions > 10 && Math.abs(event.goldsteinScale) > 5
  );

  if (significantEvents.length > 0) {
    alerts.push({
      type: 'crisis',
      message: `${significantEvents.length} significant political events detected`,
      timestamp: now,
      urgency: 'high'
    });
  }

  return alerts.slice(0, 5);
}

/**
 * Analyze news urgency and categorization
 */
function analyzeNewsUrgency(title: string, source: string): {
  urgency: 'low' | 'medium' | 'high';
  category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
} {
  const titleLower = title.toLowerCase();
  
  // High urgency keywords
  const highUrgencyTerms = [
    'breaking', 'urgent', 'resign', 'scandal', 'investigation', 
    'indicted', 'arrested', 'charged', 'impeach', 'emergency'
  ];
  
  // Medium urgency keywords
  const mediumUrgencyTerms = [
    'announces', 'proposes', 'introduces', 'votes', 'passes',
    'opposes', 'supports', 'committee', 'hearing', 'debate'
  ];

  // Category keywords
  const categoryKeywords = {
    legislation: ['bill', 'vote', 'law', 'legislation', 'amendment', 'act'],
    scandal: ['scandal', 'investigation', 'ethics', 'corruption', 'fraud'],
    election: ['election', 'campaign', 'candidate', 'primary', 'ballot'],
    policy: ['policy', 'budget', 'healthcare', 'immigration', 'climate']
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
      category = cat as any;
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
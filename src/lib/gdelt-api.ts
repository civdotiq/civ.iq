// GDELT API utility with proper error handling, rate limiting, and retry logic

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
      
      console.log(`GDELT API attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
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

// Main GDELT API fetch function with comprehensive error handling
export async function fetchGDELTNews(
  searchTerm: string, 
  maxRecords: number = 10
): Promise<GDELTArticle[]> {
  // Check rate limit
  if (!rateLimiter.canMakeCall()) {
    const waitTime = rateLimiter.getWaitTime();
    if (waitTime > 0) {
      console.log(`Rate limited, waiting ${waitTime}ms`);
      await sleep(waitTime);
    }
  }

  return retryWithBackoff(async () => {
    const encodedQuery = encodeURIComponent(searchTerm);
    
    // Use GDELT DOC 2.0 API with enhanced parameters
    const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodedQuery}&mode=artlist&maxrecords=${maxRecords}&format=json&sort=datedesc&timespan=30d&theme=GENERAL_GOVERNMENT,POLITICAL_PROCESS,POLITICAL_CANDIDATE`;
    
    console.log(`Fetching GDELT news: ${searchTerm.slice(0, 50)}...`);
    
    const headers = {
      'User-Agent': 'CivicIntelHub/1.0 (https://civic-intel-hub.vercel.app)',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      'Accept-Encoding': 'gzip, deflate'
    };
    
    rateLimiter.recordCall();
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      const response = await fetch(url, {
        headers,
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
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
        console.log('Empty response from GDELT API');
        return [];
      }
      
      let data: GDELTResponse;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse GDELT JSON response:', parseError);
        throw new GDELTAPIError('Invalid JSON response from GDELT API', undefined, false);
      }
      
      const articles = data.articles || [];
      console.log(`GDELT returned ${articles.length} articles`);
      
      // Filter for English articles and basic quality checks
      return articles.filter(article => 
        article.language === 'English' &&
        article.title &&
        article.url &&
        article.domain &&
        article.title.length > 10 &&
        !article.title.toLowerCase().includes('404') &&
        !article.title.toLowerCase().includes('error')
      );
      
    } catch (error) {
      clearTimeout(timeoutId);
      
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
    console.error('Error parsing GDELT date:', dateString, error);
  }
  
  // Fallback to current time if parsing fails
  return new Date().toISOString();
}
/**
 * Production-Ready Batch Voting Service
 *
 * Optimizes voting data retrieval with:
 * - Batch XML processing with parallel fetching (max 5 concurrent)
 * - In-memory caching for parsed vote data (24hr TTL)
 * - Rate limiting and circuit breaker patterns
 * - Target: <2 second response time for any representative
 */

import { logger } from '@/lib/logging/logger-edge';
import { getAllMappings } from '@/lib/data/legislator-mappings';
import { circuitBreakers } from '@/lib/circuit-breaker';

// Connection pooling with HTTP keep-alive for performance optimization
class HttpClient {
  private static instance: HttpClient;
  private controller: AbortController;

  private constructor() {
    this.controller = new AbortController();
  }

  static getInstance(): HttpClient {
    if (!HttpClient.instance) {
      HttpClient.instance = new HttpClient();
    }
    return HttpClient.instance;
  }

  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const defaultOptions: RequestInit = {
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (Performance Optimized)',
        Connection: 'keep-alive',
        ...options.headers,
      },
      signal: options.signal || AbortSignal.timeout(10000), // 10s timeout
    };

    // Standard fetch options for all environments

    const mergedOptions = { ...defaultOptions, ...options };

    // Determine appropriate circuit breaker based on URL
    let circuitBreaker;
    if (url.includes('api.congress.gov')) {
      circuitBreaker = circuitBreakers.congress;
    } else if (url.includes('senate.gov')) {
      circuitBreaker = circuitBreakers.senate;
    } else if (url.includes('api.open.fec.gov')) {
      circuitBreaker = circuitBreakers.fec;
    } else if (url.includes('api.census.gov')) {
      circuitBreaker = circuitBreakers.census;
    } else if (url.includes('gdelt')) {
      circuitBreaker = circuitBreakers.gdelt;
    }

    const fetchOperation = async (): Promise<Response> => {
      try {
        return await fetch(url, mergedOptions);
      } catch (error) {
        logger.warn('HTTP client fetch failed', {
          url,
          error: error instanceof Error ? error.message : 'Unknown',
        });
        throw error;
      }
    };

    // Use circuit breaker if available, otherwise direct fetch
    if (circuitBreaker) {
      return await circuitBreaker.execute(fetchOperation);
    } else {
      return await fetchOperation();
    }
  }

  // Cleanup method for connection management
  destroy(): void {
    this.controller.abort();
  }
}

// Singleton HTTP client instance
const httpClient = HttpClient.getInstance();

// Simple concurrency limiter implementation
class ConcurrencyLimiter {
  private running = 0;
  private queue: Array<() => void> = [];

  constructor(private limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++;

        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.running--;
          this.processQueue();
        }
      };

      if (this.running < this.limit) {
        execute();
      } else {
        this.queue.push(execute);
      }
    });
  }

  private processQueue(): void {
    if (this.queue.length > 0 && this.running < this.limit) {
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

// Cache configuration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class InMemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL = 24 * 60 * 60 * 1000; // 24 hours

  set<T>(key: string, data: T, ttlMs?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs || this.defaultTTL,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Cleanup expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Standardized vote data structure
interface StandardizedVote {
  voteId: string;
  congress: number;
  session: number;
  chamber: 'House' | 'Senate';
  rollCallNumber: number;
  date: string;
  question: string;
  result: string;
  bill?: {
    congress: number;
    type: string;
    number: string;
    title: string;
    url?: string;
  };
  totals: {
    yea: number;
    nay: number;
    present: number;
    notVoting: number;
  };
  memberVotes: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  }>;
  sourceUrl: string;
  processedAt: string;
}

interface VoteListItem {
  rollCallNumber: number;
  sourceDataURL: string;
  date: string;
  question: string;
  result: string;
  legislationNumber?: string;
  legislationType?: string;
  legislationUrl?: string;
}

// Circuit breaker for handling API failures
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 30000; // 30 seconds
  private readonly resetTimeout = 60000; // 1 minute

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen()) {
      throw new Error('Circuit breaker is OPEN - too many failures');
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private isOpen(): boolean {
    if (this.failures >= this.threshold) {
      if (Date.now() - this.lastFailTime > this.resetTimeout) {
        this.reset();
        return false;
      }
      return true;
    }
    return false;
  }

  private onSuccess(): void {
    this.failures = 0;
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailTime = Date.now();
  }

  private reset(): void {
    this.failures = 0;
    this.lastFailTime = 0;
  }

  getStatus(): { failures: number; isOpen: boolean } {
    return {
      failures: this.failures,
      isOpen: this.isOpen(),
    };
  }
}

export class BatchVotingService {
  private static instance: BatchVotingService;
  private cache = new InMemoryCache();
  private circuitBreaker = new CircuitBreaker();
  private limiter = new ConcurrencyLimiter(5); // Max 5 concurrent requests
  private apiKey = process.env.CONGRESS_API_KEY;
  private lisToGuideMappingPromise: Promise<Map<string, string>> | null = null;

  private constructor() {
    // Cleanup expired cache entries every hour
    setInterval(
      () => {
        this.cache.cleanup();
      },
      60 * 60 * 1000
    );
  }

  static getInstance(): BatchVotingService {
    if (!BatchVotingService.instance) {
      BatchVotingService.instance = new BatchVotingService();
    }
    return BatchVotingService.instance;
  }

  /**
   * Get House voting history for a member (optimized batch version)
   */
  async getHouseMemberVotes(
    bioguideId: string,
    congress = 119,
    session = 1,
    limit = 20,
    bypassCache = false
  ): Promise<
    Array<{
      voteId: string;
      date: string;
      question: string;
      position: string;
      result: string;
      bill?: StandardizedVote['bill'];
      rollCallNumber?: number;
    }>
  > {
    const startTime = Date.now();

    try {
      // Step 1: Get vote list (single API call)
      const voteList = await this.getHouseVoteList(congress, session, limit, bypassCache);

      if (voteList.length === 0) {
        logger.warn('No House votes found', { bioguideId, congress, session });
        return [];
      }

      // Step 2: Batch process all votes with caching and parallel fetching
      const votes = await this.batchProcessHouseVotes(voteList, bioguideId, bypassCache);

      logger.info('House member votes retrieved (optimized)', {
        bioguideId,
        votesFound: votes.length,
        totalProcessed: voteList.length,
        responseTime: Date.now() - startTime,
        cacheHits: voteList.filter(v =>
          this.cache.has(`house-vote-${congress}-${v.rollCallNumber}`)
        ).length,
      });

      return votes;
    } catch (error) {
      logger.error('Failed to get House member votes', error as Error, { bioguideId });
      return [];
    }
  }

  /**
   * Get Senate voting history for a member (optimized batch version)
   */
  async getSenateMemberVotes(
    bioguideId: string,
    congress = 119,
    session = 1,
    limit = 20
  ): Promise<
    Array<{
      voteId: string;
      date: string;
      question: string;
      position: string;
      result: string;
      bill?: StandardizedVote['bill'];
      rollCallNumber?: number;
    }>
  > {
    const startTime = Date.now();

    try {
      // For Senate, we work backwards from recent vote numbers
      const recentVoteNumbers = this.generateRecentSenateVoteNumbers(limit * 2); // Get more to account for gaps

      // Batch process Senate votes
      const votes = await this.batchProcessSenateVotes(
        recentVoteNumbers,
        congress,
        session,
        bioguideId
      );

      logger.info('Senate member votes retrieved (optimized)', {
        bioguideId,
        votesFound: votes.length,
        totalProcessed: recentVoteNumbers.length,
        responseTime: Date.now() - startTime,
        cacheHits: recentVoteNumbers.filter(n => this.cache.has(`senate-vote-${congress}-${n}`))
          .length,
      });

      return votes.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get Senate member votes', error as Error, { bioguideId });
      return [];
    }
  }

  /**
   * Get House vote list with pagination support to fetch ALL votes
   */
  private async getHouseVoteList(
    congress: number,
    session: number,
    limit: number,
    bypassCache = false
  ): Promise<VoteListItem[]> {
    const cacheKey = `house-vote-list-${congress}-${session}`;
    const cached = bypassCache ? null : this.cache.get<VoteListItem[]>(cacheKey);

    if (cached) {
      return cached.slice(0, limit);
    }

    try {
      const baseUrl = `https://api.congress.gov/v3/house-vote/${congress}`;
      const pageLimit = 250; // Maximum allowed by Congress.gov API
      let offset = 0;
      let hasMore = true;
      const allVotes: VoteListItem[] = [];

      logger.info('Fetching House votes with pagination', {
        congress,
        session,
        requestedLimit: limit,
        pageSize: pageLimit,
      });

      while (hasMore) {
        const params = new URLSearchParams({
          format: 'json',
          limit: pageLimit.toString(),
          offset: offset.toString(),
          sort: 'date:desc',
        });

        if (this.apiKey) {
          params.append('api_key', this.apiKey);
        }

        const response = await httpClient.fetch(`${baseUrl}?${params}`, {
          signal: AbortSignal.timeout(10000), // Increased timeout for larger requests
        });

        if (!response.ok) {
          throw new Error(`House vote list API failed: ${response.status}`);
        }

        const data = await response.json();
        const votes = data.rollCallVotes || data.houseRollCallVotes || data.votes || [];

        // Parse and add votes from this page
        const pageVotes: VoteListItem[] = votes.map((vote: Record<string, unknown>) => ({
          rollCallNumber: Number(vote.rollCallNumber || vote.number) || 0,
          sourceDataURL: String(vote.sourceDataURL || ''),
          date: String(vote.date || vote.voteDate || vote.startDate || ''),
          question: String(vote.question || vote.voteQuestion || ''),
          result: String(vote.result || vote.voteResult || ''),
          legislationNumber: vote.legislationNumber ? String(vote.legislationNumber) : undefined,
          legislationType: vote.legislationType ? String(vote.legislationType) : undefined,
          legislationUrl: vote.legislationUrl ? String(vote.legislationUrl) : undefined,
        }));

        allVotes.push(...pageVotes);

        // Check pagination info to determine if there are more pages
        const pagination = data.pagination;
        if (pagination) {
          const totalCount = pagination.count || 0;
          const currentPageSize = votes.length;

          // Continue if there's a next URL or if we haven't fetched all items yet
          hasMore = !!pagination.next || offset + currentPageSize < totalCount;

          // If we've already fetched enough votes for the requested limit, we can stop early
          if (allVotes.length >= limit * 2) {
            logger.info('Reached sufficient votes for requested limit', {
              fetched: allVotes.length,
              requested: limit,
            });
            hasMore = false;
          }
        } else {
          // No pagination info means this is likely the last/only page
          hasMore = false;
        }

        if (hasMore) {
          offset += pageLimit;
          logger.debug('Fetching next page of House votes', {
            offset,
            votesFetchedSoFar: allVotes.length,
          });
        }
      }

      logger.info('Completed fetching House votes', {
        congress,
        totalVotesFetched: allVotes.length,
        pagesRetrieved: Math.ceil(offset / pageLimit) + 1,
      });

      // Cache the complete list for 1 hour
      if (allVotes.length > 0) {
        this.cache.set(cacheKey, allVotes, 60 * 60 * 1000);
      }

      return allVotes.slice(0, limit);
    } catch (error) {
      logger.error('Failed to fetch House vote list', error as Error, {
        congress,
        session,
      });
      return [];
    }
  }

  /**
   * Batch process House votes with parallel XML fetching and caching
   */
  private async batchProcessHouseVotes(
    voteList: VoteListItem[],
    bioguideId: string,
    bypassCache = false
  ): Promise<
    Array<{
      voteId: string;
      date: string;
      question: string;
      position: string;
      result: string;
      bill?: StandardizedVote['bill'];
      rollCallNumber?: number;
    }>
  > {
    // Step 1: Check cache for all votes (unless bypassing cache)
    const cachedVotes: StandardizedVote[] = [];
    const uncachedVotes: VoteListItem[] = [];

    for (const vote of voteList) {
      const cacheKey = `house-vote-119-${vote.rollCallNumber}`;
      const cached = bypassCache ? null : this.cache.get<StandardizedVote>(cacheKey);

      if (cached) {
        cachedVotes.push(cached);
      } else {
        uncachedVotes.push(vote);
      }
    }

    // Step 2: Fetch uncached XMLs in parallel (with rate limiting)
    const fetchTasks = uncachedVotes.map(vote =>
      this.limiter.run(() => this.fetchAndParseHouseXML(vote))
    );

    const newVotes = await Promise.allSettled(fetchTasks);
    const successfulVotes: StandardizedVote[] = [];

    newVotes.forEach((result, _index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulVotes.push(result.value);

        // Cache the parsed vote
        const cacheKey = `house-vote-119-${result.value.rollCallNumber}`;
        this.cache.set(cacheKey, result.value);
      } else {
        logger.debug('Failed to parse House vote XML', {
          rollCallNumber: uncachedVotes[_index]?.rollCallNumber,
          error: result.status === 'rejected' ? result.reason : 'Unknown error',
        });
      }
    });

    // Step 3: Combine cached and new votes, extract member positions
    const allVotes = [...cachedVotes, ...successfulVotes];

    return this.extractMemberVotes(bioguideId, allVotes);
  }

  /**
   * Fetch and parse House XML vote data, with bill information enrichment
   */
  private async fetchAndParseHouseXML(vote: VoteListItem): Promise<StandardizedVote | null> {
    if (!vote.sourceDataURL) {
      return null;
    }

    try {
      const response = await this.circuitBreaker.call(async () => {
        const res = await httpClient.fetch(vote.sourceDataURL, {
          signal: AbortSignal.timeout(3000),
        });

        if (!res.ok) {
          throw new Error(`XML fetch failed: ${res.status}`);
        }

        return res.text();
      });

      const parsedVote = this.parseHouseXML(response, vote);

      // Enrich with bill information if available
      if (parsedVote && vote.legislationNumber && vote.legislationType) {
        parsedVote.bill = await this.fetchBillDetails(
          vote.legislationNumber,
          vote.legislationType,
          vote.legislationUrl
        );
      }

      return parsedVote;
    } catch (error) {
      logger.debug('Failed to fetch House XML', {
        rollCallNumber: vote.rollCallNumber,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Parse House XML vote data with fallback support for different XML schemas
   */
  private parseHouseXML(xmlText: string, voteInfo: VoteListItem): StandardizedVote | null {
    try {
      // Extract question and description from XML
      const getXmlTag = (tag: string) =>
        xmlText.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() || '';

      const voteQuestion = getXmlTag('vote-question') || getXmlTag('question') || voteInfo.question;
      const voteDesc = getXmlTag('vote-desc') || getXmlTag('description') || '';
      const legislativeNumber = getXmlTag('legis-num') || '';

      // Combine question and description for a more descriptive question
      let enhancedQuestion = voteQuestion || 'Unknown Question';
      if (voteDesc && voteDesc !== voteQuestion) {
        enhancedQuestion = voteDesc ? `${voteQuestion}: ${voteDesc}` : voteQuestion;
      }

      // Debug: Log the parsing process
      logger.debug('Parsing House XML', {
        rollCallNumber: voteInfo.rollCallNumber,
        xmlLength: xmlText.length,
        extractedQuestion: voteQuestion,
        extractedDesc: voteDesc,
        extractedLegisNum: legislativeNumber,
        enhancedQuestion,
      });

      // Try primary parsing method first
      let memberVotes = this.parseHouseXMLPrimary(xmlText);

      // If primary parsing fails or returns no results, try fallback methods
      if (memberVotes.length === 0) {
        logger.debug('Primary parsing failed, trying fallback methods', {
          rollCallNumber: voteInfo.rollCallNumber,
        });

        memberVotes =
          this.parseHouseXMLLegacy(xmlText) || this.parseHouseXMLAlternative(xmlText) || [];
      }

      // Enhanced logging for debugging
      const parsingResult = {
        rollCallNumber: voteInfo.rollCallNumber,
        memberVotesFound: memberVotes.length,
        parsingMethod: memberVotes.length > 0 ? 'success' : 'failed',
        xmlLength: xmlText.length,
        containsRecordedVote: xmlText.includes('<recorded-vote>'),
        containsMemberTag: xmlText.includes('<member>'),
        containsLegislatorTag: xmlText.includes('<legislator'),
        firstFewVoteIds: memberVotes.slice(0, 3).map(v => v.bioguideId),
      };

      if (memberVotes.length === 0) {
        logger.warn('House XML parsing returned no member votes', parsingResult);
      } else {
        logger.info('House XML parsing successful', parsingResult);
      }

      // Calculate totals
      const totals = {
        yea: memberVotes.filter((v: StandardizedVote['memberVotes'][0]) => v.position === 'Yea')
          .length,
        nay: memberVotes.filter((v: StandardizedVote['memberVotes'][0]) => v.position === 'Nay')
          .length,
        present: memberVotes.filter(
          (v: StandardizedVote['memberVotes'][0]) => v.position === 'Present'
        ).length,
        notVoting: memberVotes.filter(
          (v: StandardizedVote['memberVotes'][0]) => v.position === 'Not Voting'
        ).length,
      };

      return {
        voteId: `house-119-${voteInfo.rollCallNumber}`,
        congress: 119,
        session: 1,
        chamber: 'House',
        rollCallNumber: voteInfo.rollCallNumber,
        date: voteInfo.date,
        question: enhancedQuestion,
        result: voteInfo.result,
        totals,
        memberVotes,
        sourceUrl: voteInfo.sourceDataURL,
        processedAt: new Date().toISOString(),
        // Bill will be populated later in fetchAndParseHouseXML
        bill: undefined,
      };
    } catch (error) {
      logger.error('Failed to parse House XML', error as Error);
      return null;
    }
  }

  /**
   * Primary House XML parsing method for current format
   */
  private parseHouseXMLPrimary(xmlText: string): StandardizedVote['memberVotes'] {
    const memberVotes: StandardizedVote['memberVotes'] = [];

    try {
      const memberMatches = xmlText.matchAll(/<recorded-vote>[\s\S]*?<\/recorded-vote>/g);
      const memberMatchesArray = Array.from(memberMatches);

      for (const [memberXml] of memberMatchesArray) {
        // Extract vote from <vote> tag
        const voteMatch = memberXml.match(/<vote>([^<]*)<\/vote>/);
        const vote = voteMatch?.[1]?.trim() || '';

        // Extract legislator name (text content between <legislator> tags)
        const legislatorNameMatch = memberXml.match(/<legislator[^>]*>([^<]*)<\/legislator>/);
        const name = legislatorNameMatch?.[1]?.trim() || '';

        // Extract attributes from <legislator> tag
        const bioguideMatch = memberXml.match(/name-id="([^"]+)"/);
        const partyMatch = memberXml.match(/party="([^"]+)"/);
        const stateMatch = memberXml.match(/state="([^"]+)"/);

        const bioguideId = bioguideMatch?.[1] || '';
        const party = partyMatch?.[1] || 'Unknown';
        const state = stateMatch?.[1] || 'Unknown';

        // Only add if we have essential data
        if (bioguideId && vote) {
          memberVotes.push({
            bioguideId,
            name: name || 'Unknown',
            party,
            state,
            position: this.normalizePosition(vote),
          });
        }
      }
    } catch (error) {
      logger.debug('Primary House XML parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }

    return memberVotes;
  }

  /**
   * Legacy House XML parsing method for older formats
   */
  private parseHouseXMLLegacy(xmlText: string): StandardizedVote['memberVotes'] | null {
    const memberVotes: StandardizedVote['memberVotes'] = [];

    try {
      // Try older format with different tag structure
      const memberMatches = xmlText.matchAll(/<member>[\s\S]*?<\/member>/g);
      const memberMatchesArray = Array.from(memberMatches);

      for (const [memberXml] of memberMatchesArray) {
        const getName = (tag: string) =>
          memberXml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() || '';

        const bioguideId = getName('bioguide_id') || getName('bioguide') || getName('id');
        const name = getName('name') || getName('full_name') || getName('member_name');
        const party = getName('party') || 'Unknown';
        const state = getName('state') || 'Unknown';
        const vote = getName('vote') || getName('position') || getName('vote_cast');

        if (bioguideId && vote) {
          memberVotes.push({
            bioguideId,
            name: name || 'Unknown',
            party,
            state,
            position: this.normalizePosition(vote),
          });
        }
      }
    } catch (error) {
      logger.debug('Legacy House XML parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return null;
    }

    return memberVotes.length > 0 ? memberVotes : null;
  }

  /**
   * Alternative House XML parsing method for different formats
   */
  private parseHouseXMLAlternative(xmlText: string): StandardizedVote['memberVotes'] | null {
    const memberVotes: StandardizedVote['memberVotes'] = [];

    try {
      // Try alternative format with inline attributes
      const memberMatches = xmlText.matchAll(/<vote[^>]*bioguide="([^"]+)"[^>]*>([^<]*)<\/vote>/g);

      for (const match of memberMatches) {
        const bioguideId = match[1];
        const vote = match[2]?.trim();

        if (bioguideId && vote) {
          // Try to extract name and party from surrounding context
          const contextStart = Math.max(0, xmlText.indexOf(match[0]) - 200);
          const contextEnd = Math.min(
            xmlText.length,
            xmlText.indexOf(match[0]) + match[0].length + 200
          );
          const context = xmlText.substring(contextStart, contextEnd);

          const nameMatch = context.match(/name="([^"]+)"/);
          const partyMatch = context.match(/party="([^"]+)"/);
          const stateMatch = context.match(/state="([^"]+)"/);

          memberVotes.push({
            bioguideId,
            name: nameMatch?.[1] || 'Unknown',
            party: partyMatch?.[1] || 'Unknown',
            state: stateMatch?.[1] || 'Unknown',
            position: this.normalizePosition(vote),
          });
        }
      }
    } catch (error) {
      logger.debug('Alternative House XML parsing failed', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
      return null;
    }

    return memberVotes.length > 0 ? memberVotes : null;
  }

  /**
   * Generate recent Senate vote numbers with dynamic detection (optimized)
   */
  private generateRecentSenateVoteNumbers(count: number): number[] {
    // Dynamic estimation based on date and session progress
    const currentDate = new Date();
    const sessionStart = new Date(currentDate.getFullYear(), 0, 3); // January 3rd session start
    const daysSinceSessionStart = Math.floor(
      (currentDate.getTime() - sessionStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Senate averages ~1.5 votes per session day (more realistic than fixed 230)
    const dynamicEstimate = Math.max(1, Math.floor(daysSinceSessionStart * 1.5));
    const safeEstimate = Math.min(dynamicEstimate, 350); // Cap at reasonable max

    const numbers: number[] = [];

    // Start from estimated current and work backwards
    for (let i = safeEstimate; i > safeEstimate - count && i > 0; i--) {
      numbers.push(i);
    }

    logger.debug('Dynamic Senate vote number generation', {
      daysSinceSessionStart,
      dynamicEstimate,
      safeEstimate,
      numbersGenerated: numbers.length,
      startingFrom: safeEstimate,
    });

    return numbers;
  }

  /**
   * Batch process Senate votes with parallel XML fetching
   */
  private async batchProcessSenateVotes(
    voteNumbers: number[],
    congress: number,
    session: number,
    bioguideId: string
  ): Promise<
    Array<{
      voteId: string;
      date: string;
      question: string;
      position: string;
      result: string;
      bill?: StandardizedVote['bill'];
      rollCallNumber?: number;
    }>
  > {
    // Enhanced caching strategy for Senate votes
    const cachedVotes: StandardizedVote[] = [];
    const uncachedNumbers: number[] = [];
    let cacheHitCount = 0;

    for (const voteNumber of voteNumbers) {
      const cacheKey = `senate-vote-${congress}-${session}-${voteNumber}`;
      const cached = this.cache.get<StandardizedVote>(cacheKey);

      if (cached) {
        cachedVotes.push(cached);
        cacheHitCount++;
      } else {
        uncachedNumbers.push(voteNumber);
      }
    }

    logger.debug('Senate vote cache analysis', {
      totalRequested: voteNumbers.length,
      cacheHits: cacheHitCount,
      needsFetch: uncachedNumbers.length,
      hitRate: `${((cacheHitCount / voteNumbers.length) * 100).toFixed(1)}%`,
    });

    // Fetch uncached votes in parallel
    const fetchTasks = uncachedNumbers.map(voteNumber =>
      this.limiter.run(() => this.fetchAndParseSenateXML(voteNumber, congress, session))
    );

    const newVotes = await Promise.allSettled(fetchTasks);
    const successfulVotes: StandardizedVote[] = [];

    newVotes.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulVotes.push(result.value);

        // Enhanced caching with appropriate TTL
        const cacheKey = `senate-vote-${congress}-${session}-${result.value.rollCallNumber}`;
        const ttlHours = this.getSenateVoteCacheTTL(result.value.rollCallNumber);

        this.cache.set(cacheKey, result.value, ttlHours * 3600); // Convert hours to seconds

        logger.debug('Cached Senate vote', {
          rollCallNumber: result.value.rollCallNumber,
          cacheKey,
          ttlHours,
          memberVotesCount: result.value.memberVotes.length,
        });
      } else if (result.status === 'rejected') {
        const voteNumber = uncachedNumbers[index];
        logger.debug('Senate vote fetch failed', {
          voteNumber,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Combine and extract member votes
    const allVotes = [...cachedVotes, ...successfulVotes];
    return this.extractMemberVotes(bioguideId, allVotes);
  }

  /**
   * Fetch and parse individual Senate XML vote
   */
  private async fetchAndParseSenateXML(
    voteNumber: number,
    congress: number,
    session: number
  ): Promise<StandardizedVote | null> {
    try {
      const paddedNum = voteNumber.toString().padStart(5, '0');
      const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${paddedNum}.xml`;

      const xmlText = await this.circuitBreaker.call(async () => {
        const response = await httpClient.fetch(url, {
          signal: AbortSignal.timeout(3000),
        });

        if (!response.ok) {
          throw new Error(`Senate XML fetch failed: ${response.status}`);
        }

        return response.text();
      });

      return await this.parseSenateXML(xmlText, congress, session, voteNumber);
    } catch {
      // Vote probably doesn't exist, which is normal
      return null;
    }
  }

  /**
   * Parse Senate XML vote data
   */
  private async parseSenateXML(
    xmlText: string,
    congress: number,
    session: number,
    voteNumber: number
  ): Promise<StandardizedVote | null> {
    try {
      const getTag = (tag: string) =>
        xmlText.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() || '';

      const memberVotes: StandardizedVote['memberVotes'] = [];
      const memberMatches = xmlText.matchAll(/<member>[\s\S]*?<\/member>/g);

      for (const [memberXml] of memberMatches) {
        const getMemberTag = (tag: string) =>
          memberXml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`))?.[1]?.trim() || '';

        const bioguideId =
          getMemberTag('bioguide_id') ||
          (await this.convertLisToBioguide(getMemberTag('lis_member_id')));

        if (bioguideId) {
          memberVotes.push({
            bioguideId,
            name: getMemberTag('member_full'),
            party: getMemberTag('party'),
            state: getMemberTag('state'),
            position: this.normalizePosition(getMemberTag('vote_cast')),
          });
        }
      }

      const totals = {
        yea: memberVotes.filter(v => v.position === 'Yea').length,
        nay: memberVotes.filter(v => v.position === 'Nay').length,
        present: memberVotes.filter(v => v.position === 'Present').length,
        notVoting: memberVotes.filter(v => v.position === 'Not Voting').length,
      };

      return {
        voteId: `senate-${congress}-${session}-${voteNumber}`,
        congress,
        session,
        chamber: 'Senate',
        rollCallNumber: voteNumber,
        date: getTag('vote_date') || new Date().toISOString(),
        question: getTag('vote_question_text') || getTag('question') || '',
        result: getTag('vote_result') || '',
        totals,
        memberVotes,
        sourceUrl: `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${voteNumber.toString().padStart(5, '0')}.xml`,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to parse Senate XML', error as Error);
      return null;
    }
  }

  /**
   * Get LIS-to-bioguide mapping (cached)
   */
  private async getLisToGuidMapping(): Promise<Map<string, string>> {
    if (!this.lisToGuideMappingPromise) {
      this.lisToGuideMappingPromise = this.buildLisToGuideMapping();
    }
    return this.lisToGuideMappingPromise;
  }

  /**
   * Build LIS-to-bioguide mapping from legislator data
   */
  private async buildLisToGuideMapping(): Promise<Map<string, string>> {
    try {
      const legislatorMappings = await getAllMappings();
      const lisToGuideMap = new Map<string, string>();

      for (const [bioguideId, ids] of legislatorMappings.entries()) {
        if (ids.lis && bioguideId) {
          lisToGuideMap.set(ids.lis, bioguideId);
        }
      }

      logger.info('LIS-to-bioguide mapping built', {
        totalMappings: lisToGuideMap.size,
      });

      return lisToGuideMap;
    } catch (error) {
      logger.error('Failed to build LIS-to-bioguide mapping', error as Error);
      return new Map();
    }
  }

  /**
   * Convert LIS member ID to bioguide ID using real mapping data
   */
  private async convertLisToBioguide(lisId: string): Promise<string> {
    try {
      const mapping = await this.getLisToGuidMapping();
      const bioguideId = mapping.get(lisId);

      if (bioguideId) {
        return bioguideId;
      }

      // Fallback: return the lisId if no mapping found
      logger.debug('No bioguide mapping found for LIS ID', { lisId });
      return lisId;
    } catch (error) {
      logger.error('Error converting LIS to bioguide', error as Error, { lisId });
      return lisId;
    }
  }

  /**
   * Fetch bill details from Congress.gov API
   */
  private async fetchBillDetails(
    billNumber: string,
    billType: string,
    billUrl?: string
  ): Promise<StandardizedVote['bill'] | undefined> {
    try {
      // Try to get from cache first
      const cacheKey = `bill-${billType.toLowerCase()}-${billNumber}`;
      const cached = this.cache.get<StandardizedVote['bill']>(cacheKey);
      if (cached) {
        return cached;
      }

      // If we don't have an API key, return basic info
      if (!this.apiKey) {
        return {
          congress: 119,
          type: billType,
          number: billNumber,
          title: `${billType} ${billNumber}`,
          url: billUrl,
        };
      }

      // Construct API URL for bill details
      const billTypeMap: Record<string, string> = {
        HR: 'hr',
        'H.R.': 'hr',
        S: 's',
        'S.': 's',
        HRES: 'hres',
        'H.RES.': 'hres',
        SRES: 'sres',
        'S.RES.': 'sres',
        HJRES: 'hjres',
        'H.J.RES.': 'hjres',
        SJRES: 'sjres',
        'S.J.RES.': 'sjres',
        HCONRES: 'hconres',
        'H.CON.RES.': 'hconres',
        SCONRES: 'sconres',
        'S.CON.RES.': 'sconres',
      };

      const normalizedType = billTypeMap[billType.toUpperCase()] || billType.toLowerCase();
      const apiUrl = `https://api.congress.gov/v3/bill/119/${normalizedType}/${billNumber}?format=json&api_key=${this.apiKey}`;

      const response = await httpClient.fetch(apiUrl, {
        signal: AbortSignal.timeout(2000), // Quick timeout for bill details
      });

      if (!response.ok) {
        logger.debug('Failed to fetch bill details', {
          billNumber,
          billType,
          status: response.status,
        });
        // Return basic info on failure
        return {
          congress: 119,
          type: billType,
          number: billNumber,
          title: `${billType} ${billNumber}`,
          url: billUrl,
        };
      }

      const data = await response.json();
      const billData = data.bill;

      if (!billData) {
        return {
          congress: 119,
          type: billType,
          number: billNumber,
          title: `${billType} ${billNumber}`,
          url: billUrl,
        };
      }

      // Extract the title - Congress.gov provides it directly
      const title = billData.title || billData.shortTitle || `${billType} ${billNumber}`;

      const bill: StandardizedVote['bill'] = {
        congress: 119,
        type: billType,
        number: billNumber,
        title,
        url:
          billUrl ||
          `https://www.congress.gov/bill/119th-congress/${normalizedType}-bill/${billNumber}`,
      };

      // Cache the bill details for 24 hours
      this.cache.set(cacheKey, bill, 24 * 60 * 60 * 1000);

      return bill;
    } catch (error) {
      logger.debug('Error fetching bill details', {
        billNumber,
        billType,
        error: (error as Error).message,
      });
      // Return basic info on error
      return {
        congress: 119,
        type: billType,
        number: billNumber,
        title: `${billType} ${billNumber}`,
        url: billUrl,
      };
    }
  }

  /**
   * Normalize vote position to standard format
   */
  private normalizePosition(position: string): 'Yea' | 'Nay' | 'Present' | 'Not Voting' {
    const pos = position.toLowerCase().trim();

    if (pos === 'yea' || pos === 'aye' || pos === 'yes') return 'Yea';
    if (pos === 'nay' || pos === 'no') return 'Nay';
    if (pos === 'present') return 'Present';

    return 'Not Voting';
  }

  /**
   * Extract member votes from standardized vote data
   */
  private extractMemberVotes(
    bioguideId: string,
    votes: StandardizedVote[]
  ): Array<{
    voteId: string;
    date: string;
    question: string;
    position: string;
    result: string;
    bill?: StandardizedVote['bill'];
    rollCallNumber?: number;
  }> {
    const memberVotes: Array<{
      voteId: string;
      date: string;
      question: string;
      position: string;
      result: string;
      bill?: StandardizedVote['bill'];
      rollCallNumber?: number;
    }> = [];

    // Debug: Log the extraction process
    logger.debug('Extracting member votes', {
      targetBioguideId: bioguideId,
      totalVotes: votes.length,
      firstVoteMembers: votes[0]?.memberVotes.length,
      sampleMemberIds: votes[0]?.memberVotes.slice(0, 5).map(m => m.bioguideId),
    });

    for (const vote of votes) {
      const memberVote = vote.memberVotes.find(m => m.bioguideId === bioguideId);

      if (memberVote) {
        memberVotes.push({
          voteId: vote.voteId,
          date: vote.date,
          question: vote.question,
          position: memberVote.position,
          result: vote.result,
          bill: vote.bill,
          rollCallNumber: vote.rollCallNumber,
        });

        logger.debug('Found member in vote', {
          bioguideId,
          voteId: vote.voteId,
          position: memberVote.position,
        });
      } else {
        // Debug: Log why member wasn't found
        logger.debug('Member not found in vote', {
          bioguideId,
          voteId: vote.voteId,
          totalMembers: vote.memberVotes.length,
          hasTargetMember: vote.memberVotes.some(m => m.bioguideId === bioguideId),
          matchingMembers: vote.memberVotes.filter(m => m.bioguideId.includes('P000034')),
        });
      }
    }

    return memberVotes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  /**
   * Determine appropriate cache TTL for Senate votes based on recency
   */
  private getSenateVoteCacheTTL(rollCallNumber: number): number {
    // Recent votes (last 50) cache for shorter periods as they may be corrected
    const currentEstimate = Math.max(
      1,
      Math.floor(
        ((new Date().getTime() - new Date(new Date().getFullYear(), 0, 3).getTime()) /
          (1000 * 60 * 60 * 24)) *
          1.5
      )
    );
    const isRecentVote = rollCallNumber > currentEstimate - 50;

    if (isRecentVote) {
      return 6; // 6 hours for recent votes
    } else {
      return 72; // 3 days for older votes (more stable)
    }
  }

  /**
   * Get cache and circuit breaker status for debugging
   */
  getStatus(): {
    cacheSize: number;
    circuitBreakerStatus: { failures: number; isOpen: boolean };
  } {
    return {
      cacheSize: this.cache.size(),
      circuitBreakerStatus: this.circuitBreaker.getStatus(),
    };
  }

  /**
   * Clear cache (for testing/debugging)
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const batchVotingService = BatchVotingService.getInstance();

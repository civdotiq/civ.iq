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
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { getAllMappings } from '@/lib/data/legislator-mappings';
import { circuitBreakers } from '@/lib/circuit-breaker';
import { getSenateCorpusRollCalls } from './roll-call-corpus';

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
    // Use browser-like User-Agent and headers for government XML sources to avoid 403 errors
    const isGovernmentXML = url.includes('clerk.house.gov') || url.includes('senate.gov');
    const userAgent = isGovernmentXML
      ? 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      : 'CivicIntelHub/1.0 (+https://github.com/PublicDataWorks/civ-iq)';

    const headers: Record<string, string> = {
      'User-Agent': userAgent,
      Accept: isGovernmentXML
        ? 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        : 'application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    };

    // Add browser-specific headers for government sites
    if (isGovernmentXML) {
      headers.Referer = 'https://clerk.house.gov/';
      headers['Sec-Fetch-Dest'] = 'document';
      headers['Sec-Fetch-Mode'] = 'navigate';
      headers['Sec-Fetch-Site'] = 'same-origin';
    }

    const defaultOptions: RequestInit = {
      headers: {
        ...headers,
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
    }

    const fetchOperation = async (): Promise<Response> => {
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(url, mergedOptions);

          // Retry on 403 (forbidden) with exponential backoff
          if (response.status === 403 && attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000); // Max 5s delay
            logger.debug('Received 403, retrying with backoff', {
              url,
              attempt: attempt + 1,
              delayMs: delay,
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          // Return response (including non-403 errors for caller to handle)
          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown fetch error');

          // Fail fast on an aborted / timed-out request. The timeout signal in
          // `mergedOptions` is shared across attempts and fires only once, so a
          // retry would instant-abort anyway — retrying just burns backoff
          // sleep and stacks toward the analyzer timeout budget. This was the
          // dominant multiplier behind analyzer 55s stalls when an upstream
          // (e.g. Congress.gov) hangs or repeatedly 404s. Genuinely transient
          // network errors still get retried with backoff.
          const aborted = lastError.name === 'AbortError' || mergedOptions.signal?.aborted === true;

          if (!aborted && attempt < maxRetries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
            logger.debug('Network error, retrying with backoff', {
              url,
              attempt: attempt + 1,
              delayMs: delay,
              error: lastError.message,
            });
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          break;
        }
      }

      // All retries exhausted
      logger.warn('HTTP client fetch failed after retries', {
        url,
        attempts: maxRetries,
        error: lastError?.message || 'Unknown',
      });
      throw lastError || new Error('Fetch failed after retries');
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
  public delayMs = 0; // Per-request delay for batch/throttled mode

  constructor(private limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        this.running++;

        try {
          if (this.delayMs > 0) {
            await new Promise(r => setTimeout(r, this.delayMs));
          }
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
export interface StandardizedVote {
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
    /** Top-level policy area from Congress.gov (e.g., "Armed Forces and National Security"). */
    policyArea?: string;
    /** Fine-grained legislative subjects from Congress.gov (5–20 per bill, e.g., "Defense spending"). */
    subjects?: string[];
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

export interface VoteListItem {
  rollCallNumber: number;
  sourceDataURL: string;
  date: string;
  question: string;
  result: string;
  legislationNumber?: string;
  legislationType?: string;
  legislationUrl?: string;
}

/**
 * Shape returned by `https://api.congress.gov/v3/house-vote/{cong}/{sess}/{rollNum}/members?format=json`.
 * Only the fields we actually consume are typed.
 */
interface HouseMembersJsonResponse {
  houseRollCallVoteMemberVotes?: {
    congress?: number;
    sessionNumber?: number;
    rollCallNumber?: number;
    voteQuestion?: string;
    result?: string;
    sourceDataURL?: string;
    startDate?: string;
    results?: Array<{
      bioguideID?: string;
      firstName?: string;
      lastName?: string;
      voteCast?: string;
      voteParty?: string;
      voteState?: string;
    }>;
  };
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

/**
 * Detect Vercel runtimes where senate.gov XML is Akamai-blocked (MR10).
 *
 * Senate reads are corpus-first (the mirrored Redis corpus filled by the
 * sync-senate-votes workflow — see roll-call-corpus.ts), so this guard is
 * only consulted when the corpus is empty. It prevents an unmirrored
 * Congress from spinning hundreds of 15s timeouts against a CDN that will
 * never serve us. Local dev (no `VERCEL` env) keeps working live.
 *
 * Override with `DISABLE_SENATE_XML=1` for local repro of the Vercel
 * behavior, or `ALLOW_SENATE_XML=1` to opt back in if the upstream block
 * lifts before code can be redeployed.
 */
export function isSenateXmlDisabled(): boolean {
  if (process.env.ALLOW_SENATE_XML === '1') return false;
  if (process.env.DISABLE_SENATE_XML === '1') return true;
  return Boolean(process.env.VERCEL);
}

export class BatchVotingService {
  private static instance: BatchVotingService;
  private cache = new InMemoryCache();
  private circuitBreaker = new CircuitBreaker();
  private limiter = new ConcurrencyLimiter(5); // Max 5 concurrent requests
  private lisToGuideMappingPromise: Promise<Map<string, string>> | null = null;

  // Read API key lazily so dotenv has time to load in scripts
  private get apiKey(): string | undefined {
    return process.env.CONGRESS_API_KEY;
  }

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
   * Configure for batch data collection (slower, avoids rate limits).
   * Call before any vote fetching in scripts — NOT needed for web serving.
   */
  configureBatchMode(options: { concurrency?: number; delayMs?: number }): void {
    this.limiter = new ConcurrencyLimiter(options.concurrency ?? 2);
    this.limiter.delayMs = options.delayMs ?? 300;
  }

  /**
   * Get House voting history for a member (optimized batch version)
   */
  async getHouseMemberVotes(
    bioguideId: string,
    congress = getCurrentCongressNumber(),
    session = new Date().getFullYear() % 2 === 1 ? 1 : 2,
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
      const votes = await this.batchProcessHouseVotes(
        voteList,
        bioguideId,
        bypassCache,
        congress,
        session
      );

      logger.info('House member votes retrieved (optimized)', {
        bioguideId,
        votesFound: votes.length,
        totalProcessed: voteList.length,
        responseTime: Date.now() - startTime,
        cacheHits: voteList.filter(v =>
          this.cache.has(`house-vote-${congress}-${session}-${v.rollCallNumber}`)
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
    congress = getCurrentCongressNumber(),
    session = new Date().getFullYear() % 2 === 1 ? 1 : 2,
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
    // Corpus first (MR10): the mirrored senate.gov corpus in Redis serves
    // every environment, with menu-derived question/result/bill metadata.
    // Live XML remains only as a fallback for cold setups where senate.gov
    // is reachable — it never works on Vercel (Akamai block).
    try {
      const corpusRolls = await getSenateCorpusRollCalls(congress, limit * 2);
      if (corpusRolls.length > 0) {
        return this.extractMemberVotes(bioguideId, corpusRolls).slice(0, limit);
      }
    } catch (error) {
      logger.warn('Senate corpus read failed — falling back to live XML', {
        bioguideId,
        congress,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (isSenateXmlDisabled()) {
      logger.info('Senate corpus empty and XML fetching disabled (MR10) — no Senate votes', {
        bioguideId,
        congress,
        session,
      });
      return [];
    }

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
   * Get raw roll-call data for recent House votes, including every member's
   * party + position. Used for chamber-wide analysis (party-line alignment,
   * peer averages). Reuses the shared cache, so cost is amortized across
   * callers that have already loaded member-level views.
   */
  /**
   * Number of roll calls in the Congress.gov vote list for a Congress
   * (both sessions, to date). Cheap — the list is fetched once and cached.
   * Lets sweep consumers (chamber baselines) measure their own coverage.
   */
  async getHouseVoteListCount(
    congress = getCurrentCongressNumber(),
    session = new Date().getFullYear() % 2 === 1 ? 1 : 2
  ): Promise<number> {
    try {
      const voteList = await this.getHouseVoteList(congress, session, 10000);
      return voteList.length;
    } catch {
      return 0;
    }
  }

  /**
   * The full Congress.gov vote list for a Congress (both sessions), for
   * consumers that manage their own fetch pacing and persistence — the
   * chamber-baselines corpus builder. Read-only metadata; one cached fetch.
   */
  async getHouseVoteListItems(
    congress = getCurrentCongressNumber(),
    session = new Date().getFullYear() % 2 === 1 ? 1 : 2,
    limit = 10000
  ): Promise<VoteListItem[]> {
    try {
      return await this.getHouseVoteList(congress, session, limit);
    } catch (error) {
      logger.error('Failed to get House vote list items', error as Error, { congress });
      return [];
    }
  }

  /**
   * Fetch a single House roll call's full member roster, deriving the
   * session from the vote's own date. For paced corpus builders — no
   * concurrency limiter here; the CALLER is responsible for staying under
   * Congress.gov's sustained rate (~80 requests/minute).
   */
  async getHouseRollCallDetail(
    vote: VoteListItem,
    congress = getCurrentCongressNumber()
  ): Promise<StandardizedVote | null> {
    return this.fetchAndParseHouseMembersJSON(vote, congress, this.sessionForVote(vote, 1));
  }

  async getHouseChamberRollCalls(
    congress = getCurrentCongressNumber(),
    session = new Date().getFullYear() % 2 === 1 ? 1 : 2,
    limit = 50,
    bypassCache = false
  ): Promise<StandardizedVote[]> {
    try {
      const voteList = await this.getHouseVoteList(congress, session, limit, bypassCache);
      if (voteList.length === 0) {
        logger.warn('No House votes found for chamber roll calls', { congress, session });
        return [];
      }
      return await this.fetchHouseVotesRaw(voteList, bypassCache, congress, session);
    } catch (error) {
      logger.error('Failed to get House chamber roll calls', error as Error, {
        congress,
        session,
      });
      return [];
    }
  }

  /**
   * Get raw roll-call data for recent Senate votes, including every member's
   * party + position. Used for chamber-wide analysis (party-line alignment,
   * peer averages). Reuses the shared cache.
   */
  async getSenateChamberRollCalls(
    congress = getCurrentCongressNumber(),
    session = new Date().getFullYear() % 2 === 1 ? 1 : 2,
    limit = 50
  ): Promise<StandardizedVote[]> {
    // Corpus first (MR10) — see getSenateMemberVotes for the rationale.
    try {
      const corpusRolls = await getSenateCorpusRollCalls(congress, limit);
      if (corpusRolls.length > 0) return corpusRolls;
    } catch (error) {
      logger.warn('Senate corpus read failed — falling back to live XML', {
        congress,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (isSenateXmlDisabled()) {
      logger.info('Senate corpus empty and XML fetching disabled (MR10) — no roll calls', {
        congress,
        session,
      });
      return [];
    }

    try {
      const recentVoteNumbers = this.generateRecentSenateVoteNumbers(limit * 2);
      const rawVotes = await this.fetchSenateVotesRaw(recentVoteNumbers, congress, session);
      // Sort by date descending and trim to limit
      return rawVotes
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);
    } catch (error) {
      logger.error('Failed to get Senate chamber roll calls', error as Error, {
        congress,
        session,
      });
      return [];
    }
  }

  /**
   * Fetch recent vote metadata from clerk.house.gov (official House source)
   * This supplements Congress.gov API which can lag 7-14 days
   */
  private async getRecentClerkHouseVotes(
    startRoll: number,
    endRoll: number,
    year = 2025
  ): Promise<VoteListItem[]> {
    const votes: VoteListItem[] = [];

    // Fetch metadata for each roll call number
    for (let rollNum = startRoll; rollNum <= endRoll; rollNum++) {
      const url = `https://clerk.house.gov/evs/${year}/roll${rollNum}.xml`;

      try {
        const response = await httpClient.fetch(url, {
          signal: AbortSignal.timeout(15000), // 15s timeout to allow for retries
        });

        if (response.ok) {
          const xml = await response.text();

          // Extract metadata from XML using simple regex (no XML parser needed for basic fields)
          const rollMatch = xml.match(/<rollcall-num>(\d+)<\/rollcall-num>/);
          const dateMatch = xml.match(/<action-date>([\d-A-Za-z]+)<\/action-date>/);
          const questionMatch = xml.match(/<vote-question>(.*?)<\/vote-question>/);
          const resultMatch = xml.match(/<vote-result>(.*?)<\/vote-result>/);

          if (rollMatch?.[1] && dateMatch?.[1]) {
            votes.push({
              rollCallNumber: parseInt(rollMatch[1]),
              sourceDataURL: url,
              date: dateMatch[1],
              question: questionMatch?.[1] || '',
              result: resultMatch?.[1] || '',
            });
          }
        }
      } catch (error) {
        logger.debug(`Failed to fetch clerk.house.gov roll ${rollNum}`, {
          error: (error as Error).message,
        });
        // Continue fetching other votes even if one fails
      }
    }

    logger.info(`Fetched ${votes.length} recent votes from clerk.house.gov`, {
      startRoll,
      endRoll,
    });

    return votes;
  }

  /**
   * Get House vote list with pagination support to fetch ALL votes
   * Supplements Congress.gov API with fresh clerk.house.gov data
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
      logger.debug('Using cached vote list', {
        cacheKey,
        votesCount: cached.length,
        highestRoll: Math.max(...cached.map(v => v.rollCallNumber)),
      });
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

        const response = await httpClient.fetch(`${baseUrl}?${params}`, {
          headers: {
            ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
          },
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

          // No early stop: the API returns pages ordered by updateDate (the
          // sort param is broken, see below), so "enough votes" from early
          // pages is an arbitrary subset — stopping there made small-limit
          // callers return stale votes (April rolls as "newest" in July).
          // Every page must be fetched before the client-side sort below;
          // the full list is cached under this congress/session key anyway.
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

      logger.info('Completed fetching House votes from Congress.gov', {
        congress,
        totalVotesFetched: allVotes.length,
        pagesRetrieved: Math.ceil(offset / pageLimit) + 1,
      });

      // NOTE: clerk.house.gov supplemental fetching disabled due to 403 blocking
      // Congress.gov API is comprehensive and only lags by ~24-48 hours
      // The vote list is current and clerk.house.gov actively blocks automated requests
      logger.debug('Using Congress.gov vote list without clerk.house.gov supplementation', {
        totalVotes: allVotes.length,
        highestRoll: allVotes.length > 0 ? Math.max(...allVotes.map(v => v.rollCallNumber)) : 0,
      });

      // CRITICAL FIX: Congress.gov API sort parameter does NOT work correctly
      // Votes are returned in random order despite sort=date:desc parameter
      // Must sort client-side to ensure most recent votes are returned
      allVotes.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateB - dateA; // Descending order (newest first)
      });

      const newestVote = allVotes[0];
      const oldestVote = allVotes[allVotes.length - 1];

      logger.debug('Sorted votes client-side by date', {
        totalVotes: allVotes.length,
        newestVote: newestVote ? `Roll ${newestVote.rollCallNumber} on ${newestVote.date}` : 'none',
        oldestVote: oldestVote ? `Roll ${oldestVote.rollCallNumber} on ${oldestVote.date}` : 'none',
      });

      // Cache the complete sorted list for 15 minutes (matches voting cache TTL for freshness during active sessions)
      if (allVotes.length > 0) {
        this.cache.set(cacheKey, allVotes, 15 * 60 * 1000);
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
    bypassCache = false,
    congress = getCurrentCongressNumber(),
    session = 1
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
    const allVotes = await this.fetchHouseVotesRaw(voteList, bypassCache, congress, session);
    return this.extractMemberVotes(bioguideId, allVotes);
  }

  /**
   * Fetch raw StandardizedVote objects for a list of House votes,
   * using the shared cache and parallel XML parsing pipeline.
   *
   * Unlike batchProcessHouseVotes, this does not narrow to a single
   * member — callers get the full memberVotes array so they can
   * compute chamber-wide statistics (party-line alignment, etc.).
   */
  /**
   * Derive a House vote's session from its own date. The Congress.gov vote
   * list spans BOTH sessions of a Congress while roll-call numbering resets
   * each session, so fetching every roll with the caller's current session
   * 404s the prior session's votes (they silently dropped from chamber-wide
   * sweeps before this fix). Session 1 = odd year, session 2 = even year.
   */
  private sessionForVote(vote: VoteListItem, fallback: number): number {
    const year = new Date(vote.date).getFullYear();
    if (!Number.isFinite(year) || year < 1789) return fallback;
    return year % 2 === 1 ? 1 : 2;
  }

  private async fetchHouseVotesRaw(
    voteList: VoteListItem[],
    bypassCache = false,
    congress = getCurrentCongressNumber(),
    session = 1
  ): Promise<StandardizedVote[]> {
    // Step 1: Check cache for all votes (unless bypassing cache)
    const cachedVotes: StandardizedVote[] = [];
    const uncachedVotes: VoteListItem[] = [];

    for (const vote of voteList) {
      const voteSession = this.sessionForVote(vote, session);
      const cacheKey = `house-vote-${congress}-${voteSession}-${vote.rollCallNumber}`;
      const cached = bypassCache ? null : this.cache.get<StandardizedVote>(cacheKey);

      if (cached) {
        cachedVotes.push(cached);
      } else {
        uncachedVotes.push(vote);
      }
    }

    // Step 2: Fetch uncached rosters from Congress.gov JSON /members in parallel.
    // (clerk.house.gov XML is Akamai-blocked from Vercel cloud IPs; MR12.)
    const fetchTasks = uncachedVotes.map(vote =>
      this.limiter.run(() =>
        this.fetchAndParseHouseMembersJSON(vote, congress, this.sessionForVote(vote, session))
      )
    );

    const newVotes = await Promise.allSettled(fetchTasks);
    const successfulVotes: StandardizedVote[] = [];

    newVotes.forEach((result, _index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulVotes.push(result.value);

        // Cache the parsed vote under its own session
        const cacheKey = `house-vote-${congress}-${result.value.session}-${result.value.rollCallNumber}`;
        this.cache.set(cacheKey, result.value);
      } else {
        logger.debug('Failed to fetch House vote members', {
          rollCallNumber: uncachedVotes[_index]?.rollCallNumber,
          error: result.status === 'rejected' ? result.reason : 'Unknown error',
        });
      }
    });

    return [...cachedVotes, ...successfulVotes];
  }

  /**
   * Fetch the per-vote member roster from Congress.gov JSON `/members` and
   * adapt it to `StandardizedVote`. Replaces the historical XML path that
   * hit `clerk.house.gov`, which is Akamai-blocked from Vercel cloud IPs
   * (MR10). The JSON sub-resource lives on `api.congress.gov`, the same
   * host as the working vote-list endpoint, and is reachable from both
   * residential and serverless egress.
   *
   * Bill enrichment via `fetchBillDetails` is unchanged — that path uses
   * Congress.gov JSON and was never affected.
   */
  private async fetchAndParseHouseMembersJSON(
    vote: VoteListItem,
    congress: number,
    session: number
  ): Promise<StandardizedVote | null> {
    const url = `https://api.congress.gov/v3/house-vote/${congress}/${session}/${vote.rollCallNumber}/members?format=json`;

    try {
      const data = await this.circuitBreaker.call(async () => {
        const res = await httpClient.fetch(url, {
          headers: {
            ...(this.apiKey ? { 'X-API-Key': this.apiKey } : {}),
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) {
          throw new Error(`Members JSON fetch failed: ${res.status}`);
        }

        return (await res.json()) as HouseMembersJsonResponse;
      });

      const standardizedVote = this.adaptHouseMembersJSON(data, vote, congress, session);
      if (!standardizedVote) {
        return null;
      }

      // Enrich with bill information if available
      if (vote.legislationNumber && vote.legislationType) {
        standardizedVote.bill = await this.fetchBillDetails(
          vote.legislationNumber,
          vote.legislationType,
          vote.legislationUrl,
          congress
        );
      }

      return standardizedVote;
    } catch (error) {
      logger.debug('Failed to fetch House members JSON', {
        rollCallNumber: vote.rollCallNumber,
        congress,
        session,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Adapt the Congress.gov `/members` response to `StandardizedVote`.
   * Prefers metadata from the JSON envelope (voteQuestion, result,
   * sessionNumber, sourceDataURL) when available, falling back to the
   * list-level `voteInfo` so the shape stays stable if Congress.gov ever
   * drops a field.
   */
  private adaptHouseMembersJSON(
    data: HouseMembersJsonResponse,
    voteInfo: VoteListItem,
    congress: number,
    session: number
  ): StandardizedVote | null {
    const envelope = data.houseRollCallVoteMemberVotes;
    if (!envelope) {
      logger.warn('House members JSON missing envelope', {
        rollCallNumber: voteInfo.rollCallNumber,
      });
      return null;
    }

    const results = Array.isArray(envelope.results) ? envelope.results : [];
    const memberVotes: StandardizedVote['memberVotes'] = [];

    for (const raw of results) {
      const bioguideId = String(raw.bioguideID ?? '').trim();
      if (!bioguideId) continue;

      const first = String(raw.firstName ?? '').trim();
      const last = String(raw.lastName ?? '').trim();
      const name = [first, last].filter(Boolean).join(' ') || 'Unknown';

      memberVotes.push({
        bioguideId,
        name,
        party: String(raw.voteParty ?? 'Unknown'),
        state: String(raw.voteState ?? 'Unknown'),
        position: this.normalizePosition(String(raw.voteCast ?? '')),
      });
    }

    if (memberVotes.length === 0) {
      logger.warn('House members JSON returned no rosters', {
        rollCallNumber: voteInfo.rollCallNumber,
      });
      return null;
    }

    const totals = {
      yea: memberVotes.filter(v => v.position === 'Yea').length,
      nay: memberVotes.filter(v => v.position === 'Nay').length,
      present: memberVotes.filter(v => v.position === 'Present').length,
      notVoting: memberVotes.filter(v => v.position === 'Not Voting').length,
    };

    logger.info('House members JSON parsed', {
      rollCallNumber: voteInfo.rollCallNumber,
      memberVotesFound: memberVotes.length,
      yea: totals.yea,
      nay: totals.nay,
    });

    return {
      voteId: `house-${congress}-${voteInfo.rollCallNumber}`,
      congress,
      session: envelope.sessionNumber ?? session,
      chamber: 'House',
      rollCallNumber: voteInfo.rollCallNumber,
      date: voteInfo.date,
      question: envelope.voteQuestion?.trim() || voteInfo.question || 'Unknown Question',
      result: envelope.result || voteInfo.result,
      totals,
      memberVotes,
      sourceUrl: envelope.sourceDataURL || voteInfo.sourceDataURL,
      processedAt: new Date().toISOString(),
      bill: undefined,
    };
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

    // Senate averages ~2.0 votes per session day in active sessions
    const dynamicEstimate = Math.max(1, Math.floor(daysSinceSessionStart * 2.0));
    // Cap to support full year of active sessions
    const safeEstimate = Math.min(dynamicEstimate, 700);

    const numbers: number[] = [];

    // Generate from estimate down to 1 to ensure full coverage
    // Critical for Session 2 when vote numbering restarts and count may be low
    for (let i = safeEstimate; i > 0; i--) {
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
    const allVotes = await this.fetchSenateVotesRaw(voteNumbers, congress, session);
    return this.extractMemberVotes(bioguideId, allVotes);
  }

  /**
   * Fetch raw StandardizedVote objects for a list of Senate vote numbers,
   * using the shared cache and parallel XML parsing pipeline.
   *
   * Unlike batchProcessSenateVotes, this does not narrow to a single
   * member — callers get the full memberVotes array so they can
   * compute chamber-wide statistics (party-line alignment, etc.).
   */
  private async fetchSenateVotesRaw(
    voteNumbers: number[],
    congress: number,
    session: number
  ): Promise<StandardizedVote[]> {
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

        this.cache.set(cacheKey, result.value, ttlHours * 3600 * 1000); // Convert hours to ms

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

    return [...cachedVotes, ...successfulVotes];
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

      const response = await httpClient.fetch(url, {
        signal: AbortSignal.timeout(15000), // 15s timeout to allow for retries
      });

      // 404s are expected for non-existent vote numbers — handle gracefully
      // without tripping the circuit breaker (which blocks all subsequent requests)
      if (!response.ok) {
        return null;
      }

      const xmlText = await response.text();
      return await this.parseSenateXML(xmlText, congress, session, voteNumber);
    } catch {
      // Network error or timeout — vote may not exist
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
   * Parse a raw senate.gov roll-call XML document into a StandardizedVote.
   *
   * Public for the Senate roll-call ingest route (MR10): senate.gov is
   * Akamai-blocked from cloud IPs, so a GitHub Actions mirror fetches the
   * official XML and POSTs it to the ingest endpoint — parsing (including
   * the LIS→bioguide mapping) stays in this one place.
   */
  async parseSenateRollCallXML(
    xmlText: string,
    congress: number,
    session: number,
    voteNumber: number
  ): Promise<StandardizedVote | null> {
    return this.parseSenateXML(xmlText, congress, session, voteNumber);
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
    billUrl?: string,
    congress: number = getCurrentCongressNumber()
  ): Promise<StandardizedVote['bill'] | undefined> {
    try {
      // Try to get from cache first (congress-scoped: bill numbers restart
      // every Congress, so HR 1 of the 119th ≠ HR 1 of the 120th)
      const cacheKey = `bill-${congress}-${billType.toLowerCase()}-${billNumber}`;
      const cached = this.cache.get<StandardizedVote['bill']>(cacheKey);
      if (cached) {
        return cached;
      }

      // If we don't have an API key, return basic info
      if (!this.apiKey) {
        return {
          congress,
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
      const apiUrl = `https://api.congress.gov/v3/bill/${congress}/${normalizedType}/${billNumber}?format=json`;
      const subjectsUrl = `https://api.congress.gov/v3/bill/${congress}/${normalizedType}/${billNumber}/subjects?format=json`;

      // Fire bill-detail and subjects in parallel — the subjects sub-resource
      // gives 5–20 fine-grained tags ("Defense spending", "Health insurance")
      // that drive bill-sector classification downstream (MR15).
      const [response, subjectsResponse] = await Promise.all([
        httpClient.fetch(apiUrl, {
          headers: { 'X-API-Key': this.apiKey },
          signal: AbortSignal.timeout(2000),
        }),
        httpClient
          .fetch(subjectsUrl, {
            headers: { 'X-API-Key': this.apiKey },
            signal: AbortSignal.timeout(2000),
          })
          .catch(() => null),
      ]);

      if (!response.ok) {
        logger.debug('Failed to fetch bill details', {
          billNumber,
          billType,
          status: response.status,
        });
        // Return basic info on failure
        return {
          congress,
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
          congress,
          type: billType,
          number: billNumber,
          title: `${billType} ${billNumber}`,
          url: billUrl,
        };
      }

      // Extract the title - Congress.gov provides it directly
      const title = billData.title || billData.shortTitle || `${billType} ${billNumber}`;

      // policyArea is inline on the main bill response.
      const policyAreaInline: string | undefined =
        typeof billData.policyArea?.name === 'string' ? billData.policyArea.name : undefined;

      // legislativeSubjects + policyArea (alt source) come from the subjects sub-resource.
      let subjects: string[] | undefined;
      let policyAreaFromSubjects: string | undefined;
      if (subjectsResponse && subjectsResponse.ok) {
        try {
          const subjectsData = await subjectsResponse.json();
          const list = subjectsData?.subjects?.legislativeSubjects;
          if (Array.isArray(list) && list.length > 0) {
            const names = list
              .map((s: { name?: string }) => (typeof s?.name === 'string' ? s.name : null))
              .filter((n): n is string => !!n);
            if (names.length > 0) {
              subjects = names;
            }
          }
          if (typeof subjectsData?.subjects?.policyArea?.name === 'string') {
            policyAreaFromSubjects = subjectsData.subjects.policyArea.name;
          }
        } catch {
          // Subjects parse failure is non-fatal — bill still has title/policyArea.
        }
      }

      const bill: StandardizedVote['bill'] = {
        congress,
        type: billType,
        number: billNumber,
        title,
        url:
          billUrl ||
          `https://www.congress.gov/bill/${congress}th-congress/${normalizedType}-bill/${billNumber}`,
        ...(policyAreaInline || policyAreaFromSubjects
          ? { policyArea: policyAreaInline ?? policyAreaFromSubjects }
          : {}),
        ...(subjects ? { subjects } : {}),
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
        congress,
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
   * Get the yea rate for a specific party on a cached vote.
   * Cache-only lookup — no new API calls. Returns null if vote not cached.
   *
   * Roll-call numbers restart each session, so pass `session` when the
   * caller knows it (e.g. derived from the vote date) — otherwise the same
   * number can resolve to a different session's vote.
   */
  getPartyYeaRate(
    chamber: 'House' | 'Senate',
    congress: number,
    rollCallNumber: number,
    party: string,
    session?: 1 | 2
  ): { yeaRate: number; voteCount: number } | null {
    const prefix = chamber === 'House' ? 'house-vote' : 'senate-vote';
    const sessionsToProbe = session ? [session] : [1, 2];

    let cached: StandardizedVote | null = null;
    for (const s of sessionsToProbe) {
      cached = this.cache.get<StandardizedVote>(`${prefix}-${congress}-${s}-${rollCallNumber}`);
      if (cached) break;
    }
    if (!cached) return null;

    // Party labels arrive in mixed formats ("Democrat" vs "D"); compare normalized
    const targetParty = this.normalizePartyCode(party);
    if (!targetParty) return null;

    const partyVotes = cached.memberVotes.filter(
      m =>
        this.normalizePartyCode(m.party) === targetParty &&
        (m.position === 'Yea' || m.position === 'Nay')
    );
    if (partyVotes.length === 0) return null;

    const yeaCount = partyVotes.filter(m => m.position === 'Yea').length;
    return {
      yeaRate: yeaCount / partyVotes.length,
      voteCount: partyVotes.length,
    };
  }

  /** Normalize mixed party labels ("Democrat", "D", "Republican", "R", "I") to a code. */
  private normalizePartyCode(party: string): 'D' | 'R' | 'I' | null {
    const p = party.trim().toLowerCase();
    if (!p) return null;
    if (p.startsWith('d')) return 'D';
    if (p.startsWith('r')) return 'R';
    if (p.startsWith('i')) return 'I';
    return null;
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

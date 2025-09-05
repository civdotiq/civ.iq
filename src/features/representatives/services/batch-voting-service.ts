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
   * Get House vote list (single API call)
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
      const url = `https://api.congress.gov/v3/house-vote/${congress}`;
      const params = new URLSearchParams({
        format: 'json',
        limit: (limit * 2).toString(), // Get more to account for filtering
        sort: 'date:desc',
      });

      if (this.apiKey) {
        params.append('api_key', this.apiKey);
      }

      const response = await fetch(`${url}?${params}`, {
        headers: { 'User-Agent': 'CivicIntelHub/1.0' },
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`House vote list API failed: ${response.status}`);
      }

      const data = await response.json();
      const votes = data.rollCallVotes || data.houseRollCallVotes || data.votes || [];

      const voteList: VoteListItem[] = votes.map((vote: Record<string, unknown>) => ({
        rollCallNumber: Number(vote.rollCallNumber || vote.number) || 0,
        sourceDataURL: String(vote.sourceDataURL || ''),
        date: String(vote.date || vote.voteDate || ''),
        question: String(vote.question || vote.voteQuestion || ''),
        result: String(vote.result || vote.voteResult || ''),
      }));

      // Cache for 1 hour (vote lists change frequently)
      this.cache.set(cacheKey, voteList, 60 * 60 * 1000);

      return voteList.slice(0, limit);
    } catch (error) {
      logger.error('Failed to fetch House vote list', error as Error);
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
   * Fetch and parse House XML vote data
   */
  private async fetchAndParseHouseXML(vote: VoteListItem): Promise<StandardizedVote | null> {
    if (!vote.sourceDataURL) {
      return null;
    }

    try {
      const response = await this.circuitBreaker.call(async () => {
        const res = await fetch(vote.sourceDataURL, {
          headers: { 'User-Agent': 'CivicIntelHub/1.0' },
          signal: AbortSignal.timeout(3000),
        });

        if (!res.ok) {
          throw new Error(`XML fetch failed: ${res.status}`);
        }

        return res.text();
      });

      return this.parseHouseXML(response, vote);
    } catch (error) {
      logger.debug('Failed to fetch House XML', {
        rollCallNumber: vote.rollCallNumber,
        error: (error as Error).message,
      });
      return null;
    }
  }

  /**
   * Parse House XML vote data using regex (Node.js compatible)
   */
  private parseHouseXML(xmlText: string, voteInfo: VoteListItem): StandardizedVote | null {
    try {
      // Debug: Log the first 500 characters to see what we're getting
      logger.debug('Parsing House XML', {
        rollCallNumber: voteInfo.rollCallNumber,
        xmlPreview: xmlText.substring(0, 500),
        xmlLength: xmlText.length,
      });

      // Extract member votes using regex patterns
      const memberVotes: StandardizedVote['memberVotes'] = [];
      const memberMatches = xmlText.matchAll(/<recorded-vote>[\s\S]*?<\/recorded-vote>/g);
      const memberMatchesArray = Array.from(memberMatches);

      logger.debug('House XML member matches found', {
        rollCallNumber: voteInfo.rollCallNumber,
        totalMatches: memberMatchesArray.length,
        firstMatch: memberMatchesArray[0]?.[0]?.substring(0, 200),
      });

      for (const [memberXml] of memberMatchesArray) {
        // Removed debugging limit - process all members
        const getTag = (tag: string) =>
          memberXml.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`))?.[1]?.trim() || '';

        const name = getTag('legislator');
        const vote = getTag('vote');

        // Extract attributes from legislator tag
        const bioguideMatch = memberXml.match(/name-id="([^"]+)"/);
        const partyMatch = memberXml.match(/party="([^"]+)"/);
        const stateMatch = memberXml.match(/state="([^"]+)"/);

        const bioguideId = bioguideMatch?.[1] || '';
        const party = partyMatch?.[1] || 'Unknown';
        const state = stateMatch?.[1] || 'Unknown';

        if (bioguideId && name && vote) {
          memberVotes.push({
            bioguideId,
            name,
            party,
            state,
            position: this.normalizePosition(vote),
          });
        }
      }

      // Calculate totals
      const totals = {
        yea: memberVotes.filter(v => v.position === 'Yea').length,
        nay: memberVotes.filter(v => v.position === 'Nay').length,
        present: memberVotes.filter(v => v.position === 'Present').length,
        notVoting: memberVotes.filter(v => v.position === 'Not Voting').length,
      };

      return {
        voteId: `house-119-${voteInfo.rollCallNumber}`,
        congress: 119,
        session: 1,
        chamber: 'House',
        rollCallNumber: voteInfo.rollCallNumber,
        date: voteInfo.date,
        question: voteInfo.question,
        result: voteInfo.result,
        totals,
        memberVotes,
        sourceUrl: voteInfo.sourceDataURL,
        processedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Failed to parse House XML', error as Error);
      return null;
    }
  }

  /**
   * Generate recent Senate vote numbers (working backwards from current)
   */
  private generateRecentSenateVoteNumbers(count: number): number[] {
    // Senate typically has 220+ votes by September in active session
    const currentEstimate = 230;
    const numbers: number[] = [];

    for (let i = currentEstimate; i > currentEstimate - count && i > 0; i--) {
      numbers.push(i);
    }

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
    // Check cache first
    const cachedVotes: StandardizedVote[] = [];
    const uncachedNumbers: number[] = [];

    for (const voteNumber of voteNumbers) {
      const cacheKey = `senate-vote-${congress}-${voteNumber}`;
      const cached = this.cache.get<StandardizedVote>(cacheKey);

      if (cached) {
        cachedVotes.push(cached);
      } else {
        uncachedNumbers.push(voteNumber);
      }
    }

    // Fetch uncached votes in parallel
    const fetchTasks = uncachedNumbers.map(voteNumber =>
      this.limiter.run(() => this.fetchAndParseSenateXML(voteNumber, congress, session))
    );

    const newVotes = await Promise.allSettled(fetchTasks);
    const successfulVotes: StandardizedVote[] = [];

    newVotes.forEach((result, _index) => {
      if (result.status === 'fulfilled' && result.value) {
        successfulVotes.push(result.value);

        // Cache the parsed vote
        const cacheKey = `senate-vote-${congress}-${result.value.rollCallNumber}`;
        this.cache.set(cacheKey, result.value);
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
        const response = await fetch(url, {
          headers: { 'User-Agent': 'CivicIntelHub/1.0' },
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

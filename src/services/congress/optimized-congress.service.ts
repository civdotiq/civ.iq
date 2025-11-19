/**
 * Optimized Congress Service Layer
 * Fixes the performance issues in the original implementation
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';

// Congress.gov API response types
interface CongressBill {
  number?: string;
  amendmentNumber?: string;
  title?: string;
  introducedDate?: string;
  latestAction?: {
    text?: string;
  };
  congress?: number;
  type?: string;
  policyArea?: {
    name?: string;
  };
  url?: string;
}

interface CongressAPIResponse {
  sponsoredLegislation?: CongressBill[];
  pagination?: {
    count?: number;
  };
}

export interface OptimizedBillsRequest {
  bioguideId: string;
  limit?: number;
  page?: number;
  congress?: number;
  includeAmendments?: boolean;
}

export interface OptimizedBillsResponse {
  bills: Array<{
    id: string;
    number: string;
    title: string;
    introducedDate: string;
    status: string;
    lastAction: string;
    congress: number;
    type: string;
    policyArea?: string;
    url?: string;
    relationship?: 'sponsored' | 'cosponsored'; // Add relationship info
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  metadata: {
    bioguideId: string;
    congress: number;
    cached: boolean;
    executionTime: number;
    sponsoredCount?: number;
    cosponsoredCount?: number;
    totalCount?: number;
    fetchedSponsored?: number;
    fetchedCosponsored?: number;
    fetchedTotal?: number;
  };
}

// Rate limiter for Congress.gov API
class CongressRateLimiter {
  private lastCall = 0;
  private readonly minInterval = 100; // 100ms between calls (10 RPS max)

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;

    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCall = Date.now();
  }
}

const rateLimiter = new CongressRateLimiter();

/**
 * Helper interface for processed bills with relationship type
 */
interface ProcessedBill {
  id: string;
  number: string;
  title: string;
  introducedDate: string;
  status: string;
  lastAction: string;
  congress: number;
  type: string;
  policyArea?: string;
  url?: string;
  relationship: 'sponsored' | 'cosponsored'; // Make required for processing
}

/**
 * Fetch ALL sponsored legislation from Congress.gov API with proper pagination
 */
async function fetchSponsoredLegislation(
  bioguideId: string,
  apiKey: string,
  congress: number,
  _limit: number,
  _page: number
): Promise<{ bills: ProcessedBill[]; total: number }> {
  const allBills: ProcessedBill[] = [];
  let totalCount = 0;
  let currentOffset = 0;
  const pageSize = 250; // Max allowed by Congress.gov API

  // For sponsored bills, usually there are fewer, so we can fetch all at once
  // But we'll still handle pagination properly
  do {
    const url = new URL(`https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('limit', pageSize.toString());
    url.searchParams.set('offset', currentOffset.toString());
    url.searchParams.set('congress', congress.toString());
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'CIV.IQ/2.0 (Comprehensive)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Sponsored legislation API error: ${response.status}`);
    }

    const data = (await response.json()) as CongressAPIResponse;
    const rawBills = data.sponsoredLegislation || [];
    totalCount = data.pagination?.count || 0;

    // Debug logging for sponsored legislation
    logger.info('Sponsored legislation API page fetch', {
      bioguideId,
      congress,
      totalCount,
      currentOffset,
      pageSize,
      rawBillsLength: rawBills.length,
      fetchedSoFar: allBills.length + rawBills.length,
    });

    const bills: ProcessedBill[] = rawBills.map((bill: CongressBill) => ({
      id: bill.number || `unknown-${Date.now()}`,
      number: bill.number || 'Unknown',
      title: bill.title || 'Title not available',
      introducedDate: bill.introducedDate || '',
      status: bill.latestAction?.text || 'Status unknown',
      lastAction: bill.latestAction?.text || 'No recent action',
      congress: bill.congress || congress,
      type: bill.type || 'Unknown',
      policyArea: bill.policyArea?.name || undefined,
      url: bill.url || undefined,
      relationship: 'sponsored' as const,
    }));

    allBills.push(...bills);
    currentOffset += pageSize;

    // Stop if we've fetched all bills or no more bills in response
    if (rawBills.length < pageSize || allBills.length >= totalCount) {
      break;
    }
  } while (currentOffset < totalCount);

  logger.info('Sponsored legislation complete fetch', {
    bioguideId,
    congress,
    totalCount,
    actualFetched: allBills.length,
  });

  return { bills: allBills, total: totalCount };
}

/**
 * Fetch ALL cosponsored legislation from Congress.gov API with proper pagination
 */
async function fetchCosponsoredLegislation(
  bioguideId: string,
  apiKey: string,
  congress: number,
  _limit: number,
  _page: number,
  fetchAll: boolean = false // New parameter to control full fetch
): Promise<{ bills: ProcessedBill[]; total: number }> {
  const allBills: ProcessedBill[] = [];
  let totalCount = 0;
  let currentOffset = 0;
  const pageSize = 250; // Max allowed by Congress.gov API
  const maxPages = fetchAll ? 20 : 2; // Reduced to 2 pages (500 bills) to prevent timeouts - most reps have <500 cosponsorships
  let pagesFeched = 0;

  // For cosponsored bills, there can be MANY (1000+), so we need pagination
  do {
    const url = new URL(`https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('limit', pageSize.toString());
    url.searchParams.set('offset', currentOffset.toString());
    url.searchParams.set('congress', congress.toString());
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'CIV.IQ/2.0 (Comprehensive)' },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Cosponsored legislation API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      cosponsoredLegislation?: CongressBill[];
      pagination?: { count?: number };
    };
    const rawBills = data.cosponsoredLegislation || [];
    totalCount = data.pagination?.count || 0;

    logger.debug('Cosponsored API raw response', { data });

    // Debug logging for cosponsored legislation
    logger.info('Cosponsored legislation API page fetch', {
      bioguideId,
      congress,
      totalCount,
      currentOffset,
      pageSize,
      rawBillsLength: rawBills.length,
      fetchedSoFar: allBills.length + rawBills.length,
      pagesFeched: pagesFeched + 1,
    });

    const bills: ProcessedBill[] = rawBills.map((bill: CongressBill) => ({
      id: bill.number || `unknown-${Date.now()}`,
      number: bill.number || 'Unknown',
      title: bill.title || 'Title not available',
      introducedDate: bill.introducedDate || '',
      status: bill.latestAction?.text || 'Status unknown',
      lastAction: bill.latestAction?.text || 'No recent action',
      congress: bill.congress || congress,
      type: bill.type || 'Unknown',
      policyArea: bill.policyArea?.name || undefined,
      url: bill.url || undefined,
      relationship: 'cosponsored' as const,
    }));

    allBills.push(...bills);
    currentOffset += pageSize;
    pagesFeched++;

    // Add small delay to respect rate limits
    if (pagesFeched < maxPages && rawBills.length === pageSize) {
      await rateLimiter.waitIfNeeded();
    }

    // Stop conditions:
    // 1. No more bills in response
    // 2. Fetched all available bills
    // 3. Reached max pages limit (to prevent timeout)
    if (rawBills.length < pageSize || allBills.length >= totalCount || pagesFeched >= maxPages) {
      break;
    }
  } while (currentOffset < totalCount);

  // Log warning if we hit the page limit
  if (pagesFeched >= maxPages && allBills.length < totalCount) {
    logger.warn('Cosponsored bills fetch limited by max pages', {
      bioguideId,
      congress,
      totalAvailable: totalCount,
      actualFetched: allBills.length,
      maxPagesReached: maxPages,
    });
  }

  logger.info('Cosponsored legislation complete fetch', {
    bioguideId,
    congress,
    totalCount,
    actualFetched: allBills.length,
    pagesFeched,
  });

  return { bills: allBills, total: totalCount };
}

/**
 * Fetch bills with intelligent pagination and caching
 * Only fetches what's actually needed, not everything
 */
/**
 * Fetch both sponsored AND cosponsored legislation for comprehensive coverage
 */
export async function getComprehensiveBillsByMember(
  request: OptimizedBillsRequest
): Promise<OptimizedBillsResponse> {
  const startTime = Date.now();
  const { bioguideId, limit = 25, page = 1, congress = 119, includeAmendments = false } = request;

  // Check cache first
  const cacheKey = `comprehensive-bills:${bioguideId}:${congress}:${limit}:${page}:${includeAmendments}`;
  const cached = await govCache.get<OptimizedBillsResponse>(cacheKey);

  if (cached) {
    logger.info('Comprehensive bills cache hit', { bioguideId, congress, cacheKey });
    return {
      ...cached,
      metadata: { ...cached.metadata, cached: true },
    };
  }

  try {
    await rateLimiter.waitIfNeeded();

    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      throw new Error('Congress API key not configured');
    }

    // Fetch both sponsored AND cosponsored legislation
    // For sponsored: fetch all (usually < 100 bills)
    // For cosponsored: fetch up to 500 bills (2 pages) by default
    const [sponsoredData, cosponsoredData] = await Promise.all([
      fetchSponsoredLegislation(bioguideId, apiKey, congress, limit, page),
      fetchCosponsoredLegislation(bioguideId, apiKey, congress, limit, page, false), // fetchAll=false for performance
    ]);

    // Combine and process bills
    const allBills = [...sponsoredData.bills, ...cosponsoredData.bills];

    // Sort by introduced date (most recent first)
    allBills.sort(
      (a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime()
    );

    // Apply pagination to combined results
    const offset = (page - 1) * limit;
    const paginatedBills = allBills.slice(offset, offset + limit);

    // Use the ACTUAL totals from the API, not just what we fetched
    // Important: We report the ACTUAL fetched count for pagination, not the total available
    // This ensures pagination works correctly with the data we actually have
    const actualFetchedCount = allBills.length;
    const totalAvailableCount = sponsoredData.total + cosponsoredData.total;

    const result: OptimizedBillsResponse = {
      bills: paginatedBills, // Keep relationship information for route handler
      pagination: {
        total: actualFetchedCount, // Use fetched count for accurate pagination
        page,
        limit,
        pages: Math.ceil(actualFetchedCount / limit),
      },
      metadata: {
        bioguideId,
        congress,
        cached: false,
        executionTime: Date.now() - startTime,
        sponsoredCount: sponsoredData.total, // Total available from API
        cosponsoredCount: cosponsoredData.total, // Total available from API
        totalCount: totalAvailableCount, // Total available from both APIs
        fetchedSponsored: sponsoredData.bills.length, // Actually fetched
        fetchedCosponsored: cosponsoredData.bills.length, // Actually fetched
        fetchedTotal: actualFetchedCount, // Total actually fetched
      },
    };

    // Cache for 30 minutes
    await govCache.set(cacheKey, result, { ttl: 1800 * 1000, source: 'congress.gov' });

    // Log important metrics about what we fetched vs what's available
    if (actualFetchedCount < totalAvailableCount) {
      logger.warn('Not all bills fetched due to pagination limits', {
        bioguideId,
        congress,
        totalAvailable: totalAvailableCount,
        actualFetched: actualFetchedCount,
        percentFetched: Math.round((actualFetchedCount / totalAvailableCount) * 100),
      });
    }
    logger.info('Comprehensive bills fetch complete', {
      bioguideId,
      congress,
      sponsored: sponsoredData.bills.length,
      cosponsored: cosponsoredData.bills.length,
      totalBills: allBills.length,
      executionTime: result.metadata.executionTime,
    });

    return result;
  } catch (error) {
    logger.error('Comprehensive bills fetch failed', error as Error, {
      bioguideId,
      congress,
      page,
      limit,
    });

    // Return empty result instead of crashing
    return {
      bills: [],
      pagination: { total: 0, page, limit, pages: 0 },
      metadata: {
        bioguideId,
        congress,
        cached: false,
        executionTime: Date.now() - startTime,
        sponsoredCount: 0,
        cosponsoredCount: 0,
        totalCount: 0,
      },
    };
  }
}

export async function getOptimizedBillsByMember(
  request: OptimizedBillsRequest
): Promise<OptimizedBillsResponse> {
  const startTime = Date.now();
  const {
    bioguideId,
    limit = 25, // Reasonable default
    page = 1,
    congress = 119, // Current congress only by default
    includeAmendments = false,
  } = request;

  // Check cache first
  const cacheKey = `optimized-bills:${bioguideId}:${congress}:${limit}:${page}:${includeAmendments}`;
  const cached = await govCache.get<OptimizedBillsResponse>(cacheKey);

  if (cached) {
    logger.info('Bills cache hit', { bioguideId, congress, cacheKey });
    return {
      ...cached,
      metadata: { ...cached.metadata, cached: true },
    };
  }

  try {
    await rateLimiter.waitIfNeeded();

    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      throw new Error('Congress API key not configured');
    }

    // Calculate offset for pagination
    const offset = (page - 1) * limit;

    // Fetch only the requested page, not everything
    const url = new URL(`https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('limit', Math.min(limit, 250).toString()); // Cap at API max
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('congress', congress.toString());
    url.searchParams.set('format', 'json');

    logger.info('Optimized bills API call', {
      bioguideId,
      congress,
      limit,
      page,
      offset,
      url: url.toString().replace(/api_key=[^&]+/, 'api_key=***'),
    });

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/2.0 (Optimized)',
      },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as CongressAPIResponse;
    const rawBills = data.sponsoredLegislation || [];
    const totalCount = data.pagination?.count || rawBills.length;

    // Transform and filter bills
    const bills = rawBills
      .filter((bill: CongressBill) => {
        // Skip amendments unless specifically requested
        if (!includeAmendments && bill.amendmentNumber) {
          return false;
        }
        return true;
      })
      .map((bill: CongressBill) => ({
        id: bill.number || bill.amendmentNumber || `unknown-${Date.now()}`,
        number: bill.number || bill.amendmentNumber || 'Unknown',
        title: bill.title || 'Title not available',
        introducedDate: bill.introducedDate || '',
        status: bill.latestAction?.text || 'Status unknown',
        lastAction: bill.latestAction?.text || 'No recent action',
        congress: bill.congress || congress,
        type: bill.type || 'Unknown',
        policyArea: bill.policyArea?.name || undefined,
        url: bill.url || undefined,
      }));

    const result: OptimizedBillsResponse = {
      bills,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit),
      },
      metadata: {
        bioguideId,
        congress,
        cached: false,
        executionTime: Date.now() - startTime,
      },
    };

    // Cache for 30 minutes
    await govCache.set(cacheKey, result, { ttl: 1800 * 1000, source: 'congress.gov' });

    logger.info('Optimized bills fetch complete', {
      bioguideId,
      congress,
      billCount: bills.length,
      totalAvailable: totalCount,
      executionTime: result.metadata.executionTime,
    });

    return result;
  } catch (error) {
    logger.error('Optimized bills fetch failed', error as Error, {
      bioguideId,
      congress,
      page,
      limit,
    });

    // Return empty result instead of crashing
    return {
      bills: [],
      pagination: { total: 0, page, limit, pages: 0 },
      metadata: {
        bioguideId,
        congress,
        cached: false,
        executionTime: Date.now() - startTime,
      },
    };
  }
}

/**
 * Get summary stats without fetching all bills
 * Much faster for overview/stats display
 */
type BillsSummaryResult = {
  currentCongress: { count: number; congress: number };
  totalCareer: number;
  recentBills: Array<{ title: string; date: string; type: string }>;
};

export async function getBillsSummary(bioguideId: string): Promise<BillsSummaryResult> {
  const cacheKey = `bills-summary:${bioguideId}`;
  const cached = await govCache.get<BillsSummaryResult>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // Fetch just first page of current congress for stats
    const currentData = await getOptimizedBillsByMember({
      bioguideId,
      limit: 10,
      page: 1,
      congress: 119,
    });

    // For total career count, we'd need to query metadata endpoint
    // For now, estimate based on current congress
    const estimatedTotal = currentData.pagination.total * 3; // Rough estimate

    const result = {
      currentCongress: {
        count: currentData.pagination.total,
        congress: 119,
      },
      totalCareer: estimatedTotal,
      recentBills: currentData.bills.slice(0, 5).map(bill => ({
        title: bill.title,
        date: bill.introducedDate,
        type: bill.type,
      })),
    };

    await govCache.set(cacheKey, result, { ttl: 3600 * 1000, source: 'congress.gov' }); // Cache for 1 hour
    return result;
  } catch (error) {
    logger.error('Bills summary fetch failed', error as Error, { bioguideId });
    return {
      currentCongress: { count: 0, congress: 119 },
      totalCareer: 0,
      recentBills: [],
    };
  }
}

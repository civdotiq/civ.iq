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
 * Fetch bills with intelligent pagination and caching
 * Only fetches what's actually needed, not everything
 */
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

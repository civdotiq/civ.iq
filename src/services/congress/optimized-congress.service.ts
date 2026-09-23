/**
 * Optimized Congress Service Layer
 * Fixes the performance issues in the original implementation
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import {
  cachedStaleWhileRevalidate,
  refreshStaleWhileRevalidate,
} from '@/services/cache/unified-cache.service';

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
 * Page caps for the cosponsored-legislation walk (250 bills/page). Congress.gov
 * ignores the congress filter, so every page is an all-time page, fetched
 * sequentially; under load single pages stall for 7-8s. The old 20-page career
 * cap (5,000 bills) took 25-30s for ten-term members and tripped the 30s
 * function ceiling — a 504 with nothing cached, every visit. Career counts
 * stay exact via pagination.count; only the status sample is truncated, and
 * the rollup discloses that.
 */
const DEFAULT_COSPONSORED_PAGES = 2;
const CAREER_COSPONSORED_PAGE_CAP = 4;

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
 * NOTE: Congress.gov API ignores the 'congress' filter parameter, so we must filter client-side
 */
/**
 * Page a member legislation endpoint. Congress.gov ignores the congress
 * filter, so pages are all-time and the walk is capped. Page 1 is fetched
 * alone (it carries pagination.count); the remaining pages go out together,
 * launch-staggered by the rate limiter. Congress.gov page latency is erratic
 * (0.3s to 8s+ per page, observed 2026-09-03), so sequential paging summed
 * the stalls into 25s+ walks; in parallel the walk is bounded by its slowest
 * page.
 */
async function fetchLegislationPages(
  endpoint: string,
  listKey: 'sponsoredLegislation' | 'cosponsoredLegislation',
  apiKey: string,
  maxPages: number
): Promise<{ rawBills: CongressBill[]; totalCount: number; pagesFetched: number }> {
  const pageSize = 250; // Max allowed by Congress.gov API

  const fetchPage = async (offset: number): Promise<{ bills: CongressBill[]; count: number }> => {
    const url = new URL(endpoint);
    url.searchParams.set('limit', pageSize.toString());
    url.searchParams.set('offset', offset.toString());
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/2.0 (Comprehensive)',
        'X-API-Key': apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      throw new Error(`${listKey} API error: ${response.status}`);
    }
    const data = (await response.json()) as {
      sponsoredLegislation?: CongressBill[];
      cosponsoredLegislation?: CongressBill[];
      pagination?: { count?: number };
    };
    return { bills: data[listKey] || [], count: data.pagination?.count || 0 };
  };

  const first = await fetchPage(0);
  const totalCount = first.count;
  const totalPages = Math.min(Math.ceil(totalCount / pageSize), maxPages);

  const rest: Promise<{ bills: CongressBill[]; count: number }>[] = [];
  for (let page = 1; page < totalPages && first.bills.length === pageSize; page++) {
    await rateLimiter.waitIfNeeded();
    rest.push(fetchPage(page * pageSize));
  }
  const pages = [first, ...(await Promise.all(rest))];
  const rawBills = pages.flatMap(p => p.bills);

  if (totalPages < Math.ceil(totalCount / pageSize)) {
    logger.warn('Member legislation walk capped', {
      endpoint,
      totalFromApi: totalCount,
      totalFetched: rawBills.length,
      maxPages,
    });
  }

  return { rawBills, totalCount, pagesFetched: pages.length };
}

function toProcessedBill(
  bill: CongressBill,
  relationship: 'sponsored' | 'cosponsored'
): ProcessedBill {
  return {
    id: bill.number || `unknown-${Date.now()}`,
    number: bill.number || 'Unknown',
    title: bill.title || 'Title not available',
    introducedDate: bill.introducedDate || '',
    status: bill.latestAction?.text || 'Status unknown',
    lastAction: bill.latestAction?.text || 'No recent action',
    congress: bill.congress || 0,
    type: bill.type || 'Unknown',
    policyArea: bill.policyArea?.name || undefined,
    url: bill.url || undefined,
    relationship,
  };
}

/** True for bills/resolutions; false for amendments and typeless items,
 *  which toProcessedBill marks with the 'Unknown' placeholders. */
export function isBillOrResolution(bill: Pick<ProcessedBill, 'type' | 'number'>): boolean {
  return bill.type !== 'Unknown' && bill.number !== 'Unknown' && /^\d+$/.test(bill.number);
}

/** Sponsored walks are uncapped in practice (no sitting member nears 2,000). */
const SPONSORED_PAGE_CAP = 8;

async function fetchSponsoredLegislation(
  bioguideId: string,
  apiKey: string,
  congress: number,
  _limit: number,
  _page: number
): Promise<{ bills: ProcessedBill[]; total: number; apiTotal: number }> {
  const { rawBills, totalCount, pagesFetched } = await fetchLegislationPages(
    `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation`,
    'sponsoredLegislation',
    apiKey,
    SPONSORED_PAGE_CAP
  );
  const allBills = rawBills.map(bill => toProcessedBill(bill, 'sponsored'));

  // Filter bills by requested congress (Congress.gov API ignores congress param)
  const filteredBills =
    congress > 0 ? allBills.filter(bill => bill.congress === congress) : allBills;

  logger.info('Sponsored legislation complete fetch', {
    bioguideId,
    congress,
    totalFromApi: totalCount,
    totalFetched: allBills.length,
    filteredCount: filteredBills.length,
    pagesFetched,
  });

  return { bills: filteredBills, total: filteredBills.length, apiTotal: totalCount };
}

/**
 * Fetch cosponsored legislation from Congress.gov with capped pagination.
 * NOTE: Congress.gov API ignores the 'congress' filter parameter, so we must filter client-side
 */
async function fetchCosponsoredLegislation(
  bioguideId: string,
  apiKey: string,
  congress: number,
  _limit: number,
  _page: number,
  maxPages: number = DEFAULT_COSPONSORED_PAGES
): Promise<{ bills: ProcessedBill[]; total: number; apiTotal: number }> {
  const { rawBills, totalCount, pagesFetched } = await fetchLegislationPages(
    `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation`,
    'cosponsoredLegislation',
    apiKey,
    maxPages
  );
  const allBills = rawBills.map(bill => toProcessedBill(bill, 'cosponsored'));

  // Filter bills by requested congress (Congress.gov API ignores congress param)
  const filteredBills =
    congress > 0 ? allBills.filter(bill => bill.congress === congress) : allBills;

  logger.info('Cosponsored legislation complete fetch', {
    bioguideId,
    congress,
    totalFromApi: totalCount,
    totalFetched: allBills.length,
    filteredCount: filteredBills.length,
    pagesFetched,
  });

  return { bills: filteredBills, total: filteredBills.length, apiTotal: totalCount };
}

/**
 * Fetch a member's complete legislation history (all congresses, unfiltered)
 * for career/current-congress rollups. Passing congress=0 skips client-side
 * filtering so one fetch serves both splits. Cosponsored fetch is capped at
 * CAREER_COSPONSORED_PAGE_CAP pages (1,000 bills) — apiTotal preserves the
 * exact all-time count so callers can detect and disclose truncation.
 */
export interface MemberLegislationHistory {
  sponsored: { bills: ProcessedBill[]; apiTotal: number };
  cosponsored: { bills: ProcessedBill[]; apiTotal: number };
}

export type { ProcessedBill };

export async function fetchAllMemberLegislation(
  bioguideId: string
): Promise<MemberLegislationHistory> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error('Congress API key not configured');
  }

  const [sponsored, cosponsored] = await Promise.all([
    fetchSponsoredLegislation(bioguideId, apiKey, 0, 250, 1),
    fetchCosponsoredLegislation(bioguideId, apiKey, 0, 250, 1, CAREER_COSPONSORED_PAGE_CAP),
  ]);

  return {
    sponsored: { bills: sponsored.bills, apiTotal: sponsored.apiTotal },
    cosponsored: { bills: cosponsored.bills, apiTotal: cosponsored.apiTotal },
  };
}

/**
 * Freshness for a member's bill walk. Within BILLS_FRESH_MS the cache is served
 * as is; up to BILLS_MAX_STALE_MS it is served while one background refresh
 * runs. The walk is 3-9 all-time Congress.gov pages (~12s cold), and the
 * warm-member-bills cron keeps a copy for every sitting member, so a cold ISR
 * render after a deploy reads Redis instead of walking Congress.gov.
 */
const BILLS_FRESH_MS = 30 * 60 * 1000;
const BILLS_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

/** The cached part of a member's bill walk; independent of limit and page. */
interface MemberBillsWalk {
  bills: ProcessedBill[];
  sponsoredCount: number;
  cosponsoredCount: number;
}

async function walkMemberBills(
  bioguideId: string,
  congress: number,
  includeAmendments: boolean
): Promise<MemberBillsWalk> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error('Congress API key not configured');
  }
  await rateLimiter.waitIfNeeded();

  // For sponsored: fetch all (usually < 100 bills)
  // For cosponsored: fetch up to 500 bills (2 pages) by default
  const [sponsoredData, cosponsoredData] = await Promise.all([
    fetchSponsoredLegislation(bioguideId, apiKey, congress, 0, 1),
    fetchCosponsoredLegislation(bioguideId, apiKey, congress, 0, 1),
  ]);

  // Congress.gov mixes amendments (amendmentNumber, no bill type/number)
  // into sponsored-legislation; they are not bills and have no bill page.
  if (!includeAmendments) {
    sponsoredData.bills = sponsoredData.bills.filter(isBillOrResolution);
    sponsoredData.total = sponsoredData.bills.length;
    cosponsoredData.bills = cosponsoredData.bills.filter(isBillOrResolution);
    cosponsoredData.total = cosponsoredData.bills.length;
  }

  const bills = [...sponsoredData.bills, ...cosponsoredData.bills];
  // Sort by introduced date (most recent first)
  bills.sort((a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime());

  logger.info('Comprehensive bills fetch complete', {
    bioguideId,
    congress,
    sponsored: sponsoredData.bills.length,
    cosponsored: cosponsoredData.bills.length,
    totalBills: bills.length,
  });

  return {
    bills,
    sponsoredCount: sponsoredData.total,
    cosponsoredCount: cosponsoredData.total,
  };
}

function billsWalkCacheKey(bioguideId: string, congress: number, includeAmendments: boolean) {
  return `comprehensive-bills:v2:${bioguideId}:${congress}:${includeAmendments}`;
}

/**
 * Warm one member's bill walk for the warm-member-bills cron. Skips members
 * whose copy is still fresh; throws on upstream failure (nothing is cached).
 */
export async function warmComprehensiveBillsByMember(
  bioguideId: string,
  congress: number = 119
): Promise<'fresh' | 'refreshed' | 'locked'> {
  return refreshStaleWhileRevalidate(
    billsWalkCacheKey(bioguideId, congress, false),
    () => walkMemberBills(bioguideId, congress, false),
    { freshMs: BILLS_FRESH_MS, maxStaleMs: BILLS_MAX_STALE_MS, source: 'congress.gov' }
  );
}

/**
 * Fetch both sponsored AND cosponsored legislation for comprehensive coverage.
 * Served stale-while-revalidate from Redis (see BILLS_FRESH_MS). Pass
 * requireFresh when acting on the result (alerts): a stale copy is refetched.
 */
export async function getComprehensiveBillsByMember(
  request: OptimizedBillsRequest & { requireFresh?: boolean }
): Promise<OptimizedBillsResponse> {
  const startTime = Date.now();
  const {
    bioguideId,
    limit = 25,
    page = 1,
    congress = 119,
    includeAmendments = false,
    requireFresh = false,
  } = request;

  try {
    const { data: walk, state } = await cachedStaleWhileRevalidate(
      billsWalkCacheKey(bioguideId, congress, includeAmendments),
      () => walkMemberBills(bioguideId, congress, includeAmendments),
      {
        freshMs: BILLS_FRESH_MS,
        maxStaleMs: BILLS_MAX_STALE_MS,
        source: 'congress.gov',
        staleMode: requireFresh ? 'refetch' : 'background',
      }
    );
    if (state !== 'miss') {
      logger.info('Comprehensive bills cache hit', { bioguideId, congress, state });
    }

    // NOTE: Don't apply server-side pagination here - the frontend (BillsTab.tsx) expects
    // ALL bills and handles its own filtering and pagination. Server-side pagination
    // breaks the sponsored/cosponsored separation since we slice before separating.
    const actualFetchedCount = walk.bills.length;
    const totalAvailableCount = walk.sponsoredCount + walk.cosponsoredCount;
    const fetchedSponsored = walk.bills.filter(b => b.relationship === 'sponsored').length;

    return {
      bills: walk.bills, // Return ALL bills - frontend handles pagination
      pagination: {
        total: actualFetchedCount, // Use fetched count for accurate pagination
        page,
        limit,
        pages: Math.ceil(actualFetchedCount / limit),
      },
      metadata: {
        bioguideId,
        congress,
        cached: state !== 'miss',
        executionTime: Date.now() - startTime,
        sponsoredCount: walk.sponsoredCount, // Total available from API
        cosponsoredCount: walk.cosponsoredCount, // Total available from API
        totalCount: totalAvailableCount, // Total available from both APIs
        fetchedSponsored, // Actually fetched
        fetchedCosponsored: actualFetchedCount - fetchedSponsored, // Actually fetched
        fetchedTotal: actualFetchedCount, // Total actually fetched
      },
    };
  } catch (error) {
    logger.error('Comprehensive bills fetch failed', error as Error, {
      bioguideId,
      congress,
      page,
      limit,
    });

    // Return empty result instead of crashing. Never cached: the SWR helper
    // only stores what the walk returns, and the walk threw.
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

/**
 * @deprecated Use getComprehensiveBillsByMember instead — this function trusts
 * Congress.gov's congress parameter which silently returns all-time data.
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
      url: url.toString(),
    });

    const response = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/2.0 (Optimized)',
        'X-API-Key': apiKey,
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
  cosponsoredCount: number;
  totalCurrentCongress: number;
  recentBills: Array<{ title: string; date: string; type: string }>;
};

export async function getBillsSummary(bioguideId: string): Promise<BillsSummaryResult> {
  const cacheKey = `bills-summary:${bioguideId}`;
  const cached = await govCache.get<BillsSummaryResult>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) throw new Error('Congress API key not configured');

    // Use client-side congress filtering for both sponsored and cosponsored
    // (Congress.gov API ignores the congress param — pagination.count is always all-time)
    const [sponsoredData, cosponsoredData] = await Promise.all([
      fetchSponsoredLegislation(bioguideId, apiKey, 119, 250, 1),
      fetchCosponsoredLegislation(bioguideId, apiKey, 119, 250, 1, CAREER_COSPONSORED_PAGE_CAP),
    ]);

    const result: BillsSummaryResult = {
      currentCongress: {
        count: sponsoredData.total,
        congress: 119,
      },
      cosponsoredCount: cosponsoredData.total,
      totalCurrentCongress: sponsoredData.total,
      recentBills: sponsoredData.bills.slice(0, 5).map(bill => ({
        title: bill.title,
        date: bill.introducedDate,
        type: bill.type,
      })),
    };

    await govCache.set(cacheKey, result, { ttl: 3600 * 1000, source: 'congress.gov' });
    return result;
  } catch (error) {
    logger.error('Bills summary fetch failed', error as Error, { bioguideId });
    return {
      currentCongress: { count: 0, congress: 119 },
      cosponsoredCount: 0,
      totalCurrentCongress: 0,
      recentBills: [],
    };
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikidata Photo Service — High-resolution congressional portraits via SPARQL
 *
 * Uses Wikidata's P1157 (Bioguide ID) → P18 (image) property chain to fetch
 * current, high-resolution official portraits from Wikimedia Commons.
 *
 * Optimizations:
 * - Single SPARQL query per member (combined bioguide→entity→image)
 * - MD5-based Wikimedia CDN thumbnail URLs (faster than thumb.php)
 * - Request deduplication (concurrent requests share one fetch)
 * - Bulk query for cache warming (one query for all 535 members)
 * - Redis caching with 7-day TTL
 *
 * All images sourced through this service are public domain per 17 U.S.C. § 105.
 */

import {
  hasEnhancedWikidataMapping,
  getEnhancedWikidataId,
} from '@/lib/data/enhanced-wikidata-mappings';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { createHash } from 'crypto';

// Network configuration — matches wikidata.ts patterns
const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

// Cache TTL: 7 days for photo URLs (photos change very rarely)
const PHOTO_CACHE_TTL = 7 * 24 * 60 * 60;

// Bulk cache TTL: 24 hours for the full roster mapping
const BULK_CACHE_TTL = 24 * 60 * 60;

// Thumbnail width — 200px is sufficient for 2x displays at 96px max component size
const THUMBNAIL_WIDTH = 200;

/** Result of a Wikidata photo lookup */
export interface WikidataPhotoResult {
  /** Direct Wikimedia Commons URL for the image */
  commonsUrl: string | null;
  /** Wikimedia CDN thumbnail URL at display width */
  thumbnailUrl: string | null;
  /** Wikidata entity ID (e.g., Q359442) */
  wikidataId: string | null;
  /** Whether the lookup succeeded */
  found: boolean;
}

/** SPARQL binding for bulk photo query results */
interface BulkPhotoSparqlBinding {
  bioguideId: { value: string };
  image: { value: string };
  person: { value: string };
}

/** SPARQL binding for single-member combined query */
interface CombinedPhotoSparqlBinding {
  image: { value: string };
  person?: { value: string };
}

// ── Request deduplication ──────────────────────────────────────────
// Prevents concurrent requests for the same bioguide ID from duplicating work
const inflightRequests = new Map<string, Promise<WikidataPhotoResult>>();

/**
 * Fetch with timeout and retry logic for SPARQL queries
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0 (https://civdotiq.org) Government Data Portal',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok && retries > 0) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
}

/**
 * Convert a Wikimedia Commons file URL to a CDN thumbnail URL.
 *
 * Wikimedia CDN pattern:
 *   https://upload.wikimedia.org/wikipedia/commons/thumb/{a}/{ab}/Filename.jpg/{width}px-Filename.jpg
 *
 * Where {a} = md5(filename)[0], {ab} = md5(filename)[0:2]
 * This serves from edge CDN rather than hitting the PHP backend (thumb.php).
 */
function commonsToThumbnail(commonsUrl: string, width: number = THUMBNAIL_WIDTH): string {
  const filename = extractCommonsFilename(commonsUrl);
  if (!filename) return commonsUrl;

  const md5 = createHash('md5').update(filename).digest('hex');
  const a = md5[0];
  const ab = md5.substring(0, 2);

  const encodedFilename = encodeURIComponent(filename).replace(/%20/g, '_');

  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${a}/${ab}/${encodedFilename}/${width}px-${encodedFilename}`;
}

/**
 * Extract the filename from a Wikimedia Commons URL.
 * Handles Special:FilePath/, /wiki/File:, and direct upload paths.
 */
function extractCommonsFilename(commonsUrl: string): string | null {
  let filename: string | null = null;

  if (commonsUrl.includes('Special:FilePath/')) {
    filename = commonsUrl.split('Special:FilePath/')[1] ?? null;
  } else if (commonsUrl.includes('/wiki/File:')) {
    filename = commonsUrl.split('/wiki/File:')[1] ?? null;
  } else {
    // Direct upload URL — take last path segment
    const segments = commonsUrl.split('/');
    filename = segments[segments.length - 1] ?? null;
  }

  if (!filename) return null;

  // Decode URL encoding and normalize spaces to underscores (Wikimedia convention)
  return decodeURIComponent(filename).replace(/ /g, '_');
}

/**
 * Fetch a single member's photo URL from Wikidata by Bioguide ID.
 *
 * Uses request deduplication: concurrent calls for the same ID share one fetch.
 * Results are cached in Redis for 7 days.
 */
export async function getPhotoByBioguideId(bioguideId: string): Promise<WikidataPhotoResult> {
  const upperBioguide = bioguideId.toUpperCase();
  const cacheKey = `wikidata-photo:${upperBioguide}`;

  try {
    return await cachedFetch(cacheKey, () => deduplicatedFetch(upperBioguide), PHOTO_CACHE_TTL);
  } catch (error) {
    logger.warn('Wikidata photo lookup failed', {
      bioguideId: upperBioguide,
      error: (error as Error).message,
    });
    return { commonsUrl: null, thumbnailUrl: null, wikidataId: null, found: false };
  }
}

/**
 * Deduplicate concurrent requests for the same bioguide ID.
 */
function deduplicatedFetch(bioguideId: string): Promise<WikidataPhotoResult> {
  const existing = inflightRequests.get(bioguideId);
  if (existing) return existing;

  const promise = fetchPhotoForMember(bioguideId).finally(() => {
    inflightRequests.delete(bioguideId);
  });

  inflightRequests.set(bioguideId, promise);
  return promise;
}

/**
 * Internal: fetch photo for a single member using a single SPARQL query.
 *
 * Two strategies:
 * 1. If enhanced mapping exists: use known Wikidata ID → query P18 directly
 * 2. Otherwise: combined query (P1157 bioguide → P18 image in one trip)
 */
async function fetchPhotoForMember(bioguideId: string): Promise<WikidataPhotoResult> {
  // Strategy 1: Known Wikidata ID — single targeted query
  if (hasEnhancedWikidataMapping(bioguideId)) {
    const wikidataId = getEnhancedWikidataId(bioguideId);
    if (wikidataId) {
      return fetchPhotoByWikidataId(bioguideId, wikidataId);
    }
  }

  // Strategy 2: Combined SPARQL query (bioguide → image in one round trip)
  const query = `SELECT ?image ?person WHERE {
  ?person wdt:P1157 "${bioguideId}" .
  ?person wdt:P18 ?image .
} LIMIT 1`;

  try {
    const encodedQuery = encodeURIComponent(query);
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetchWithRetry(sparqlUrl);
    if (!response.ok) {
      return { commonsUrl: null, thumbnailUrl: null, wikidataId: null, found: false };
    }

    const data = await response.json();
    const bindings = data.results?.bindings as CombinedPhotoSparqlBinding[] | undefined;

    if (!bindings?.length) {
      return { commonsUrl: null, thumbnailUrl: null, wikidataId: null, found: false };
    }

    const commonsUrl = bindings[0]?.image?.value ?? null;
    const personUri = bindings[0]?.person?.value ?? null;
    const wikidataId = personUri?.split('/').pop() ?? null;

    if (!commonsUrl) {
      return { commonsUrl: null, thumbnailUrl: null, wikidataId, found: false };
    }

    const thumbnailUrl = commonsToThumbnail(commonsUrl);

    logger.info('Wikidata photo found (combined query)', {
      bioguideId,
      wikidataId,
    });

    return { commonsUrl, thumbnailUrl, wikidataId, found: true };
  } catch (error) {
    logger.warn('Wikidata combined SPARQL query failed', {
      bioguideId,
      error: (error as Error).message,
    });
    return { commonsUrl: null, thumbnailUrl: null, wikidataId: null, found: false };
  }
}

/**
 * Fetch photo for a known Wikidata entity ID (single SPARQL query).
 */
async function fetchPhotoByWikidataId(
  bioguideId: string,
  wikidataId: string
): Promise<WikidataPhotoResult> {
  const query = `SELECT ?image WHERE { wd:${wikidataId} wdt:P18 ?image . } LIMIT 1`;

  try {
    const encodedQuery = encodeURIComponent(query);
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetchWithRetry(sparqlUrl);
    if (!response.ok) {
      return { commonsUrl: null, thumbnailUrl: null, wikidataId, found: false };
    }

    const data = await response.json();
    const bindings = data.results?.bindings as CombinedPhotoSparqlBinding[] | undefined;

    if (!bindings?.length) {
      return { commonsUrl: null, thumbnailUrl: null, wikidataId, found: false };
    }

    const commonsUrl = bindings[0]?.image?.value ?? null;
    if (!commonsUrl) {
      return { commonsUrl: null, thumbnailUrl: null, wikidataId, found: false };
    }

    const thumbnailUrl = commonsToThumbnail(commonsUrl);

    logger.info('Wikidata photo found (mapped entity)', {
      bioguideId,
      wikidataId,
    });

    return { commonsUrl, thumbnailUrl, wikidataId, found: true };
  } catch (error) {
    logger.warn('Wikidata entity photo query failed', {
      bioguideId,
      wikidataId,
      error: (error as Error).message,
    });
    return { commonsUrl: null, thumbnailUrl: null, wikidataId, found: false };
  }
}

/**
 * Bulk-fetch photo URLs for all members with a Bioguide ID.
 *
 * Uses a single SPARQL query to fetch all Bioguide ID → image mappings,
 * avoiding 535 individual queries. Results are cached for 24 hours.
 *
 * Returns a plain object (Record) for Redis serialization compatibility.
 */
export async function bulkFetchCongressPhotos(): Promise<Record<string, WikidataPhotoResult>> {
  const cacheKey = 'wikidata-photos:bulk-congress';

  try {
    return await cachedFetch(cacheKey, executeBulkPhotoQuery, BULK_CACHE_TTL);
  } catch (error) {
    logger.error('Bulk Wikidata photo fetch failed', error as Error, {
      operation: 'bulkFetchCongressPhotos',
    });
    return {};
  }
}

/**
 * Internal: execute the bulk SPARQL query
 */
async function executeBulkPhotoQuery(): Promise<Record<string, WikidataPhotoResult>> {
  const query = `SELECT ?bioguideId ?image ?person WHERE {
  ?person wdt:P1157 ?bioguideId .
  ?person wdt:P18 ?image .
}`;

  const encodedQuery = encodeURIComponent(query);
  const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

  logger.info('Executing bulk Wikidata photo SPARQL query');

  const response = await fetchWithRetry(sparqlUrl);
  if (!response.ok) {
    throw new Error(`SPARQL query failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  const bindings = data.results?.bindings as BulkPhotoSparqlBinding[] | undefined;

  if (!bindings?.length) {
    logger.warn('Bulk SPARQL query returned no results');
    return {};
  }

  const results: Record<string, WikidataPhotoResult> = {};

  for (const binding of bindings) {
    const bioguideId = binding.bioguideId?.value?.toUpperCase();
    const commonsUrl = binding.image?.value;
    const personUri = binding.person?.value;

    if (!bioguideId || !commonsUrl) continue;

    const wikidataId = personUri?.includes('/entity/')
      ? (personUri.split('/').pop() ?? null)
      : null;

    results[bioguideId] = {
      commonsUrl,
      thumbnailUrl: commonsToThumbnail(commonsUrl),
      wikidataId,
      found: true,
    };
  }

  logger.info('Bulk Wikidata photo query completed', {
    totalResults: Object.keys(results).length,
  });

  return results;
}

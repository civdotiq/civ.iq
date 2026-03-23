/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congressional Record Service
 *
 * Fetches floor speeches from the GovInfo API CREC collection.
 * Uses the POST /search endpoint to query by member bioguide ID.
 *
 * Data source: https://api.govinfo.gov
 * Collection: CREC (Congressional Record)
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { FloorSpeech } from '@/types/govinfo';

const GOVINFO_API = 'https://api.govinfo.gov';
const API_KEY = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';

const HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
  'X-API-Key': API_KEY,
};

/** Granule classes that contain substantive speech content */
const SPEECH_CLASSES = new Set(['HOUSE', 'SENATE', 'EXTENSIONS']);

interface GovInfoSearchResult {
  title: string;
  packageId: string;
  granuleId: string;
  collectionCode: string;
  dateIssued: string;
  lastModified: string;
  category: string;
  resultLink: string;
  download?: {
    txtLink?: string;
    pdfLink?: string;
  };
}

interface GovInfoSearchResponse {
  count: number;
  offsetMark: string;
  nextOffsetMark: string | null;
  results: GovInfoSearchResult[];
}

interface GranuleSummary {
  granuleId: string;
  granuleClass: string;
  subGranuleClass: string;
  title: string;
  packageId: string;
  dateIssued: string;
  members: Array<{
    bioGuideId: string;
    memberName: string;
    role: string;
    party: string;
    state: string;
    chamber: string;
    congress: number;
  }>;
  committees: Array<{
    authorityId: string;
    chamber: string;
    committeeName: string;
    type: string;
  }>;
  references: Array<{
    collectionCode: string;
    type: string;
    number: string;
    congress: string;
  }>;
  download: {
    txtLink?: string;
    pdfLink?: string;
    modsLink?: string;
  };
}

/**
 * Map granuleClass to readable chamber name.
 */
function chamberFromClass(granuleClass: string): 'House' | 'Senate' {
  if (granuleClass === 'SENATE') return 'Senate';
  return 'House';
}

/**
 * Fetch granule summary to get structured member, committee, and bill references.
 */
async function fetchGranuleSummary(
  packageId: string,
  granuleId: string
): Promise<GranuleSummary | null> {
  const cacheKey = `crec-granule-${granuleId}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        const url = `${GOVINFO_API}/packages/${packageId}/granules/${granuleId}/summary`;
        const response = await fetch(url, { headers: HEADERS });

        if (!response.ok) {
          logger.warn('GovInfo granule summary fetch failed', {
            granuleId,
            status: response.status,
          });
          return null;
        }

        return (await response.json()) as GranuleSummary;
      } catch (error) {
        logger.error('Error fetching granule summary', error as Error);
        return null;
      }
    },
    24 * 60 * 60 // 24 hour cache — granule data is immutable
  );
}

/**
 * Transform a granule summary into a FloorSpeech for UI consumption.
 */
function transformGranule(summary: GranuleSummary): FloorSpeech {
  const section = SPEECH_CLASSES.has(summary.granuleClass)
    ? (summary.granuleClass as 'HOUSE' | 'SENATE' | 'EXTENSIONS')
    : 'EXTENSIONS';

  const relatedBills = (summary.references ?? [])
    .filter(ref => ref.collectionCode === 'BILLS')
    .map(ref => ({
      type: ref.type,
      number: ref.number,
      congress: parseInt(ref.congress) || 119,
    }));

  return {
    id: summary.granuleId,
    title: summary.title,
    date: summary.dateIssued,
    chamber: chamberFromClass(summary.granuleClass),
    section,
    category: summary.subGranuleClass ?? '',
    relatedBills,
    pdfUrl: summary.download?.pdfLink ?? null,
    govInfoUrl: `https://www.govinfo.gov/app/details/${summary.packageId}/${summary.granuleId}`,
  };
}

/**
 * Search for Congressional Record entries by member name.
 *
 * Uses the GovInfo POST /search endpoint with collection:CREC filter.
 * Returns paginated results sorted by date descending.
 */
async function searchByMember(
  memberName: string,
  pageSize: number,
  offsetMark: string
): Promise<{ results: GovInfoSearchResult[]; total: number; nextOffset: string | null }> {
  const cacheKey = `crec-search-${memberName}-${pageSize}-${offsetMark}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        const body = {
          query: `collection:CREC AND member:"${memberName}"`,
          pageSize,
          offsetMark,
          sorts: [{ field: 'publishdate', sortOrder: 'DESC' }],
        };

        const response = await fetch(`${GOVINFO_API}/search`, {
          method: 'POST',
          headers: HEADERS,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          logger.error('GovInfo CREC search failed', new Error(`HTTP ${response.status}`));
          return { results: [], total: 0, nextOffset: null };
        }

        const data = (await response.json()) as GovInfoSearchResponse;

        return {
          results: data.results ?? [],
          total: data.count ?? 0,
          nextOffset: data.nextOffsetMark ?? null,
        };
      } catch (error) {
        logger.error('Error searching CREC', error as Error);
        return { results: [], total: 0, nextOffset: null };
      }
    },
    60 * 60 // 1 hour cache for search results
  );
}

/**
 * Fetch floor speeches for a member by bioguide ID.
 *
 * Strategy:
 * 1. Search CREC by member name (GovInfo search API)
 * 2. For each result, fetch granule summary to get structured metadata
 * 3. Filter to speech-bearing granule classes (HOUSE, SENATE, EXTENSIONS)
 * 4. Return processed FloorSpeech objects
 */
export async function getFloorSpeeches(
  bioguideId: string,
  memberName: string,
  options: { pageSize?: number; offsetMark?: string } = {}
): Promise<{
  speeches: FloorSpeech[];
  total: number;
  hasMore: boolean;
  dataAsOf: string;
}> {
  const pageSize = Math.min(options.pageSize ?? 20, 50);
  const offsetMark = options.offsetMark ?? '*';

  // Search uses member name (last name is sufficient and more reliable)
  const lastName = memberName.split(',')[0]?.trim() ?? memberName.split(' ').pop() ?? memberName;

  const { results, total, nextOffset } = await searchByMember(lastName, pageSize, offsetMark);

  // Fetch granule summaries in parallel (batched to avoid rate limits)
  const BATCH_SIZE = 5;
  const speeches: FloorSpeech[] = [];
  let latestDate = '';

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);

    const summaries = await Promise.all(
      batch.map(result => {
        const { packageId, granuleId } = result;
        if (!packageId || !granuleId) return null;
        return fetchGranuleSummary(packageId, granuleId);
      })
    );

    for (const summary of summaries) {
      if (!summary) continue;

      // Filter to speech-bearing granule classes
      if (!SPEECH_CLASSES.has(summary.granuleClass)) continue;

      // Verify this member actually appears in the granule
      const memberMatch = summary.members?.some(
        m => m.bioGuideId === bioguideId
      );
      if (!memberMatch) continue;

      const speech = transformGranule(summary);
      speeches.push(speech);

      if (speech.date > latestDate) {
        latestDate = speech.date;
      }
    }
  }

  return {
    speeches,
    total,
    hasMore: nextOffset !== null && nextOffset !== offsetMark,
    dataAsOf: latestDate || new Date().toISOString().slice(0, 10),
  };
}

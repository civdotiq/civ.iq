/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Keyword / full-text bill search via the GovInfo Search Service.
 *
 * Congress.gov's API has no keyword search — its /bill endpoint only lists by
 * congress + type. GovInfo indexes the full text of the BILLS collection and
 * exposes it through POST /search, so this is the real-data path for "find
 * bills about <topic>". Results map back to congress-type-number ids so they
 * feed get_bill_details and the bill pages unchanged. Reuses the same
 * GOVINFO_API_KEY and X-API-Key convention as the hearings integration.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

const GOVINFO_API = 'https://api.govinfo.gov';

export const BILL_TYPES = [
  'hr',
  's',
  'hjres',
  'sjres',
  'hconres',
  'sconres',
  'hres',
  'sres',
] as const;
export type BillType = (typeof BILL_TYPES)[number];

export interface BillSearchResult {
  /** congress-type-number, ready for get_bill_details (e.g. "119-hr-340"). */
  id: string;
  congress: number;
  type: string; // uppercase display form, e.g. "HR"
  number: string;
  title: string;
  dateIssued: string | null;
  source: 'govinfo-fulltext';
}

interface GovInfoSearchResult {
  title?: string;
  packageId?: string;
  dateIssued?: string;
}

interface GovInfoSearchResponse {
  results?: GovInfoSearchResult[];
  count?: number;
}

// GovInfo bill package IDs look like BILLS-119hr340ih (congress|type|number|
// version). Requiring digits after the type forces the correct type boundary
// via backtracking (so "hconres"/"hres" don't get mis-split as "hr").
const PACKAGE_RE = new RegExp(`^BILLS-(\\d+)(${BILL_TYPES.join('|')})(\\d+)[a-z]+$`, 'i');

/** Strip characters that would break the GovInfo query DSL (colons, parens). */
function sanitizeQuery(raw: string): string {
  return raw
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Full-text search of congressional bills. Returns one entry per bill (deduped
 * across text versions), most-relevant first. Returns an empty array when the
 * query is unusable, GovInfo errors, or nothing matches — never throws.
 */
export async function searchBillsByKeyword(
  query: string,
  opts: { congress?: number; type?: BillType; limit?: number } = {}
): Promise<BillSearchResult[]> {
  const clean = sanitizeQuery(query);
  if (!clean) return [];

  const congress = opts.congress ?? 119;
  const limit = Math.min(opts.limit ?? 20, 50);
  const apiKey = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';
  const cacheKey = `bill-search:${congress}:${opts.type ?? 'all'}:${limit}:${clean.toLowerCase()}`;

  return cachedFetch(
    cacheKey,
    async () => {
      // Request extra rows: GovInfo returns multiple text versions per bill,
      // which collapse to one after dedup.
      const govQuery = `collection:BILLS AND congress:${congress} AND (${clean})`;
      const body = {
        query: govQuery,
        pageSize: String(Math.min(limit * 5, 100)),
        offsetMark: '*',
        sorts: [{ field: 'score', sortOrder: 'DESC' }],
      };

      let data: GovInfoSearchResponse;
      try {
        const response = await fetch(`${GOVINFO_API}/search`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
            'X-API-Key': apiKey,
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          logger.warn('GovInfo bill search error', {
            status: response.status,
            operation: 'bill_search',
          });
          return [];
        }

        data = (await response.json()) as GovInfoSearchResponse;
      } catch (error) {
        logger.warn('GovInfo bill search failed', {
          error: error instanceof Error ? error.message : 'Unknown',
          operation: 'bill_search',
        });
        return [];
      }

      const seen = new Set<string>();
      const bills: BillSearchResult[] = [];
      for (const r of data.results ?? []) {
        const match = r.packageId?.match(PACKAGE_RE);
        if (!match) continue;

        const [, cong, rawType, num] = match;
        if (!cong || !rawType || !num) continue;
        const type = rawType.toLowerCase();
        if (opts.type && type !== opts.type) continue;

        const id = `${cong}-${type}-${num}`;
        if (seen.has(id)) continue;
        seen.add(id);

        bills.push({
          id,
          congress: Number(cong),
          type: type.toUpperCase(),
          number: num,
          title: r.title ?? '(untitled)',
          dateIssued: r.dateIssued ?? null,
          source: 'govinfo-fulltext',
        });

        if (bills.length >= limit) break;
      }

      return bills;
    },
    3600 // 1h — new bills appear in GovInfo within a day; keyword results are stable
  );
}

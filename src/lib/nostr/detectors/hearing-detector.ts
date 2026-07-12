/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Hearing Event Detector
 * Detects new congressional hearings from GovInfo API.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { nostrConfig } from '@/config/nostr.config';
import type { CivicEvent, HearingEvent } from '@/types/nostr';
import type { GovInfoCollectionResponse } from '@/types/govinfo';
import { GOVINFO_API } from './types';
import logger from '@/lib/logging/simple-logger';

/** Parse chamber from GovInfo document class */
export function parseChamberFromDocClass(docClass: string): 'House' | 'Senate' | 'Joint' {
  if (docClass.startsWith('H')) return 'House';
  if (docClass.startsWith('S')) return 'Senate';
  return 'Joint';
}

/**
 * The collections query filters by lastModified, which resurfaces packages
 * from past congresses whenever GovInfo touches their metadata. Only newly
 * issued transcripts are news. Kept under the 30-day dedup TTL so an expired
 * dedup entry can't let a still-in-window package publish twice.
 */
const MAX_ISSUED_AGE_DAYS = 14;

export function isRecentlyIssued(dateIssued: string): boolean {
  const age = Date.now() - new Date(dateIssued).getTime();
  return age >= 0 ? age <= MAX_ISSUED_AGE_DAYS * 24 * 60 * 60 * 1000 : true;
}

/** Detect new hearing events from GovInfo API */
export async function detectHearingEvents(): Promise<CivicEvent[]> {
  const govInfoApiKey = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

    // offsetMark is mandatory since GovInfo retired offset pagination
    const url = `${GOVINFO_API}/collections/CHRG/${startDateStr}?pageSize=20&offsetMark=*`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        'X-API-Key': govInfoApiKey,
      },
    });

    if (!response.ok) {
      logger.error('GovInfo hearings API error', new Error(`HTTP ${response.status}`), {
        operation: 'nostr_publisher',
      });
      return [];
    }

    const data: GovInfoCollectionResponse = await response.json();
    const packages = data.packages ?? [];

    logger.info(`Fetched ${packages.length} hearings for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const pkg of packages) {
      if (!pkg.dateIssued || !isRecentlyIssued(pkg.dateIssued)) continue;

      const dedupKey = `${nostrConfig.dedupPrefix}hearing-${pkg.packageId}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const chamber = parseChamberFromDocClass(pkg.docClass);
        const hearingData: HearingEvent = {
          packageId: pkg.packageId,
          title: pkg.title,
          congress: parseInt(pkg.congress) || 119,
          chamber,
          dateIssued: pkg.dateIssued,
          url: `https://www.govinfo.gov/app/details/${pkg.packageId}`,
        };

        events.push({
          type: 'hearing',
          id: `hearing-${pkg.packageId}`,
          timestamp: Math.floor(new Date(pkg.dateIssued).getTime() / 1000),
          title: `Hearing: ${pkg.title}`,
          summary: `${chamber} hearing — ${pkg.title}`,
          tags: ['hearing', chamber.toLowerCase()],
          source: {
            url: `https://www.govinfo.gov/app/details/${pkg.packageId}`,
            api: 'govinfo.gov',
          },
          data: hearingData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect hearing events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

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

/** Detect new hearing events from GovInfo API */
export async function detectHearingEvents(): Promise<CivicEvent[]> {
  const govInfoApiKey = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

    const url = `${GOVINFO_API}/collections/CHRG/${startDateStr}?pageSize=20`;
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

    logger.info(`Fetched ${data.packages.length} hearings for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const pkg of data.packages) {
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

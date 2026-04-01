/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Executive Order Detector
 * Detects new executive orders from Federal Register API.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { nostrConfig } from '@/config/nostr.config';
import type { CivicEvent, ExecutiveOrderEvent } from '@/types/nostr';
import type { FederalRegisterAPIResponse } from '@/types/federal-register';
import { FEDERAL_REGISTER_API } from './types';
import logger from '@/lib/logging/simple-logger';

/** Detect new executive order events from Federal Register API */
export async function detectExecutiveOrderEvents(): Promise<CivicEvent[]> {
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const params = new URLSearchParams();
    params.set('conditions[presidential_document_type]', 'executive_order');
    params.set('per_page', '10');
    params.set('order', 'newest');
    [
      'document_number',
      'title',
      'abstract',
      'publication_date',
      'html_url',
      'agencies',
      'executive_order_number',
      'signing_date',
    ].forEach(f => params.append('fields[]', f));

    const url = `${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) {
      logger.error('Federal Register EO API error', new Error(`HTTP ${response.status}`), {
        operation: 'nostr_publisher',
      });
      return [];
    }

    const data: FederalRegisterAPIResponse = await response.json();

    logger.info(`Fetched ${data.results.length} executive orders for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const doc of data.results) {
      const dedupKey = `${nostrConfig.dedupPrefix}eo-${doc.document_number}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const primaryAgency = doc.agencies?.[0];
        const eoData: ExecutiveOrderEvent = {
          documentNumber: doc.document_number,
          title: doc.title,
          summary: doc.abstract,
          eoNumber: doc.executive_order_number ?? undefined,
          signingDate: doc.signing_date ?? undefined,
          agency: primaryAgency?.name ?? 'Executive Office of the President',
          url: doc.html_url,
        };

        events.push({
          type: 'executive-order',
          id: `eo-${doc.document_number}`,
          timestamp: Math.floor(new Date(doc.publication_date).getTime() / 1000),
          title: doc.executive_order_number
            ? `Executive Order ${doc.executive_order_number}: ${doc.title}`
            : `Executive Order: ${doc.title}`,
          summary: doc.abstract || doc.title,
          tags: ['executive-order', 'presidential'],
          source: {
            url: doc.html_url,
            api: 'federalregister.gov',
          },
          data: eoData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect executive order events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Comment Period Detector
 * Detects open comment periods from Federal Register API.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { nostrConfig } from '@/config/nostr.config';
import type { CivicEvent, CommentPeriodEvent } from '@/types/nostr';
import type { FederalRegisterAPIResponse } from '@/types/federal-register';
import { FEDERAL_REGISTER_API } from './types';
import logger from '@/lib/logging/simple-logger';

/** Detect new open comment period events from Federal Register API */
export async function detectCommentPeriodEvents(): Promise<CivicEvent[]> {
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0] ?? '';

    const params = new URLSearchParams();
    params.set('conditions[type]', 'PRORULE');
    params.set('conditions[comment_date][gte]', todayStr);
    params.set('per_page', '20');
    params.set('order', 'newest');
    [
      'document_number',
      'title',
      'abstract',
      'publication_date',
      'html_url',
      'agencies',
      'comment_url',
      'comments_close_on',
    ].forEach(f => params.append('fields[]', f));

    const url = `${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`;
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) {
      logger.error(
        'Federal Register comment period API error',
        new Error(`HTTP ${response.status}`),
        {
          operation: 'nostr_publisher',
        }
      );
      return [];
    }

    const data: FederalRegisterAPIResponse = await response.json();

    logger.info(`Fetched ${data.results.length} comment periods for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const doc of data.results) {
      const dedupKey = `${nostrConfig.dedupPrefix}comment-${doc.document_number}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const primaryAgency = doc.agencies?.[0];
        let daysUntilClose: number | undefined;
        if (doc.comments_close_on) {
          const closeDate = new Date(doc.comments_close_on);
          const diffTime = closeDate.getTime() - today.getTime();
          daysUntilClose = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }

        const commentData: CommentPeriodEvent = {
          documentNumber: doc.document_number,
          title: doc.title,
          summary: doc.abstract,
          agency: primaryAgency?.name ?? 'Unknown Agency',
          commentUrl: doc.comment_url ?? undefined,
          commentsCloseOn: doc.comments_close_on ?? undefined,
          daysUntilClose,
          url: doc.html_url,
        };

        const closingNote =
          daysUntilClose !== undefined ? ` (${daysUntilClose} days remaining)` : '';
        events.push({
          type: 'comment-period',
          id: `comment-${doc.document_number}`,
          timestamp: Math.floor(new Date(doc.publication_date).getTime() / 1000),
          title: `Open for Comment: ${doc.title}`,
          summary: `${primaryAgency?.name ?? 'Agency'} — ${doc.abstract || doc.title}${closingNote}`,
          tags: ['comment-period', 'regulation', primaryAgency?.slug ?? 'federal'],
          source: {
            url: doc.html_url,
            api: 'federalregister.gov',
          },
          data: commentData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect comment period events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

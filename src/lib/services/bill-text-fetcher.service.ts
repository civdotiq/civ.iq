/**
 * Bill Text Fetcher Service
 *
 * Fetches and parses bill text from version URLs provided by OpenStates.
 * Handles HTML content cleaning and PDF link passthrough.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import DOMPurify from 'isomorphic-dompurify';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import type { StateBill, StateBillText } from '@/types/state-legislature';

const TEXT_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_TEXT_LENGTH = 50000; // 50K character limit

/**
 * Fetch and parse bill text from OpenStates version URLs.
 *
 * Strategy:
 * 1. Iterate bill.versions (newest first)
 * 2. For HTML: strip tags, extract text
 * 3. For PDF: return URL with format 'pdf-link'
 * 4. Truncate to 50K chars if needed
 */
export async function fetchBillText(bill: StateBill, state: string): Promise<StateBillText> {
  const cacheKey = `bill-text:${state}:${bill.id}`;

  try {
    // Check cache first
    const cached = await govCache.get<StateBillText>(cacheKey);
    if (cached) {
      logger.info('Bill text cache hit', { state, billId: bill.id });
      return cached;
    }

    const versions = bill.versions ?? [];
    if (versions.length === 0) {
      logger.info('No bill versions available', { state, billId: bill.id });
      return buildEmptyResult(bill, state);
    }

    // Process versions newest first
    const sortedVersions = [...versions].reverse();
    const parsedVersions: StateBillText['versions'] = [];

    for (const version of sortedVersions) {
      if (!version.url) continue;

      const format = detectFormat(version.url, version.media_type);

      if (format === 'pdf-link') {
        parsedVersions.push({
          note: version.note ?? 'PDF',
          date: version.date,
          format: 'pdf-link',
          url: version.url,
        });
        continue;
      }

      // Attempt to fetch HTML/text content
      try {
        const content = await fetchAndParseHTML(version.url);
        if (content) {
          const truncated = content.length > MAX_TEXT_LENGTH;
          parsedVersions.push({
            note: version.note ?? 'Full Text',
            date: version.date,
            format: 'html',
            content: truncated ? content.substring(0, MAX_TEXT_LENGTH) : content,
            url: version.url,
            truncated,
            charCount: content.length,
          });
        }
      } catch (error) {
        logger.warn('Failed to fetch bill version, adding as link', {
          url: version.url,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        parsedVersions.push({
          note: version.note ?? 'Full Text',
          date: version.date,
          format: 'text',
          url: version.url,
        });
      }
    }

    const result: StateBillText = {
      billId: bill.id,
      identifier: bill.identifier,
      state,
      versions: parsedVersions,
      lastUpdated: new Date().toISOString(),
    };

    // Cache the result
    await govCache.set(cacheKey, result, {
      ttl: TEXT_CACHE_TTL,
      source: 'bill-text',
      dataType: 'bills',
    });

    logger.info('Bill text fetched', {
      state,
      billId: bill.id,
      identifier: bill.identifier,
      versionCount: parsedVersions.length,
      hasContent: parsedVersions.some(v => !!v.content),
    });

    return result;
  } catch (error) {
    logger.error('Bill text fetch failed', error as Error, {
      state,
      billId: bill.id,
    });
    return buildEmptyResult(bill, state);
  }
}

/**
 * Detect the format of a bill version URL.
 */
function detectFormat(url: string, mediaType?: string): 'html' | 'pdf-link' | 'text' {
  const lowerUrl = url.toLowerCase();
  const lowerMedia = (mediaType ?? '').toLowerCase();

  if (lowerUrl.endsWith('.pdf') || lowerMedia.includes('pdf')) {
    return 'pdf-link';
  }

  if (lowerUrl.endsWith('.html') || lowerUrl.endsWith('.htm') || lowerMedia.includes('html')) {
    return 'html';
  }

  // Most state legislature URLs serve HTML even without extension
  return 'html';
}

/**
 * Fetch an HTML page and extract clean text content.
 */
async function fetchAndParseHTML(url: string): Promise<string | null> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: {
      'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq)',
      Accept: 'text/html, text/plain, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') ?? '';

  // Don't parse binary content (PDF served without correct extension)
  if (contentType.includes('pdf') || contentType.includes('octet-stream')) {
    return null;
  }

  const html = await response.text();

  // Strip HTML tags and clean text using DOMPurify
  const sanitized = DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });

  // Clean up whitespace
  const text = sanitized
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text.length > 0 ? text : null;
}

/**
 * Build empty result when no text is available.
 */
function buildEmptyResult(bill: StateBill, state: string): StateBillText {
  return {
    billId: bill.id,
    identifier: bill.identifier,
    state,
    versions: [],
    lastUpdated: new Date().toISOString(),
  };
}

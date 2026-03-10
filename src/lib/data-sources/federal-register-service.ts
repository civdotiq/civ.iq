/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Register Preamble Service
 *
 * Fetches full preamble text from the Federal Register API and computes
 * text statistics for the intelligence extraction layer.
 *
 * API: https://www.federalregister.gov/developers/documentation/api/v1
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FederalRegisterAPIDocument,
  PreambleTextStats,
} from '@/types/federal-register';

const FR_API = 'https://www.federalregister.gov/api/v1';

/** Max characters to send to LLM extraction. */
export const MAX_PREAMBLE_CHARS = 30_000;

/** Minimum word count to attempt extraction. */
export const MIN_WORDS_FOR_EXTRACTION = 100;

// ── Pre-compiled regex patterns for text stats ────────────────────

const SECTION_PATTERN = /(?:^|\n)\s*(?:(?:I{1,3}|IV|VI{0,3}|IX|X{0,3})\.|Section\s+\d+)/gi;
const DOLLAR_PATTERN = /\$[\d,]+(?:\.\d+)?(?:\s*(?:billion|million|thousand|trillion))?/gi;
const DATE_PATTERN = /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/gi;
const ENTITY_PATTERN = /(?:Department|Agency|Bureau|Commission|Administration|Authority|Office|Board)\s+(?:of\s+)?(?:[A-Z][a-z]+\s*)+/g;

/**
 * Fetch a single document's metadata including body URLs.
 */
export async function getDocumentMetadata(
  documentNumber: string
): Promise<FederalRegisterAPIDocument | null> {
  const cacheKey = `fr-doc-meta:${documentNumber}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const fields = [
          'document_number',
          'title',
          'abstract',
          'type',
          'publication_date',
          'html_url',
          'pdf_url',
          'agencies',
          'body_html_url',
          'raw_text_url',
          'comment_url',
          'comments_close_on',
          'effective_on',
          'executive_order_number',
          'regulation_id_number',
        ];

        const params = new URLSearchParams();
        fields.forEach(f => params.append('fields[]', f));

        const url = `${FR_API}/documents/${encodeURIComponent(documentNumber)}.json?${params.toString()}`;

        logger.info('[FRService] Fetching document metadata', { documentNumber });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          if (response.status === 404) return null;
          throw new Error(`Federal Register API returned ${response.status}`);
        }

        return (await response.json()) as FederalRegisterAPIDocument;
      },
      3600 // 1 hour
    );
  } catch (error) {
    logger.error('[FRService] Failed to fetch document metadata', error as Error, {
      documentNumber,
    });
    return null;
  }
}

/**
 * Fetch and clean the full preamble text for a document.
 * Tries raw_text_url first, falls back to body_html_url with tag stripping.
 *
 * @param documentNumber - FR document number
 * @param doc - Pre-fetched metadata (avoids duplicate API call when caller already has it)
 */
export async function getPreambleText(
  documentNumber: string,
  doc?: FederalRegisterAPIDocument | null
): Promise<string | null> {
  const cacheKey = `fr-preamble-text:${documentNumber}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const metadata = doc ?? await getDocumentMetadata(documentNumber);
        if (!metadata) return null;

        // Try raw text first (cleanest), then HTML (strip tags)
        const textUrl = metadata.raw_text_url ?? metadata.body_html_url;
        if (!textUrl) {
          logger.info('[FRService] No preamble URL available', { documentNumber });
          return null;
        }

        logger.info('[FRService] Fetching preamble text', {
          documentNumber,
          source: metadata.raw_text_url ? 'raw_text' : 'body_html',
        });

        const response = await fetch(textUrl, {
          headers: { 'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)' },
          signal: AbortSignal.timeout(30_000),
        });

        if (!response.ok) {
          throw new Error(`Preamble fetch returned ${response.status}`);
        }

        const rawContent = await response.text();

        // If from HTML, strip tags
        const text = metadata.raw_text_url ? rawContent : stripHtmlTags(rawContent);

        // Normalize whitespace
        const cleaned = text
          .replace(/\r\n/g, '\n')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        if (!cleaned) return null;

        return cleaned;
      },
      86_400 // 24 hours — preamble content is immutable once published
    );
  } catch (error) {
    logger.error('[FRService] Failed to fetch preamble text', error as Error, {
      documentNumber,
    });
    return null;
  }
}

/**
 * Compute text statistics from preamble text.
 * These are computed BEFORE any AI call (statistics-first rule).
 */
export function computeTextStats(text: string): PreambleTextStats {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const wasTruncated = text.length >= MAX_PREAMBLE_CHARS;

  // Reset lastIndex for global regexes before each use
  SECTION_PATTERN.lastIndex = 0;
  DOLLAR_PATTERN.lastIndex = 0;
  DATE_PATTERN.lastIndex = 0;
  ENTITY_PATTERN.lastIndex = 0;

  const sectionCount = text.match(SECTION_PATTERN)?.length ?? 0;
  const dollarAmountMentions = text.match(DOLLAR_PATTERN)?.length ?? 0;
  const dateMentions = text.match(DATE_PATTERN)?.length ?? 0;
  const entityMentions = text.match(ENTITY_PATTERN)?.length ?? 0;

  return {
    wordCount: words.length,
    sectionCount,
    dollarAmountMentions,
    dateMentions,
    entityMentions,
    wasTruncated,
  };
}

/**
 * Strip HTML tags from content, preserving text.
 */
function stripHtmlTags(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–');
}

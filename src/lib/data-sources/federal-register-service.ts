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
  FederalRegisterAPIResponse,
  PreambleTextStats,
} from '@/types/federal-register';
import { getAgenciesForCommittee, type AgencyInfo } from '@civiq/entity-resolution';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import type { RegulationNode } from '@/lib/intelligence/types';

const FR_API = 'https://www.federalregister.gov/api/v1';

/** Max characters to send to LLM extraction. */
export const MAX_PREAMBLE_CHARS = 30_000;

/** Minimum word count to attempt extraction. */
export const MIN_WORDS_FOR_EXTRACTION = 100;

// ── Pre-compiled regex patterns for text stats ────────────────────

const SECTION_PATTERN = /(?:^|\n)\s*(?:(?:I{1,3}|IV|VI{0,3}|IX|X{0,3})\.|Section\s+\d+)/gi;
const DOLLAR_PATTERN = /\$[\d,]+(?:\.\d+)?(?:\s*(?:billion|million|thousand|trillion))?/gi;
const DATE_PATTERN =
  /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/gi;
const ENTITY_PATTERN =
  /(?:Department|Agency|Bureau|Commission|Administration|Authority|Office|Board)\s+(?:of\s+)?(?:[A-Z][a-z]+\s*)+/g;

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
          'regulation_id_numbers',
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
        const metadata = doc ?? (await getDocumentMetadata(documentNumber));
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

// ── Phase 2: Regulation Node Methods ────────────────────────────────

const FR_FIELDS = [
  'document_number',
  'title',
  'abstract',
  'type',
  'publication_date',
  'html_url',
  'pdf_url',
  'agencies',
  'comment_url',
  'comments_close_on',
  'effective_on',
  'regulation_id_numbers',
];

/**
 * Search for rules and proposed rules from a specific agency.
 */
export async function searchAgencyRules(
  agencySlug: string,
  opts?: { dateFrom?: string; dateTo?: string; type?: 'RULE' | 'PRORULE' }
): Promise<FederalRegisterAPIDocument[]> {
  const cacheKey = `fr-agency-rules:${agencySlug}:${opts?.dateFrom ?? ''}:${opts?.dateTo ?? ''}:${opts?.type ?? ''}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const params = new URLSearchParams({
          per_page: '50',
          order: 'newest',
          'conditions[agencies][]': agencySlug,
        });

        // The FR API filters on short type codes (RULE / PRORULE), not the
        // human-readable labels — 'Rule' matches zero documents.
        const docType = opts?.type ?? 'RULE';
        params.set('conditions[type][]', docType);
        if (!opts?.type) {
          params.append('conditions[type][]', 'PRORULE');
        }

        if (opts?.dateFrom) {
          params.set('conditions[publication_date][gte]', opts.dateFrom);
        }
        if (opts?.dateTo) {
          params.set('conditions[publication_date][lte]', opts.dateTo);
        }

        for (const field of FR_FIELDS) {
          params.append('fields[]', field);
        }

        const url = `${FR_API}/documents.json?${params.toString()}`;
        logger.info('[FRService] Searching agency rules', { agencySlug, type: docType });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          throw new Error(`Federal Register API returned ${response.status}`);
        }

        const data: FederalRegisterAPIResponse = await response.json();
        return data.results ?? [];
      },
      3600 // 1 hour
    );
  } catch (error) {
    logger.error('[FRService] Failed to search agency rules', error as Error, { agencySlug });
    return [];
  }
}

/**
 * Find Federal Register documents by RIN (Regulation Identifier Number).
 * RINs are the strongest link between legislation and regulation.
 */
export async function getDocumentsByRIN(rin: string): Promise<FederalRegisterAPIDocument[]> {
  const cacheKey = `fr-rin:${rin}`;

  try {
    return await cachedFetch(
      cacheKey,
      async () => {
        const params = new URLSearchParams({
          per_page: '20',
          'conditions[regulation_id_number]': rin,
        });

        for (const field of FR_FIELDS) {
          params.append('fields[]', field);
        }

        const url = `${FR_API}/documents.json?${params.toString()}`;
        logger.info('[FRService] Searching by RIN', { rin });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          throw new Error(`Federal Register API returned ${response.status}`);
        }

        const data: FederalRegisterAPIResponse = await response.json();
        return data.results ?? [];
      },
      86_400 // 24 hours — RIN linkages are stable
    );
  } catch (error) {
    logger.error('[FRService] Failed to search by RIN', error as Error, { rin });
    return [];
  }
}

/**
 * The critical join: find regulations related to a bill.
 *
 * Three methods tried in order:
 * 1. RIN-based (0.95 confidence) — if bill has regulation_id_numbers
 * 2. Committee-agency (0.80 confidence) — committees → agencies → FR docs filtered by policy keywords
 * 3. Text similarity is handled externally by the regulation analyzer
 *
 * @param billTitle - Title of the bill
 * @param policyArea - Congress.gov policyArea string
 * @param committees - Committee names the bill was referred to
 * @param rin - Regulation Identifier Number if known
 */
export async function findRegulationsForBill(
  billTitle: string,
  policyArea: string,
  committees: string[],
  rin?: string
): Promise<RegulationNode[]> {
  const results: RegulationNode[] = [];
  const seenDockets = new Set<string>();

  // Method 1: RIN-based (0.95 confidence)
  if (rin) {
    try {
      const rinDocs = await getDocumentsByRIN(rin);
      for (const doc of rinDocs) {
        const docType =
          doc.type === 'Proposed Rule' ? ('proposed_rule' as const) : ('final_rule' as const);
        const agency = doc.agencies?.[0];
        if (!agency) continue;

        const docketId = `${agency.slug}-${doc.regulation_id_numbers?.[0] ?? doc.document_number}`;
        if (seenDockets.has(docketId)) continue;
        seenDockets.add(docketId);

        results.push({
          docketId,
          agency: agency.name,
          agencySlug: agency.slug,
          title: doc.title,
          type: docType,
          status: inferStatusFromDoc(doc),
          publicationDate: doc.publication_date,
          rin: doc.regulation_id_numbers?.[0] ?? null,
          commentCount: 0, // Would need Regulations.gov query to get this
          linkMethod: 'rin',
          linkConfidence: 0.95,
        });
      }
    } catch {
      logger.warn('[FRService] RIN search failed, continuing with other methods', { rin });
    }
  }

  // Method 2: Committee-agency (0.80 confidence)
  const policyMapping = getPolicyAreaMapping(policyArea);
  const keywords = policyMapping?.federalRegisterKeywords ?? [];

  // Collect unique agency slugs from committees
  const agencySet = new Map<string, AgencyInfo>();
  for (const committeeName of committees) {
    const agencies = getAgenciesForCommittee(committeeName);
    for (const agency of agencies) {
      agencySet.set(agency.slug, agency);
    }
  }

  // Also include agencies from policy area mapping
  if (policyMapping) {
    for (const slug of policyMapping.agencySlugs) {
      if (!agencySet.has(slug)) {
        agencySet.set(slug, { name: slug, slug, abbreviation: '', keywords: [] });
      }
    }
  }

  // Search each agency for rules matching policy keywords
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const dateFrom = oneYearAgo.toISOString().slice(0, 10);

  for (const [slug] of agencySet) {
    try {
      const agencyDocs = await searchAgencyRules(slug, { dateFrom });

      for (const doc of agencyDocs) {
        const docType =
          doc.type === 'Proposed Rule' ? ('proposed_rule' as const) : ('final_rule' as const);
        const agency = doc.agencies?.[0];
        if (!agency) continue;

        // Check if title or abstract matches policy keywords
        const titleLower = doc.title.toLowerCase();
        const abstractLower = (doc.abstract ?? '').toLowerCase();
        const textToSearch = `${titleLower} ${abstractLower}`;

        const matchesKeyword = keywords.some(kw => textToSearch.includes(kw.toLowerCase()));
        if (!matchesKeyword && keywords.length > 0) continue;

        const docketId = `${agency.slug}-${doc.regulation_id_numbers?.[0] ?? doc.document_number}`;
        if (seenDockets.has(docketId)) continue;
        seenDockets.add(docketId);

        results.push({
          docketId,
          agency: agency.name,
          agencySlug: agency.slug,
          title: doc.title,
          type: docType,
          status: inferStatusFromDoc(doc),
          publicationDate: doc.publication_date,
          rin: doc.regulation_id_numbers?.[0] ?? null,
          commentCount: 0,
          linkMethod: 'committee_agency',
          linkConfidence: 0.8,
        });
      }
    } catch {
      logger.warn('[FRService] Agency rule search failed', { agencySlug: slug });
    }
  }

  return results;
}

/**
 * Infer rule status from Federal Register document metadata.
 */
function inferStatusFromDoc(doc: FederalRegisterAPIDocument): RegulationNode['status'] {
  if (doc.effective_on) {
    const effectiveDate = new Date(doc.effective_on);
    if (effectiveDate <= new Date()) return 'effective';
    return 'final';
  }

  if (doc.type === 'Rule') return 'final';

  if (doc.comments_close_on) {
    const closeDate = new Date(doc.comments_close_on);
    if (closeDate < new Date()) return 'comment_closed';
    return 'comment_period';
  }

  if (doc.type === 'Proposed Rule') return 'proposed';

  return 'proposed';
}

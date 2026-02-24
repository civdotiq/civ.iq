/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Committee → Regulations API — Gap 2 Join Endpoint
 *
 * Given a committee code (e.g. HSIF, SSEG), finds related Federal Register
 * documents by mapping the committee to its oversight agencies and topics,
 * then querying the Federal Register API for each agency.
 *
 * Groups results into:
 * - Active rulemakings (proposed rules)
 * - Open comment periods (sorted by urgency — days until close)
 * - Recent final rules
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import {
  ALL_COMMITTEE_MAPPINGS,
  type CommitteeMapping,
} from '@/lib/connections/committee-agency-map';
import type {
  FederalRegisterItem,
  FederalRegisterAPIResponse,
  FederalRegisterAPIDocument,
} from '@/types/federal-register';
import type { JoinMetadata } from '@/types/joins';

export const revalidate = 10800; // 3 hours

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';

const FIELDS = [
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
];

interface CommitteeRegulationsResponse {
  committeeCode: string;
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  oversightAgencies: Array<{ name: string; slug: string; abbreviation: string }>;
  activeRulemakings: FederalRegisterItem[];
  openCommentPeriods: FederalRegisterItem[];
  recentFinalRules: FederalRegisterItem[];
  summary: {
    totalDocuments: number;
    openComments: number;
    urgentComments: number; // closing within 7 days
  };
  metadata: JoinMetadata;
}

function transformDocument(doc: FederalRegisterAPIDocument): FederalRegisterItem {
  const primaryAgency = doc.agencies?.[0];

  let type: FederalRegisterItem['type'] = 'notice';
  if (doc.type === 'Presidential Document') {
    type = 'executive_order';
  } else if (doc.type === 'Proposed Rule') {
    type = 'proposed_rule';
  } else if (doc.type === 'Rule') {
    type = 'final_rule';
  }

  let daysUntilClose: number | undefined;
  let isOpenForComment = false;
  if (doc.comments_close_on) {
    const closeDate = new Date(doc.comments_close_on);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = closeDate.getTime() - today.getTime();
    daysUntilClose = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    isOpenForComment = daysUntilClose > 0;
  }

  return {
    id: doc.document_number,
    title: doc.title,
    summary: doc.abstract,
    type,
    publishedDate: doc.publication_date,
    agency: primaryAgency?.name ?? 'Unknown Agency',
    agencySlug: primaryAgency?.slug ?? 'unknown',
    url: doc.html_url,
    pdfUrl: doc.pdf_url,
    commentUrl: doc.comment_url ?? undefined,
    commentsCloseOn: doc.comments_close_on ?? undefined,
    daysUntilClose,
    isOpenForComment,
    effectiveDate: doc.effective_on ?? undefined,
  };
}

async function fetchFedRegByAgency(
  agencySlug: string,
  docType: 'PRORULE' | 'RULE',
  perPage: number
): Promise<FederalRegisterItem[]> {
  const params = new URLSearchParams();
  params.set('per_page', perPage.toString());
  params.set('order', 'newest');
  params.set('conditions[agencies][]', agencySlug);
  params.set('conditions[type]', docType);
  FIELDS.forEach(f => params.append('fields[]', f));

  try {
    const response = await fetch(`${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) return [];

    const data: FederalRegisterAPIResponse = await response.json();
    return data.results.map(transformDocument);
  } catch {
    return [];
  }
}

async function fetchOpenComments(
  agencySlug: string,
  perPage: number
): Promise<FederalRegisterItem[]> {
  const today = new Date().toISOString().split('T')[0] ?? '';
  const params = new URLSearchParams();
  params.set('per_page', perPage.toString());
  params.set('order', 'newest');
  params.set('conditions[agencies][]', agencySlug);
  params.set('conditions[comment_date][gte]', today);
  FIELDS.forEach(f => params.append('fields[]', f));

  try {
    const response = await fetch(`${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) return [];

    const data: FederalRegisterAPIResponse = await response.json();
    return data.results.map(transformDocument);
  } catch {
    return [];
  }
}

function findCommitteeMapping(committeeId: string): CommitteeMapping | null {
  const upper = committeeId.toUpperCase();
  return ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === upper) ?? null;
}

function filterByTopics(items: FederalRegisterItem[], topics: string[]): FederalRegisterItem[] {
  if (topics.length === 0) return items;
  const lowerTopics = topics.map(t => t.toLowerCase());
  return items.filter(item => {
    const titleLower = item.title.toLowerCase();
    const summaryLower = (item.summary ?? '').toLowerCase();
    return lowerTopics.some(t => titleLower.includes(t) || summaryLower.includes(t));
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<CommitteeRegulationsResponse | { error: string }>> {
  const { committeeId } = await params;

  if (!committeeId) {
    return NextResponse.json({ error: 'Committee ID is required' }, { status: 400 });
  }

  try {
    logger.info('Committee regulations join request', { committeeId });

    const mapping = findCommitteeMapping(committeeId);
    if (!mapping) {
      return NextResponse.json(
        { error: `Committee ${committeeId} not found in agency mapping` },
        { status: 404 }
      );
    }

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 30);

    const cacheKey = `join-committee-regulations:${committeeId}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        const agencySlugs = mapping.agencies.map(a => a.slug);
        const uniqueSlugs = [...new Set(agencySlugs)];

        // Fetch proposed rules, final rules, and open comments in parallel per agency
        const proposedPromises = uniqueSlugs.map(s => fetchFedRegByAgency(s, 'PRORULE', limit));
        const finalPromises = uniqueSlugs.map(s => fetchFedRegByAgency(s, 'RULE', limit));
        const commentPromises = uniqueSlugs.map(s => fetchOpenComments(s, limit));

        const [proposedResults, finalResults, commentResults] = await Promise.all([
          Promise.all(proposedPromises),
          Promise.all(finalPromises),
          Promise.all(commentPromises),
        ]);

        // Flatten and deduplicate by document ID
        const dedup = (items: FederalRegisterItem[][]): FederalRegisterItem[] => {
          const seen = new Set<string>();
          const result: FederalRegisterItem[] = [];
          for (const batch of items) {
            for (const item of batch) {
              if (!seen.has(item.id)) {
                seen.add(item.id);
                result.push(item);
              }
            }
          }
          return result;
        };

        let allProposed = dedup(proposedResults);
        let allFinal = dedup(finalResults);
        const allComments = dedup(commentResults);

        // Filter by topic relevance for better signal
        allProposed = filterByTopics(allProposed, mapping.topics);
        allFinal = filterByTopics(allFinal, mapping.topics);
        // Don't topic-filter open comments — they're inherently relevant by agency

        // Sort open comments by urgency (days until close, ascending)
        allComments.sort((a, b) => (a.daysUntilClose ?? 999) - (b.daysUntilClose ?? 999));

        const activeRulemakings = allProposed.slice(0, limit);
        const openCommentPeriods = allComments.slice(0, limit);
        const recentFinalRules = allFinal.slice(0, limit);

        const urgentComments = openCommentPeriods.filter(
          c => c.daysUntilClose !== undefined && c.daysUntilClose <= 7
        ).length;

        const totalDocuments =
          activeRulemakings.length + openCommentPeriods.length + recentFinalRules.length;

        const response: CommitteeRegulationsResponse = {
          committeeCode: mapping.committeeCode,
          committeeName: mapping.committeeName,
          chamber: mapping.chamber,
          oversightAgencies: mapping.agencies.map(a => ({
            name: a.name,
            slug: a.slug,
            abbreviation: a.abbreviation,
          })),
          activeRulemakings,
          openCommentPeriods,
          recentFinalRules,
          summary: {
            totalDocuments,
            openComments: openCommentPeriods.length,
            urgentComments,
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources: ['federalregister.gov'],
            joinType: 'committee-regulations',
            dataQuality: totalDocuments > 0 ? 'complete' : 'partial',
          },
        };

        return response;
      },
      3 * 60 * 60 * 1000 // 3 hour cache
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch committee regulations' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('Committee regulations join error', error as Error, { committeeId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

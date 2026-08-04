/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  CommentPeriodsResponse,
  FederalRegisterItem,
  FederalRegisterAPIResponse,
  FederalRegisterAPIDocument,
} from '@/types/federal-register';

export const dynamic = 'force-dynamic';

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';

/**
 * Transform API document to comment period format
 */
function transformProposedRule(doc: FederalRegisterAPIDocument): FederalRegisterItem {
  const primaryAgency = doc.agencies?.[0];

  // Calculate days until comment period closes
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
    type: 'proposed_rule',
    publishedDate: doc.publication_date,
    agency: primaryAgency?.name ?? 'Unknown Agency',
    agencySlug: primaryAgency?.slug ?? 'unknown',
    url: doc.html_url,
    pdfUrl: doc.pdf_url,
    commentUrl: doc.comment_url ?? undefined,
    commentsCloseOn: doc.comments_close_on ?? undefined,
    daysUntilClose,
    isOpenForComment,
  };
}

/**
 * Fetch proposed rules with open comment periods from Federal Register API
 */
async function fetchCommentPeriods(): Promise<{
  openComments: FederalRegisterItem[];
  closingSoon: FederalRegisterItem[];
  recentlyClosed: FederalRegisterItem[];
  stats: {
    /** Federal Register's own match count, not the size of the page fetched. */
    totalOpen: number;
    closingThisWeek: number;
    avgDaysRemaining: number;
    /** Rules the average was taken over; the page is capped, the counts are not. */
    avgDaysRemainingSampleSize: number;
    /** False when a count above fell back to filtering the capped page. */
    countsAreExact: boolean;
  };
}> {
  const cacheKey = 'federal-register-comment-periods';

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        // Get today and date ranges
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0] ?? '';
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0] ?? '';

        // Fields to fetch
        const fields = [
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
        ];

        // Fetch open comment periods (comments close in the future)
        const openParams = new URLSearchParams();
        openParams.set('conditions[type]', 'PRORULE');
        openParams.set('conditions[comment_date][gte]', todayStr);
        openParams.set('per_page', '100');
        // 'oldest', not 'newest'. Among rules still open, the oldest-published
        // are the ones closing soonest, and ordering by newest filled the page
        // with rules that had a month left: measured against the live API, a
        // newest-ordered page of 100 contained zero rules closing within seven
        // days, so the "closing this week" figure filtered from it was
        // structurally zero. Note the API silently ignores an unsupported
        // order value rather than erroring, so 'comment_date' reads as newest.
        openParams.set('order', 'oldest');
        fields.forEach(f => openParams.append('fields[]', f));

        const openUrl = `${FEDERAL_REGISTER_API}/documents.json?${openParams.toString()}`;
        logger.info('Fetching open comment periods', { url: openUrl });

        const openResponse = await fetch(openUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        let openComments: FederalRegisterItem[] = [];
        // Federal Register reports the count for the whole query; the page is
        // capped at 100 and there are usually more than twice that open.
        let totalOpenUpstream: number | null = null;
        if (openResponse.ok) {
          const openData: FederalRegisterAPIResponse = await openResponse.json();
          totalOpenUpstream = typeof openData.count === 'number' ? openData.count : null;
          openComments = openData.results
            .map(transformProposedRule)
            .filter(item => item.isOpenForComment);
        }

        // Rules closing within a week, counted upstream rather than by
        // filtering the capped page — this is the number a citizen acts on.
        const weekAheadStr = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);
        const soonParams = new URLSearchParams();
        soonParams.set('conditions[type]', 'PRORULE');
        soonParams.set('conditions[comment_date][gte]', todayStr);
        soonParams.set('conditions[comment_date][lte]', weekAheadStr);
        soonParams.set('per_page', '1');
        soonParams.append('fields[]', 'document_number');

        let closingThisWeekUpstream: number | null = null;
        try {
          const soonResponse = await fetch(
            `${FEDERAL_REGISTER_API}/documents.json?${soonParams.toString()}`,
            {
              headers: {
                Accept: 'application/json',
                'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
              },
            }
          );
          if (soonResponse.ok) {
            const soonData: FederalRegisterAPIResponse = await soonResponse.json();
            closingThisWeekUpstream = typeof soonData.count === 'number' ? soonData.count : null;
          }
        } catch {
          // Leave null; the page falls back to the capped filter and says so.
        }

        // Fetch recently closed (last 7 days)
        const closedParams = new URLSearchParams();
        closedParams.set('conditions[type]', 'PRORULE');
        closedParams.set('conditions[comment_date][gte]', weekAgoStr);
        closedParams.set('conditions[comment_date][lte]', todayStr);
        closedParams.set('per_page', '50');
        closedParams.set('order', 'newest');
        fields.forEach(f => closedParams.append('fields[]', f));

        const closedUrl = `${FEDERAL_REGISTER_API}/documents.json?${closedParams.toString()}`;

        const closedResponse = await fetch(closedUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        let recentlyClosed: FederalRegisterItem[] = [];
        if (closedResponse.ok) {
          const closedData: FederalRegisterAPIResponse = await closedResponse.json();
          recentlyClosed = closedData.results
            .map(transformProposedRule)
            .filter(item => !item.isOpenForComment);
        }

        // Calculate statistics
        const closingSoon = openComments.filter(
          item => item.daysUntilClose !== undefined && item.daysUntilClose <= 7
        );

        const totalDaysRemaining = openComments.reduce(
          (sum, item) => sum + (item.daysUntilClose ?? 0),
          0
        );
        const avgDaysRemaining =
          openComments.length > 0 ? Math.round(totalDaysRemaining / openComments.length) : 0;

        // Sort open comments by closing date (soonest first)
        openComments.sort((a, b) => {
          const daysA = a.daysUntilClose ?? 999;
          const daysB = b.daysUntilClose ?? 999;
          return daysA - daysB;
        });

        return {
          openComments,
          closingSoon,
          recentlyClosed,
          stats: {
            totalOpen: totalOpenUpstream ?? openComments.length,
            closingThisWeek: closingThisWeekUpstream ?? closingSoon.length,
            // Averaged over the soonest-closing rules retrieved, so it skews
            // low against all open rules. Its denominator travels with it.
            avgDaysRemaining,
            avgDaysRemainingSampleSize: openComments.length,
            /** False when a stat above fell back to counting the capped page. */
            countsAreExact: totalOpenUpstream !== null && closingThisWeekUpstream !== null,
          },
        };
      } catch (error) {
        logger.error('Error fetching comment periods', error as Error);
        return {
          openComments: [],
          closingSoon: [],
          recentlyClosed: [],
          stats: {
            totalOpen: 0,
            closingThisWeek: 0,
            avgDaysRemaining: 0,
            avgDaysRemainingSampleSize: 0,
            countsAreExact: false,
          },
        };
      }
    },
    60 * 60 // 1 hour cache
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<CommentPeriodsResponse>> {
  try {
    const { searchParams } = request.nextUrl;
    const agency = searchParams.get('agency');

    logger.info('Comment Periods API request', { agency });

    const { openComments, closingSoon, recentlyClosed, stats } = await fetchCommentPeriods();

    // Filter by agency if specified
    const filterByAgency = (items: FederalRegisterItem[]) =>
      agency
        ? items.filter(
            item =>
              item.agencySlug === agency || item.agency.toLowerCase().includes(agency.toLowerCase())
          )
        : items;

    return NextResponse.json(
      {
        success: true,
        openComments: filterByAgency(openComments),
        closingSoon: filterByAgency(closingSoon),
        recentlyClosed: filterByAgency(recentlyClosed),
        // An agency filter is applied to the retrieved page, not to the query,
        // so its counts describe those rows rather than the agency's full
        // docket and are flagged inexact. The unfiltered counts above come
        // from Federal Register and stay exact.
        stats: agency
          ? {
              totalOpen: filterByAgency(openComments).length,
              closingThisWeek: filterByAgency(closingSoon).length,
              avgDaysRemaining: stats.avgDaysRemaining,
              avgDaysRemainingSampleSize: stats.avgDaysRemainingSampleSize,
              countsAreExact: false,
            }
          : stats,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'federalregister.gov',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Comment Periods API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        openComments: [],
        closingSoon: [],
        recentlyClosed: [],
        stats: { totalOpen: 0, closingThisWeek: 0, avgDaysRemaining: 0 },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'federalregister.gov',
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

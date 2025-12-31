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

// ISR: Revalidate every 1 hour (comment periods change daily)
export const revalidate = 3600;
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
  stats: { totalOpen: number; closingThisWeek: number; avgDaysRemaining: number };
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
        openParams.set('order', 'newest');
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
        if (openResponse.ok) {
          const openData: FederalRegisterAPIResponse = await openResponse.json();
          openComments = openData.results
            .map(transformProposedRule)
            .filter(item => item.isOpenForComment);
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
            totalOpen: openComments.length,
            closingThisWeek: closingSoon.length,
            avgDaysRemaining,
          },
        };
      } catch (error) {
        logger.error('Error fetching comment periods', error as Error);
        return {
          openComments: [],
          closingSoon: [],
          recentlyClosed: [],
          stats: { totalOpen: 0, closingThisWeek: 0, avgDaysRemaining: 0 },
        };
      }
    },
    60 * 60 * 1000 // 1 hour cache
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
        stats: agency
          ? {
              totalOpen: filterByAgency(openComments).length,
              closingThisWeek: filterByAgency(closingSoon).length,
              avgDaysRemaining: stats.avgDaysRemaining,
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

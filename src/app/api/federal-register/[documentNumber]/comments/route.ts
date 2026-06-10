/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { regulationsGovService } from '@/lib/data-sources/regulations-gov-service';
import logger from '@/lib/logging/simple-logger';
import type { RegCommentsResponse } from '@/types/regulations-gov';

export const dynamic = 'force-dynamic'; // 1 hour

/**
 * Get public comments from Regulations.gov for a Federal Register document.
 *
 * Maps a Federal Register document number to its Regulations.gov docket
 * and returns public comment data and statistics.
 *
 * @example
 * GET /api/federal-register/2025-12345/comments
 * GET /api/federal-register/2025-12345/comments?page=2&pageSize=25
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentNumber: string }> }
) {
  const { documentNumber } = await params;
  const { searchParams } = request.nextUrl;
  // NaN page/pageSize would reach Regulations.gov pagination — fall back to defaults
  const page = Math.max(parseInt(searchParams.get('page') ?? '1', 10) || 1, 1);
  const pageSize = Math.min(
    Math.max(parseInt(searchParams.get('pageSize') ?? '25', 10) || 25, 1),
    250
  );

  logger.info('Federal Register comments request', { documentNumber, page, pageSize });

  try {
    if (!documentNumber) {
      return NextResponse.json({ error: 'Document number is required' }, { status: 400 });
    }

    const apiKey = process.env.DATA_GOV_API_KEY;
    if (!apiKey) {
      const response: RegCommentsResponse = {
        success: true,
        comments: [],
        stats: null,
        document: null,
        pagination: { total: 0, page: 1, pageSize, totalPages: 0 },
        metadata: {
          dataSource: 'regulations.gov',
          generatedAt: new Date().toISOString(),
        },
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Search for the document on Regulations.gov using the FR document number
    const documents = await regulationsGovService.searchDocuments({
      searchTerm: documentNumber,
      pageSize: 5,
    });

    // Find the matching document
    const matchedDoc = documents[0];
    if (!matchedDoc) {
      const response: RegCommentsResponse = {
        success: true,
        comments: [],
        stats: null,
        document: null,
        pagination: { total: 0, page: 1, pageSize, totalPages: 0 },
        metadata: {
          dataSource: 'regulations.gov',
          generatedAt: new Date().toISOString(),
        },
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Fetch comments and stats in parallel
    const [commentsResult, stats] = await Promise.all([
      regulationsGovService.getComments(matchedDoc.docketId, { pageSize, pageNumber: page }),
      regulationsGovService.getCommentStats(matchedDoc.docketId),
    ]);

    const response: RegCommentsResponse = {
      success: true,
      comments: commentsResult.comments,
      stats,
      document: {
        documentId: matchedDoc.documentId,
        title: matchedDoc.title,
        docketId: matchedDoc.docketId,
        agencyId: matchedDoc.agencyId,
      },
      pagination: {
        total: commentsResult.total,
        page,
        pageSize,
        totalPages: commentsResult.totalPages,
      },
      metadata: {
        dataSource: 'regulations.gov',
        generatedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Federal Register comments request failed', error as Error, { documentNumber });

    return NextResponse.json(
      {
        success: false,
        comments: [],
        stats: null,
        document: null,
        pagination: { total: 0, page: 1, pageSize, totalPages: 0 },
        metadata: {
          dataSource: 'regulations.gov',
          generatedAt: new Date().toISOString(),
        },
        error: errorMessage,
      } satisfies RegCommentsResponse,
      { status: 500 }
    );
  }
}

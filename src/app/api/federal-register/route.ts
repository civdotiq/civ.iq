/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FederalRegisterResponse,
  FederalRegisterItem,
  FederalRegisterAPIResponse,
  FederalRegisterAPIDocument,
} from '@/types/federal-register';

// ISR: Revalidate every 1 hour (Federal Register updates daily)
export const revalidate = 3600;
export const dynamic = 'force-dynamic';

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';

// Document type mapping
const DOCUMENT_TYPES = {
  executive_order: 'presidential_document',
  proposed_rule: 'PRORULE',
  final_rule: 'RULE',
  notice: 'NOTICE',
} as const;

/**
 * Transform API document to simplified format
 */
function transformDocument(doc: FederalRegisterAPIDocument): FederalRegisterItem {
  const primaryAgency = doc.agencies?.[0];

  // Determine document type
  let type: FederalRegisterItem['type'] = 'notice';
  if (doc.type === 'Presidential Document') {
    type = 'executive_order';
  } else if (doc.type === 'Proposed Rule') {
    type = 'proposed_rule';
  } else if (doc.type === 'Rule') {
    type = 'final_rule';
  }

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
    type,
    publishedDate: doc.publication_date,
    agency: primaryAgency?.name ?? 'Unknown Agency',
    agencySlug: primaryAgency?.slug ?? 'unknown',
    url: doc.html_url,
    pdfUrl: doc.pdf_url,
    // Comment period fields
    commentUrl: doc.comment_url ?? undefined,
    commentsCloseOn: doc.comments_close_on ?? undefined,
    daysUntilClose,
    isOpenForComment,
    // Executive order fields
    executiveOrderNumber: doc.executive_order_number ?? undefined,
    // Rule fields
    effectiveDate: doc.effective_on ?? undefined,
  };
}

/**
 * Fetch documents from Federal Register API
 */
async function fetchDocuments(
  type: keyof typeof DOCUMENT_TYPES | 'all',
  options: {
    page?: number;
    perPage?: number;
    agency?: string;
    openForComment?: boolean;
  } = {}
): Promise<{ items: FederalRegisterItem[]; total: number; totalPages: number }> {
  const { page = 1, perPage = 20, agency, openForComment } = options;

  const cacheKey = `federal-register-${type}-${page}-${perPage}-${agency ?? 'all'}-${openForComment ?? 'all'}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        // Build query parameters
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('per_page', perPage.toString());
        params.set('order', 'newest');

        // Add fields we need
        const fields = [
          'document_number',
          'title',
          'abstract',
          'type',
          'subtype',
          'publication_date',
          'html_url',
          'pdf_url',
          'agencies',
          'comment_url',
          'comments_close_on',
          'effective_on',
          'executive_order_number',
          'signing_date',
          'president',
        ];
        fields.forEach(f => params.append('fields[]', f));

        // Add type filter
        if (type === 'executive_order') {
          params.set('conditions[presidential_document_type]', 'executive_order');
        } else if (type !== 'all') {
          params.set('conditions[type]', DOCUMENT_TYPES[type]);
        }

        // Add agency filter
        if (agency) {
          params.set('conditions[agencies][]', agency);
        }

        // Add comment period filter
        if (openForComment) {
          const today = new Date().toISOString().split('T')[0] ?? '';
          params.set('conditions[comment_date][gte]', today);
        }

        const url = `${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`;

        logger.info('Fetching Federal Register documents', { type, page, url });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        if (!response.ok) {
          logger.error('Federal Register API error', new Error(`HTTP ${response.status}`));
          return { items: [], total: 0, totalPages: 0 };
        }

        const data: FederalRegisterAPIResponse = await response.json();
        const items = data.results.map(transformDocument);

        return {
          items,
          total: data.count,
          totalPages: data.total_pages,
        };
      } catch (error) {
        logger.error('Error fetching Federal Register', error as Error);
        return { items: [], total: 0, totalPages: 0 };
      }
    },
    60 * 60 * 1000 // 1 hour cache
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<FederalRegisterResponse>> {
  try {
    const { searchParams } = request.nextUrl;

    // Parse query parameters
    const type = (searchParams.get('type') ?? 'all') as keyof typeof DOCUMENT_TYPES | 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get('per_page') ?? '20')));
    const agency = searchParams.get('agency') ?? undefined;
    const openForComment = searchParams.get('open_for_comment') === 'true';

    logger.info('Federal Register API request', {
      type,
      page,
      perPage,
      agency,
      openForComment,
    });

    const { items, total, totalPages } = await fetchDocuments(type, {
      page,
      perPage,
      agency,
      openForComment,
    });

    const response: FederalRegisterResponse = {
      success: true,
      items,
      pagination: {
        total,
        page,
        perPage,
        totalPages,
        hasMore: page < totalPages,
      },
      filters: {
        type,
        agency,
        openForComment: openForComment || undefined,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'federalregister.gov',
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Federal Register API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        items: [],
        pagination: {
          total: 0,
          page: 1,
          perPage: 20,
          totalPages: 0,
          hasMore: false,
        },
        filters: { type: 'all' },
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

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  ExecutiveOrdersResponse,
  FederalRegisterItem,
  FederalRegisterAPIResponse,
  FederalRegisterAPIDocument,
} from '@/types/federal-register';

// ISR: Revalidate every 6 hours (EOs don't change often)
export const revalidate = 21600;
export const dynamic = 'force-dynamic';

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';

/**
 * Transform API document to simplified executive order format
 */
function transformExecutiveOrder(doc: FederalRegisterAPIDocument): FederalRegisterItem {
  const primaryAgency = doc.agencies?.[0];

  return {
    id: doc.document_number,
    title: doc.title,
    summary: doc.abstract,
    type: 'executive_order',
    publishedDate: doc.publication_date,
    agency: primaryAgency?.name ?? 'Executive Office of the President',
    agencySlug: primaryAgency?.slug ?? 'executive-office-of-the-president',
    url: doc.html_url,
    pdfUrl: doc.pdf_url,
    executiveOrderNumber: doc.executive_order_number ?? undefined,
  };
}

/**
 * Fetch executive orders from Federal Register API
 */
async function fetchExecutiveOrders(
  page: number,
  perPage: number
): Promise<{ orders: FederalRegisterItem[]; total: number }> {
  const cacheKey = `federal-register-eo-${page}-${perPage}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        const params = new URLSearchParams();
        params.set('conditions[presidential_document_type]', 'executive_order');
        params.set('page', page.toString());
        params.set('per_page', perPage.toString());
        params.set('order', 'newest');

        // Add fields we need
        const fields = [
          'document_number',
          'title',
          'abstract',
          'type',
          'publication_date',
          'html_url',
          'pdf_url',
          'agencies',
          'executive_order_number',
          'signing_date',
          'president',
        ];
        fields.forEach(f => params.append('fields[]', f));

        const url = `${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`;

        logger.info('Fetching Executive Orders', { page, url });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        if (!response.ok) {
          logger.error('Federal Register API error', new Error(`HTTP ${response.status}`));
          return { orders: [], total: 0 };
        }

        const data: FederalRegisterAPIResponse = await response.json();
        const orders = data.results.map(transformExecutiveOrder);

        return { orders, total: data.count };
      } catch (error) {
        logger.error('Error fetching Executive Orders', error as Error);
        return { orders: [], total: 0 };
      }
    },
    6 * 60 * 60 * 1000 // 6 hour cache
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<ExecutiveOrdersResponse>> {
  try {
    const { searchParams } = request.nextUrl;

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const perPage = Math.min(50, Math.max(1, parseInt(searchParams.get('per_page') ?? '20')));

    logger.info('Executive Orders API request', { page, perPage });

    const { orders, total } = await fetchExecutiveOrders(page, perPage);

    return NextResponse.json(
      {
        success: true,
        orders,
        pagination: {
          total,
          page,
          perPage,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'federalregister.gov',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Executive Orders API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        orders: [],
        pagination: { total: 0, page: 1, perPage: 20 },
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

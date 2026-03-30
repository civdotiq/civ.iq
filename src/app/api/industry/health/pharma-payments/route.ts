/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { openPaymentsService } from '@/lib/data-sources/open-payments-service';
import logger from '@/lib/logging/simple-logger';

export const revalidate = 86400; // 24 hours

/**
 * Pharma payments data from CMS Open Payments.
 *
 * Returns aggregated payment data by company and specialty,
 * optionally filtered by state.
 *
 * @example GET /api/industry/health/pharma-payments
 * @example GET /api/industry/health/pharma-payments?state=CA
 */
export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get('state');

  try {
    // If state provided, get aggregates + recent payments
    // Otherwise just get top-level recent payments
    const [aggregates, recentPayments] = await Promise.all([
      state
        ? openPaymentsService.getPaymentAggregates(state.toUpperCase()).catch(e => {
            logger.error('Open Payments aggregates failed', e as Error, { state });
            return null;
          })
        : Promise.resolve(null),
      openPaymentsService
        .searchPayments({
          state: state?.toUpperCase(),
          limit: 25,
        })
        .catch(e => {
          logger.error('Open Payments search failed', e as Error, { state });
          return [];
        }),
    ]);

    if (!aggregates && recentPayments.length === 0) {
      return NextResponse.json(
        { error: 'Pharma payments data not currently available.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        state: state?.toUpperCase() ?? null,
        aggregates,
        recentPayments,
        dataSource: 'CMS Open Payments',
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    logger.error('Pharma payments error', error as Error, { state });
    return NextResponse.json({ error: 'Failed to fetch pharma payments data' }, { status: 500 });
  }
}

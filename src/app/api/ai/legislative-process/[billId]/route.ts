/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Legislative Process Explainer API
 *
 * Returns AI-generated explanation of where a bill is in the legislative process.
 * Translates procedural status into plain English.
 */

import { NextRequest, NextResponse } from 'next/server';
import { LegislativeProcessExplainer } from '@/features/legislation/services/ai/legislative-process-explainer';
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';
import type { BillStatus } from '@/types/ai';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { billId } = await params;

    // Validate billId
    const billIdErrors = InputValidator.validateValue(billId, {
      required: true,
      minLength: 5,
      maxLength: 20,
      pattern: /^[A-Z0-9\-\.]+$/i,
    });

    if (billIdErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid bill ID', details: billIdErrors },
        { status: 400 }
      );
    }

    logger.info('Legislative process request received', {
      billId,
      operation: 'legislative_process_api',
    });

    // Fetch bill status from Congress.gov API
    const billStatus = await fetchBillStatus(billId);

    if (!billStatus) {
      return NextResponse.json(
        {
          error: 'Bill not found',
          message: 'Unable to retrieve bill status from Congress.gov',
        },
        { status: 404 }
      );
    }

    // Generate process explanation
    const explanation = await LegislativeProcessExplainer.explainProcess(
      billId,
      billStatus.title,
      billStatus.status
    );

    const responseTime = Date.now() - startTime;

    logger.info('Legislative process explanation completed', {
      billId,
      responseTime,
      confidence: explanation.confidence,
      source: explanation.source,
      operation: 'legislative_process_api',
    });

    return NextResponse.json(
      {
        explanation,
        metadata: {
          responseTime,
          billId,
          dataSources: {
            billStatus: 'Congress.gov API',
          },
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const resolvedParams = await params;

    logger.error('Legislative process explanation failed', error as Error, {
      billId: resolvedParams.billId,
      responseTime,
      operation: 'legislative_process_api',
    });

    return NextResponse.json(
      {
        error: 'Process explanation failed',
        message: 'Unable to generate legislative process explanation at this time',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch bill status from Congress.gov API
 */
async function fetchBillStatus(
  billId: string
): Promise<{ title: string; status: BillStatus } | null> {
  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      logger.warn('Congress API key not configured');
      return null;
    }

    // Parse billId format: congress-type-number (e.g., 118-hr-1234)
    const parts = billId.split('-');
    if (parts.length < 3) {
      return null;
    }

    const [congress, type, number] = parts;
    const url = `https://api.congress.gov/v3/bill/${congress}/${type}/${number}?api_key=${apiKey}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const bill = data.bill;

    if (!bill) {
      return null;
    }

    // Map Congress.gov action to stage
    const currentStage = mapActionToStage(bill.latestAction?.text || '');

    const committees: Array<{ name: string; chamber: string }> = [];
    if (bill.committees?.url) {
      const committeesResponse = await fetch(`${bill.committees.url}&api_key=${apiKey}`, {
        signal: AbortSignal.timeout(10000),
      });
      if (committeesResponse.ok) {
        const committeesData = await committeesResponse.json();
        for (const committee of committeesData.committees || []) {
          committees.push({
            name: committee.name || '',
            chamber: committee.chamber || '',
          });
        }
      }
    }

    return {
      title: bill.title || '',
      status: {
        latestAction: {
          actionDate: bill.latestAction?.actionDate || '',
          text: bill.latestAction?.text || '',
        },
        committees,
        currentStage,
      },
    };
  } catch (error) {
    logger.warn('Failed to fetch bill status', {
      billId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Map latest action text to a legislative stage
 */
function mapActionToStage(
  actionText: string
): 'introduced' | 'committee' | 'floor' | 'passed' | 'enacted' {
  const lower = actionText.toLowerCase();

  if (lower.includes('became public law') || lower.includes('signed by president')) {
    return 'enacted';
  }
  if (lower.includes('passed') || lower.includes('agreed to')) {
    return 'passed';
  }
  if (
    lower.includes('floor') ||
    lower.includes('placed on calendar') ||
    lower.includes('motion to proceed')
  ) {
    return 'floor';
  }
  if (lower.includes('referred to') || lower.includes('committee')) {
    return 'committee';
  }
  return 'introduced';
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vacancy Check Cron Job
 *
 * Detects congressional vacancies by comparing current member count
 * from Congress.gov against the expected 535 (435 House + 100 Senate).
 * Detection and logging only — does not auto-update profiles.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

const EXPECTED_MEMBERS = 535;

interface VacancyCheckResult {
  checked: boolean;
  memberCount: number;
  expected: number;
  vacancies: number;
  timestamp: string;
}

function authorize(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  return !!cronSecret && authHeader === `Bearer ${cronSecret}`;
}

async function checkVacancies(): Promise<VacancyCheckResult> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    throw new Error('CONGRESS_API_KEY not configured');
  }

  const url = new URL('https://api.congress.gov/v3/member');
  url.searchParams.set('currentMember', 'true');
  url.searchParams.set('limit', '1');
  url.searchParams.set('format', 'json');
  url.searchParams.set('api_key', apiKey);

  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Congress.gov API returned ${response.status}`);
  }

  const data = await response.json();
  const memberCount = data.pagination?.count ?? 0;
  const vacancies = EXPECTED_MEMBERS - memberCount;

  if (vacancies > 0) {
    logger.warn(
      `[VacancyCheck] ${vacancies} vacancy(ies) detected: ${memberCount}/${EXPECTED_MEMBERS} current members`
    );
  } else {
    logger.info(`[VacancyCheck] All seats filled: ${memberCount}/${EXPECTED_MEMBERS}`);
  }

  return {
    checked: true,
    memberCount,
    expected: EXPECTED_MEMBERS,
    vacancies: Math.max(0, vacancies),
    timestamp: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await checkVacancies();
    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      `[VacancyCheck] Failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      {
        error: 'Vacancy check failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    if (!authorize(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    const result = await checkVacancies();
    return NextResponse.json(result);
  } catch (error) {
    logger.error(
      `[VacancyCheck] Failed: ${error instanceof Error ? error.message : String(error)}`
    );
    return NextResponse.json(
      {
        error: 'Vacancy check failed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

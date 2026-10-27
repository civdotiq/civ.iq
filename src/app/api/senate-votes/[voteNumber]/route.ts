/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Former senate.gov XML proxy. senate.gov blocks requests from Vercel, so it
 * could never answer in production. Single votes now redirect to the public
 * v1 vote API, which serves the stored copy of senate.gov's roll-call XML.
 * Vote lists have no replacement here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ voteNumber: string }> }
) {
  const { voteNumber } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const congress = searchParams.get('congress') || String(getCurrentCongressNumber());
  const session = searchParams.get('session');

  if (searchParams.get('type') === 'list' || voteNumber === 'list') {
    return NextResponse.json(
      {
        error:
          'Senate vote lists are no longer served here. For a single Senate vote, use /api/v1/votes/senate-{congress}-{session}-{rollNumber}, e.g. /api/v1/votes/senate-119-2-253.',
        replacement: '/api/v1/votes/senate-{congress}-{session}-{rollNumber}',
      },
      { status: 410 }
    );
  }
  if (
    !/^\d+$/.test(voteNumber) ||
    !/^\d+$/.test(congress) ||
    (session && !/^[12]$/.test(session))
  ) {
    return NextResponse.json(
      { error: 'Invalid vote number, congress or session' },
      { status: 400 }
    );
  }

  const voteId = `senate-${congress}-${session ? `${session}-` : ''}${Number.parseInt(voteNumber, 10)}`;
  return NextResponse.redirect(new URL(`/api/v1/votes/${voteId}`, request.url), 308);
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * MR12 verification probe — confirms the Congress.gov JSON
 * `/v3/house-vote/{cong}/{sess}/{rollNum}/members` sub-resource is
 * reachable from Vercel cloud IPs.
 *
 * Context: clerk.house.gov XML is Akamai-blocked from Vercel (see MR10).
 * Before swapping batchVotingService away from XML to this JSON endpoint,
 * we need to confirm `/members` itself is not similarly filtered.
 *
 * Production-safe: returns only HTTP status, response time, member
 * count, and a single sample bioguideID. No secrets, no roster dump.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const DEFAULT_CONGRESS = getCurrentCongressNumber();
const DEFAULT_SESSION = 1;
const DEFAULT_ROLL = 1;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = request.nextUrl.searchParams;
  const congress = Number(params.get('congress') ?? DEFAULT_CONGRESS);
  const session = Number(params.get('session') ?? DEFAULT_SESSION);
  const rollNumber = Number(params.get('roll') ?? DEFAULT_ROLL);

  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: 'CONGRESS_API_KEY not set' }, { status: 500 });
  }

  const url = `https://api.congress.gov/v3/house-vote/${congress}/${session}/${rollNumber}/members?format=json`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ MR12 Probe (civdotiq.org)',
        'X-API-Key': apiKey,
      },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    const elapsedMs = Date.now() - start;

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        url,
        httpStatus: response.status,
        elapsedMs,
        runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
        region: process.env.VERCEL_REGION ?? null,
      });
    }

    const data = (await response.json()) as {
      houseRollCallVoteMemberVotes?: {
        results?: Array<{ bioguideID?: string; voteCast?: string }>;
        voteQuestion?: string;
        sourceDataURL?: string;
      };
    };

    const results = data.houseRollCallVoteMemberVotes?.results ?? [];
    const sample = results[0];

    return NextResponse.json({
      ok: true,
      url,
      httpStatus: response.status,
      elapsedMs,
      memberCount: results.length,
      sampleBioguideId: sample?.bioguideID ?? null,
      sampleVoteCast: sample?.voteCast ?? null,
      voteQuestion: data.houseRollCallVoteMemberVotes?.voteQuestion ?? null,
      sourceDataURL: data.houseRollCallVoteMemberVotes?.sourceDataURL ?? null,
      runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
      region: process.env.VERCEL_REGION ?? null,
    });
  } catch (error) {
    const elapsedMs = Date.now() - start;
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        ok: false,
        url,
        error: message,
        elapsedMs,
        runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
        region: process.env.VERCEL_REGION ?? null,
      },
      { status: 500 }
    );
  }
}

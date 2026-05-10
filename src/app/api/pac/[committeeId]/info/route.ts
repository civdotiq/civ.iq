/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Thin wrapper around fecApiService.getCommitteeInfo for the redesigned
 * PAC profile (PR 17). Returns committee metadata plus the classified
 * PAC type. 404 when the committee id resolves to no record.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { classifyPACType, fecApiService } from '@/lib/fec/fec-api-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 12;

const COMMITTEE_ID_RE = /^C\d{8}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
) {
  const { committeeId } = await params;
  const id = (committeeId ?? '').toUpperCase();

  if (!COMMITTEE_ID_RE.test(id)) {
    return NextResponse.json(
      { error: 'Invalid committee ID format. Expected C followed by 8 digits.' },
      { status: 400 }
    );
  }

  try {
    const info = await fecApiService.getCommitteeInfo(id);
    if (!info) {
      return NextResponse.json({ error: 'Committee not found' }, { status: 404 });
    }

    const pacType = classifyPACType(info.committee_type, info.designation);

    return NextResponse.json(
      {
        committeeId: info.committee_id,
        name: info.name,
        committeeType: info.committee_type,
        committeeTypeFull: info.committee_type_full,
        designation: info.designation,
        party: info.party,
        state: info.state,
        cycles: info.cycles ?? [],
        candidateIds: info.candidate_ids ?? [],
        sponsorCandidateIds: info.sponsor_candidate_ids ?? [],
        treasurerName: info.treasurer_name ?? null,
        pacType,
        dataAsOf: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    logger.error('[PAC API · info] failed', error as Error, { committeeId: id });
    return NextResponse.json({ error: 'Failed to fetch committee info' }, { status: 502 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Influence Committee Profile API
 *
 * Returns full committee profile with financial totals and resolved recipients.
 * @example GET /api/influence/C00797670?cycle=2026
 */

import { NextRequest, NextResponse } from 'next/server';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { resolveCommitteeRecipients } from '@/lib/fec/recipient-resolver';
import { ApiErrors } from '@/lib/api/error-responses';
import logger from '@/lib/logging/simple-logger';
import type { CommitteeProfile } from '@/types/influence';

// Dynamic: reads `cycle` query param. CDN caching handled via Cache-Control header below.
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse> {
  const { committeeId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const cycle = parseInt(searchParams.get('cycle') ?? '2026', 10);

  if (!committeeId || !/^C\d+$/.test(committeeId)) {
    return ApiErrors.validation('Invalid committee ID format. Expected format: C00000000');
  }

  try {
    logger.info(`[Influence Profile] Fetching profile for ${committeeId} cycle=${cycle}`);

    // Fetch committee info, totals, and resolved recipients in parallel
    const [committeeInfo, totals, recipients] = await Promise.all([
      fecApiService.getCommitteeInfo(committeeId),
      fecApiService.getCommitteeTotals(committeeId, cycle),
      resolveCommitteeRecipients(committeeId, cycle),
    ]);

    if (!committeeInfo) {
      return ApiErrors.notFound('Committee', committeeId);
    }

    const profile: CommitteeProfile = {
      committee: {
        committeeId: committeeInfo.committee_id,
        name: committeeInfo.name,
        type: committeeInfo.committee_type,
        typeFull: committeeInfo.committee_type_full,
        designation: committeeInfo.designation,
        designationFull: committeeInfo.designation ?? '',
        party: committeeInfo.party,
        state: committeeInfo.state ?? '',
        treasurerName: '',
        cycles: committeeInfo.cycles,
        fecUrl: `https://www.fec.gov/data/committee/${committeeId}/`,
      },
      totals: totals
        ? {
            cycle: totals.cycle,
            receipts: totals.receipts,
            disbursements: totals.disbursements,
            cashOnHand: totals.last_cash_on_hand_end_period,
            individualContributions: totals.individual_contributions,
            otherCommitteeContributions: totals.other_political_committee_contributions,
            independentExpenditures: totals.independent_expenditures,
          }
        : null,
      recipients,
      metadata: {
        cycle,
        lastUpdated: new Date().toISOString(),
        totalRecipients: recipients.length,
        resolvedRecipients: recipients.filter(r => r.bioguideId !== null).length,
        fecTransparencyLink: `https://www.fec.gov/data/committee/${committeeId}/`,
      },
    };

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    logger.error(`[Influence Profile] Failed for ${committeeId}:`, error);
    return ApiErrors.serverError(error instanceof Error ? error : undefined);
  }
}

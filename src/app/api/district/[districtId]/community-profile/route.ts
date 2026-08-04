/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { epaEchoService } from '@/lib/data-sources/epa-echo-service';
import { cmsProviderService } from '@/lib/data-sources/cms-provider-service';
import { femaService } from '@/lib/data-sources/fema-service';
import { cfpbComplaintService } from '@/lib/data-sources/cfpb-complaint-service';
import { eiaService } from '@/lib/data-sources/eia-service';
import { collegeScorecardService } from '@/lib/data-sources/college-scorecard-service';
import { nihReporterService } from '@/lib/data-sources/nih-reporter-service';
import { fdicService } from '@/lib/data-sources/fdic-service';
import logger from '@/lib/logging/simple-logger';

export const revalidate = 86400; // 24 hours

const EPA_LIMIT = 100;
const FEMA_LIMIT = 50;
const COLLEGE_LIMIT = 50;
const NIH_LIMIT = 50;

/**
 * A figure derived from rows rather than counted upstream.
 *
 * Averages, rates and subgroup counts need the rows themselves, and every
 * source here caps how many rows it will serve. Such a figure describes the
 * rows examined, so it travels with that denominator and never alone: a caller
 * that renders `value` must render `examined` of `population` beside it.
 */
interface SampledFigure<T> {
  value: T;
  /** Rows the figure was computed over. */
  examined: number;
  /** Rows that exist upstream, or null when the source does not report it. */
  population: number | null;
}

function sampled<T>(value: T, examined: number, population: number | null): SampledFigure<T> {
  return { value, examined, population };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId } = await params;

  logger.info('Community profile request', { districtId });

  try {
    if (!districtId) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 });
    }

    const stateMatch = districtId.match(/^([A-Z]{2})/i);
    if (!stateMatch?.[1]) {
      return NextResponse.json(
        { error: 'Invalid district ID format. Expected format: ST-NN (e.g., CA-12)' },
        { status: 400 }
      );
    }

    const state = stateMatch[1].toUpperCase();

    // Each source reports its own match count; the row caps below bound only
    // what we can compute an average or a subgroup share over.
    const [
      epaFacilities,
      hospitals,
      nursingHomes,
      disasters,
      complaints,
      energyProfile,
      colleges,
      nihGrants,
      banking,
    ] = await Promise.all([
      epaEchoService
        .searchFacilitiesWithTotal({ state, limit: EPA_LIMIT })
        .catch(() => ({ items: [], totalAvailable: null })),
      cmsProviderService
        .searchHospitalsWithTotal(state)
        .catch(() => ({ items: [], totalAvailable: null })),
      cmsProviderService
        .searchNursingHomesWithTotal(state)
        .catch(() => ({ items: [], totalAvailable: null })),
      femaService
        .searchDisastersWithTotal({ state, limit: FEMA_LIMIT })
        .catch(() => ({ items: [], totalAvailable: null })),
      cfpbComplaintService.getComplaintAggregates(state).catch(() => null),
      eiaService.getStateEnergyProfile(state).catch(() => null),
      collegeScorecardService
        .searchInstitutionsWithTotal({ state, limit: COLLEGE_LIMIT })
        .catch(() => ({ items: [], totalAvailable: null })),
      nihReporterService
        .searchGrantsWithTotal({ state, limit: NIH_LIMIT })
        .catch(() => ({ items: [], totalAvailable: null })),
      fdicService.getStateBankingTotals(state).catch(() => null),
    ]);

    // Compute hospital quality over the hospitals actually retrieved
    const hospitalRatings = hospitals.items
      .map(h => h.overallRating)
      .filter((r): r is number => r !== null);
    const avgHospitalRating =
      hospitalRatings.length > 0
        ? Math.round((hospitalRatings.reduce((a, b) => a + b, 0) / hospitalRatings.length) * 10) /
          10
        : null;

    // Count EPA violations — must exclude "No Violation Identified"
    const facilitiesWithViolations = epaFacilities.items.filter(f => {
      if (f.sncFlag === 'Y') return true;
      const status = (f.complianceStatus ?? '').toLowerCase();
      return status === 'violation identified' || status === 'significant violation';
    }).length;

    // Count significant non-compliance specifically
    const significantViolations = epaFacilities.items.filter(f => f.sncFlag === 'Y').length;

    // Recent disasters (last 5 years). Declarations arrive newest-first, so a
    // short page proves the window is fully covered; a full page does not, and
    // the count is then only what was seen.
    const currentYear = new Date().getFullYear();
    const recentDisasters = disasters.items.filter(d => d.fyDeclared >= currentYear - 5);
    const recentWindowComplete = disasters.items.length < FEMA_LIMIT;

    // College stats over the schools retrieved
    const publicColleges = colleges.items.filter(c => c.ownership === 'Public').length;
    const collegesWithEarnings = colleges.items.filter(c => c.medianEarnings !== null);
    const avgMedianEarnings =
      collegesWithEarnings.length > 0
        ? Math.round(
            collegesWithEarnings.reduce((sum, c) => sum + (c.medianEarnings ?? 0), 0) /
              collegesWithEarnings.length
          )
        : null;

    // NIH grants come back sorted by award amount, so this is the value of the
    // largest awards — not state NIH funding, which would need every project.
    const largestGrantsFunding = nihGrants.items.reduce((sum, g) => sum + g.awardAmount, 0);

    const profile = {
      districtId,
      state,
      environment: {
        // ECHO's state-wide query is restricted to major facilities; a query
        // for all regulated facilities exceeds its queryset limit.
        majorFacilities: epaFacilities.totalAvailable,
        facilitiesWithViolations: sampled(
          facilitiesWithViolations,
          epaFacilities.items.length,
          epaFacilities.totalAvailable
        ),
        significantViolations: sampled(
          significantViolations,
          epaFacilities.items.length,
          epaFacilities.totalAvailable
        ),
        violationRate: sampled(
          epaFacilities.items.length > 0
            ? Math.round((facilitiesWithViolations / epaFacilities.items.length) * 1000) / 10
            : null,
          epaFacilities.items.length,
          epaFacilities.totalAvailable
        ),
      },
      health: {
        hospitals: hospitals.totalAvailable,
        nursingHomes: nursingHomes.totalAvailable,
        avgHospitalRating: sampled(
          avgHospitalRating,
          hospitalRatings.length,
          hospitals.totalAvailable
        ),
        hospitalsWithEmergency: sampled(
          hospitals.items.filter(h => h.emergencyServices).length,
          hospitals.items.length,
          hospitals.totalAvailable
        ),
      },
      safety: {
        totalDisasters: disasters.totalAvailable,
        recentDisasters: recentDisasters.length,
        recentDisastersComplete: recentWindowComplete,
        consumerComplaints: complaints?.total ?? null,
        topComplaintProducts: (complaints?.byProduct ?? []).slice(0, 3).map(p => p.product ?? p),
      },
      energy: energyProfile
        ? {
            renewablePercentage: energyProfile.renewablePercentage,
            topSources: energyProfile.topSources.slice(0, 3).map(s => ({
              source: s.source,
              amount: s.amount,
            })),
          }
        : null,
      education: {
        totalColleges: colleges.totalAvailable,
        publicColleges: sampled(publicColleges, colleges.items.length, colleges.totalAvailable),
        avgMedianEarnings: sampled(
          avgMedianEarnings,
          collegesWithEarnings.length,
          colleges.totalAvailable
        ),
        nihGrants: nihGrants.totalAvailable,
        // Deliberately not "total NIH funding": summing every award would take
        // thousands of rows, and the sum of the largest few is a different
        // quantity, so it is named for what it measures.
        largestGrantsFunding: sampled(
          largestGrantsFunding,
          nihGrants.items.length,
          nihGrants.totalAvailable
        ),
      },
      banking: banking
        ? {
            fdicInstitutions: banking.institutions,
            totalAssets: banking.totalAssets,
            totalDeposits: banking.totalDeposits,
          }
        : null,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSources: [
          'EPA ECHO',
          'CMS Hospital Compare',
          'CMS Nursing Home Compare',
          'FEMA',
          'CFPB',
          'EIA',
          'College Scorecard',
          'NIH RePORTER',
          'FDIC BankFind',
        ],
        note:
          'Data aggregated at state level. District-level patterns approximate. ' +
          'Counts are the full match count reported by each source. Figures shaped ' +
          '{ value, examined, population } are computed over the rows retrieved, ' +
          'not the whole population.',
      },
    };

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    logger.error('Community profile failed', error as Error);
    return NextResponse.json({ error: 'Failed to fetch community profile' }, { status: 500 });
  }
}

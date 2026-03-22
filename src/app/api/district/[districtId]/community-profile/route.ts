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

/**
 * Community profile for a congressional district.
 *
 * Aggregates data from 8 government APIs into a single response:
 * EPA, CMS, FEMA, CFPB, EIA, College Scorecard, NIH, FDIC.
 *
 * @example GET /api/district/CA-12/community-profile
 */
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

    // Fetch all data sources in parallel — each catches its own errors
    const [
      epaFacilities,
      hospitals,
      nursingHomes,
      disasters,
      complaints,
      energyProfile,
      colleges,
      nihGrants,
      banks,
    ] = await Promise.all([
      epaEchoService.searchFacilities({ state, limit: 100 }).catch(() => []),
      cmsProviderService.searchHospitals(state).catch(() => []),
      cmsProviderService.searchNursingHomes(state).catch(() => []),
      femaService.searchDisasters({ state, limit: 50 }).catch(() => []),
      cfpbComplaintService.getComplaintAggregates(state).catch(() => null),
      eiaService.getStateEnergyProfile(state).catch(() => null),
      collegeScorecardService.searchInstitutions({ state, limit: 50 }).catch(() => []),
      nihReporterService.searchGrants({ state, limit: 50 }).catch(() => []),
      fdicService.searchInstitutions({ state, limit: 50 }).catch(() => []),
    ]);

    // Compute hospital quality
    const hospitalRatings = hospitals
      .map(h => h.overallRating)
      .filter((r): r is number => r !== null);
    const avgHospitalRating =
      hospitalRatings.length > 0
        ? Math.round((hospitalRatings.reduce((a, b) => a + b, 0) / hospitalRatings.length) * 10) /
          10
        : null;

    // Count EPA violations — must exclude "No Violation Identified"
    const facilitiesWithViolations = epaFacilities.filter(f => {
      if (f.sncFlag === 'Y') return true;
      const status = (f.complianceStatus ?? '').toLowerCase();
      return status === 'violation identified' || status === 'significant violation';
    }).length;

    // Count significant non-compliance specifically
    const significantViolations = epaFacilities.filter(f => f.sncFlag === 'Y').length;

    // Recent disasters (last 5 years)
    const currentYear = new Date().getFullYear();
    const recentDisasters = disasters.filter(d => d.fyDeclared >= currentYear - 5);

    // NIH funding total
    const nihTotalFunding = nihGrants.reduce((sum, g) => sum + g.awardAmount, 0);

    // FDIC totals
    const totalBankAssets = banks.reduce((sum, b) => sum + (b.totalAssets ?? 0), 0);
    const totalBankDeposits = banks.reduce((sum, b) => sum + (b.totalDeposits ?? 0), 0);

    // College stats
    const publicColleges = colleges.filter(c => c.ownership === 'Public').length;
    const collegesWithEarnings = colleges.filter(c => c.medianEarnings !== null);
    const avgMedianEarnings =
      collegesWithEarnings.length > 0
        ? Math.round(
            collegesWithEarnings.reduce((sum, c) => sum + (c.medianEarnings ?? 0), 0) /
              collegesWithEarnings.length
          )
        : null;

    const profile = {
      districtId,
      state,
      environment: {
        epaFacilities: epaFacilities.length,
        facilitiesWithViolations,
        significantViolations,
        violationRate:
          epaFacilities.length > 0
            ? Math.round((facilitiesWithViolations / epaFacilities.length) * 1000) / 10
            : null,
      },
      health: {
        hospitals: hospitals.length,
        nursingHomes: nursingHomes.length,
        avgHospitalRating,
        hospitalsWithEmergency: hospitals.filter(h => h.emergencyServices).length,
      },
      safety: {
        recentDisasters: recentDisasters.length,
        totalDisasters: disasters.length,
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
        totalColleges: colleges.length,
        publicColleges,
        avgMedianEarnings,
        nihGrants: nihGrants.length,
        nihTotalFunding,
      },
      banking: {
        fdicInstitutions: banks.length,
        totalAssets: totalBankAssets,
        totalDeposits: totalBankDeposits,
      },
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
        note: 'Data aggregated at state level. District-level patterns approximate.',
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

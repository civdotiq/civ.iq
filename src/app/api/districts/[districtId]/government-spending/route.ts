/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { STATE_FIPS_TO_CODE } from '@/lib/data/us-states';
import { govCache } from '@/services/cache';
import { getServerBaseUrl } from '@/lib/server-url';
import { fetchMedicaidEnrollment } from '@/lib/data-sources/cms-medicaid-enrollment-service';
import { fetchVeteranPopulation } from '@/lib/data-sources/va-veteran-population-service';
import {
  getDistrictSpending,
  getDistrictAwardCounts,
  getDistrictInfrastructureSpending,
  parseDistrictId,
} from '@/lib/services/spending.service';
import type { FederalAward } from '@/types/spending';
import type { GovernmentServicesProfile } from '@/types/district-enhancements';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

// State-to-FIPS mapping for government spending APIs
// All 50 states + DC + territories, from the shared table (a local copy
// omitted DC, which made every DC lookup through it fail).
const STATE_FIPS: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_FIPS_TO_CODE).map(([fips, code]) => [code, fips])
);

const CACHE_KEY_PREFIX = 'district-government-spending';

/**
 * District-scoped federal spending from USASpending.gov (place of
 * performance, current federal fiscal year to date), via the shared
 * spending service. null = data unavailable, never a fabricated 0.
 */
async function fetchFederalInvestment(
  districtId: string
): Promise<GovernmentServicesProfile['federalInvestment']> {
  const unavailable: GovernmentServicesProfile['federalInvestment'] = {
    totalAnnualSpending: null,
    contractsAndGrants: null,
    spendingPerCapita: null,
    population: null,
    majorProjects: [],
    infrastructureInvestment: null,
  };

  const parsed = parseDistrictId(districtId);
  if (!parsed) {
    logger.warn('Cannot parse district ID for USASpending lookup', { districtId });
    return unavailable;
  }

  try {
    const [spending, counts, infrastructure] = await Promise.all([
      getDistrictSpending(parsed.state, parsed.district),
      getDistrictAwardCounts(parsed.state, parsed.district),
      getDistrictInfrastructureSpending(parsed.state, parsed.district),
    ]);

    const majorProjects = [...spending.contracts, ...spending.grants]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((award: FederalAward) => ({
        title: award.recipientName || 'Federal award',
        amount: award.amount,
        agency: award.agency,
        description: award.description,
      }));

    return {
      totalAnnualSpending: spending.aggregate?.total ?? null,
      contractsAndGrants: counts ? counts.contracts + counts.grants : null,
      spendingPerCapita: spending.aggregate?.perCapita ?? null,
      population: spending.aggregate?.population ?? null,
      majorProjects,
      // Construction & infrastructure obligations from the documented
      // INFRASTRUCTURE_CODE_SET (PSC Y+Z contracts + DOT/EPA-SRF grants).
      // null = queried-but-none or upstream unavailable (see service).
      infrastructureInvestment: infrastructure?.total ?? null,
    };
  } catch (error) {
    logger.error('Error fetching district federal investment', error as Error, { districtId });
    return unavailable;
  }
}

async function fetchCongressionalBillsData(
  districtId: string
): Promise<Partial<GovernmentServicesProfile['representation']>> {
  try {
    // Congress.gov API for bills affecting the district
    const billsUrl = `${getServerBaseUrl()}/api/representative/${districtId.toUpperCase()}/bills`;

    logger.info('Fetching Congressional bills data', {
      districtId,
      url: billsUrl,
    });

    const response = await fetch(billsUrl, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`Congressional bills API error: ${response.status}`);
    }

    const data = await response.json();

    if (data && Array.isArray(data)) {
      const billsAffectingDistrict = data.slice(0, 10).map((bill: unknown) => {
        const billData = bill as Record<string, unknown>;
        return {
          billNumber: String(billData.number || 'Unknown'),
          title: String(billData.title || 'Federal Legislation'),
          status: String(billData.latestAction || 'In Progress'),
          // No real impact classification exists — never fabricate one
          impactLevel: null,
        };
      });

      return {
        billsAffectingDistrict,
        appropriationsSecured: null, // Requires CBO appropriations data
      };
    }

    logger.warn('Congressional bills API returned no data', { districtId });
    return {};
  } catch (error) {
    logger.error('Error fetching Congressional bills data', error as Error, { districtId });
    return {};
  }
}

function getSocialServicesData(): GovernmentServicesProfile['socialServices'] {
  // No real API source for district-level social services yet.
  // Following CLAUDE.md "NO mock data ever": emit null (= unavailable), not 0
  // (which a consumer would read as a genuine zero count).
  return {
    snapBeneficiaries: null,
    medicaidEnrollment: null,
    housingAssistanceUnits: null,
    veteransServices: null,
  };
}

function getFederalFacilitiesData(): GovernmentServicesProfile['representation']['federalFacilities'] {
  // Return empty array for federal facilities as no real API is available
  // Following CLAUDE.md rule: "NO mock data ever" - show "Data unavailable" instead
  return [];
}

/**
 * Statewide context — real federal data published only at the state level
 * (Medicaid/CHIP enrollment from CMS, veteran population from VA). Attached
 * here as explicitly statewide figures, never as district-specific numbers.
 */
async function fetchStateContext(
  stateCode: string
): Promise<GovernmentServicesProfile['stateContext']> {
  const [medicaid, veterans] = await Promise.all([
    fetchMedicaidEnrollment(stateCode),
    fetchVeteranPopulation(stateCode),
  ]);

  return {
    state: stateCode,
    medicaidChipEnrollment: medicaid?.totalMedicaidAndChip ?? null,
    medicaidChipPeriod: medicaid?.reportingPeriod ?? null,
    medicaidChipPreliminary: medicaid?.preliminary ?? false,
    veteranPopulation: veterans?.count ?? null,
    veteranPopulationFiscalYear: veterans?.fiscalYear ?? null,
  };
}

async function getGovernmentServicesProfile(
  districtId: string
): Promise<GovernmentServicesProfile> {
  const cacheKey = `${CACHE_KEY_PREFIX}:${districtId}`;
  const cached = await govCache.get<GovernmentServicesProfile>(cacheKey);

  if (cached) {
    logger.info('Returning cached government services data', { districtId });
    return cached;
  }

  try {
    // Parse district ID to get state
    const stateCode = districtId.split('-')[0]?.toUpperCase();
    if (!stateCode || !STATE_FIPS[stateCode]) {
      throw new Error(`Invalid district ID format: ${districtId}`);
    }

    logger.info('Fetching government services profile for district', { districtId, stateCode });

    // Fetch data from multiple sources in parallel
    const [federalInvestment, billsData, stateContext] = await Promise.all([
      fetchFederalInvestment(districtId),
      fetchCongressionalBillsData(districtId),
      fetchStateContext(stateCode),
    ]);

    const socialServicesData = getSocialServicesData();
    const federalFacilitiesData = getFederalFacilitiesData();

    // Combine all data sources — use null/[] when APIs fail (no fake data)
    const servicesProfile: GovernmentServicesProfile = {
      federalInvestment,
      socialServices: socialServicesData,
      representation: {
        billsAffectingDistrict: billsData.billsAffectingDistrict || [],
        federalFacilities: federalFacilitiesData,
        appropriationsSecured: billsData.appropriationsSecured ?? null,
      },
      stateContext,
    };

    // Cache the result (Redis + memory fallback; shared across instances)
    await govCache.set(cacheKey, servicesProfile, {
      dataType: 'heavyEndpoints',
      source: 'district-government-spending',
    });

    logger.info('Government services profile compiled successfully', {
      districtId,
      stateCode,
      totalSpending: servicesProfile.federalInvestment.totalAnnualSpending,
      billCount: servicesProfile.representation.billsAffectingDistrict.length,
    });

    return servicesProfile;
  } catch (error) {
    logger.error('Error compiling government services profile', error as Error, { districtId });

    // Everything failed: all metrics honestly unavailable (never cached)
    return {
      federalInvestment: {
        totalAnnualSpending: null,
        contractsAndGrants: null,
        spendingPerCapita: null,
        population: null,
        majorProjects: [],
        infrastructureInvestment: null,
      },
      socialServices: {
        snapBeneficiaries: null,
        medicaidEnrollment: null,
        housingAssistanceUnits: null,
        veteransServices: null,
      },
      representation: {
        billsAffectingDistrict: [],
        federalFacilities: [],
        appropriationsSecured: null,
      },
      stateContext: {
        state: districtId.split('-')[0]?.toUpperCase() ?? '',
        medicaidChipEnrollment: null,
        medicaidChipPeriod: null,
        medicaidChipPreliminary: false,
        veteranPopulation: null,
        veteranPopulationFiscalYear: null,
      },
    };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;

    logger.info('Government services profile API request', { districtId });

    const servicesProfile = await getGovernmentServicesProfile(districtId);

    return NextResponse.json(
      {
        districtId,
        government: servicesProfile,
        metadata: {
          timestamp: new Date().toISOString(),
          dataSources: {
            usaspending: 'USASpending.gov - https://api.usaspending.gov/',
            congress: 'Congress.gov enhanced API access',
            socialServices: 'Data unavailable - no real district-level API source',
            federalFacilities: 'Data unavailable - no real API source',
            medicaidChip: 'CMS - data.medicaid.gov (statewide Medicaid + CHIP enrollment, monthly)',
            veteranPopulation: 'VA NCVAS/VetPop - datahub.va.gov (statewide veteran population)',
          },
          notes: [
            'null values mean data is unavailable from real government sources - never estimated',
            'Federal spending figures are DISTRICT-scoped (USASpending.gov place of performance), current federal fiscal year to date',
            'Contracts & grants count covers awards with a place of performance in the district, current fiscal year',
            'Infrastructure investment = federal construction & infrastructure obligations from a documented code set: procurement for construction and real-property work (PSC Y & Z) plus DOT/EPA-SRF infrastructure grants (assistance listings 20.106/20.205/20.500/20.507, 66.458, 66.468), place of performance in district, current FY to date; null = none found or upstream unavailable',
            'Congressional bills from enhanced Congress.gov access; no impact classification is available (impactLevel is null)',
            'District-level social services data unavailable - real government APIs needed',
            'Federal facilities data unavailable - real government APIs needed',
            'stateContext figures are STATEWIDE, not district-specific (Medicaid/CHIP and veteran population are published only at the state level)',
          ],
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    const resolvedParams = await params;
    logger.error('Government services profile API error', error as Error, {
      districtId: resolvedParams.districtId,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch government services profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import { getServerBaseUrl } from '@/lib/server-url';
import { fetchMedicaidEnrollment } from '@/lib/data-sources/cms-medicaid-enrollment-service';
import { fetchVeteranPopulation } from '@/lib/data-sources/va-veteran-population-service';
import type { GovernmentServicesProfile } from '@/types/district-enhancements';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

// State-to-FIPS mapping for government spending APIs
const STATE_FIPS: Record<string, string> = {
  AL: '01',
  AK: '02',
  AZ: '04',
  AR: '05',
  CA: '06',
  CO: '08',
  CT: '09',
  DE: '10',
  FL: '12',
  GA: '13',
  HI: '15',
  ID: '16',
  IL: '17',
  IN: '18',
  IA: '19',
  KS: '20',
  KY: '21',
  LA: '22',
  ME: '23',
  MD: '24',
  MA: '25',
  MI: '26',
  MN: '27',
  MS: '28',
  MO: '29',
  MT: '30',
  NE: '31',
  NV: '32',
  NH: '33',
  NJ: '34',
  NM: '35',
  NY: '36',
  NC: '37',
  ND: '38',
  OH: '39',
  OK: '40',
  OR: '41',
  PA: '42',
  RI: '44',
  SC: '45',
  SD: '46',
  TN: '47',
  TX: '48',
  UT: '49',
  VT: '50',
  VA: '51',
  WA: '53',
  WV: '54',
  WI: '55',
  WY: '56',
};

const CACHE_KEY_PREFIX = 'district-government-spending';

async function fetchUSASpendingData(
  stateCode: string
): Promise<Partial<GovernmentServicesProfile['federalInvestment']>> {
  try {
    // USASpending.gov API for federal spending by state
    const spendingUrl = `https://api.usaspending.gov/api/v2/spending/state/${stateCode}`;

    logger.info('Fetching USASpending.gov data', {
      stateCode,
      url: spendingUrl,
    });

    const response = await fetch(spendingUrl, {
      signal: AbortSignal.timeout(15000),
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`USASpending API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      let totalSpending = 0;
      let contractsCount = 0;
      let infrastructureSpending = 0;

      data.results.forEach((award: unknown) => {
        const awardData = award as Record<string, unknown>;
        const amount = parseFloat(String(awardData.total_obligation)) || 0;
        totalSpending += amount;

        if (String(awardData.type).includes('Contract')) {
          contractsCount++;
        }

        // Infrastructure-related spending keywords
        const description = String(awardData.description || '').toLowerCase();
        if (
          description.includes('infrastructure') ||
          description.includes('highway') ||
          description.includes('bridge') ||
          description.includes('transit')
        ) {
          infrastructureSpending += amount;
        }
      });

      // Extract major projects from largest awards
      const majorProjects = data.results
        .slice(0, 5)
        .map((award: unknown) => {
          const awardData = award as Record<string, unknown>;
          return {
            title: String(awardData.description || 'Federal Award'),
            amount: parseFloat(String(awardData.total_obligation)) || 0,
            agency: String(awardData.awarding_agency_name || 'Federal Agency'),
            description: String(awardData.description || 'Government investment'),
          };
        })
        .filter((project: { amount: number }) => project.amount > 100000);

      return {
        totalAnnualSpending: totalSpending,
        contractsAndGrants: contractsCount,
        majorProjects,
        infrastructureInvestment: infrastructureSpending,
      };
    }

    logger.warn('USASpending API returned no data', { stateCode });
    return {};
  } catch (error) {
    logger.error('Error fetching USASpending data', error as Error, { stateCode });
    return {};
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
    const [spendingData, billsData, stateContext] = await Promise.all([
      fetchUSASpendingData(stateCode),
      fetchCongressionalBillsData(districtId),
      fetchStateContext(stateCode),
    ]);

    // Generate estimates for missing data
    const socialServicesData = getSocialServicesData();
    const federalFacilitiesData = getFederalFacilitiesData();

    // Combine all data sources — use null/[] when APIs fail (no fake data)
    const servicesProfile: GovernmentServicesProfile = {
      federalInvestment: {
        totalAnnualSpending: spendingData.totalAnnualSpending ?? null,
        contractsAndGrants: spendingData.contractsAndGrants ?? null,
        majorProjects: spendingData.majorProjects || [],
        infrastructureInvestment: spendingData.infrastructureInvestment ?? null,
      },
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
            'Federal spending figures from USASpending.gov are STATEWIDE totals, not district-specific',
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

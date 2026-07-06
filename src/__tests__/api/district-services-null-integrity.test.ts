/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Data-integrity regression tests for the district services-health and
 * government-spending routes: unavailable data must be emitted as null,
 * never as a fabricated 0 (2026-07 audit item 1; same class as b2841c90).
 */

import { GET as getServicesHealth } from '@/app/api/districts/[districtId]/services-health/route';
import { GET as getGovernmentSpending } from '@/app/api/districts/[districtId]/government-spending/route';
import { GET as getEconomicProfile } from '@/app/api/districts/[districtId]/economic-profile/route';
import { createMockRequest, mockFetchResponse } from '../utils/test-helpers';

jest.mock('@/services/cache', () => ({
  govCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/lib/server-url', () => ({
  getServerBaseUrl: jest.fn(() => 'http://localhost:3000'),
}));

// Pass-through: the spending service caches via cachedFetch; tests must be
// driven by the fetch mock, never by a warm cache from a prior test.
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fetchFn: () => Promise<unknown>) => fetchFn()),
}));

jest.mock('@/lib/data-sources/cms-medicaid-enrollment-service', () => ({
  fetchMedicaidEnrollment: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/data-sources/va-veteran-population-service', () => ({
  fetchVeteranPopulation: jest.fn().mockResolvedValue(null),
}));

import { govCache } from '@/services/cache';

function makeParams(districtId: string): { params: Promise<{ districtId: string }> } {
  return { params: Promise.resolve({ districtId }) };
}

function failAllFetches() {
  global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
}

describe('/api/districts/[districtId]/services-health null integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (govCache.get as jest.Mock).mockResolvedValue(null);
  });

  it('emits null (never 0) for every metric when all upstream APIs fail', async () => {
    failAllFetches();

    const response = await getServicesHealth(
      createMockRequest('http://localhost:3000/api/districts/TX-10/services-health'),
      makeParams('TX-10')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    const { education, healthcare, publicHealth } = body.services;

    for (const [field, value] of Object.entries(education)) {
      expect({ field, value }).toEqual({ field, value: null });
    }
    for (const [field, value] of Object.entries(healthcare)) {
      expect({ field, value }).toEqual({ field, value: null });
    }
    for (const [field, value] of Object.entries(publicHealth)) {
      expect({ field, value }).toEqual({ field, value: null });
    }
  });

  it('uses Census ASFIN federal revenue (not per-pupil expenditure) for federalEducationFunding', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('api.census.gov')) {
        // ASFIN row: [PPEXPGN, TFEDREV, ENROLLM]
        return mockFetchResponse([
          ['PPEXPGN', 'TFEDREV', 'ENROLLM', 'state'],
          ['12000', '5500000000', '5400000', '48'],
        ]);
      }
      return Promise.reject(new Error('unreachable'));
    });

    const response = await getServicesHealth(
      createMockRequest('http://localhost:3000/api/districts/TX-10/services-health'),
      makeParams('TX-10')
    );
    const body = await response.json();

    expect(body.services.education.federalEducationFunding).toBe(5500000000);
    // Fields with no honest source stay null even when other fetches succeed
    expect(body.services.education.schoolDistrictPerformance).toBeNull();
    expect(body.services.education.collegeEnrollmentRate).toBeNull();
  });

  it('never emits public health or healthcare values (no correct source mapping exists)', async () => {
    global.fetch = jest.fn().mockImplementation(() => mockFetchResponse({ result: [] }));

    const response = await getServicesHealth(
      createMockRequest('http://localhost:3000/api/districts/CA-12/services-health'),
      makeParams('CA-12')
    );
    const body = await response.json();

    expect(body.services.healthcare.hospitalQualityRating).toBeNull();
    expect(body.services.publicHealth.preventableDiseaseRate).toBeNull();
    expect(body.services.publicHealth.mentalHealthProviderRatio).toBeNull();
    expect(body.services.publicHealth.substanceAbusePrograms).toBeNull();
    expect(body.services.publicHealth.preventiveCareCoverage).toBeNull();
  });
});

describe('/api/districts/[districtId]/government-spending null integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (govCache.get as jest.Mock).mockResolvedValue(null);
  });

  it('emits null (never 0) for federal investment when USASpending fails', async () => {
    failAllFetches();

    const response = await getGovernmentSpending(
      createMockRequest('http://localhost:3000/api/districts/TX-10/government-spending'),
      makeParams('TX-10')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    const { federalInvestment, representation } = body.government;

    expect(federalInvestment.totalAnnualSpending).toBeNull();
    expect(federalInvestment.contractsAndGrants).toBeNull();
    expect(federalInvestment.spendingPerCapita).toBeNull();
    expect(federalInvestment.population).toBeNull();
    expect(federalInvestment.infrastructureInvestment).toBeNull();
    expect(federalInvestment.majorProjects).toEqual([]);
    expect(representation.appropriationsSecured).toBeNull();
  });

  it('maps district-scoped USASpending data (geography + award counts) into federalInvestment', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('spending_by_geography')) {
        // Must query the district geo layer with a FIPS-based shape code
        expect(String(init?.body)).toContain('"geo_layer":"district"');
        expect(String(init?.body)).toContain('"geo_layer_filters":["4810"]');
        return mockFetchResponse({
          results: [
            {
              shape_code: '4810',
              display_name: 'TX-10',
              aggregated_amount: 3647514226.44,
              population: 775543,
              per_capita: 4703.17,
            },
          ],
        });
      }
      if (u.includes('spending_by_award_count')) {
        expect(String(init?.body)).toContain('"district_current":"10"');
        return mockFetchResponse({
          results: { contracts: 8268, grants: 1319, loans: 11077, direct_payments: 8133 },
        });
      }
      if (u.includes('spending_by_award')) {
        return mockFetchResponse({
          results: [
            {
              internal_id: 1,
              'Award ID': 'W15QKN19C0032',
              'Recipient Name': 'RDZM, LLC',
              'Award Amount': 48315012,
              'Award Type': 'Definitive Contract',
              'Awarding Agency': 'Department of Defense',
              'Start Date': '2019-01-01',
              Description: 'Cartridge production',
              generated_internal_id: 'CONT_AWD_1',
            },
          ],
        });
      }
      return Promise.reject(new Error('unreachable'));
    });

    const response = await getGovernmentSpending(
      createMockRequest('http://localhost:3000/api/districts/TX-10/government-spending'),
      makeParams('TX-10')
    );
    const body = await response.json();

    const { federalInvestment } = body.government;
    expect(federalInvestment.totalAnnualSpending).toBe(3647514226.44);
    expect(federalInvestment.spendingPerCapita).toBe(4703.17);
    expect(federalInvestment.population).toBe(775543);
    // Contracts + grants only — loans and direct payments are not awards we label as such
    expect(federalInvestment.contractsAndGrants).toBe(8268 + 1319);
    expect(federalInvestment.majorProjects[0]).toMatchObject({
      title: 'RDZM, LLC',
      amount: 48315012,
      agency: 'Department of Defense',
    });
    // No honest classification source — never fabricated from keyword matching
    expect(federalInvestment.infrastructureInvestment).toBeNull();
  });

  it('never fabricates an impactLevel classification for bills', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (String(url).includes('/bills')) {
        return mockFetchResponse([
          { number: 'HR 1234', title: 'A Real Bill', latestAction: 'Referred to committee' },
          { number: 'S 99', title: 'Another Bill', latestAction: 'Passed Senate' },
        ]);
      }
      return Promise.reject(new Error('unreachable'));
    });

    const response = await getGovernmentSpending(
      createMockRequest('http://localhost:3000/api/districts/TX-10/government-spending'),
      makeParams('TX-10')
    );
    const body = await response.json();

    const bills = body.government.representation.billsAffectingDistrict;
    expect(bills.length).toBeGreaterThan(0);
    for (const bill of bills) {
      expect(bill.impactLevel).toBeNull();
    }
  });

  it('returns all-null profile (not zeros) for an unrecognized state prefix', async () => {
    failAllFetches();

    const response = await getGovernmentSpending(
      createMockRequest('http://localhost:3000/api/districts/ZZ-01/government-spending'),
      makeParams('ZZ-01')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.government.federalInvestment.totalAnnualSpending).toBeNull();
    expect(body.government.representation.appropriationsSecured).toBeNull();
  });
});

describe('/api/districts/[districtId]/economic-profile null integrity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (govCache.get as jest.Mock).mockResolvedValue(null);
  });

  function expectAllNull(section: Record<string, unknown>) {
    for (const [field, value] of Object.entries(section)) {
      if (field === 'majorIndustries') {
        expect(value).toEqual([]);
      } else {
        expect({ field, value }).toEqual({ field, value: null });
      }
    }
  }

  it('emits null (never 0) for every metric when all upstream APIs fail', async () => {
    failAllFetches();

    const response = await getEconomicProfile(
      createMockRequest('http://localhost:3000/api/districts/TX-10/economic-profile'),
      makeParams('TX-10')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expectAllNull(body.economic.employment);
    expectAllNull(body.economic.infrastructure);
    expectAllNull(body.economic.connectivity);
  });

  it('passes real BLS values through while sourceless metrics stay null', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('api.bls.gov')) {
        // LAUS series: unemployment (003) vs labor force participation (006)
        const value = u.endsWith('03') ? '4.2' : '63.1';
        return mockFetchResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: { series: [{ data: [{ value }] }] },
        });
      }
      if (u.includes('data.bls.gov/cew')) {
        const csv = '"area_fips","industry_code","avg_wkly_wage"\n"48000","10","1250"';
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve(csv),
          json: () => Promise.reject(new Error('CSV response')),
        } as unknown as Response);
      }
      return Promise.reject(new Error('unreachable'));
    });

    const response = await getEconomicProfile(
      createMockRequest('http://localhost:3000/api/districts/TX-10/economic-profile'),
      makeParams('TX-10')
    );
    const body = await response.json();

    expect(body.economic.employment.unemploymentRate).toBe(4.2);
    expect(body.economic.employment.laborForceParticipation).toBe(63.1);
    expect(body.economic.employment.averageWage).toBe(1250 * 52);
    // Fields with no honest source stay null even when BLS fetches succeed
    expect(body.economic.employment.jobGrowthRate).toBeNull();
    expectAllNull(body.economic.infrastructure);
    expectAllNull(body.economic.connectivity);
  });

  it('returns all-null profile (not zeros) for an invalid district id', async () => {
    failAllFetches();

    const response = await getEconomicProfile(
      createMockRequest('http://localhost:3000/api/districts/ZZ-01/economic-profile'),
      makeParams('ZZ-01')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expectAllNull(body.economic.employment);
    expect(govCache.set).not.toHaveBeenCalled();
  });
});

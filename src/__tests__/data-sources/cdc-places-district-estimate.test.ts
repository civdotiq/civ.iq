/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetTractsForDistrict = jest.fn();
jest.mock('@/lib/data/tract-district-mapping', () => ({
  getTractsForDistrict: (...args: unknown[]) => mockGetTractsForDistrict(...args),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import { computeDistrictPlacesEstimate } from '@/lib/data-sources/cdc-places-district-estimate';

interface RawRecord {
  locationid: string;
  measureid: string;
  data_value?: string;
  low_confidence_limit?: string;
  high_confidence_limit?: string;
  totalpop18plus?: string;
  year?: string;
}

function rec(r: Partial<RawRecord> & { locationid: string; measureid: string }): RawRecord {
  return { year: '2023', ...r };
}

function mockRecords(records: RawRecord[]): void {
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => records });
}

const findMeasure = (
  result: Awaited<ReturnType<typeof computeDistrictPlacesEstimate>>,
  id: string
) => result?.measures.find(m => m.measureId === id);

describe('computeDistrictPlacesEstimate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('computes the population-weighted mean and weighted confidence limits', async () => {
    mockGetTractsForDistrict.mockReturnValue([
      { tract: '06037111111', areaFraction: 1 },
      { tract: '06037222222', areaFraction: 1 },
    ]);
    mockRecords([
      rec({
        locationid: '06037111111',
        measureid: 'DIABETES',
        data_value: '10',
        low_confidence_limit: '8',
        high_confidence_limit: '12',
        totalpop18plus: '1000',
      }),
      rec({
        locationid: '06037222222',
        measureid: 'DIABETES',
        data_value: '20',
        low_confidence_limit: '18',
        high_confidence_limit: '22',
        totalpop18plus: '3000',
      }),
    ]);

    const result = await computeDistrictPlacesEstimate('CA', 37);
    const diabetes = findMeasure(result, 'DIABETES');

    // (10*1000 + 20*3000) / 4000 = 17.5
    expect(diabetes?.value).toBe(17.5);
    expect(diabetes?.lowCI).toBe(15.5); // (8*1000 + 18*3000)/4000
    expect(diabetes?.highCI).toBe(19.5); // (12*1000 + 22*3000)/4000
    expect(diabetes?.coverage.tractsUsed).toBe(2);
    expect(diabetes?.coverage.pctCovered).toBe(1);
    expect(diabetes?.estimateUnavailableReason).toBeUndefined();
    expect(result?.dataYear).toBe('2023');
  });

  it('apportions a split tract by its land-area fraction', async () => {
    mockGetTractsForDistrict.mockReturnValue([
      { tract: '06037111111', areaFraction: 0.5 },
      { tract: '06037222222', areaFraction: 1 },
    ]);
    mockRecords([
      rec({
        locationid: '06037111111',
        measureid: 'DIABETES',
        data_value: '10',
        totalpop18plus: '1000',
      }),
      rec({
        locationid: '06037222222',
        measureid: 'DIABETES',
        data_value: '20',
        totalpop18plus: '3000',
      }),
    ]);

    const result = await computeDistrictPlacesEstimate('CA', 37);
    // weight A = 1000*0.5 = 500; (10*500 + 20*3000) / 3500 = 18.571 -> 18.6
    expect(findMeasure(result, 'DIABETES')?.value).toBe(18.6);
  });

  it('returns null with a reason when tract coverage is below the 80% threshold', async () => {
    mockGetTractsForDistrict.mockReturnValue([
      { tract: '06037111111', areaFraction: 1 },
      { tract: '06037222222', areaFraction: 1 },
    ]);
    // District adult pop = 10000. DIABETES only covers tract A (1000 -> 10%).
    // OBESITY only covers tract B (9000 -> 90%).
    mockRecords([
      rec({
        locationid: '06037111111',
        measureid: 'DIABETES',
        data_value: '10',
        totalpop18plus: '1000',
      }),
      rec({
        locationid: '06037222222',
        measureid: 'OBESITY',
        data_value: '30',
        totalpop18plus: '9000',
      }),
    ]);

    const result = await computeDistrictPlacesEstimate('CA', 37);
    const diabetes = findMeasure(result, 'DIABETES');
    const obesity = findMeasure(result, 'OBESITY');

    expect(diabetes?.value).toBeNull();
    expect(diabetes?.estimateUnavailableReason).toMatch(/below/i);
    expect(diabetes?.coverage.pctCovered).toBe(0.1);

    expect(obesity?.value).toBe(30);
    expect(obesity?.coverage.pctCovered).toBe(0.9);
  });

  it('excludes a tract that has a value but no usable population weight', async () => {
    mockGetTractsForDistrict.mockReturnValue([
      { tract: '06037111111', areaFraction: 1 },
      { tract: '06037222222', areaFraction: 1 },
    ]);
    mockRecords([
      rec({
        locationid: '06037111111',
        measureid: 'DIABETES',
        data_value: '10',
        totalpop18plus: '1000',
      }),
      // has a value but zero adult population -> excluded from the weighted mean
      rec({
        locationid: '06037222222',
        measureid: 'DIABETES',
        data_value: '15',
        totalpop18plus: '0',
      }),
    ]);

    const result = await computeDistrictPlacesEstimate('CA', 37);
    const diabetes = findMeasure(result, 'DIABETES');

    expect(diabetes?.value).toBe(10); // only tract A counts
    expect(diabetes?.coverage.tractsUsed).toBe(1);
    expect(diabetes?.coverage.tractsExcluded).toBe(1);
  });

  it('omits confidence limits when tract limits are missing but still returns a value', async () => {
    mockGetTractsForDistrict.mockReturnValue([{ tract: '06037111111', areaFraction: 1 }]);
    mockRecords([
      rec({
        locationid: '06037111111',
        measureid: 'DIABETES',
        data_value: '10',
        totalpop18plus: '1000',
      }),
    ]);

    const result = await computeDistrictPlacesEstimate('CA', 37);
    const diabetes = findMeasure(result, 'DIABETES');
    expect(diabetes?.value).toBe(10);
    expect(diabetes?.lowCI).toBeNull();
    expect(diabetes?.highCI).toBeNull();
  });

  it('never fabricates a number when the district has no tract mapping', async () => {
    mockGetTractsForDistrict.mockReturnValue([]);
    const result = await computeDistrictPlacesEstimate('ZZ', 99);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns null when PLACES returns no tract records', async () => {
    mockGetTractsForDistrict.mockReturnValue([{ tract: '06037111111', areaFraction: 1 }]);
    mockRecords([]);
    const result = await computeDistrictPlacesEstimate('CA', 37);
    expect(result).toBeNull();
  });

  it('returns null on API failure rather than a partial number', async () => {
    mockGetTractsForDistrict.mockReturnValue([{ tract: '06037111111', areaFraction: 1 }]);
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    const result = await computeDistrictPlacesEstimate('CA', 37);
    expect(result).toBeNull();
  });
});

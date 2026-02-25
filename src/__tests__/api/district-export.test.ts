/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { describe, test, expect } from '@jest/globals';
import type { DistrictExport } from '@/types/export';

describe('District Export Types', () => {
  test('export structure has all required fields', () => {
    const exportData: DistrictExport = {
      metadata: {
        exportedAt: '2025-02-25T00:00:00.000Z',
        version: '1.0',
        sources: ['Congress.gov API', 'Census Bureau ACS'],
        license: 'MIT',
        platform: 'CIV.IQ',
        districtId: 'MI-12',
        congress: '119th Congress (2025-2027)',
      },
      district: {
        id: 'mi-12',
        state: 'MI',
        number: '12',
        name: 'MI District 12',
      },
      representatives: [
        {
          name: 'Rep. Smith',
          party: 'D',
          bioguideId: 'S000001',
          chamber: 'House',
        },
      ],
      demographics: {
        population: 750000,
        medianIncome: 55000,
        medianAge: 38.5,
        diversityIndex: 45.2,
        urbanPercentage: 72.1,
        white_percent: 60.5,
        black_percent: 18.3,
        hispanic_percent: 12.1,
        asian_percent: 5.4,
        poverty_rate: 13.2,
        bachelor_degree_percent: 32.1,
      },
      geography: {
        area: 5200,
        counties: ['Wayne', 'Oakland'],
        majorCities: ['Detroit', 'Dearborn'],
      },
      political: {
        cookPVI: 'D+5',
        lastElection: {
          winner: 'Rep. Smith',
          margin: 12.3,
          turnout: 0,
        },
        registeredVoters: 0,
      },
      spending: null,
      bills: [],
    };

    expect(exportData.metadata.license).toBe('MIT');
    expect(exportData.metadata.platform).toBe('CIV.IQ');
    expect(exportData.metadata.districtId).toBe('MI-12');
    expect(exportData.district.state).toBe('MI');
    expect(exportData.representatives).toHaveLength(1);
    expect(exportData.demographics?.population).toBe(750000);
    expect(exportData.geography.counties).toContain('Wayne');
  });

  test('export supports spending data', () => {
    const spending = {
      totalAmount: 1500000000,
      awards: [
        {
          recipientName: 'Highway Infrastructure',
          amount: 500000000,
          awardType: 'contract/grant',
          agency: 'Department of Transportation',
          description: 'Highway improvement project',
        },
      ],
    };

    expect(spending.totalAmount).toBe(1500000000);
    expect(spending.awards).toHaveLength(1);
    expect(spending.awards[0]?.agency).toBe('Department of Transportation');
  });

  test('export supports bills with relevance scoring', () => {
    const bills = [
      {
        id: '119-hr-100',
        title: 'Infrastructure Investment Act',
        type: 'hr',
        number: '100',
        congress: 119,
        status: 'Introduced',
        policyArea: 'Transportation',
        introducedDate: '2025-01-15',
        latestActionDate: '2025-02-10',
        latestActionText: 'Referred to Committee',
        relevanceScore: 5,
        relevanceReasons: ['policyArea match', 'committee match'],
      },
    ];

    expect(bills[0]?.relevanceScore).toBe(5);
    expect(bills[0]?.relevanceReasons).toContain('policyArea match');
    expect(bills[0]?.congress).toBe(119);
  });

  test('export handles null demographics gracefully', () => {
    const exportData: DistrictExport = {
      metadata: {
        exportedAt: '2025-02-25T00:00:00.000Z',
        version: '1.0',
        sources: ['Congress.gov API'],
        license: 'MIT',
        platform: 'CIV.IQ',
        districtId: 'AK-AL',
        congress: '119th Congress (2025-2027)',
      },
      district: {
        id: 'ak-al',
        state: 'AK',
        number: 'AL',
        name: 'Alaska At-Large',
      },
      representatives: [
        {
          name: 'Rep. Peltola',
          party: 'D',
          bioguideId: 'P000001',
          chamber: 'House',
        },
      ],
      demographics: null,
      geography: { area: 0, counties: [], majorCities: [] },
      political: {
        cookPVI: 'Data unavailable',
        lastElection: { winner: 'Data unavailable', margin: 0, turnout: 0 },
        registeredVoters: 0,
      },
      spending: null,
      bills: [],
    };

    expect(exportData.demographics).toBeNull();
    expect(exportData.spending).toBeNull();
    expect(exportData.bills).toEqual([]);
  });

  test('export JSON is valid and parseable', () => {
    const exportData: DistrictExport = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        sources: ['Congress.gov API'],
        license: 'MIT',
        platform: 'CIV.IQ',
        districtId: 'CA-12',
        congress: '119th Congress (2025-2027)',
      },
      district: { id: 'ca-12', state: 'CA', number: '12', name: 'CA District 12' },
      representatives: [
        { name: 'Rep. Pelosi', party: 'D', bioguideId: 'P000197', chamber: 'House' },
      ],
      demographics: null,
      geography: { area: 100, counties: ['San Francisco'], majorCities: ['San Francisco'] },
      political: {
        cookPVI: 'D+35',
        lastElection: { winner: 'Data unavailable', margin: 0, turnout: 0 },
        registeredVoters: 0,
      },
      spending: null,
      bills: [],
    };

    const json = JSON.stringify(exportData, null, 2);
    const parsed = JSON.parse(json) as DistrictExport;

    expect(parsed.metadata.platform).toBe('CIV.IQ');
    expect(parsed.district.state).toBe('CA');
    expect(parsed.representatives[0]?.bioguideId).toBe('P000197');
  });
});

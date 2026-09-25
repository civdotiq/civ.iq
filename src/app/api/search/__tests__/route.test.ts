/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/lib/cache', () => ({
  cache: { get: jest.fn(async () => null), set: jest.fn(async () => true) },
}));
jest.mock('@/lib/server-url', () => ({ getServerBaseUrl: () => 'http://localhost:3000' }));

// Bulk roster rows as buildEnhancedRepresentatives returns them: committees
// always [], terms sorted newest-first, yearsInOffice = chamber tenure.
const ROSTER = [
  {
    bioguideId: 'S000510',
    name: 'Adam Smith',
    party: 'Democrat',
    state: 'WA',
    district: '9',
    chamber: 'House',
    yearsInOffice: 29,
    terms: [{ startYear: '2025' }, { startYear: '1997' }],
    committees: [],
  },
  {
    bioguideId: 'S001172',
    name: 'Adrian Smith',
    party: 'Republican',
    state: 'NE',
    district: '3',
    chamber: 'House',
    yearsInOffice: 19,
    terms: [{ startYear: '2025' }, { startYear: '2007' }],
    committees: [],
  },
];
jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: async () => ROSTER.map(r => ({ ...r })),
  getCommitteeNamesByMember: async () =>
    new Map([
      ['S000510', ['House Committee on Armed Services']],
      ['S001172', ['House Committee on Ways and Means']],
    ]),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';

async function search(qs: string) {
  const res = await GET(new NextRequest(`https://civdotiq.org/api/search?${qs}`));
  return (await res.json()).data;
}

describe('GET /api/search', () => {
  it('never returns placeholder bills, voting or fundraising numbers', async () => {
    const data = await search('q=smith');
    expect(data.results).toHaveLength(2);
    for (const r of data.results) {
      expect(r).not.toHaveProperty('billsSponsored');
      expect(r).not.toHaveProperty('votingScore');
      expect(r).not.toHaveProperty('fundraisingTotal');
    }
    expect(JSON.stringify(data.metadata)).not.toMatch(/placeholder/i);
  });

  it('filters by committee using the membership roster', async () => {
    const data = await search('q=smith&committee=Armed');
    expect(data.results.map((r: { bioguideId: string }) => r.bioguideId)).toEqual(['S000510']);
    expect(data.results[0].committees).toEqual(['House Committee on Armed Services']);
  });

  it('uses real chamber tenure, not the newest term, for years in office', async () => {
    const data = await search('q=smith&experienceYearsMin=25');
    expect(data.results.map((r: { bioguideId: string }) => r.bioguideId)).toEqual(['S000510']);
    expect(data.results[0].yearsInOffice).toBe(29);
  });
});

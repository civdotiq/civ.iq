/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/lib/cache', () => ({ cachedFetch: jest.fn(async () => []) }));
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: { searchCommittees: jest.fn(async () => []) },
}));
jest.mock('@/services/core/state-legislature-core.service', () => ({
  StateLegislatureCoreService: {
    getStateLegislatorsSummary: async () => [
      {
        id: 'ocd-person/1',
        name: 'María Isa Pérez-Vega',
        party: 'DFL',
        district: '65B',
        chamber: 'lower',
      },
    ],
  },
}));
jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: async () => [
    {
      bioguideId: 'S000168',
      name: 'María Elvira Salazar',
      fullName: { first: 'Maria', last: 'Salazar', official: 'Maria Elvira Salazar' },
      party: 'Republican',
      state: 'FL',
      district: '27',
      chamber: 'House',
    },
    {
      bioguideId: 'C001088',
      name: 'Chris Coons',
      fullName: { first: 'Christopher', last: 'Coons', official: 'Christopher A. Coons' },
      party: 'Democrat',
      state: 'DE',
      chamber: 'Senate',
    },
  ],
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';

async function search(q: string) {
  const res = await GET(
    new NextRequest(`https://civdotiq.org/api/search/unified?q=${encodeURIComponent(q)}`)
  );
  return res.json();
}

const ids = (reps: Array<{ bioguideId: string }>) => reps.map(r => r.bioguideId);

describe('GET /api/search/unified names', () => {
  it('finds members with or without accents', async () => {
    expect(ids((await search('maria salazar')).representatives)).toEqual(['S000168']);
    expect(ids((await search('María Salazar')).representatives)).toEqual(['S000168']);
  });

  it('finds members by their official name as well as the one they go by', async () => {
    expect(ids((await search('chris coons')).representatives)).toEqual(['C001088']);
    expect(ids((await search('christopher coons')).representatives)).toEqual(['C001088']);
  });

  it('finds state legislators with or without accents', async () => {
    const data = await search('MN: perez-vega');
    expect(data.stateLegislators).toHaveLength(1);
  });
});

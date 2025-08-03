/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';

// TEST DATA: Mock representative data for unit testing only
export const mockRepresentative = {
  bioguideId: 'S000148',
  name: 'Charles E. Schumer',
  firstName: 'Charles',
  lastName: 'Schumer',
  state: 'NY',
  district: null,
  party: 'Democratic',
  chamber: 'Senate',
  imageUrl: 'https://www.congress.gov/img/member/s000148.jpg',
  contactInfo: {
    phone: '(202) 224-6542',
    website: 'https://www.schumer.senate.gov',
    office: '322 Hart Senate Office Building',
  },
  committees: [
    {
      name: 'Committee on Rules and Administration',
      role: 'Chair',
    },
  ],
  social: {
    twitter: '@SenSchumer',
    facebook: 'senschumer',
  },
};

// TEST DATA: Mock vote data for unit testing only
export const mockVote = {
  voteId: '119-hr-1-190',
  bill: {
    number: 'HR 1',
    title: 'One Big Beautiful Bill Act',
    congress: '119',
  },
  question: 'On Passage',
  result: 'Passed',
  date: '2025-07-03',
  position: 'Yea' as const,
  chamber: 'House' as const,
  rollNumber: 190,
  isKeyVote: true,
};

// TEST DATA: Mock district boundary data for unit testing only
export const mockDistrictBoundary = {
  type: 'Polygon',
  coordinates: [
    [
      [-74.0059, 40.7128],
      [-74.0, 40.7128],
      [-74.0, 40.72],
      [-74.0059, 40.72],
      [-74.0059, 40.7128],
    ],
  ],
  properties: {
    district: '10',
    state: 'NY',
    name: 'Congressional District 10',
    type: 'congressional' as const,
    source: 'census-tiger',
  },
};

// TEST DATA: Mock campaign finance data for unit testing only
export const mockFinanceData = {
  candidate_info: {
    candidate_id: 'S8NY00082',
    name: 'SCHUMER, CHARLES E',
    party: 'DEM',
    office: 'S',
    state: 'NY',
    election_years: [2022, 2016],
    cycles: [2022, 2024],
  },
  financial_summary: [
    {
      cycle: 2024,
      total_receipts: 1250000,
      total_disbursements: 980000,
      cash_on_hand_end_period: 270000,
      individual_contributions: 850000,
      pac_contributions: 300000,
      party_contributions: 75000,
      candidate_contributions: 25000,
    },
  ],
  recent_contributions: [],
  recent_expenditures: [],
  top_contributors: [],
  top_expenditure_categories: [],
};

// TEST UTILITY: Helper to create mock NextRequest for unit testing
export function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  const requestOptions = {
    ...options,
    signal: options.signal || undefined,
  };
  const request = new NextRequest(url, requestOptions);
  return request;
}

// TEST UTILITY: Helper to mock fetch responses for unit testing
export function mockFetchResponse(data: unknown, status = 200): Promise<Response> {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
    headers: new Headers(),
    url: 'https://example.com',
    redirected: false,
    type: 'basic' as ResponseType,
    body: null,
    bodyUsed: false,
    clone: () => new Response(JSON.stringify(data), { status }),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData()),
  } as Response);
}

// TEST UTILITY: Helper to mock Congress API responses for unit testing
export function mockCongressApiResponse(endpoint: string, data: unknown) {
  const url = `https://api.congress.gov/v3/${endpoint}`;
  return {
    url,
    response: mockFetchResponse(data),
  };
}

// Helper to mock Census TIGER API responses
export function mockCensusTigerResponse(data: unknown) {
  return mockFetchResponse({
    features: [data],
  });
}

// Helper to create test environment
export function setupTestEnvironment() {
  // Mock console methods
  const originalConsole = global.console;
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  return {
    restoreConsole: () => {
      global.console = originalConsole;
    },
  };
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

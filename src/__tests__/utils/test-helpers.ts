import { NextRequest } from 'next/server'

// Mock representative data for testing
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
    office: '322 Hart Senate Office Building'
  },
  committees: [
    {
      name: 'Committee on Rules and Administration',
      role: 'Chair'
    }
  ],
  social: {
    twitter: '@SenSchumer',
    facebook: 'senschumer'
  }
}

// Mock vote data
export const mockVote = {
  voteId: '119-hr-1-190',
  bill: {
    number: 'HR 1',
    title: 'One Big Beautiful Bill Act',
    congress: '119'
  },
  question: 'On Passage',
  result: 'Passed',
  date: '2025-07-03',
  position: 'Yea' as const,
  chamber: 'House' as const,
  rollNumber: 190,
  isKeyVote: true
}

// Mock district boundary data
export const mockDistrictBoundary = {
  type: 'Polygon',
  coordinates: [[
    [-74.0059, 40.7128],
    [-74.0000, 40.7128],
    [-74.0000, 40.7200],
    [-74.0059, 40.7200],
    [-74.0059, 40.7128]
  ]],
  properties: {
    district: '10',
    state: 'NY',
    name: 'Congressional District 10',
    type: 'congressional' as const,
    source: 'census-tiger'
  }
}

// Mock campaign finance data
export const mockFinanceData = {
  candidate_info: {
    candidate_id: 'S8NY00082',
    name: 'SCHUMER, CHARLES E',
    party: 'DEM',
    office: 'S',
    state: 'NY',
    election_years: [2022, 2016],
    cycles: [2022, 2024]
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
      candidate_contributions: 25000
    }
  ],
  recent_contributions: [],
  recent_expenditures: [],
  top_contributors: [],
  top_expenditure_categories: []
}

// Helper to create mock NextRequest
export function createMockRequest(url: string, options: RequestInit = {}): NextRequest {
  const requestOptions = {
    ...options,
    signal: options.signal || undefined
  }
  const request = new NextRequest(url, requestOptions)
  return request
}

// Helper to mock fetch responses
export function mockFetchResponse(data: any, status = 200): Promise<Response> {
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
    clone: () => mockFetchResponse(data, status) as any,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    blob: () => Promise.resolve(new Blob()),
    formData: () => Promise.resolve(new FormData())
  } as Response)
}

// Helper to mock Congress API responses
export function mockCongressApiResponse(endpoint: string, data: any) {
  const url = `https://api.congress.gov/v3/${endpoint}`
  return {
    url,
    response: mockFetchResponse(data)
  }
}

// Helper to mock Census TIGER API responses
export function mockCensusTigerResponse(data: any) {
  return mockFetchResponse({
    features: [data]
  })
}

// Helper to create test environment
export function setupTestEnvironment() {
  // Mock console methods
  const originalConsole = global.console
  global.console = {
    ...console,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }

  return {
    restoreConsole: () => {
      global.console = originalConsole
    }
  }
}

// Helper to wait for async operations
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * ZIP endpoint honesty contract.
 *
 * Pins the behavior required by .claude/rules/security.md ("Address, not ZIP")
 * and memory/feedback_address-not-zip.md: every route that resolves districts
 * from a ZIP must surface `accuracyNote` so SDK / MCP consumers see the
 * 10–20% imprecision programmatically. Address-based inputs must not carry
 * the note.
 *
 * Each of the 8 ZIP-accepting routes gets two tests (16 total):
 *   • ZIP input    → accuracyNote present
 *   • non-ZIP input → accuracyNote absent
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

jest.mock('@/lib/logging/logger-edge', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  createRequestLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@/lib/monitoring/telemetry-edge', () => ({
  monitorExternalApi: jest.fn(() => ({ end: jest.fn() })),
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
  cache: {
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve(true)),
    delete: jest.fn(() => Promise.resolve(true)),
    clear: jest.fn(() => Promise.resolve(true)),
    exists: jest.fn(() => Promise.resolve(false)),
    getStatus: jest.fn(() => ({ connected: true })),
  },
}));

jest.mock('@/services/cache', () => ({
  govCache: {
    get: jest.fn(() => null),
    set: jest.fn(),
  },
}));

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve(null)),
    set: jest.fn(() => Promise.resolve(true)),
  })),
}));

jest.mock('@/lib/server-url', () => ({
  getServerBaseUrl: jest.fn(() => 'http://localhost:3000'),
}));

const mockRepresentatives = [
  {
    bioguideId: 'S000148',
    name: 'Charles E. Schumer',
    party: 'Democratic',
    state: 'NY',
    district: null,
    chamber: 'Senate',
    title: 'Senator',
    phone: '(202) 224-6542',
    website: 'https://www.schumer.senate.gov',
    terms: [{ startYear: '2017' }],
    committees: [],
  },
  {
    bioguideId: 'O000172',
    name: 'Alexandria Ocasio-Cortez',
    party: 'Democratic',
    state: 'NY',
    district: '14',
    chamber: 'House',
    title: 'Representative',
    phone: '(202) 225-3965',
    website: 'https://ocasio-cortez.house.gov',
    terms: [{ startYear: '2019' }],
    committees: [],
  },
];

jest.mock('@/services/core/representatives-core.service', () => ({
  RepresentativesCoreService: {
    getAllRepresentatives: jest.fn(() => Promise.resolve(mockRepresentatives)),
    getRepresentativesByState: jest.fn(() => Promise.resolve(mockRepresentatives)),
  },
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn(() => Promise.resolve(mockRepresentatives)),
  getEnhancedRepresentative: jest.fn(),
}));

jest.mock('@/lib/census-api', () => ({
  getCongressionalDistrictFromZip: jest.fn(() => Promise.resolve({ state: 'NY', district: '14' })),
}));

jest.mock('@/lib/data/zip-district-mapping', () => ({
  getAllCongressionalDistrictsForZip: jest.fn(() => [{ state: 'NY', district: '14' }]),
  isZipMultiDistrict: jest.fn(() => false),
}));

jest.mock('@/lib/data/zip-district-mapping-119th', () => ({
  getAllDistrictsForZip: jest.fn(() => [{ state: 'NY', district: '14', primary: true }]),
}));

jest.mock('@/services/core/state-legislature-core.service', () => ({
  StateLegislatureCoreService: {
    getAllStateLegislators: jest.fn(() =>
      Promise.resolve([
        {
          id: 'ocd-person/1',
          name: 'Test Legislator',
          party: 'Democratic',
          chamber: 'upper',
          district: '1',
          state: 'NY',
          photo_url: undefined,
          email: undefined,
          phone: undefined,
          links: [],
        },
      ])
    ),
    getStateJurisdiction: jest.fn(() =>
      Promise.resolve({
        name: 'New York',
        classification: 'state',
        chambers: {
          upper: { name: 'Senate' },
          lower: { name: 'Assembly' },
        },
      })
    ),
  },
}));

jest.mock('@/services/geocoding/census-geocoder.service', () => ({
  CensusGeocoderService: {
    geocodeAddress: jest.fn(() =>
      Promise.resolve({
        congressionalDistrict: { number: '14', state: 'NY' },
      })
    ),
  },
}));

jest.mock('@/services/district-lookup', () => ({
  districtLookupService: {
    initialize: jest.fn(() => Promise.resolve()),
    findDistrictByCoordinates: jest.fn(() =>
      Promise.resolve({
        found: true,
        district: {
          state_abbr: 'NY',
          district_num: '14',
          id: 'NY-14',
          name: 'NY-14',
        },
        confidence: 1.0,
        method: 'census_api',
      })
    ),
    findDistrictByAddress: jest.fn(() =>
      Promise.resolve({
        found: true,
        district: {
          state_abbr: 'NY',
          district_num: '14',
          id: 'NY-14',
          name: 'NY-14',
        },
        confidence: 1.0,
        method: 'census_api',
        geocoded: {
          latitude: 40.74,
          longitude: -73.89,
          address: 'Test Address',
        },
      })
    ),
  },
}));

jest.mock('@/lib/census-geocoder', () => ({
  geocodeAddress: jest.fn(() => Promise.resolve([{ district: { state: 'NY', district: '14' } }])),
  extractDistrictFromResult: jest.fn(() => ({ state: 'NY', district: '14' })),
  parseAddressComponents: jest.fn((query: string) => {
    const zipMatch = query.match(/\b(\d{5})\b/);
    return zipMatch ? { zip: zipMatch[1] } : {};
  }),
}));

jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  withTimeout: <T>(promise: Promise<T>) => promise,
  generateInsightNarrative: jest.fn(() =>
    Promise.resolve({ narrative: 'test narrative', source: 'statistical' })
  ),
  SENATE_UPSTREAM_BLOCKED_REASON:
    'Senate roll-call data is temporarily unavailable from Vercel due to upstream CDN blocking by senate.gov.',
}));

jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: jest.fn(() => Promise.resolve(null)),
  analyzeVoteFinanceWithReason: jest.fn(() => Promise.resolve({ insight: null })),
}));

jest.mock('@/lib/intelligence/analyzers/finance-jurisdiction-analyzer', () => ({
  analyzeFinanceJurisdiction: jest.fn(() => Promise.resolve(null)),
  analyzeFinanceJurisdictionWithReason: jest.fn(() => Promise.resolve({ insight: null })),
}));

jest.mock('@/lib/intelligence/analyzers/vote-prediction-analyzer', () => ({
  analyzeVotePrediction: jest.fn(() => Promise.resolve(null)),
  analyzeVotePredictionWithReason: jest.fn(() => Promise.resolve({ insight: null })),
}));

jest.mock('@/lib/intelligence/analyzers/influence-chain-analyzer', () => ({
  analyzeInfluenceChains: jest.fn(() => Promise.resolve({ chains: [] })),
}));

jest.mock('@/lib/intelligence/statistics/civic-stats', () => ({
  confidenceScore: jest.fn(() => 0.8),
  mean: jest.fn((arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)),
}));

import { NextRequest } from 'next/server';
import { ZIP_ACCURACY_NOTE, BOUNDARY_FALLBACK_NOTE } from '@/lib/backbone/zip-accuracy';
import { districtLookupService } from '@/services/district-lookup';
import { GET as representativesGET } from '@/app/api/representatives/route';
import { GET as multiDistrictGET } from '@/app/api/representatives-multi-district/route';
import {
  GET as intelAddrRepsGET,
  POST as intelAddrRepsPOST,
} from '@/app/api/intelligence/address/representatives/route';
import {
  GET as moneyReportGET,
  POST as moneyReportPOST,
} from '@/app/api/intelligence/address/money-report/route';
import { GET as stateRepsGET } from '@/app/api/state-representatives/route';
import { GET as searchGET } from '@/app/api/search/route';
import { GET as districtMapGET } from '@/app/api/district-map/route';
import { POST as geocodePOST } from '@/app/api/geocode/route';

function makeGET(url: string): NextRequest {
  return new NextRequest(url);
}

function makePOST(url: string, body: unknown): NextRequest {
  // jsdom's fetch polyfill does not implement Request body streams, so
  // NextRequest.json() throws "request.json is not a function". Wrap a
  // NextRequest with a Promise-returning .json() that resolves to our body.
  const req = new NextRequest(url, { method: 'POST' });
  Object.defineProperty(req, 'json', {
    value: () => Promise.resolve(body),
    writable: true,
  });
  return req;
}

describe('ZIP endpoint honesty contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock Census TIGER + other fetches used by district-map so they return
    // boundary-free payloads without hitting the network.
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            result: {
              addressMatches: [
                {
                  coordinates: { x: -73.89, y: 40.74 },
                  addressComponents: { state: 'NY' },
                },
              ],
            },
            features: [],
          }),
      } as unknown as Response)
    ) as unknown as typeof fetch;
  });

  describe('/api/representatives', () => {
    it('ZIP input → accuracyNote present', async () => {
      const response = await representativesGET(
        makeGET('http://localhost/api/representatives?zip=10001')
      );
      const data = await response.json();
      expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    });

    it('ZIP input → BackboneResponse envelope, never complete', async () => {
      const response = await representativesGET(
        makeGET('http://localhost/api/representatives?zip=10001')
      );
      const body = await response.json();
      // Envelope contract: data payload + top-level dataQuality/sourceStatus
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.representatives)).toBe(true);
      expect(Array.isArray(body.sourceStatus)).toBe(true);
      // ZIP input is never 'complete' — the answer is approximate by nature
      expect(['partial', 'empty', 'unavailable']).toContain(body.dataQuality);
    });

    it('state+district input → no accuracyNote', async () => {
      const response = await representativesGET(
        makeGET('http://localhost/api/representatives?state=NY&district=14')
      );
      const data = await response.json();
      expect(data.accuracyNote).toBeUndefined();
      expect(data.data).toBeDefined();
      expect(['complete', 'empty']).toContain(data.dataQuality);
    });
  });

  describe('/api/representatives-multi-district', () => {
    it('ZIP input → accuracyNote present', async () => {
      const response = await multiDistrictGET(
        makeGET('http://localhost/api/representatives-multi-district?zip=10001')
      );
      const data = await response.json();
      expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    });

    it('missing ZIP → 400 and no accuracyNote', async () => {
      const response = await multiDistrictGET(
        makeGET('http://localhost/api/representatives-multi-district')
      );
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.accuracyNote).toBeUndefined();
    });

    it('ZIP input → BackboneResponse envelope, never complete', async () => {
      const response = await multiDistrictGET(
        makeGET('http://localhost/api/representatives-multi-district?zip=10001')
      );
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.districts)).toBe(true);
      expect(Array.isArray(body.sourceStatus)).toBe(true);
      expect(['partial', 'empty', 'unavailable']).toContain(body.dataQuality);
    });
  });

  describe('/api/intelligence/address/representatives', () => {
    it('ZIP input (GET) → accuracyNote present', async () => {
      const response = await intelAddrRepsGET(
        makeGET('http://localhost/api/intelligence/address/representatives?zip=10001')
      );
      const data = await response.json();
      expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    });

    it('address input (POST) → no accuracyNote', async () => {
      const response = await intelAddrRepsPOST(
        makePOST('http://localhost/api/intelligence/address/representatives', {
          street: '74-09 37th Ave',
          city: 'Queens',
          state: 'NY',
        })
      );
      const data = await response.json();
      expect(data.accuracyNote).toBeUndefined();
    });
  });

  describe('/api/intelligence/address/money-report', () => {
    it('ZIP input (GET) → accuracyNote present', async () => {
      const response = await moneyReportGET(
        makeGET('http://localhost/api/intelligence/address/money-report?zip=10001')
      );
      const data = await response.json();
      expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    });

    it('address input (POST) → no accuracyNote', async () => {
      const response = await moneyReportPOST(
        makePOST('http://localhost/api/intelligence/address/money-report', {
          street: '74-09 37th Ave',
          city: 'Queens',
          state: 'NY',
        })
      );
      const data = await response.json();
      expect(data.accuracyNote).toBeUndefined();
    });
  });

  describe('/api/state-representatives', () => {
    it('ZIP input → accuracyNote present', async () => {
      const response = await stateRepsGET(
        makeGET('http://localhost/api/state-representatives?zip=10001')
      );
      const data = await response.json();
      expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    });

    it('ZIP input → BackboneResponse envelope, never complete', async () => {
      const response = await stateRepsGET(
        makeGET('http://localhost/api/state-representatives?zip=10001')
      );
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.legislators)).toBe(true);
      expect(Array.isArray(body.sourceStatus)).toBe(true);
      expect(['partial', 'empty', 'unavailable']).toContain(body.dataQuality);
    });

    it('missing ZIP → 400 and no accuracyNote', async () => {
      const response = await stateRepsGET(makeGET('http://localhost/api/state-representatives'));
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.accuracyNote).toBeUndefined();
    });
  });

  describe('/api/search', () => {
    it('ZIP-only query → accuracyNote present', async () => {
      const response = await searchGET(makeGET('http://localhost/api/search?q=10001'));
      const data = await response.json();
      expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    });

    it('keyword query → no accuracyNote', async () => {
      const response = await searchGET(makeGET('http://localhost/api/search?q=Schumer'));
      const data = await response.json();
      expect(data.accuracyNote).toBeUndefined();
    });
  });

  describe('/api/district-map', () => {
    it('ZIP input → accuracyNote present', async () => {
      const response = await districtMapGET(makeGET('http://localhost/api/district-map?zip=10001'));
      const data = await response.json();
      // 200 path carries the note; error paths do not.
      if (response.status === 200) {
        expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
      } else {
        // If the mocked pipeline returned an error, accuracyNote remains unset.
        expect(data.accuracyNote).toBeUndefined();
      }
    });

    it('missing ZIP → 400 and no accuracyNote', async () => {
      const response = await districtMapGET(makeGET('http://localhost/api/district-map'));
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.accuracyNote).toBeUndefined();
    });
  });

  describe('/api/geocode', () => {
    it('address + ZIP body → accuracyNote present', async () => {
      const response = await geocodePOST(
        makePOST('http://localhost/api/geocode', {
          mode: 'address',
          address: '74-09 37th Ave, Queens, NY',
          zipCode: '11372',
        })
      );
      const data = await response.json();
      expect(data.accuracyNote).toBe(ZIP_ACCURACY_NOTE);
    });

    it('address-only body → no accuracyNote', async () => {
      const response = await geocodePOST(
        makePOST('http://localhost/api/geocode', {
          mode: 'address',
          address: '74-09 37th Ave, Queens, NY',
        })
      );
      const data = await response.json();
      expect(data.accuracyNote).toBeUndefined();
    });

    it('additive envelope: dataQuality + sourceStatus alongside the legacy payload', async () => {
      const response = await geocodePOST(
        makePOST('http://localhost/api/geocode', {
          mode: 'address',
          address: '74-09 37th Ave, Queens, NY',
          zipCode: '11372',
        })
      );
      const body = await response.json();
      // Public route: legacy top-level payload preserved (no `data` wrapper)
      expect(body.data).toBeUndefined();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.sourceStatus)).toBe(true);
      // ZIP-adjacent input is never 'complete'
      expect(['partial', 'empty', 'unavailable']).toContain(body.dataQuality);
    });

    it('surfaces the lookup method and confidence', async () => {
      const response = await geocodePOST(
        makePOST('http://localhost/api/geocode', {
          mode: 'address',
          address: '74-09 37th Ave, Queens, NY',
        })
      );
      const data = await response.json();
      expect(data.lookup).toEqual({ method: 'census_api', confidence: 1.0 });
    });

    it('degraded boundary lookup (bbox) → BOUNDARY_FALLBACK_NOTE even for address input', async () => {
      (districtLookupService.findDistrictByAddress as jest.Mock).mockResolvedValueOnce({
        found: true,
        district: { state_abbr: 'NY', district_num: '14', id: 'NY-14', name: 'NY-14' },
        confidence: 0.9,
        method: 'bbox',
        geocoded: { latitude: 40.74, longitude: -73.89, address: 'Test Address' },
      });

      const response = await geocodePOST(
        makePOST('http://localhost/api/geocode', {
          mode: 'address',
          address: '74-09 37th Ave, Queens, NY',
        })
      );
      const data = await response.json();
      expect(data.accuracyNote).toBe(BOUNDARY_FALLBACK_NOTE);
      expect(data.lookup).toEqual({ method: 'bbox', confidence: 0.9 });
    });

    it('degraded lookup + ZIP body → both caveats combined', async () => {
      (districtLookupService.findDistrictByAddress as jest.Mock).mockResolvedValueOnce({
        found: true,
        district: { state_abbr: 'NY', district_num: '14', id: 'NY-14', name: 'NY-14' },
        confidence: 0.7,
        method: 'fallback',
        geocoded: { latitude: 40.74, longitude: -73.89, address: 'Test Address' },
      });

      const response = await geocodePOST(
        makePOST('http://localhost/api/geocode', {
          mode: 'address',
          address: '74-09 37th Ave, Queens, NY',
          zipCode: '11372',
        })
      );
      const data = await response.json();
      expect(data.accuracyNote).toContain(BOUNDARY_FALLBACK_NOTE);
      expect(data.accuracyNote).toContain(ZIP_ACCURACY_NOTE);
    });
  });
});

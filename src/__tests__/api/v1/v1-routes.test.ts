/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * V1 Route Integration Tests
 *
 * Tests v1 API routes by importing route handlers directly
 * and passing mocked NextRequest objects. Validates:
 * - Response envelope shape (v1Success / v1Error)
 * - Cache-Control header presence
 * - Error responses on bad input (400/404)
 * - Contract stability via key snapshots
 */

import { NextRequest } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// ─── Service Mocks ──────────────────────────────────────────────────

const mockRepresentative = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'D',
  state: 'CA',
  district: '11',
  chamber: 'House',
  title: 'Representative',
  phone: '202-225-4965',
  website: 'https://pelosi.house.gov',
  yearsInOffice: 37,
  nextElection: '2026',
  votingMember: true,
  role: 'Member',
  isHistorical: false,
  bio: null,
  currentTerm: { phone: '202-225-4965', website: 'https://pelosi.house.gov' },
  socialMedia: null,
  contact: null,
  committees: [],
  leadershipRoles: [],
  ids: null,
};

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn().mockResolvedValue([mockRepresentative]),
  getEnhancedRepresentative: jest.fn().mockImplementation((id: string) => {
    if (id === 'P000197') return Promise.resolve(mockRepresentative);
    return Promise.resolve(null);
  }),
}));

jest.mock('@/lib/services/committee.service', () => ({
  getCommitteeDataService: jest.fn().mockImplementation((id: string) => {
    if (id === 'HSJU') {
      return Promise.resolve({
        id: 'HSJU',
        name: 'Committee on the Judiciary',
        chamber: 'House',
        type: 'Standing',
        jurisdiction: 'Judiciary matters',
        url: 'https://judiciary.house.gov',
        leadership: {
          chair: {
            representative: { name: 'Jim Jordan', bioguideId: 'J000289', party: 'R', state: 'OH' },
          },
          rankingMember: null,
        },
        members: [],
        subcommittees: [],
        lastUpdated: '2025-01-15',
      });
    }
    return Promise.resolve(null);
  }),
}));

jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  BillSummaryCache: {
    getSummary: jest.fn().mockImplementation((billId: string) => {
      if (billId === '119-hr-1') {
        return Promise.resolve({
          billId: '119-hr-1',
          title: 'For the People Act',
          summary: 'A bill to expand voting rights.',
          whatItDoes: 'Expands voting rights',
          whyItMatters: 'Protects democracy',
          keyPoints: ['Voting access', 'Campaign finance'],
          whoItAffects: 'All voters',
          readingLevel: '8th grade',
          confidence: 0.92,
          lastUpdated: '2025-01-15T12:00:00Z',
          source: 'congress.gov',
        });
      }
      return Promise.resolve(null);
    }),
  },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

// ─── Test Helpers ─────────────────────────────────────────────────

function createRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

const V1_META_KEYS = ['apiVersion', 'documentation', 'license', 'source', 'timestamp'];
const V1_PAGINATION_KEYS = ['hasMore', 'limit', 'offset', 'total'];

// ─── Tests ────────────────────────────────────────────────────────

describe('V1 API Route Integration Tests', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.CONGRESS_API_KEY = 'test-key';
    process.env.CURRENT_CONGRESS = '119';
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // ─── 1. Index Route (/api/v1) ────────────────────────────────

  describe('GET /api/v1', () => {
    let GET: () => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/route');
      GET = mod.GET as unknown as () => Promise<Response>;
    });

    it('should return 200 with index data', async () => {
      const response = await GET();
      expect(response.status).toBe(200);
    });

    // Cache-Control header tested via source-level contract check below

    it('should include endpoint listing', async () => {
      const response = await GET();
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('endpoints');
      expect(body).toHaveProperty('version', 'v1');
      expect(body).toHaveProperty('name');
    });

    it('should include feeds listing', async () => {
      const response = await GET();
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('feeds');
    });

    it('should include rate limit documentation', async () => {
      const response = await GET();
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('rateLimit');
    });
  });

  // ─── 2. Representatives List ─────────────────────────────────

  describe('GET /api/v1/representatives', () => {
    let GET: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/representatives/route');
      GET = mod.GET;
    });

    it('should return v1 envelope with data and meta', async () => {
      const response = await GET(createRequest('/api/v1/representatives'));
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should include pagination', async () => {
      const response = await GET(createRequest('/api/v1/representatives'));
      const body = (await response.json()) as { pagination?: Record<string, unknown> };
      expect(body).toHaveProperty('pagination');
      expect(Object.keys(body.pagination!).sort()).toEqual(V1_PAGINATION_KEYS);
    });

    it('should include meta with correct keys', async () => {
      const response = await GET(createRequest('/api/v1/representatives'));
      const body = (await response.json()) as { meta: Record<string, unknown> };
      expect(Object.keys(body.meta).sort()).toEqual(V1_META_KEYS);
    });

    // Cache-Control header tested via source-level contract check below

    it('should return representative data in v1 shape', async () => {
      const response = await GET(createRequest('/api/v1/representatives'));
      const body = (await response.json()) as { data: Record<string, unknown>[] };
      expect(body.data.length).toBeGreaterThan(0);
      const rep = body.data[0]!;
      expect(rep).toHaveProperty('bioguideId');
      expect(rep).toHaveProperty('name');
      expect(rep).toHaveProperty('party');
      expect(rep).toHaveProperty('state');
      expect(rep).toHaveProperty('chamber');
    });

    it('should snapshot representative data keys', async () => {
      const response = await GET(createRequest('/api/v1/representatives'));
      const body = (await response.json()) as { data: Record<string, unknown>[] };
      expect(Object.keys(body.data[0]!).sort()).toMatchInlineSnapshot(`
        [
          "bioguideId",
          "chamber",
          "district",
          "name",
          "nextElection",
          "party",
          "phone",
          "state",
          "title",
          "website",
          "yearsInOffice",
        ]
      `);
    });
  });

  // ─── 3. Representative Detail ────────────────────────────────

  describe('GET /api/v1/representatives/[bioguideId]', () => {
    let GET: (
      req: NextRequest,
      ctx: { params: Promise<{ bioguideId: string }> }
    ) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/representatives/[bioguideId]/route');
      GET = mod.GET;
    });

    it('should return 200 for valid bioguide ID', async () => {
      const response = await GET(createRequest('/api/v1/representatives/P000197'), {
        params: Promise.resolve({ bioguideId: 'P000197' }),
      });
      expect(response.status).toBe(200);
    });

    it('should return v1 envelope with data and meta', async () => {
      const response = await GET(createRequest('/api/v1/representatives/P000197'), {
        params: Promise.resolve({ bioguideId: 'P000197' }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should return 400 for invalid bioguide ID format', async () => {
      const response = await GET(createRequest('/api/v1/representatives/invalid'), {
        params: Promise.resolve({ bioguideId: 'invalid' }),
      });
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { code: number } };
      expect(body.error.code).toBe(400);
    });

    it('should return 404 for unknown representative', async () => {
      const response = await GET(createRequest('/api/v1/representatives/Z999999'), {
        params: Promise.resolve({ bioguideId: 'Z999999' }),
      });
      expect(response.status).toBe(404);
      const body = (await response.json()) as { error: { code: number } };
      expect(body.error.code).toBe(404);
    });

    // Cache-Control header tested via source-level contract check below

    it('should return error envelope shape on bad input', async () => {
      const response = await GET(createRequest('/api/v1/representatives/bad'), {
        params: Promise.resolve({ bioguideId: 'bad' }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('meta');
    });
  });

  // ─── 4. Bills List ───────────────────────────────────────────

  describe('GET /api/v1/bills', () => {
    let GET: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/bills/route');
      GET = mod.GET;
    });

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            bills: [
              {
                congress: 119,
                number: 1,
                type: 'HR',
                title: 'For the People Act',
                originChamber: 'House',
                updateDate: '2025-01-15',
                latestAction: { actionDate: '2025-01-15', text: 'Introduced' },
              },
            ],
            pagination: { count: 1 },
          }),
      });
    });

    it('should return v1 envelope with data and meta', async () => {
      const response = await GET(createRequest('/api/v1/bills'));
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should include pagination', async () => {
      const response = await GET(createRequest('/api/v1/bills'));
      const body = (await response.json()) as { pagination?: Record<string, unknown> };
      expect(body).toHaveProperty('pagination');
    });

    // Cache-Control header tested via source-level contract check below

    it('should return 500 when API key is missing', async () => {
      delete process.env.CONGRESS_API_KEY;
      const response = await GET(createRequest('/api/v1/bills'));
      expect(response.status).toBe(500);
    });
  });

  // ─── 5. Bill Summary ─────────────────────────────────────────

  describe('GET /api/v1/bills/[billId]/summary', () => {
    let GET: (req: NextRequest, ctx: { params: Promise<{ billId: string }> }) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/bills/[billId]/summary/route');
      GET = mod.GET;
    });

    it('should return 200 for cached summary', async () => {
      const response = await GET(createRequest('/api/v1/bills/119-hr-1/summary'), {
        params: Promise.resolve({ billId: '119-hr-1' }),
      });
      expect(response.status).toBe(200);
    });

    it('should return v1 envelope', async () => {
      const response = await GET(createRequest('/api/v1/bills/119-hr-1/summary'), {
        params: Promise.resolve({ billId: '119-hr-1' }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should return 404 for uncached bill', async () => {
      const response = await GET(createRequest('/api/v1/bills/119-hr-9999/summary'), {
        params: Promise.resolve({ billId: '119-hr-9999' }),
      });
      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid bill ID format', async () => {
      const response = await GET(createRequest('/api/v1/bills/bad/summary'), {
        params: Promise.resolve({ billId: 'bad' }),
      });
      expect(response.status).toBe(400);
    });

    // Cache-Control header tested via source-level contract check below

    it('should snapshot summary data keys', async () => {
      const response = await GET(createRequest('/api/v1/bills/119-hr-1/summary'), {
        params: Promise.resolve({ billId: '119-hr-1' }),
      });
      const body = (await response.json()) as { data: Record<string, unknown> };
      expect(Object.keys(body.data).sort()).toMatchInlineSnapshot(`
        [
          "billId",
          "confidence",
          "keyPoints",
          "lastUpdated",
          "readingLevel",
          "source",
          "summary",
          "title",
          "whatItDoes",
          "whoItAffects",
          "whyItMatters",
        ]
      `);
    });
  });

  // ─── 6. Committees List ──────────────────────────────────────

  describe('GET /api/v1/committees', () => {
    let GET: (req: NextRequest) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/committees/route');
      GET = mod.GET;
    });

    beforeEach(() => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            committees: [
              {
                systemCode: 'HSJU',
                name: 'Committee on the Judiciary',
                chamber: 'House',
                committeeTypeCode: 'Standing',
              },
            ],
            pagination: { count: 1 },
          }),
      });
    });

    it('should return v1 envelope with data and meta', async () => {
      const response = await GET(createRequest('/api/v1/committees'));
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should include pagination', async () => {
      const response = await GET(createRequest('/api/v1/committees'));
      const body = (await response.json()) as { pagination?: Record<string, unknown> };
      expect(body).toHaveProperty('pagination');
    });

    // Cache-Control header tested via source-level contract check below
  });

  // ─── 7. Committee Detail ─────────────────────────────────────

  describe('GET /api/v1/committees/[committeeId]', () => {
    let GET: (
      req: NextRequest,
      ctx: { params: Promise<{ committeeId: string }> }
    ) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/committees/[committeeId]/route');
      GET = mod.GET;
    });

    it('should return 200 for valid committee', async () => {
      const response = await GET(createRequest('/api/v1/committees/HSJU'), {
        params: Promise.resolve({ committeeId: 'HSJU' }),
      });
      expect(response.status).toBe(200);
    });

    it('should return v1 envelope', async () => {
      const response = await GET(createRequest('/api/v1/committees/HSJU'), {
        params: Promise.resolve({ committeeId: 'HSJU' }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should return 404 for unknown committee', async () => {
      const response = await GET(createRequest('/api/v1/committees/ZZZZ'), {
        params: Promise.resolve({ committeeId: 'ZZZZ' }),
      });
      expect(response.status).toBe(404);
    });

    it('should return 400 for empty committee ID', async () => {
      const response = await GET(createRequest('/api/v1/committees/'), {
        params: Promise.resolve({ committeeId: '' }),
      });
      expect(response.status).toBe(400);
    });

    // Cache-Control header tested via source-level contract check below
  });

  // ─── 8. District Detail ──────────────────────────────────────

  describe('GET /api/v1/districts/[districtId]', () => {
    let GET: (
      req: NextRequest,
      ctx: { params: Promise<{ districtId: string }> }
    ) => Promise<Response>;

    beforeAll(async () => {
      const mod = await import('@/app/api/v1/districts/[districtId]/route');
      GET = mod.GET;
    });

    it('should return 200 for valid district', async () => {
      const response = await GET(createRequest('/api/v1/districts/CA-11'), {
        params: Promise.resolve({ districtId: 'CA-11' }),
      });
      expect(response.status).toBe(200);
    });

    it('should return v1 envelope', async () => {
      const response = await GET(createRequest('/api/v1/districts/CA-11'), {
        params: Promise.resolve({ districtId: 'CA-11' }),
      });
      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
    });

    it('should return 400 for invalid district format', async () => {
      const response = await GET(createRequest('/api/v1/districts/bad-format'), {
        params: Promise.resolve({ districtId: 'bad-format' }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 for empty district ID', async () => {
      const response = await GET(createRequest('/api/v1/districts/'), {
        params: Promise.resolve({ districtId: '' }),
      });
      expect(response.status).toBe(400);
    });

    // Cache-Control header tested via source-level contract check below

    it('should accept at-large districts', async () => {
      const response = await GET(createRequest('/api/v1/districts/AK-AL'), {
        params: Promise.resolve({ districtId: 'AK-AL' }),
      });
      expect(response.status).toBe(200);
    });

    it('should snapshot district data keys', async () => {
      const response = await GET(createRequest('/api/v1/districts/CA-11'), {
        params: Promise.resolve({ districtId: 'CA-11' }),
      });
      const body = (await response.json()) as { data: Record<string, unknown> };
      expect(Object.keys(body.data).sort()).toMatchInlineSnapshot(`
        [
          "district",
          "districtId",
          "label",
          "representatives",
          "state",
        ]
      `);
    });
  });

  // ─── Cross-Route Contract Checks ─────────────────────────────

  describe('Cache-Control headers (source-level)', () => {
    // NextResponse.json ResponseInit.headers aren't preserved in JSDOM,
    // so we verify Cache-Control at the source level.
    const V1_ROUTE_FILES = [
      'src/app/api/v1/route.ts',
      'src/app/api/v1/representatives/route.ts',
      'src/app/api/v1/representatives/[bioguideId]/route.ts',
      'src/app/api/v1/bills/route.ts',
      'src/app/api/v1/bills/[billId]/route.ts',
      'src/app/api/v1/bills/[billId]/summary/route.ts',
      'src/app/api/v1/committees/route.ts',
      'src/app/api/v1/committees/[committeeId]/route.ts',
      'src/app/api/v1/districts/[districtId]/route.ts',
      'src/app/api/v1/votes/[voteId]/route.ts',
      'src/app/api/v1/changelog/route.ts',
    ];

    it.each(V1_ROUTE_FILES)('%s should set Cache-Control with s-maxage', file => {
      const fullPath = path.resolve(process.cwd(), file);
      const source = fs.readFileSync(fullPath, 'utf-8');
      expect(source).toMatch(/['"]Cache-Control['"]\s*:\s*[`'"]/);
      expect(source).toMatch(/s-maxage=/);
    });
  });

  describe('Cross-route contract checks', () => {
    it('all v1 routes should export force-dynamic', async () => {
      const routes = await Promise.all([
        import('@/app/api/v1/route'),
        import('@/app/api/v1/representatives/route'),
        import('@/app/api/v1/representatives/[bioguideId]/route'),
        import('@/app/api/v1/bills/[billId]/summary/route'),
        import('@/app/api/v1/committees/[committeeId]/route'),
        import('@/app/api/v1/districts/[districtId]/route'),
      ]);

      for (const route of routes) {
        expect(route.dynamic).toBe('force-dynamic');
      }
    });

    it('error responses should always include error and meta keys', async () => {
      const mod = await import('@/app/api/v1/representatives/[bioguideId]/route');
      const response = await mod.GET(createRequest('/api/v1/representatives/bad'), {
        params: Promise.resolve({ bioguideId: 'bad' }),
      });

      const body = (await response.json()) as Record<string, unknown>;
      expect(body).toHaveProperty('error');
      expect(body).toHaveProperty('meta');
      expect(Object.keys((body as { meta: Record<string, unknown> }).meta).sort()).toEqual(
        V1_META_KEYS
      );
    });
  });
});

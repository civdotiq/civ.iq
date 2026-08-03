/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The IE half of the race total comes from schedule_e/by_candidate, which
 * paginates. A single page silently under-reports a contested race, so these
 * cover the walk and, when the walk stops short, the incompleteness signal that
 * keeps a floor from being cached and read as the total.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockReserveFecCall = jest.fn();
jest.mock('@/lib/fec/fec-rate-limiter', () => ({
  reserveFecCall: () => mockReserveFecCall(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/elections/[id]/total-spent/route';

const CANDIDATE = 'S4CA00123';

function ieRows(count: number, total: number) {
  return Array.from({ length: count }, () => ({
    candidate_id: CANDIDATE,
    cycle: 2026,
    total,
    count: 1,
  }));
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body };
}

/**
 * Route every FEC call to a handler keyed by endpoint. Disbursements are held
 * flat so the assertions read against the IE walk alone.
 */
function mockFec(ieByPage: (page: number) => unknown): jest.Mock {
  const fetchMock = jest.fn(async (url: string) => {
    if (url.includes('/candidate/')) {
      return jsonResponse({ results: [{ disbursements: 1_000 }] });
    }
    const page = Number(new URL(url).searchParams.get('page') ?? '1');
    return jsonResponse(ieByPage(page));
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function request(): NextRequest {
  return new NextRequest(
    `https://civdotiq.org/api/elections/CA-SEN/total-spent?ids=${CANDIDATE}&cycle=2026`
  );
}

const params = Promise.resolve({ id: 'CA-SEN' });

describe('GET /api/elections/[id]/total-spent', () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.FEC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FEC_API_KEY = 'test-key';
    mockReserveFecCall.mockResolvedValue({ allowed: true, count: 1, ceiling: 60 });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FEC_API_KEY;
    else process.env.FEC_API_KEY = originalKey;
  });

  it('sums a single short page and reports a complete total', async () => {
    mockFec(() => ({ results: ieRows(3, 5_000), pagination: { pages: 1 } }));

    const body = await (await GET(request(), { params })).json();

    expect(body.breakdown.independentExpenditures).toBe(15_000);
    expect(body.incomplete).toBeUndefined();
  });

  it('walks every page of a contested race instead of summing only the first', async () => {
    // 250 rows across 3 pages. A one-page read would report 100 rows.
    const fetchMock = mockFec(page => ({
      results: ieRows(page < 3 ? 100 : 50, 1_000),
      pagination: { pages: 3 },
    }));

    const body = await (await GET(request(), { params })).json();

    const iePages = fetchMock.mock.calls.filter(c => String(c[0]).includes('schedule_e'));
    expect(iePages).toHaveLength(3);
    expect(body.breakdown.independentExpenditures).toBe(250_000);
    expect(body.incomplete).toBeUndefined();
  });

  it('flags the total incomplete when the page bound cuts the walk short', async () => {
    // FEC says there are 40 pages; the route reads 4 and must say so rather
    // than publish the floor as the race total.
    const fetchMock = mockFec(() => ({
      results: ieRows(100, 1_000),
      pagination: { pages: 40 },
    }));

    const response = await GET(request(), { params });
    const body = await response.json();

    const iePages = fetchMock.mock.calls.filter(c => String(c[0]).includes('schedule_e'));
    expect(iePages).toHaveLength(4);
    expect(body.incomplete).toBe(true);
    expect(body.truncatedCandidates).toBe(1);
    expect(response.status).toBe(200);
  });

  it('still reports incomplete when one candidate lookup fails outright', async () => {
    const other = 'S4CA00456';
    global.fetch = jest.fn(async (url: string) => {
      if (url.includes('/candidate/')) {
        return jsonResponse({ results: [{ disbursements: 1_000 }] });
      }
      // Only the second candidate's IE lookup fails; a race where every lookup
      // fails is a 502 and is covered by the route's own guard.
      if (url.includes(other)) return { ok: false, status: 500, json: async () => ({}) };
      return jsonResponse({ results: ieRows(2, 4_000), pagination: { pages: 1 } });
    }) as unknown as typeof fetch;

    const body = await (
      await GET(
        new NextRequest(
          `https://civdotiq.org/api/elections/CA-SEN/total-spent?ids=${CANDIDATE},${other}&cycle=2026`
        ),
        { params }
      )
    ).json();

    expect(body.incomplete).toBe(true);
    expect(body.failedCandidates).toBe(1);
    expect(body.truncatedCandidates).toBe(0);
  });
});

/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Congress.gov occasionally stalls for minutes at a time. With no fetch
 * timeout, /api/v1/bills/[billId] and /api/feed/bill/[billId] hung until the
 * 20s function cap and returned 504 — to Googlebot among others. A stall must
 * end in a fast 503 with Retry-After instead.
 *
 * Congress.gov also lists a bare "Intro-S" action with no text beside
 * "Introduced in Senate"; the feed crashed on it with a 500.
 */

import { NextRequest } from 'next/server';
import { GET as getV1Bill } from '@/app/api/v1/bills/[billId]/route';
import { GET as getBillFeed } from '@/app/api/feed/bill/[billId]/route';

// The global jest.setup mock of next/server drops headers and has no
// NextResponse constructor; these assertions need both.
jest.mock('next/server', () => {
  class _NextResponse {
    body: string | null;
    status: number;
    headers: Headers;

    constructor(
      body?: string | null,
      init?: { status?: number; headers?: Record<string, string> }
    ) {
      this.body = body ?? null;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }

    async text() {
      return this.body ?? '';
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new _NextResponse(JSON.stringify(data), init);
    }
  }

  class _NextRequest {
    url: string;
    constructor(url: string) {
      this.url = url;
    }
  }

  return { NextResponse: _NextResponse, NextRequest: _NextRequest };
});

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const BILL_ID = '119-s-3362';
const ctx = { params: Promise.resolve({ billId: BILL_ID }) };

const timeoutError = () =>
  new DOMException('The operation was aborted due to timeout', 'TimeoutError');

const jsonResponse = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;

beforeAll(() => {
  process.env.CONGRESS_API_KEY = 'test-key';
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('GET /api/v1/bills/[billId]', () => {
  it('passes a timeout signal to Congress.gov', async () => {
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(
        jsonResponse({ bill: { congress: 119, type: 'S', number: '3362', title: 'T' } })
      );

    await getV1Bill(new NextRequest(`https://civdotiq.org/api/v1/bills/${BILL_ID}`), ctx);

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('returns 503 with Retry-After when Congress.gov times out', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(timeoutError());

    const res = await getV1Bill(
      new NextRequest(`https://civdotiq.org/api/v1/bills/${BILL_ID}`),
      ctx
    );

    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('120');
  });
});

describe('GET /api/feed/bill/[billId]', () => {
  it('returns 503 with Retry-After when Congress.gov times out', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(timeoutError());

    const res = await getBillFeed(
      new NextRequest(`https://civdotiq.org/api/feed/bill/${BILL_ID}`),
      ctx
    );

    expect(res.status).toBe(503);
    expect(res.headers.get('Retry-After')).toBe('120');
  });

  it('skips actions that have no text', async () => {
    jest.spyOn(global, 'fetch').mockImplementation(async input =>
      String(input).includes('/actions')
        ? jsonResponse({
            actions: [
              {
                actionDate: '2025-12-04',
                type: 'IntroReferral',
                text: 'Read twice and referred to the Committee on Finance.',
              },
              { actionDate: '2025-12-04', type: 'IntroReferral', actionCode: 'Intro-S' },
              { actionDate: '2025-12-04', type: 'IntroReferral', text: 'Introduced in Senate' },
            ],
          })
        : jsonResponse({ bill: { title: 'Health Marketplace and Savings Accounts for All Act' } })
    );

    const res = await getBillFeed(
      new NextRequest(`https://civdotiq.org/api/feed/bill/${BILL_ID}`),
      ctx
    );
    const xml = await res.text();

    expect(res.status).toBe(200);
    expect(xml.match(/<entry>/g)).toHaveLength(2);
    expect(xml).not.toContain('undefined');
  });
});

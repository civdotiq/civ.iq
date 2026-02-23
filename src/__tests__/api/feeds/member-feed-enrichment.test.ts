/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Member Feed Enrichment Tests
 *
 * Tests that the member Atom feed includes vote and sponsored-bill entries
 * and degrades gracefully when data is unavailable.
 */

// Mock next/server — define classes inside factory (jest.mock is hoisted)
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
    method: string;
    headers: Headers;
    nextUrl: URL;

    constructor(
      urlInput: string | URL,
      init?: { method?: string; headers?: Record<string, string> }
    ) {
      this.url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      this.method = init?.method ?? 'GET';
      this.headers = new Headers(init?.headers);
      this.nextUrl = new URL(this.url);
    }
  }

  return { NextResponse: _NextResponse, NextRequest: _NextRequest };
});

// Mock dependencies
const mockGetEnhancedRepresentative = jest.fn();
const mockGetVotesByMember = jest.fn();
const mockGetComprehensiveBillsByMember = jest.fn();

jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

jest.mock('@/features/representatives/services/congress-api', () => ({
  getVotesByMember: (...args: unknown[]) => mockGetVotesByMember(...args),
}));

jest.mock('@/services/congress/optimized-congress.service', () => ({
  getComprehensiveBillsByMember: (...args: unknown[]) => mockGetComprehensiveBillsByMember(...args),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { GET } from '@/app/api/feed/member/[bioguideId]/route';
import type { NextRequest } from 'next/server';

const MOCK_REP = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'D',
  state: 'CA',
  district: '11',
  chamber: 'House',
  title: 'Representative',
  currentTerm: { start: '2023-01-03', end: '2025-01-03' },
  committees: [{ name: 'Appropriations Committee', role: 'Member' }],
  leadershipRoles: [],
};

const MOCK_VOTES = [
  {
    voteId: 'house-119-100',
    question: 'On Passage: HR 1234',
    result: 'Passed',
    date: '2025-06-01',
    position: 'Yea',
    rollNumber: 100,
  },
  {
    voteId: 'house-119-101',
    question: 'On Motion: HR 5678',
    result: 'Failed',
    date: '2025-06-02',
    position: 'Nay',
    rollNumber: 101,
  },
];

const MOCK_BILLS = {
  bills: [
    {
      congress: 119,
      type: 'HR',
      number: '9999',
      title: 'Test Act of 2025',
      introducedDate: '2025-05-15',
      lastAction: 'Referred to committee',
    },
  ],
};

function makeRequest(
  bioguideId: string
): [NextRequest, { params: Promise<{ bioguideId: string }> }] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest: NR } = require('next/server');
  return [
    new NR(`https://civ.iq/api/feed/member/${bioguideId}`) as NextRequest,
    { params: Promise.resolve({ bioguideId }) },
  ];
}

describe('Member Feed Enrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnhancedRepresentative.mockResolvedValue(MOCK_REP);
    mockGetVotesByMember.mockResolvedValue(MOCK_VOTES);
    mockGetComprehensiveBillsByMember.mockResolvedValue(MOCK_BILLS);
  });

  it('should return valid Atom XML', async () => {
    const response = await GET(...makeRequest('P000197'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/atom+xml');

    const xml = await response.text();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
  });

  describe('vote entries', () => {
    it('should include vote entries in the feed', async () => {
      const response = await GET(...makeRequest('P000197'));
      const xml = await response.text();

      expect(xml).toContain('term="vote"');
      expect(xml).toContain('On Passage: HR 1234');
      expect(xml).toContain('voted Yea');
    });

    it('should include up to 10 votes', async () => {
      const manyVotes = Array.from({ length: 15 }, (_, i) => ({
        voteId: `house-119-${i}`,
        question: `Vote ${i}`,
        result: 'Passed',
        date: '2025-06-01',
        position: 'Yea',
        rollNumber: i,
      }));
      mockGetVotesByMember.mockResolvedValue(manyVotes);

      const response = await GET(...makeRequest('P000197'));
      const xml = await response.text();
      const voteCount = (xml.match(/term="vote"/g) || []).length;
      expect(voteCount).toBeLessThanOrEqual(10);
    });

    it('should degrade gracefully when votes fail', async () => {
      mockGetVotesByMember.mockRejectedValue(new Error('API timeout'));

      const response = await GET(...makeRequest('P000197'));
      expect(response.status).toBe(200);

      const xml = await response.text();
      // Feed still works with profile entries
      expect(xml).toContain('<entry>');
      expect(xml).toContain('term="role"');
    });
  });

  describe('sponsored bill entries', () => {
    it('should include sponsored bill entries', async () => {
      const response = await GET(...makeRequest('P000197'));
      const xml = await response.text();

      expect(xml).toContain('term="sponsored-bill"');
      expect(xml).toContain('Sponsored: Test Act of 2025');
    });

    it('should degrade gracefully when bills fail', async () => {
      mockGetComprehensiveBillsByMember.mockRejectedValue(new Error('API error'));

      const response = await GET(...makeRequest('P000197'));
      expect(response.status).toBe(200);

      const xml = await response.text();
      expect(xml).toContain('<entry>');
      expect(xml).toContain('term="role"');
    });
  });

  describe('combined feed', () => {
    it('should include role, vote, and bill entries together', async () => {
      const response = await GET(...makeRequest('P000197'));
      const xml = await response.text();

      expect(xml).toContain('term="role"');
      expect(xml).toContain('term="vote"');
      expect(xml).toContain('term="sponsored-bill"');
      expect(xml).toContain('term="committee"');
    });

    it('should still work when both votes and bills fail', async () => {
      mockGetVotesByMember.mockRejectedValue(new Error('timeout'));
      mockGetComprehensiveBillsByMember.mockRejectedValue(new Error('timeout'));

      const response = await GET(...makeRequest('P000197'));
      expect(response.status).toBe(200);

      const xml = await response.text();
      expect(xml).toContain('term="role"');
      expect(xml).not.toContain('term="vote"');
      expect(xml).not.toContain('term="sponsored-bill"');
    });
  });

  describe('validation', () => {
    it('should return 400 for invalid bioguide ID', async () => {
      const response = await GET(...makeRequest('invalid'));
      expect(response.status).toBe(400);
    });

    it('should return 404 when representative not found', async () => {
      mockGetEnhancedRepresentative.mockResolvedValue(null);
      const response = await GET(...makeRequest('X999999'));
      expect(response.status).toBe(404);
    });
  });
});

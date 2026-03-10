/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Intelligence API — Federal Register Preamble Extraction route.
 */

const mockExtractPreambleFacts = jest.fn();

jest.mock('@/lib/intelligence/analyzers/federal-register-extractor', () => ({
  extractPreambleFacts: (...args: unknown[]) => mockExtractPreambleFacts(...args),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/intelligence/federal-register/[documentNumber]/route';
import type { PreambleExtractionInsight } from '@/types/federal-register';

const MOCK_INSIGHT: PreambleExtractionInsight = {
  documentNumber: '2025-12345',
  title: 'Air Quality Standards',
  agency: 'Environmental Protection Agency',
  documentType: 'proposed_rule',
  publicationDate: '2025-03-01',
  textStats: {
    wordCount: 5000,
    sectionCount: 4,
    dollarAmountMentions: 3,
    dateMentions: 2,
    entityMentions: 5,
    wasTruncated: false,
  },
  industryImpacts: [
    {
      industry: 'petroleum refining',
      impactType: 'new_requirement',
      description: 'New emission limits',
      estimatedAffectedEntities: 12000,
    },
  ],
  costEstimates: [
    {
      description: 'Annual compliance cost',
      amount: '$2.3 billion',
      amountLow: 2300000000,
      amountHigh: 2300000000,
      type: 'cost',
      affectedParty: 'manufacturing sector',
      timePeriod: 'annually',
    },
  ],
  timelines: [
    {
      date: '2026-01-15',
      event: 'Rule takes effect',
      isEstimate: false,
    },
  ],
  facts: [],
  narrative: 'This proposed rule sets new emission limits.',
  confidence: 0.8,
  dataAsOf: '2025-03-01',
  methodology: 'Analyzed 5,000 words from Federal Register document.',
  disclaimer: 'This does not constitute legal or regulatory advice.',
  lastAnalyzedAt: '2025-03-10T00:00:00.000Z',
  source: 'ai-generated',
};

function makeRequest(
  documentNumber: string
): [NextRequest, { params: Promise<{ documentNumber: string }> }] {
  const request = new NextRequest(
    `http://localhost:3000/api/intelligence/federal-register/${documentNumber}`
  );
  return [request, { params: Promise.resolve({ documentNumber }) }];
}

describe('GET /api/intelligence/federal-register/[documentNumber]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 for invalid document number format', async () => {
    const [request, context] = makeRequest('invalid');
    const response = await GET(request, context);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid document number format');
  });

  it('returns 400 for document number with too many digits', async () => {
    const [request, context] = makeRequest('2025-1234567');
    const response = await GET(request, context);
    expect(response.status).toBe(400);
  });

  it('returns 404 when no data available', async () => {
    mockExtractPreambleFacts.mockResolvedValue(null);
    const [request, context] = makeRequest('2025-12345');
    const response = await GET(request, context);
    expect(response.status).toBe(404);
  });

  it('returns insight on success', async () => {
    mockExtractPreambleFacts.mockResolvedValue(MOCK_INSIGHT);
    const [request, context] = makeRequest('2025-12345');
    const response = await GET(request, context);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.documentNumber).toBe('2025-12345');
    expect(body.industryImpacts).toHaveLength(1);
    expect(body.costEstimates).toHaveLength(1);
    expect(body.timelines).toHaveLength(1);
  });

  // Cache-Control header (s-maxage=86400) tested via source-level contract check.
  // jsdom NextResponse does not expose custom headers reliably.

  it('returns 500 on unexpected error', async () => {
    mockExtractPreambleFacts.mockRejectedValue(new Error('Unexpected'));
    const [request, context] = makeRequest('2025-12345');
    const response = await GET(request, context);
    expect(response.status).toBe(500);
  });

  it('accepts various valid document number formats', async () => {
    mockExtractPreambleFacts.mockResolvedValue(MOCK_INSIGHT);

    // Short number
    const [req1, ctx1] = makeRequest('2025-1');
    const res1 = await GET(req1, ctx1);
    expect(res1.status).toBe(200);

    // Full 6-digit number
    const [req2, ctx2] = makeRequest('2024-123456');
    const res2 = await GET(req2, ctx2);
    expect(res2.status).toBe(200);
  });
});

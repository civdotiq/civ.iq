/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for PreambleInsightsSection component.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockUseSWR = jest.fn();
jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

import { PreambleInsightsSection } from '@/components/intelligence/PreambleInsightsSection';
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
      industry: 'Petroleum Refining',
      impactType: 'new_requirement',
      description: 'New emission limits for refinery operations',
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
    {
      description: 'Health benefits',
      amount: '$8.5 billion',
      amountLow: 8500000000,
      amountHigh: 8500000000,
      type: 'benefit',
      affectedParty: 'general public',
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
  narrative: 'This proposed rule sets new emission limits for industrial facilities.',
  confidence: 0.85,
  dataAsOf: '2025-03-01',
  methodology: 'Analyzed 5,000 words from Federal Register document.',
  disclaimer: 'This does not constitute legal or regulatory advice.',
  lastAnalyzedAt: '2025-03-10T00:00:00.000Z',
  source: 'ai-generated',
};

describe('PreambleInsightsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state', () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<PreambleInsightsSection documentNumber="2025-12345" />);
    // Loading placeholder renders structural borders without content
    expect(container.querySelector('.border-2')).toBeInTheDocument();
  });

  it('renders nothing when no data', () => {
    mockUseSWR.mockReturnValue({ data: null, isLoading: false });
    const { container } = render(<PreambleInsightsSection documentNumber="2025-12345" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders full insight with all sections', () => {
    mockUseSWR.mockReturnValue({ data: MOCK_INSIGHT, isLoading: false });
    render(<PreambleInsightsSection documentNumber="2025-12345" />);

    // Header
    expect(screen.getByText('Preamble Analysis')).toBeInTheDocument();

    // Key stats
    expect(screen.getByText('5,000')).toBeInTheDocument();
    expect(screen.getByText('Words analyzed')).toBeInTheDocument();

    // Narrative
    expect(
      screen.getByText('This proposed rule sets new emission limits for industrial facilities.')
    ).toBeInTheDocument();

    // Cost estimates
    expect(screen.getByRole('heading', { name: 'Cost estimates' })).toBeInTheDocument();
    expect(screen.getByText('$2.3 billion')).toBeInTheDocument();
    expect(screen.getByText('$8.5 billion')).toBeInTheDocument();

    // Industry impacts
    expect(screen.getByRole('heading', { name: 'Affected industries' })).toBeInTheDocument();
    expect(screen.getByText('Petroleum Refining')).toBeInTheDocument();
    expect(screen.getByText('New requirement')).toBeInTheDocument();
    expect(screen.getByText('~12,000 entities affected')).toBeInTheDocument();

    // Timeline
    expect(screen.getByRole('heading', { name: 'Key dates' })).toBeInTheDocument();
    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    expect(screen.getByText('Rule takes effect')).toBeInTheDocument();

    // Disclaimer
    expect(
      screen.getByText('This does not constitute legal or regulatory advice.')
    ).toBeInTheDocument();
  });

  it('renders cost type badges with correct labels', () => {
    mockUseSWR.mockReturnValue({ data: MOCK_INSIGHT, isLoading: false });
    render(<PreambleInsightsSection documentNumber="2025-12345" />);

    expect(screen.getByText('cost')).toBeInTheDocument();
    expect(screen.getByText('benefit')).toBeInTheDocument();
  });

  it('shows estimated tag on timeline entries', () => {
    const insightWithEstimate = {
      ...MOCK_INSIGHT,
      timelines: [{ date: '2026-Q2', event: 'Phase 2 compliance', isEstimate: true }],
    };
    mockUseSWR.mockReturnValue({ data: insightWithEstimate, isLoading: false });
    render(<PreambleInsightsSection documentNumber="2025-12345" />);

    expect(screen.getByText('(estimated)')).toBeInTheDocument();
  });

  it('hides sections when no data for them', () => {
    const minimalInsight = {
      ...MOCK_INSIGHT,
      industryImpacts: [],
      costEstimates: [],
      timelines: [],
      facts: [
        {
          category: 'legal_authority' as const,
          summary: 'Issued under Clean Air Act',
          sourceQuote: null,
          confidence: 0.9,
        },
      ],
    };
    mockUseSWR.mockReturnValue({ data: minimalInsight, isLoading: false });
    render(<PreambleInsightsSection documentNumber="2025-12345" />);

    expect(screen.queryByRole('heading', { name: 'Cost estimates' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Affected industries' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Key dates' })).not.toBeInTheDocument();
    // Should show "Facts extracted" as fallback key stat
    expect(screen.getByText('Facts extracted')).toBeInTheDocument();
  });

  it('passes correct URL to useSWR', () => {
    mockUseSWR.mockReturnValue({ data: null, isLoading: false });
    render(<PreambleInsightsSection documentNumber="2025-12345" />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      '/api/intelligence/federal-register/2025-12345',
      expect.any(Function),
      expect.objectContaining({ revalidateOnFocus: false })
    );
  });
});

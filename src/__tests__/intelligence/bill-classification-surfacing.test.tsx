/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { BillIntelligenceInsight } from '@/lib/intelligence/types';

// Mock SWR to return controlled data without network calls
let mockSWRData: BillIntelligenceInsight | undefined;
jest.mock('swr', () => ({
  __esModule: true,
  default: () => ({ data: mockSWRData, isLoading: false }),
}));

// Mock sub-components to isolate sector pill rendering
jest.mock('@/components/intelligence/ConfidenceBadge', () => ({
  ConfidenceBadge: ({ confidence }: { confidence: number }) => (
    <span data-testid="confidence">{confidence}</span>
  ),
}));

jest.mock('@/components/intelligence/InsightDisclaimer', () => ({
  InsightDisclaimer: () => <div data-testid="disclaimer" />,
}));

// Import after mocks are set up
import { BillIntelligenceSection } from '@/components/intelligence/BillIntelligenceSection';

function makeBillInsight(overrides?: Partial<BillIntelligenceInsight>): BillIntelligenceInsight {
  return {
    billId: '119-hr-1',
    billTitle: 'Test Bill',
    policyArea: 'Armed Forces and National Security',
    affectedSectors: ['Defense', 'Communications/Electronics', 'Health'],
    sponsorAnalysis: null,
    cosponsorSummary: {
      totalCosponsors: 0,
      analyzedCosponsors: 0,
      avgSectorDonationPercentage: 0,
    },
    relatedLobbyingSpending: 0,
    relatedLobbyingOrgs: 0,
    narrative: 'Test narrative.',
    confidence: 0.7,
    dataAsOf: '2026-03-20T00:00:00Z',
    methodology: 'Test',
    disclaimer: 'Test disclaimer',
    lastAnalyzedAt: '2026-03-20T00:00:00Z',
    source: 'statistical-fallback',
    ...overrides,
  };
}

describe('BillIntelligenceSection sector pills', () => {
  afterEach(() => {
    mockSWRData = undefined;
  });

  it('renders confidence-styled pills when classifiedSectors exists', () => {
    mockSWRData = makeBillInsight({
      classifiedSectors: [
        { sector: 'Defense', confidence: 0.85 },
        { sector: 'Communications/Electronics', confidence: 0.55 },
        { sector: 'Health', confidence: 0.3 },
      ],
    });

    render(<BillIntelligenceSection billId="119-hr-1" />);

    // Should use displaySector names
    expect(screen.getByText('Defense & Military')).toBeInTheDocument();
    expect(screen.getByText('Technology & Media')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();
  });

  it('applies different border styles by confidence tier', () => {
    mockSWRData = makeBillInsight({
      classifiedSectors: [
        { sector: 'Defense', confidence: 0.85 },
        { sector: 'Communications/Electronics', confidence: 0.55 },
        { sector: 'Health', confidence: 0.3 },
      ],
    });

    render(<BillIntelligenceSection billId="119-hr-1" />);

    const defense = screen.getByText('Defense & Military');
    const tech = screen.getByText('Technology & Media');
    const health = screen.getByText('Healthcare');

    // Strong match — dark border
    expect(defense.className).toContain('border-gray-900');
    // Likely match — medium border
    expect(tech.className).toContain('border-gray-400');
    // Possible match — light border
    expect(health.className).toContain('border-gray-300');
  });

  it('shows methodology note when ML sectors present', () => {
    mockSWRData = makeBillInsight({
      classifiedSectors: [{ sector: 'Defense', confidence: 0.85 }],
    });

    render(<BillIntelligenceSection billId="119-hr-1" />);

    expect(screen.getByText(/Darker labels indicate a stronger match/)).toBeInTheDocument();
    expect(screen.getByText(/identified these sectors by analyzing/)).toBeInTheDocument();
  });

  it('renders plain pills with displaySector when no classifiedSectors', () => {
    mockSWRData = makeBillInsight({
      classifiedSectors: undefined,
    });

    render(<BillIntelligenceSection billId="119-hr-1" />);

    // Should still use displaySector for friendly names
    expect(screen.getByText('Defense & Military')).toBeInTheDocument();
    expect(screen.getByText('Technology & Media')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();

    // All plain pills should have same style
    const defense = screen.getByText('Defense & Military');
    expect(defense.className).toContain('border-gray-200');
    expect(defense.className).toContain('text-gray-500');

    // No methodology note
    expect(screen.queryByText(/Darker labels/)).not.toBeInTheDocument();
  });

  it('adds aria-label for screen readers on confidence pills', () => {
    mockSWRData = makeBillInsight({
      classifiedSectors: [
        { sector: 'Defense', confidence: 0.85 },
        { sector: 'Health', confidence: 0.3 },
      ],
    });

    render(<BillIntelligenceSection billId="119-hr-1" />);

    const defense = screen.getByLabelText('Defense & Military: Strong match');
    const health = screen.getByLabelText('Healthcare: Possible match');
    expect(defense).toBeInTheDocument();
    expect(health).toBeInTheDocument();
  });
});

describe('Confidence styling helpers', () => {
  // Inline the logic from BillIntelligenceSection for testability
  function getSectorConfidenceStyles(confidence: number): string {
    if (confidence >= 0.65) return 'border-gray-900 text-gray-900';
    if (confidence >= 0.45) return 'border-gray-400 text-gray-600';
    return 'border-gray-300 text-gray-400';
  }

  function getConfidenceLabel(confidence: number): string {
    if (confidence >= 0.65) return 'Strong match';
    if (confidence >= 0.45) return 'Likely match';
    return 'Possible match';
  }

  it('returns strong styles for high confidence', () => {
    expect(getSectorConfidenceStyles(0.85)).toBe('border-gray-900 text-gray-900');
    expect(getConfidenceLabel(0.85)).toBe('Strong match');
  });

  it('returns medium styles for medium confidence', () => {
    expect(getSectorConfidenceStyles(0.55)).toBe('border-gray-400 text-gray-600');
    expect(getConfidenceLabel(0.55)).toBe('Likely match');
  });

  it('returns light styles for low confidence', () => {
    expect(getSectorConfidenceStyles(0.3)).toBe('border-gray-300 text-gray-400');
    expect(getConfidenceLabel(0.3)).toBe('Possible match');
  });

  it('handles boundary values', () => {
    expect(getSectorConfidenceStyles(0.65)).toBe('border-gray-900 text-gray-900');
    expect(getSectorConfidenceStyles(0.45)).toBe('border-gray-400 text-gray-600');
    expect(getSectorConfidenceStyles(0.44)).toBe('border-gray-300 text-gray-400');
  });
});

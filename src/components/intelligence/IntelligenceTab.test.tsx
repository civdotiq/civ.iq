/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { IntelligenceTab } from './IntelligenceTab';
import type {
  CivicBriefInsight,
  FinanceJurisdictionInsight,
  VoteFinanceInsight,
} from '@/lib/intelligence/types';

// ── Mock child components to isolate IntelligenceTab logic ────────────

jest.mock('./CivicBriefCard', () => ({
  CivicBriefCard: ({ insight }: { insight: CivicBriefInsight }) => (
    <div data-testid="civic-brief">{insight.identity.name}</div>
  ),
}));

jest.mock('./InsightCard', () => ({
  InsightCard: ({ title }: { title: string }) => <div data-testid="insight-card">{title}</div>,
  financeJurisdictionKeyStats: () => [],
  voteFinanceKeyStats: () => [],
  temporalVoteKeyStats: () => [],
  lobbyingPipelineKeyStats: () => [],
  stockCommitteeKeyStats: () => [],
}));

jest.mock('./VoteShiftTimeline', () => ({
  VoteShiftTimeline: () => <div data-testid="vote-shift-timeline" />,
}));
jest.mock('./InfluenceChainTable', () => ({
  InfluenceChainTable: () => <div data-testid="influence-chain-table" />,
}));
jest.mock('./StockOverlapTable', () => ({
  StockOverlapTable: () => <div data-testid="stock-overlap-table" />,
}));
jest.mock('./VotePredictionCard', () => ({
  VotePredictionCard: () => <div data-testid="vote-prediction-card" />,
}));
jest.mock('./InfluenceChainCard', () => ({
  InfluenceChainCard: () => <div data-testid="influence-chain-card" />,
}));
jest.mock('./InfluenceClusterChart', () => ({
  InfluenceClusterChart: () => <div data-testid="influence-cluster-chart" />,
}));
jest.mock('./TemporalProximityCard', () => ({
  TemporalProximityCard: () => <div data-testid="temporal-proximity-card" />,
}));
jest.mock('@/components/mesh/CounterfactualSection', () => ({
  CounterfactualSection: () => <div data-testid="counterfactual-section" />,
}));

// ── SWR mock ─────────────────────────────────────────────────────────

const swrResponses: Record<string, { data?: unknown; error?: Error; isLoading: boolean }> = {};

jest.mock('swr', () => ({
  __esModule: true,
  default: (key: string | null) => {
    if (!key) return { data: undefined, error: undefined, isLoading: false };
    return swrResponses[key] ?? { data: undefined, error: undefined, isLoading: false };
  },
}));

// ── Fixtures ─────────────────────────────────────────────────────────

const insightBase = {
  confidence: 0.8,
  dataAsOf: '2026-03-01T00:00:00Z',
  methodology: 'stats',
  disclaimer: 'Correlation != causation',
  lastAnalyzedAt: '2026-03-15T00:00:00Z',
  source: 'statistical-fallback' as const,
};

const mockCivicBrief: CivicBriefInsight = {
  ...insightBase,
  bioguideId: 'T000001',
  identity: {
    name: 'Jane Test',
    party: 'D',
    state: 'CA',
    district: '12',
    chamber: 'House',
    termStart: '2023-01-03',
    committees: [],
  },
  funding: {
    totalRaised: 1_000_000,
    totalSpent: 500_000,
    cashOnHand: 500_000,
    inStatePct: 60,
    topSectors: [],
    contributionsSampled: 50,
    cycle: 2024,
  },
  voting: {
    totalVotes: 100,
    partyAlignmentPct: 90,
    missedVotePct: 2,
    billsSponsored: 3,
    billsCosponsored: 10,
  },
  oversight: {
    jurisdictionOverlapScore: null,
    lobbyingAlignmentScore: null,
    topLobbyingMatches: [],
  },
  patterns: [],
  summary: 'Test summary',
};

const mockFinanceJurisdiction: FinanceJurisdictionInsight = {
  ...insightBase,
  bioguideId: 'T000001',
  overlapScore: 0.35,
  committees: [],
  peerComparison: { peerAverage: 0.3, peerCount: 10, percentileRank: 60 },
  narrative: 'Finance-jurisdiction narrative.',
};

const mockVoteFinance: VoteFinanceInsight = {
  ...insightBase,
  bioguideId: 'T000001',
  overallCorrelation: 0.12,
  correlations: [],
  peerComparison: { peerAverage: 0.1, peerCount: 8, percentileRank: 55 },
  narrative: 'Vote-finance narrative.',
};

// ── Helpers ──────────────────────────────────────────────────────────

function clearSWR() {
  Object.keys(swrResponses).forEach(k => delete swrResponses[k]);
}

function setSWR(urlFragment: string, data: unknown) {
  // Find matching key or build one
  const key = urlFragment;
  swrResponses[key] = { data, error: undefined, isLoading: false };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('IntelligenceTab', () => {
  beforeEach(() => {
    clearSWR();
  });

  it('renders Civic Brief outside the details element', () => {
    setSWR('/api/intelligence/representative/T000001/brief', mockCivicBrief);

    render(<IntelligenceTab bioguideId="T000001" />);

    const brief = screen.getByTestId('civic-brief');
    expect(brief).toBeInTheDocument();
    // Brief should NOT be inside a <details> element
    expect(brief.closest('details')).toBeNull();
  });

  it('renders detailed cards inside a collapsed details element', () => {
    setSWR('/api/intelligence/representative/T000001/brief', mockCivicBrief);
    setSWR(
      '/api/intelligence/representative/T000001/finance-jurisdiction',
      mockFinanceJurisdiction
    );
    setSWR('/api/intelligence/representative/T000001/vote-finance', mockVoteFinance);

    render(<IntelligenceTab bioguideId="T000001" />);

    const details = document.querySelector('details');
    expect(details).toBeInTheDocument();
    // <details> should be closed by default (no open attribute)
    expect(details?.hasAttribute('open')).toBe(false);
  });

  it('uses citizen-friendly titles for insight cards', () => {
    setSWR('/api/intelligence/representative/T000001/brief', mockCivicBrief);
    setSWR(
      '/api/intelligence/representative/T000001/finance-jurisdiction',
      mockFinanceJurisdiction
    );
    setSWR('/api/intelligence/representative/T000001/vote-finance', mockVoteFinance);

    render(<IntelligenceTab bioguideId="T000001" />);

    expect(screen.getByText('Do donors match committee power?')).toBeInTheDocument();
    expect(screen.getByText('Do donations align with votes?')).toBeInTheDocument();
  });

  it('shows section count in summary when loading is complete', () => {
    setSWR('/api/intelligence/representative/T000001/brief', mockCivicBrief);
    setSWR(
      '/api/intelligence/representative/T000001/finance-jurisdiction',
      mockFinanceJurisdiction
    );

    render(<IntelligenceTab bioguideId="T000001" />);

    // 1 detailed insight + 2 always-rendered sections (What-If, Clusters) = 3
    expect(screen.getByText(/3 sections available/)).toBeInTheDocument();
  });

  it('shows empty state when no insights load', () => {
    // All SWR returns nothing (default) and not loading
    render(<IntelligenceTab bioguideId="T000001" />);

    expect(screen.getByText('No insights available')).toBeInTheDocument();
  });

  it('always shows details section when civic brief is loaded (What-If and Clusters are always available)', () => {
    setSWR('/api/intelligence/representative/T000001/brief', mockCivicBrief);

    render(<IntelligenceTab bioguideId="T000001" />);

    // Details section renders because What-If and Clusters are always available
    const details = document.querySelector('details');
    expect(details).toBeInTheDocument();
    expect(screen.getByTestId('counterfactual-section')).toBeInTheDocument();
    expect(screen.getByTestId('influence-cluster-chart')).toBeInTheDocument();
  });

  it('does not show details toggle when nothing loaded and loading is done', () => {
    // No civic brief, no detailed insights, all done loading
    render(<IntelligenceTab bioguideId="T000001" />);

    const details = document.querySelector('details');
    expect(details).toBeNull();
    // Should show empty state instead
    expect(screen.getByText('No insights available')).toBeInTheDocument();
  });

  it('moves intro text inside the details section', () => {
    setSWR('/api/intelligence/representative/T000001/brief', mockCivicBrief);
    setSWR(
      '/api/intelligence/representative/T000001/finance-jurisdiction',
      mockFinanceJurisdiction
    );

    render(<IntelligenceTab bioguideId="T000001" />);

    const introText = screen.getByText(/Statistical analysis connecting/);
    expect(introText.closest('details')).not.toBeNull();
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LobbyingTab } from './LobbyingTab';

// Mock useSWR
const mockUseSWR = jest.fn();
jest.mock('swr', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

// Mock InsightDisclaimer
jest.mock('@/components/intelligence/InsightDisclaimer', () => ({
  InsightDisclaimer: ({ disclaimer }: { disclaimer: string }) => (
    <div data-testid="insight-disclaimer">{disclaimer}</div>
  ),
}));

// Mock MoneyFlowChain
jest.mock('@/components/intelligence/MoneyFlowChain', () => ({
  MoneyFlowChain: ({ chain }: { chain: { organization: string } }) => (
    <div data-testid="money-flow-chain">{chain.organization}</div>
  ),
}));

const makeLobbyingData = () => ({
  lobbyingData: {
    totalRelevantSpending: 5_000_000,
    affectedCommittees: 3,
    topCompanies: [
      { name: 'Acme Corp', totalSpending: 2_000_000, committees: ['Energy'], recentFilings: 5 },
      {
        name: 'Tech Inc',
        totalSpending: 1_500_000,
        committees: ['Commerce', 'Energy'],
        recentFilings: 3,
      },
    ],
    committeeBreakdown: [
      {
        committee: 'Energy and Commerce',
        totalSpending: 3_000_000,
        companyCount: 8,
        topIssues: ['Climate', 'Energy'],
      },
    ],
  },
});

const makeChainData = (chainCount = 2) => ({
  confidence: 0.85,
  dataAsOf: '2026-03-01T00:00:00Z',
  methodology: 'Statistical analysis of lobbying-vote patterns',
  disclaimer: 'Correlation does not imply causation.',
  lastAnalyzedAt: '2026-03-15T00:00:00Z',
  source: 'statistical-fallback' as const,
  bioguideId: 'T000001',
  totalChainsDetected: chainCount,
  chainsDropped: 0,
  peerComparison: { percentileRank: 65, peerGroupSize: 50, peerGroupLabel: 'House Democrats' },
  narrative: 'Multiple lobbying-to-vote connections detected.',
  chains: Array.from({ length: chainCount }, (_, i) => ({
    organization: `Org ${i + 1}`,
    lobbyingSpending: 1_000_000 * (i + 1),
    contributionAmount: 50_000,
    billId: `hr-${100 + i}`,
    billTitle: `Test Bill ${i + 1}`,
    vote: 'yea' as const,
    textSimilarity: 0.7,
    links: [{ type: 'committee' as const, label: 'Energy', confidence: 1, data: {} }],
    chainConfidence: 0.85,
  })),
});

function setupSWR(lobbyingReturn: unknown, chainReturn: unknown) {
  mockUseSWR.mockImplementation((key: string | null) => {
    if (key === null) return { data: undefined, error: undefined, isLoading: false };
    if (typeof key === 'string' && key.includes('influence-chain')) return chainReturn;
    return lobbyingReturn;
  });
}

describe('LobbyingTab', () => {
  beforeEach(() => {
    mockUseSWR.mockReset();
  });

  it('renders summary stats with data', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('$5.0M')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Total lobbying spending')).toBeInTheDocument();
  });

  it('renders MoneyFlowChain components for chains', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: makeChainData(2), error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    const chains = screen.getAllByTestId('money-flow-chain');
    expect(chains).toHaveLength(2);
    expect(screen.getByText('Follow the Money')).toBeInTheDocument();
  });

  it('shows "Show all" toggle when > 3 chains', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: makeChainData(5), error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);

    // Initially only 3 chains shown
    expect(screen.getAllByTestId('money-flow-chain')).toHaveLength(3);

    const toggle = screen.getByText('Show all 5 chains');
    expect(toggle).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getAllByTestId('money-flow-chain')).toHaveLength(5);
    expect(screen.getByText('Show fewer chains')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    setupSWR(
      { data: undefined, error: undefined, isLoading: true },
      { data: undefined, error: undefined, isLoading: true }
    );
    const { container } = render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows empty state when no lobbying data', () => {
    setupSWR(
      {
        data: {
          lobbyingData: {
            totalRelevantSpending: 0,
            affectedCommittees: 0,
            topCompanies: [],
            committeeBreakdown: [],
          },
        },
        error: undefined,
        isLoading: false,
      },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText(/No lobbying data found/)).toBeInTheDocument();
  });

  it('shows error state when both endpoints fail', () => {
    setupSWR(
      { data: undefined, error: new Error('fail'), isLoading: false },
      { data: undefined, error: new Error('fail'), isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument();
  });

  it('renders top organizations list', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Tech Inc')).toBeInTheDocument();
    expect(screen.getByText('Top Organizations')).toBeInTheDocument();
  });

  it('renders committee breakdown', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('Energy and Commerce')).toBeInTheDocument();
    expect(screen.getByText('Committee Breakdown')).toBeInTheDocument();
  });

  it('renders narrative and disclaimer from chain data', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: makeChainData(2), error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('Multiple lobbying-to-vote connections detected.')).toBeInTheDocument();
    expect(screen.getByTestId('insight-disclaimer')).toBeInTheDocument();
  });
});

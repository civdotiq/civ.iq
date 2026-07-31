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
  representative: {
    name: 'Jane Smith',
    committees: ['Energy and Commerce'],
  },
  metadata: {
    coveragePeriod: 'Last 2 years (quarterly filings)',
  },
  lobbyingData: {
    totalRelevantSpending: 5_000_000,
    affectedCommittees: 3,
    topCompanies: [
      {
        name: 'Acme Corp',
        registrantId: '301',
        totalSpending: 2_000_000,
        committees: ['Energy'],
        recentFilings: 5,
      },
      {
        name: 'Tech Inc',
        registrantId: '302',
        totalSpending: 1_500_000,
        committees: ['Commerce', 'Energy'],
        recentFilings: 3,
      },
      {
        name: 'Zero Corp',
        registrantId: '303',
        totalSpending: 0,
        committees: ['Energy'],
        recentFilings: 1,
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
    summary: {
      quarterlyTrend: [
        { quarter: 'Q1', year: 2025, spending: 1_000_000 },
        { quarter: 'Q2', year: 2025, spending: 1_500_000 },
        { quarter: 'Q3', year: 2025, spending: 800_000 },
        { quarter: 'Q4', year: 2025, spending: 1_200_000 },
      ],
      industryBreakdown: [
        { industry: 'Healthcare', filingCount: 8, percentage: 40 },
        { industry: 'Technology', filingCount: 6, percentage: 30 },
        { industry: 'Energy', filingCount: 4, percentage: 20 },
      ],
    },
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

  it('renders count-based summary stats and withholds the sample-based dollar total', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('Organizations in recent filings')).toBeInTheDocument();
    expect(screen.getByText('Committees targeted')).toBeInTheDocument();
    // The API still returns totalRelevantSpending ($5.0M) but the sample-based
    // aggregate must not be rendered (PLAN-lobbying-corpus-2026-07.md Phase 0)
    expect(screen.queryByText('Total lobbying spending')).not.toBeInTheDocument();
    expect(screen.queryByText('$5.0M')).not.toBeInTheDocument();
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
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    // Assert on the a11y role rather than English copy — resilient to message changes.
    expect(screen.getByRole('status')).toBeInTheDocument();
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

  it('renders committee breakdown without per-committee dollar totals', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('Energy and Commerce')).toBeInTheDocument();
    expect(screen.getByText('Committee Breakdown')).toBeInTheDocument();
    // Fixture committee totalSpending is $3.0M — must not render (sample-based)
    expect(screen.queryByText('$3.0M')).not.toBeInTheDocument();
  });

  it('does not crash when chain data is an error-shaped object without chains', () => {
    // Regression: preload fetcher cached { error: "..." } as data — no chains property
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      {
        data: { error: 'Influence chain analysis not available for this legislator' },
        error: undefined,
        isLoading: false,
      }
    );
    // Should render without throwing
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    // Lobbying data still renders
    expect(screen.getByText('Top Organizations')).toBeInTheDocument();
    // No "Follow the Money" section since chains are absent
    expect(screen.queryByText('Follow the Money')).not.toBeInTheDocument();
  });

  it('does not crash when chain data has no chains property at all', () => {
    setupSWR(
      { data: undefined, error: undefined, isLoading: false },
      { data: {} as never, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    // Falls through to empty state
    expect(screen.getByText(/No lobbying data found/)).toBeInTheDocument();
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

  it('renders rank numbers in top organizations', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('#2')).toBeInTheDocument();
  });

  it('groups $0 spending organizations separately', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText(/filing-only activity/)).toBeInTheDocument();
    // Zero Corp links to internal lobby profile page
    const zeroCorp = screen.getByText('Zero Corp');
    expect(zeroCorp.tagName).toBe('A');
    expect(zeroCorp).toHaveAttribute('href', '/lobby/303');
  });

  it('renders issue tags in committee breakdown', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    // Issues should render as individual tags, not joined text
    const climateTag = screen.getByText('Climate');
    expect(climateTag.tagName).toBe('SPAN');
    expect(climateTag.className).toContain('border-2');
  });

  it('does not render the quarterly dollar trend even when the API returns it', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.queryByText('Quarterly Trend')).not.toBeInTheDocument();
    expect(screen.queryByText('Q1')).not.toBeInTheDocument();
  });

  it('renders industry breakdown when summary data present', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('Issue Areas')).toBeInTheDocument();
    expect(screen.getByText('Healthcare')).toBeInTheDocument();
    expect(screen.getByText('Technology')).toBeInTheDocument();
  });

  it('renders intro disclaimer with representative name and LDA link', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText(/Jane Smith's committee assignments/)).toBeInTheDocument();
    expect(screen.getByText(/Filing a disclosure does not mean/)).toBeInTheDocument();
    const ldaLink = screen.getByText('Search all filings on Senate LDA');
    expect(ldaLink.tagName).toBe('A');
    expect(ldaLink).toHaveAttribute('href', 'https://lda.gov/filings/public/filing/search/');
  });

  it('links organization names to internal lobby profile', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    const acmeLink = screen.getByText('Acme Corp');
    expect(acmeLink.tagName).toBe('A');
    expect(acmeLink).toHaveAttribute('href', '/lobby/301');
  });

  it('hides industry breakdown when only Other category exists', () => {
    const data = makeLobbyingData();
    data.lobbyingData.summary = {
      quarterlyTrend: [
        { quarter: 'Q1', year: 2025, spending: 1_000_000 },
        { quarter: 'Q2', year: 2025, spending: 0 },
        { quarter: 'Q3', year: 2025, spending: 0 },
        { quarter: 'Q4', year: 2025, spending: 0 },
      ],
      industryBreakdown: [{ industry: 'Other', filingCount: 5, percentage: 100 }],
    };
    setupSWR(
      { data, error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    // Issue areas hidden since the breakdown is just "Other"; the quarterly
    // dollar trend never renders anymore
    expect(screen.queryByText('Issue Areas')).not.toBeInTheDocument();
    expect(screen.queryByText('Quarterly Trend')).not.toBeInTheDocument();
  });

  it('hides spending overview when summary is empty', () => {
    const data = makeLobbyingData();
    data.lobbyingData.summary = {
      quarterlyTrend: [
        { quarter: 'Q1', year: 2025, spending: 0 },
        { quarter: 'Q2', year: 2025, spending: 0 },
        { quarter: 'Q3', year: 2025, spending: 0 },
        { quarter: 'Q4', year: 2025, spending: 0 },
      ],
      industryBreakdown: [],
    };
    setupSWR(
      { data, error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.queryByText('Quarterly Trend')).not.toBeInTheDocument();
    expect(screen.queryByText('Issue Areas')).not.toBeInTheDocument();
  });

  it('frames the intro copy as a sample of recent filings', () => {
    setupSWR(
      { data: makeLobbyingData(), error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText(/sample of recent filings, not a complete tally/)).toBeInTheDocument();
  });

  it('renders corpus-backed per-committee totals with a peer baseline', () => {
    const data = {
      ...makeLobbyingData(),
      corpusLobbying: {
        quarters: ['2025-Q1', '2025-Q2'],
        generatedAt: '2026-07-13T00:00:00.000Z',
        committees: [
          {
            committeeCode: 'HSIF',
            committeeName: 'Energy and Commerce',
            windowTotal: 60_000_000,
            quarterly: [
              { quarter: '2025-Q1', total: 30_000_000 },
              { quarter: '2025-Q2', total: 30_000_000 },
            ],
            peer: { medianTotal: 30_000_000, ratioToMedian: 2 },
            topIssues: [{ code: 'HCR', label: 'Health Issues', count: 40 }],
            topOrgs: [
              {
                name: 'US CHAMBER OF COMMERCE',
                registrantId: '301',
                amount: 12_000_000,
                filings: 8,
              },
              {
                name: 'MERGED MULTI-FIRM CLIENT',
                registrantId: null,
                amount: 5_000_000,
                filings: 6,
              },
            ],
          },
        ],
      },
    };
    setupSWR(
      { data, error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    expect(screen.getByText('Lobbying spending by committee')).toBeInTheDocument();
    expect(screen.getByText('$60.0M')).toBeInTheDocument();
    expect(screen.getByText(/2.0× the median committee/)).toBeInTheDocument();
    // Corpus top orgs render; the self-filer links, the merged org does not
    const chamber = screen.getByText('US CHAMBER OF COMMERCE');
    expect(chamber.closest('a')).toHaveAttribute('href', '/lobby/301');
    expect(screen.getByText('MERGED MULTI-FIRM CLIENT').closest('a')).toBeNull();
    // Methodology makes the not-summed-across-committees caveat explicit
    expect(screen.getByText(/not summed across\s+committees/)).toBeInTheDocument();
  });

  it('shows corpus totals even when the live sample has no companies', () => {
    const data = {
      representative: { name: 'Jane Smith', committees: ['Finance'] },
      metadata: { coveragePeriod: 'Last 2 years' },
      lobbyingData: {
        totalRelevantSpending: 0,
        affectedCommittees: 0,
        topCompanies: [],
        committeeBreakdown: [],
      },
      corpusLobbying: {
        quarters: ['2025-Q1'],
        generatedAt: '2026-07-13T00:00:00.000Z',
        committees: [
          {
            committeeCode: 'SSFI',
            committeeName: 'Finance',
            windowTotal: 100_000_000,
            quarterly: [{ quarter: '2025-Q1', total: 100_000_000 }],
            peer: { medianTotal: 50_000_000, ratioToMedian: 2 },
            topIssues: [],
          },
        ],
      },
    };
    setupSWR(
      { data, error: undefined, isLoading: false },
      { data: undefined, error: undefined, isLoading: false }
    );
    render(<LobbyingTab bioguideId="T000001" hasCommittees={true} />);
    // Not the empty state — corpus section renders
    expect(screen.queryByText(/No lobbying data found/)).not.toBeInTheDocument();
    expect(screen.getByText('Lobbying spending by committee')).toBeInTheDocument();
    expect(screen.getByText('$100.0M')).toBeInTheDocument();
  });
});

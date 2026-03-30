/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { InfluenceGraphCard } from './InfluenceGraphCard';
import type {
  InfluenceGraphInsight,
  InfluenceGraphChain,
  RegulationNode,
  EnforcementAction,
  OutcomeSignal,
} from '@/lib/intelligence/types';

function makeRegulation(overrides: Partial<RegulationNode> = {}): RegulationNode {
  return {
    docketId: 'EPA-HQ-2025-0001',
    agency: 'EPA',
    agencySlug: 'environmental-protection-agency',
    title: 'Clean Air Standards for Industrial Emissions',
    type: 'proposed_rule',
    status: 'comment_period',
    publicationDate: '2025-11-01',
    rin: '2060-AB01',
    commentCount: 1500,
    linkMethod: 'committee_agency',
    linkConfidence: 0.75,
    ...overrides,
  };
}

function makeEnforcement(overrides: Partial<EnforcementAction> = {}): EnforcementAction {
  return {
    agency: 'EPA',
    actionType: 'Civil penalty',
    organization: 'Acme Industries',
    resolvedCompany: null,
    sector: null,
    penaltyAmount: 500_000,
    date: '2025-10-15',
    state: 'IL',
    district: '13',
    ...overrides,
  };
}

function makeOutcome(overrides: Partial<OutcomeSignal> = {}): OutcomeSignal {
  return {
    type: 'economic_indicator',
    metric: 'Industrial emissions index',
    value: 85,
    change: -0.12,
    periodStart: '2025-01-01',
    periodEnd: '2025-12-31',
    direction: 'negative',
    baseline: { value: 96.5, label: 'national avg' },
    ...overrides,
  };
}

function makeChain(overrides: Partial<InfluenceGraphChain> = {}): InfluenceGraphChain {
  return {
    organization: 'Acme Industries PAC',
    registrantId: 'REG001',
    lobbyingSpending: 2_500_000,
    contributionAmount: 50_000,
    billId: 'hr1234-119',
    billTitle: 'Clean Air Modernization Act of 2025',
    vote: 'yea',
    textSimilarity: 0.72,
    links: [
      { type: 'lobbying', label: 'Lobbied on clean air', confidence: 0.9, data: {} },
      { type: 'vote', label: 'Voted yea', confidence: 0.95, data: {} },
    ],
    chainConfidence: 0.82,
    hasContributionEvidence: true,
    regulationNode: makeRegulation(),
    enforcementActions: [makeEnforcement()],
    courtCases: [
      {
        caseName: 'EPA v. Acme Industries',
        court: 'D.C. Circuit',
        dateFiled: '2025-06-15',
        status: 'open',
      },
    ],
    outcomeSignals: [makeOutcome()],
    ...overrides,
  };
}

function makeInsight(overrides: Partial<InfluenceGraphInsight> = {}): InfluenceGraphInsight {
  return {
    confidence: 0.78,
    dataAsOf: '2026-03-01T00:00:00Z',
    methodology: 'Extended influence chain analysis.',
    disclaimer: 'Correlation does not imply causation.',
    lastAnalyzedAt: '2026-03-15T00:00:00Z',
    source: 'statistical-fallback',
    bioguideId: 'T000001',
    totalChainsDetected: 5,
    chainsDropped: 2,
    chains: [makeChain()],
    graphStats: {
      nodesCount: 24,
      edgesCount: 31,
      avgChainLength: 4.2,
      maxChainLength: 6,
      regulationLinks: 3,
      enforcementLinks: 2,
    },
    peerComparison: {
      value: 5,
      peerAverage: 3.2,
      peerCount: 45,
      peerGroupLabel: 'House members',
      percentileRank: 78,
    },
    narrative: 'This representative has above-average influence graph complexity.',
    ...overrides,
  };
}

describe('InfluenceGraphCard', () => {
  it('renders header with title and confidence', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('Influence Graph')).toBeInTheDocument();
  });

  it('renders stats row', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('5')).toBeInTheDocument(); // total chains
    expect(screen.getByText('3')).toBeInTheDocument(); // regulation links
    expect(screen.getByText('2')).toBeInTheDocument(); // enforcement links
    expect(screen.getByText('Chains traced')).toBeInTheDocument();
    expect(screen.getByText('Regulation links')).toBeInTheDocument();
    expect(screen.getByText('Enforcement links')).toBeInTheDocument();
  });

  it('renders peer comparison', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('78th')).toBeInTheDocument();
    expect(screen.getByText(/House members/)).toBeInTheDocument();
  });

  it('renders narrative', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(
      screen.getByText('This representative has above-average influence graph complexity.')
    ).toBeInTheDocument();
  });

  it('renders disclaimer', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('Correlation does not imply causation.')).toBeInTheDocument();
  });

  it('shows dropped chains count', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('2 low-confidence chains omitted')).toBeInTheDocument();
  });

  it('renders lobbying step with spending', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('LOBBYING')).toBeInTheDocument();
    expect(screen.getByText(/\$2\.5M spent/)).toBeInTheDocument();
    expect(screen.getByText(/\$50K in campaign contributions/)).toBeInTheDocument();
  });

  it('renders vote step with bill and badge', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('VOTE')).toBeInTheDocument();
    expect(screen.getByText('YEA')).toBeInTheDocument();
    expect(screen.getByText(/72% text match/)).toBeInTheDocument();
  });

  it('renders regulation step', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('REGULATION')).toBeInTheDocument();
    expect(screen.getByText('EPA')).toBeInTheDocument();
    expect(screen.getByText(/Clean Air Standards/)).toBeInTheDocument();
    expect(screen.getByText('COMMENT PERIOD')).toBeInTheDocument();
    expect(screen.getByText(/1,500 comments/)).toBeInTheDocument();
  });

  it('renders enforcement step', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('ENFORCEMENT')).toBeInTheDocument();
    expect(screen.getByText(/1 action/)).toBeInTheDocument();
    expect(screen.getByText(/\$500K in penalties/)).toBeInTheDocument();
  });

  it('renders court step', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('COURT')).toBeInTheDocument();
    expect(screen.getByText('EPA v. Acme Industries')).toBeInTheDocument();
    expect(screen.getByText(/D\.C\. Circuit/)).toBeInTheDocument();
  });

  it('renders outcome step', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('OUTCOME')).toBeInTheDocument();
    expect(screen.getByText(/Industrial emissions index/)).toBeInTheDocument();
    expect(screen.getByText(/-12\.0%/)).toBeInTheDocument();
  });

  it('omits steps when data is absent', () => {
    const chain = makeChain({
      regulationNode: null,
      enforcementActions: [],
      courtCases: [],
      outcomeSignals: [],
    });
    render(<InfluenceGraphCard insight={makeInsight({ chains: [chain] })} />);
    expect(screen.getByText('LOBBYING')).toBeInTheDocument();
    expect(screen.getByText('VOTE')).toBeInTheDocument();
    expect(screen.queryByText('REGULATION')).not.toBeInTheDocument();
    expect(screen.queryByText('ENFORCEMENT')).not.toBeInTheDocument();
    expect(screen.queryByText('COURT')).not.toBeInTheDocument();
    expect(screen.queryByText('OUTCOME')).not.toBeInTheDocument();
    // Step count should be 2
    expect(screen.getByText('2-step chain')).toBeInTheDocument();
  });

  it('shows correct step count for full chain', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('6-step chain')).toBeInTheDocument();
  });

  it('shows empty state when no chains', () => {
    render(
      <InfluenceGraphCard
        insight={makeInsight({ chains: [], totalChainsDetected: 0, chainsDropped: 0 })}
      />
    );
    expect(screen.getByText(/No influence chains with extended graph data/)).toBeInTheDocument();
  });

  it('handles show all toggle for more than 3 chains', async () => {
    const user = userEvent.setup();
    const chains = [
      makeChain({ organization: 'Org A' }),
      makeChain({ organization: 'Org B' }),
      makeChain({ organization: 'Org C' }),
      makeChain({ organization: 'Org D' }),
    ];
    render(<InfluenceGraphCard insight={makeInsight({ chains })} />);

    // Initially shows 3, hides 4th
    expect(screen.getByText(/Show all 4 chains/)).toBeInTheDocument();

    await user.click(screen.getByText(/Show all 4 chains/));
    expect(screen.getByText('Show fewer chains')).toBeInTheDocument();
  });

  it('hides peer comparison when percentile is 0', () => {
    const insight = makeInsight({
      peerComparison: {
        value: 0,
        peerAverage: 0,
        peerCount: 0,
        peerGroupLabel: '',
        percentileRank: 0,
      },
    });
    render(<InfluenceGraphCard insight={insight} />);
    expect(screen.queryByText('Peer percentile')).not.toBeInTheDocument();
  });
});

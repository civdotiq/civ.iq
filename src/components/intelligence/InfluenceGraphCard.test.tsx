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
    narrative:
      'This representative has above-average connections between lobbying and legislation.',
    ...overrides,
  };
}

describe('InfluenceGraphCard', () => {
  it('renders citizen-friendly title', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('How lobbying money becomes policy')).toBeInTheDocument();
  });

  it('renders narrative at the top, before stats', () => {
    const { container } = render(<InfluenceGraphCard insight={makeInsight()} />);
    const narrative = screen.getByText(/above-average connections/);
    const statsLabel = screen.getByText('Paths from money to policy');
    // Narrative should appear before stats in DOM order
    const allElements = container.querySelectorAll('*');
    const narrativeIndex = Array.from(allElements).indexOf(narrative.closest('p')!);
    const statsIndex = Array.from(allElements).indexOf(statsLabel.closest('div')!);
    expect(narrativeIndex).toBeLessThan(statsIndex);
  });

  it('renders plain-language stats', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Paths from money to policy')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Connected regulations')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Enforcement actions')).toBeInTheDocument();
  });

  it('renders peer comparison as a sentence', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/More money-to-policy connections than/)).toBeInTheDocument();
    expect(screen.getByText('78%')).toBeInTheDocument();
    expect(screen.getByText(/House members/)).toBeInTheDocument();
  });

  it('renders disclaimer and methodology', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('Correlation does not imply causation.')).toBeInTheDocument();
  });

  it('shows transparency about dropped paths', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/2 additional paths found but excluded/)).toBeInTheDocument();
  });

  // ── Chain story summaries ───────────────────────────────────────────

  it('renders a plain-language story summary for each chain', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/Acme Industries PAC spent \$2\.5M lobbying/)).toBeInTheDocument();
    expect(screen.getByText(/voted in favor of/)).toBeInTheDocument();
  });

  // ── Step question labels ────────────────────────────────────────────

  it('uses question labels instead of jargon', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('Who spent money?')).toBeInTheDocument();
    expect(screen.getByText('What was voted on?')).toBeInTheDocument();
    expect(screen.getByText('Did regulators act?')).toBeInTheDocument();
    expect(screen.getByText('Was anyone penalized?')).toBeInTheDocument();
    expect(screen.getByText('Any court cases?')).toBeInTheDocument();
    expect(screen.getByText('What changed?')).toBeInTheDocument();
  });

  it('renders lobbying step with spending', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/spent \$2\.5M on lobbying/)).toBeInTheDocument();
    expect(screen.getByText(/Also gave \$50K in campaign contributions/)).toBeInTheDocument();
  });

  it('renders vote step with bill and badge', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('YEA')).toBeInTheDocument();
  });

  it('renders regulation step in plain language', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/EPA proposed a rule/)).toBeInTheDocument();
    expect(screen.getByText(/Clean Air Standards/)).toBeInTheDocument();
    expect(screen.getByText(/1,500 public comments/)).toBeInTheDocument();
  });

  it('renders enforcement step', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/took 1 enforcement action/)).toBeInTheDocument();
    expect(screen.getByText(/\$500K in penalties/)).toBeInTheDocument();
  });

  it('renders court step', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText('EPA v. Acme Industries')).toBeInTheDocument();
    expect(screen.getByText(/D\.C\. Circuit/)).toBeInTheDocument();
  });

  it('renders outcome step', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/Industrial emissions index moved/)).toBeInTheDocument();
    expect(screen.getByText(/-12\.0%/)).toBeInTheDocument();
    expect(screen.getByText(/compared to national avg/)).toBeInTheDocument();
  });

  // ── Missing steps ──────────────────────────────────────────────────

  it('omits steps when data is absent', () => {
    const chain = makeChain({
      regulationNode: null,
      enforcementActions: [],
      courtCases: [],
      outcomeSignals: [],
    });
    render(<InfluenceGraphCard insight={makeInsight({ chains: [chain] })} />);
    expect(screen.getByText('Who spent money?')).toBeInTheDocument();
    expect(screen.getByText('What was voted on?')).toBeInTheDocument();
    expect(screen.queryByText('Did regulators act?')).not.toBeInTheDocument();
    expect(screen.queryByText('Was anyone penalized?')).not.toBeInTheDocument();
    expect(screen.queryByText('Any court cases?')).not.toBeInTheDocument();
    expect(screen.queryByText('What changed?')).not.toBeInTheDocument();
  });

  // ── Methodology toggle ─────────────────────────────────────────────

  it('hides confidence scores by default, shows on toggle', async () => {
    const user = userEvent.setup();
    render(<InfluenceGraphCard insight={makeInsight()} />);

    // Analyst metrics hidden by default
    expect(screen.queryByText(/Chain confidence: 82%/)).not.toBeInTheDocument();
    expect(screen.queryByText(/text similarity/i)).not.toBeInTheDocument();

    // Click methodology toggle
    await user.click(screen.getByText('Show confidence scores and methodology'));

    // Now visible
    expect(screen.getByText(/Chain confidence: 82%/)).toBeInTheDocument();
    expect(screen.getByText(/Lobbying text \/ bill text similarity: 72%/)).toBeInTheDocument();
    expect(screen.getByText(/Regulation linked via committee agency/)).toBeInTheDocument();

    // Toggle off
    await user.click(screen.getByText('Hide technical detail'));
    expect(screen.queryByText(/Chain confidence: 82%/)).not.toBeInTheDocument();
  });

  // ── Empty and expand states ─────────────────────────────────────────

  it('shows empty state when no paths', () => {
    render(
      <InfluenceGraphCard
        insight={makeInsight({ chains: [], totalChainsDetected: 0, chainsDropped: 0 })}
      />
    );
    expect(
      screen.getByText(/No traceable paths from lobbying spending to legislation/)
    ).toBeInTheDocument();
  });

  it('handles show all toggle for more than 3 paths', async () => {
    const user = userEvent.setup();
    const chains = [
      makeChain({ organization: 'Org A' }),
      makeChain({ organization: 'Org B' }),
      makeChain({ organization: 'Org C' }),
      makeChain({ organization: 'Org D' }),
    ];
    render(<InfluenceGraphCard insight={makeInsight({ chains })} />);

    expect(screen.getByText(/Show all 4 paths/)).toBeInTheDocument();

    await user.click(screen.getByText(/Show all 4 paths/));
    expect(screen.getByText('Show fewer')).toBeInTheDocument();
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
    expect(screen.queryByText(/More money-to-policy connections/)).not.toBeInTheDocument();
  });

  it('renders chain intro text explaining public records', () => {
    render(<InfluenceGraphCard insight={makeInsight()} />);
    expect(screen.getByText(/Each path below traces public records/)).toBeInTheDocument();
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for DonorVotingAlignmentAnswer — the pod renderer for the
 * /ask/donor-voting-alignment/[id] page.
 *
 * These tests lock in the citizen-legibility filter invariants:
 * - The generic FEC "Other" bucket never appears in the per-sector breakdown.
 * - Sectors with $0 in donations never appear in the per-sector breakdown.
 * - Sectors under the 10-vote minimum never appear in the per-sector breakdown.
 * - The correlation coefficient is never rendered as a percent in the headline.
 * - Peer comparison is shown only when real peer data is present.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { DonorVotingAlignmentAnswer } from '@/components/questions/DonorVotingAlignmentAnswer';
import type {
  InsightResponse,
  VoteFinanceInsight,
  IndustryCorrelation,
} from '@/lib/intelligence/types';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';

// ── Fixtures ────────────────────────────────────────────────────────

function makeCorrelation(overrides: Partial<IndustryCorrelation> = {}): IndustryCorrelation {
  return {
    sector: IndustrySector.HEALTH,
    donationAmount: 100_000,
    billsVotedOn: 20,
    alignmentScore: 0.5,
    meetsSampleSize: true,
    ...overrides,
  };
}

function makeInsight(overrides: Partial<VoteFinanceInsight> = {}): VoteFinanceInsight {
  return {
    bioguideId: 'T000001',
    correlations: [],
    overallCorrelation: null,
    overallAlignment: 0.6,
    peerComparison: null,
    narrative: 'Test narrative.',
    confidence: 0.8,
    confidenceMethod: 'computed',
    dataAsOf: '2026-03-01',
    methodology: 'Test methodology.',
    disclaimer: 'Correlation does not indicate causation.',
    lastAnalyzedAt: '2026-03-01T00:00:00Z',
    source: 'statistical-fallback',
    ...overrides,
  };
}

function wrap(data: VoteFinanceInsight | null): InsightResponse<VoteFinanceInsight> | null {
  if (!data) return null;
  return { data, errors: [], status: 'complete' };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('DonorVotingAlignmentAnswer', () => {
  it('renders the no-data state when voteFinance is null', () => {
    render(<DonorVotingAlignmentAnswer voteFinance={null} />);
    expect(screen.getByText(/we couldn't compute/i)).toBeInTheDocument();
  });

  it('excludes the generic FEC "Other" bucket from the per-sector breakdown', () => {
    const insight = makeInsight({
      correlations: [
        makeCorrelation({
          sector: IndustrySector.OTHER,
          donationAmount: 5_000_000,
          billsVotedOn: 50,
          alignmentScore: 0.9,
        }),
        makeCorrelation({
          sector: IndustrySector.HEALTH,
          donationAmount: 100_000,
          billsVotedOn: 20,
          alignmentScore: 0.5,
        }),
      ],
    });

    render(<DonorVotingAlignmentAnswer voteFinance={wrap(insight)} />);

    // "Other" is the FEC catch-all — must never appear as a ranked sector.
    expect(screen.queryByText(/^Other$/)).not.toBeInTheDocument();
    // Healthcare is the citizen-friendly display name for HEALTH.
    expect(screen.getByText(/Healthcare/)).toBeInTheDocument();
  });

  it('excludes sectors with $0 donations from the per-sector breakdown', () => {
    const insight = makeInsight({
      correlations: [
        makeCorrelation({
          sector: IndustrySector.DEFENSE,
          donationAmount: 0,
          billsVotedOn: 30,
          alignmentScore: 0.8,
        }),
        makeCorrelation({
          sector: IndustrySector.HEALTH,
          donationAmount: 50_000,
          billsVotedOn: 15,
          alignmentScore: 0.4,
        }),
      ],
    });

    render(<DonorVotingAlignmentAnswer voteFinance={wrap(insight)} />);

    expect(screen.queryByText(/Defense & Military/)).not.toBeInTheDocument();
    expect(screen.getByText(/Healthcare/)).toBeInTheDocument();
  });

  it('excludes sectors under the 10-vote minimum from the per-sector breakdown', () => {
    const insight = makeInsight({
      correlations: [
        makeCorrelation({
          sector: IndustrySector.ENERGY_NATURAL_RESOURCES,
          donationAmount: 75_000,
          billsVotedOn: 5,
          alignmentScore: 1.0,
          meetsSampleSize: false,
        }),
        makeCorrelation({
          sector: IndustrySector.HEALTH,
          donationAmount: 50_000,
          billsVotedOn: 12,
          alignmentScore: 0.4,
          meetsSampleSize: true,
        }),
      ],
    });

    render(<DonorVotingAlignmentAnswer voteFinance={wrap(insight)} />);

    expect(screen.queryByText(/Energy & Natural Resources/)).not.toBeInTheDocument();
    expect(screen.getByText(/Healthcare/)).toBeInTheDocument();
  });

  it('renders the headline as a yea-rate, not a Spearman correlation coefficient', () => {
    const insight = makeInsight({
      overallAlignment: 0.62,
      overallCorrelation: -0.19,
      correlations: [makeCorrelation({ billsVotedOn: 40 })],
    });

    render(<DonorVotingAlignmentAnswer voteFinance={wrap(insight)} />);

    // Headline shows the 62% yea-rate, not "-19%" (the correlation coefficient).
    expect(screen.getAllByText(/62%/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/-19%/)).not.toBeInTheDocument();
  });

  it('shows peer comparison only when real peer data is present', () => {
    const withoutPeer = makeInsight({
      correlations: [makeCorrelation({ billsVotedOn: 20 })],
      peerComparison: null,
    });

    const { rerender } = render(<DonorVotingAlignmentAnswer voteFinance={wrap(withoutPeer)} />);
    expect(screen.queryByText(/delegation average/i)).not.toBeInTheDocument();

    const withPeer = makeInsight({
      correlations: [makeCorrelation({ billsVotedOn: 20 })],
      peerComparison: {
        value: 0.6,
        peerAverage: 0.55,
        peerCount: 8,
        peerGroupLabel: 'CA House delegation',
        percentileRank: 70,
      },
    });

    rerender(<DonorVotingAlignmentAnswer voteFinance={wrap(withPeer)} />);
    expect(screen.getByText(/CA House delegation average/i)).toBeInTheDocument();
    expect(screen.getByText(/55%/)).toBeInTheDocument();
  });
});

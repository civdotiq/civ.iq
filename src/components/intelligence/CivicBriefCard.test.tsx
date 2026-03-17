/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CivicBriefCard } from './CivicBriefCard';
import type { CivicBriefInsight } from '@/lib/intelligence/types';

function makeBrief(overrides: Partial<CivicBriefInsight> = {}): CivicBriefInsight {
  return {
    confidence: 0.85,
    dataAsOf: '2026-03-01T00:00:00Z',
    methodology: 'Statistical analysis',
    disclaimer: 'Correlation does not imply causation.',
    lastAnalyzedAt: '2026-03-15T00:00:00Z',
    source: 'statistical-fallback',
    bioguideId: 'T000001',
    identity: {
      name: 'Jane Test',
      party: 'D',
      state: 'CA',
      district: '12',
      chamber: 'House',
      termStart: '2023-01-03',
      committees: [{ name: 'Finance', role: 'Member' }],
    },
    funding: {
      totalRaised: 5_000_000,
      totalSpent: 3_000_000,
      cashOnHand: 2_000_000,
      inStatePct: 60,
      topSectors: [
        { sector: 'Health', amount: 500_000, pct: 35, overlapsCommittee: true },
        { sector: 'Tech', amount: 300_000, pct: 20, overlapsCommittee: false },
      ],
      contributionsSampled: 100,
      cycle: 2024,
    },
    voting: {
      totalVotes: 200,
      partyAlignmentPct: 92,
      missedVotePct: 3,
      billsSponsored: 5,
      billsCosponsored: 20,
    },
    oversight: {
      jurisdictionOverlapScore: 0.45,
      lobbyingAlignmentScore: 0.3,
      topLobbyingMatches: [],
    },
    patterns: [
      {
        type: 'funding-jurisdiction-overlap',
        headline: 'Committee donors are above average',
        detail: 'Donors from sectors under committee oversight are 12% above peer average.',
        dataPoints: { overlapPct: 45 },
        significance: 0.8,
      },
    ],
    summary: 'Jane Test is a House Democrat from California.',
    ...overrides,
  };
}

describe('CivicBriefCard', () => {
  it('renders summary and identity', () => {
    render(<CivicBriefCard insight={makeBrief()} />);
    expect(screen.getByText('Civic Brief')).toBeInTheDocument();
    expect(screen.getByText('Jane Test is a House Democrat from California.')).toBeInTheDocument();
    expect(screen.getByText('Jane Test')).toBeInTheDocument();
    expect(screen.getByText('Democrat')).toBeInTheDocument();
  });

  it('renders sector bars when sectors are meaningful', () => {
    render(<CivicBriefCard insight={makeBrief()} />);
    expect(screen.getByText('Health')).toBeInTheDocument();
    expect(screen.getByText('Tech')).toBeInTheDocument();
    expect(screen.queryByText(/Detailed funding breakdown unavailable/)).not.toBeInTheDocument();
  });

  it('hides sector bars when top sector is "Other" at > 80%', () => {
    const brief = makeBrief({
      funding: {
        totalRaised: 2_000_000,
        totalSpent: 1_000_000,
        cashOnHand: 1_000_000,
        inStatePct: 50,
        topSectors: [
          { sector: 'Other', amount: 1_800_000, pct: 90, overlapsCommittee: false },
          { sector: 'Health', amount: 200_000, pct: 10, overlapsCommittee: false },
        ],
        contributionsSampled: 50,
        cycle: 2024,
      },
    });

    render(<CivicBriefCard insight={brief} />);
    expect(screen.queryByText('Other')).not.toBeInTheDocument();
    expect(screen.queryByText('Health')).not.toBeInTheDocument();
    expect(screen.getByText(/Detailed funding breakdown unavailable/)).toBeInTheDocument();
  });

  it('shows sector bars when top is "Other" at exactly 80%', () => {
    const brief = makeBrief({
      funding: {
        totalRaised: 1_000_000,
        totalSpent: 500_000,
        cashOnHand: 500_000,
        inStatePct: 40,
        topSectors: [
          { sector: 'Other', amount: 800_000, pct: 80, overlapsCommittee: false },
          { sector: 'Defense', amount: 200_000, pct: 20, overlapsCommittee: true },
        ],
        contributionsSampled: 30,
        cycle: 2024,
      },
    });

    render(<CivicBriefCard insight={brief} />);
    expect(screen.getByText('Other')).toBeInTheDocument();
    expect(screen.getByText('Defense')).toBeInTheDocument();
    expect(screen.queryByText(/Detailed funding breakdown unavailable/)).not.toBeInTheDocument();
  });

  it('shows sector bars when top is not "Other"', () => {
    const brief = makeBrief({
      funding: {
        totalRaised: 1_000_000,
        totalSpent: 500_000,
        cashOnHand: 500_000,
        inStatePct: 55,
        topSectors: [
          { sector: 'Energy', amount: 500_000, pct: 85, overlapsCommittee: true },
          { sector: 'Other', amount: 150_000, pct: 15, overlapsCommittee: false },
        ],
        contributionsSampled: 40,
        cycle: 2024,
      },
    });

    render(<CivicBriefCard insight={brief} />);
    expect(screen.getByText('Energy')).toBeInTheDocument();
    expect(screen.queryByText(/Detailed funding breakdown unavailable/)).not.toBeInTheDocument();
  });

  it('hides funding section entirely when totalRaised is null and sectors are all "Other"', () => {
    const brief = makeBrief({
      funding: {
        totalRaised: null,
        totalSpent: null,
        cashOnHand: null,
        inStatePct: null,
        topSectors: [{ sector: 'Other', amount: 100, pct: 99, overlapsCommittee: false }],
        contributionsSampled: 5,
        cycle: 2024,
      },
    });

    render(<CivicBriefCard insight={brief} />);
    expect(screen.queryByText('Where does the money come from?')).not.toBeInTheDocument();
    expect(screen.queryByText(/Detailed funding breakdown unavailable/)).not.toBeInTheDocument();
  });

  it('shows funding totals even when sectors are hidden', () => {
    const brief = makeBrief({
      funding: {
        totalRaised: 3_000_000,
        totalSpent: 1_500_000,
        cashOnHand: 1_500_000,
        inStatePct: 45,
        topSectors: [{ sector: 'Other', amount: 2_700_000, pct: 95, overlapsCommittee: false }],
        contributionsSampled: 60,
        cycle: 2024,
      },
    });

    render(<CivicBriefCard insight={brief} />);
    expect(screen.getByText('Where does the money come from?')).toBeInTheDocument();
    expect(screen.getByText(/\$3\.0M/)).toBeInTheDocument();
    expect(screen.getByText(/Detailed funding breakdown unavailable/)).toBeInTheDocument();
  });

  it('renders key findings', () => {
    render(<CivicBriefCard insight={makeBrief()} />);
    expect(screen.getByText('Key findings')).toBeInTheDocument();
    expect(screen.getByText('Committee donors are above average')).toBeInTheDocument();
  });

  it('shows committee overlap highlight when sectors overlap committees', () => {
    render(<CivicBriefCard insight={makeBrief()} />);
    expect(screen.getByText(/Highlighted industries fall under topics/)).toBeInTheDocument();
  });
});

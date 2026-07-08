/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MoneyReportCard } from './MoneyReportCard';
import type {
  MoneyReportCardInsight,
  RepMoneyMetrics,
  MetricStatus,
} from '@/lib/intelligence/types';

function ready(value: number): MetricStatus {
  return { state: 'ready', value };
}

function makeRep(
  overrides: Partial<RepMoneyMetrics> & Pick<RepMoneyMetrics, 'bioguideId' | 'name'>
): RepMoneyMetrics {
  const voteFinance = overrides.voteFinance ?? ready(0);
  const financeJurisdiction = overrides.financeJurisdiction ?? ready(0);
  const independence = overrides.independence ?? ready(0);
  return {
    party: 'D',
    chamber: 'House',
    state: 'IL',
    influenceChainCount: 0,
    ...overrides,
    voteFinance,
    financeJurisdiction,
    independence,
  };
}

function makeInsight(overrides: Partial<MoneyReportCardInsight> = {}): MoneyReportCardInsight {
  return {
    confidence: 0.82,
    dataAsOf: '2026-03-01T00:00:00Z',
    methodology: 'Aggregates vote-finance correlation and influence chains.',
    disclaimer: 'Correlation does not imply causation.',
    lastAnalyzedAt: '2026-03-15T00:00:00Z',
    source: 'statistical-fallback',
    state: 'IL',
    district: '13',
    multiDistrict: false,
    narrative: 'Your representatives show moderate correlation between donors and votes.',
    representatives: [
      makeRep({
        bioguideId: 'D000001',
        name: 'Dick Durbin',
        chamber: 'Senate',
        voteFinance: ready(0.35),
        financeJurisdiction: ready(0.42),
        independence: ready(0.65),
        influenceChainCount: 12,
      }),
      makeRep({
        bioguideId: 'D000002',
        name: 'Tammy Duckworth',
        chamber: 'Senate',
        voteFinance: ready(0.28),
        financeJurisdiction: ready(0.38),
        independence: ready(0.72),
        influenceChainCount: 8,
      }),
      makeRep({
        bioguideId: 'D000003',
        name: 'Nikki Budzinski',
        chamber: 'House',
        voteFinance: ready(0.45),
        financeJurisdiction: ready(0.55),
        independence: ready(0.58),
        influenceChainCount: 5,
      }),
    ],
    aggregates: {
      averageCorrelation: 0.36,
      highestOverlap: { name: 'Nikki Budzinski', value: 0.55 },
      lowestOverlap: { name: 'Tammy Duckworth', value: 0.38 },
      mostIndependent: { name: 'Tammy Duckworth', value: 0.72 },
      leastIndependent: { name: 'Nikki Budzinski', value: 0.58 },
    },
    ...overrides,
  };
}

describe('MoneyReportCard', () => {
  it('renders header with title and confidence', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    expect(screen.getByText('Money Report Card')).toBeInTheDocument();
  });

  it('shows district context line', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    expect(screen.getByText(/IL District 13/)).toBeInTheDocument();
    expect(screen.getByText(/3 representatives/)).toBeInTheDocument();
  });

  it('renders narrative', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    expect(
      screen.getByText('Your representatives show moderate correlation between donors and votes.')
    ).toBeInTheDocument();
  });

  it('renders aggregate stats', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    expect(screen.getByText('Highest overlap')).toBeInTheDocument();
    expect(screen.getByText('Lowest overlap')).toBeInTheDocument();
    expect(screen.getByText('Most independent')).toBeInTheDocument();
    expect(screen.getByText('Least independent')).toBeInTheDocument();
  });

  it('renders representative names as links', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    const durbin = screen.getByRole('link', { name: 'Dick Durbin' });
    expect(durbin).toHaveAttribute('href', '/representative/D000001');
    const duckworth = screen.getByRole('link', { name: 'Tammy Duckworth' });
    expect(duckworth).toHaveAttribute('href', '/representative/D000002');
  });

  it('shows influence chain counts', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders percentage bars for metrics', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    expect(screen.getAllByText('Votes align with top donor industries')).toHaveLength(3);
    expect(screen.getAllByText('Campaign money from industries they oversee')).toHaveLength(3);
    expect(screen.getAllByText('Votes independently of party + donors')).toHaveLength(3);
  });

  it('renders insufficient-data state with tooltip when analyzer surfaces a reason', () => {
    const insight = makeInsight({
      representatives: [
        makeRep({
          bioguideId: 'N000001',
          name: 'New Rep',
          party: 'R',
          voteFinance: {
            state: 'insufficient-data',
            reason:
              'No donor industry sector has 10 or more recorded votes. We need at least 10 votes in a sector to show a pattern.',
          },
          financeJurisdiction: {
            state: 'insufficient-data',
            reason: 'No FEC contributions for this cycle',
          },
          independence: {
            state: 'insufficient-data',
            reason: 'Model requires 20 confident predictions; only 3 available',
          },
        }),
      ],
    });
    render(<MoneyReportCard insight={insight} />);
    expect(screen.getByRole('link', { name: 'New Rep' })).toBeInTheDocument();
    const empties = screen.getAllByText('Not enough data yet');
    expect(empties.length).toBe(3);
    expect(empties[0]).toHaveAttribute(
      'title',
      'No donor industry sector has 10 or more recorded votes. We need at least 10 votes in a sector to show a pattern.'
    );
  });

  it('renders unavailable state in amber with tooltip', () => {
    const insight = makeInsight({
      representatives: [
        makeRep({
          bioguideId: 'U000001',
          name: 'Timeout Rep',
          voteFinance: { state: 'unavailable', reason: 'timeout' },
          financeJurisdiction: { state: 'unavailable', reason: 'analyzer-error' },
          independence: { state: 'unavailable', reason: 'timeout' },
        }),
      ],
    });
    render(<MoneyReportCard insight={insight} />);
    const labels = screen.getAllByText('Unavailable');
    expect(labels.length).toBe(3);
    expect(labels[0]).toHaveClass('text-amber-600');
    expect(labels[0]).toHaveAttribute('title', 'timeout');
  });

  it('renders computing state without showing a value', () => {
    const insight = makeInsight({
      representatives: [
        makeRep({
          bioguideId: 'C000001',
          name: 'Warming Rep',
          voteFinance: { state: 'computing' },
          financeJurisdiction: { state: 'computing' },
          independence: { state: 'computing' },
        }),
      ],
    });
    render(<MoneyReportCard insight={insight} />);
    const labels = screen.getAllByText('Warming analysis…');
    expect(labels.length).toBe(3);
  });

  it('shows empty state when no reps', () => {
    const insight = makeInsight({
      representatives: [],
      aggregates: {
        averageCorrelation: null,
        highestOverlap: null,
        lowestOverlap: null,
        mostIndependent: null,
        leastIndependent: null,
      },
    });
    render(<MoneyReportCard insight={insight} />);
    expect(screen.getByText(/No representatives found for this district/)).toBeInTheDocument();
  });

  it('shows multi-district warning', () => {
    render(<MoneyReportCard insight={makeInsight({ multiDistrict: true })} />);
    expect(screen.getByText(/multiple districts/)).toBeInTheDocument();
  });

  it('renders disclaimer', () => {
    render(<MoneyReportCard insight={makeInsight()} />);
    expect(screen.getByText('Correlation does not imply causation.')).toBeInTheDocument();
  });

  it('does not show aggregate section when all null', () => {
    const insight = makeInsight({
      aggregates: {
        averageCorrelation: null,
        highestOverlap: null,
        lowestOverlap: null,
        mostIndependent: null,
        leastIndependent: null,
      },
    });
    render(<MoneyReportCard insight={insight} />);
    expect(screen.queryByText('Highest overlap')).not.toBeInTheDocument();
  });

  it('handles show all toggle when more than 3 reps', async () => {
    const user = userEvent.setup();
    const insight = makeInsight();
    // Has 3 reps — exactly at the limit, no toggle needed
    // Add a 4th rep to trigger the toggle
    insight.representatives.push(
      makeRep({
        bioguideId: 'D000004',
        name: 'Fourth Rep',
        party: 'R',
        voteFinance: ready(0.5),
        financeJurisdiction: ready(0.5),
        independence: ready(0.5),
        influenceChainCount: 3,
      })
    );
    render(<MoneyReportCard insight={insight} />);

    // Should show toggle button
    const toggle = screen.getByText(/Show all 4 representatives/);
    expect(toggle).toBeInTheDocument();

    // Initially 4th rep not visible
    expect(screen.queryByText('Fourth Rep')).not.toBeInTheDocument();

    // Click to show all
    await user.click(toggle);
    expect(screen.getByText('Fourth Rep')).toBeInTheDocument();
    expect(screen.getByText('Show fewer')).toBeInTheDocument();
  });
});

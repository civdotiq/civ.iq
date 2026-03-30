/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MoneyReportCard } from './MoneyReportCard';
import type { MoneyReportCardInsight } from '@/lib/intelligence/types';

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
      {
        bioguideId: 'D000001',
        name: 'Dick Durbin',
        party: 'D',
        chamber: 'Senate',
        state: 'IL',
        voteFinanceCorrelation: 0.35,
        financeJurisdictionOverlap: 0.42,
        independenceScore: 0.65,
        influenceChainCount: 12,
      },
      {
        bioguideId: 'D000002',
        name: 'Tammy Duckworth',
        party: 'D',
        chamber: 'Senate',
        state: 'IL',
        voteFinanceCorrelation: 0.28,
        financeJurisdictionOverlap: 0.38,
        independenceScore: 0.72,
        influenceChainCount: 8,
      },
      {
        bioguideId: 'D000003',
        name: 'Nikki Budzinski',
        party: 'D',
        chamber: 'House',
        state: 'IL',
        voteFinanceCorrelation: 0.45,
        financeJurisdictionOverlap: 0.55,
        independenceScore: 0.58,
        influenceChainCount: 5,
      },
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

  it('handles null metrics gracefully', () => {
    const insight = makeInsight({
      representatives: [
        {
          bioguideId: 'N000001',
          name: 'New Rep',
          party: 'R',
          chamber: 'House',
          state: 'IL',
          voteFinanceCorrelation: null,
          financeJurisdictionOverlap: null,
          independenceScore: null,
          influenceChainCount: 0,
        },
      ],
    });
    render(<MoneyReportCard insight={insight} />);
    expect(screen.getByRole('link', { name: 'New Rep' })).toBeInTheDocument();
    // Null metrics render as em-dash
    const dashes = screen.getAllByText('\u2014');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
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
    insight.representatives.push({
      bioguideId: 'D000004',
      name: 'Fourth Rep',
      party: 'R',
      chamber: 'House',
      state: 'IL',
      voteFinanceCorrelation: 0.5,
      financeJurisdictionOverlap: 0.5,
      independenceScore: 0.5,
      influenceChainCount: 3,
    });
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

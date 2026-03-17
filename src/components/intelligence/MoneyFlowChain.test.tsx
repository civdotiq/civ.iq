/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MoneyFlowChain } from './MoneyFlowChain';
import type { InfluenceChain } from '@/lib/intelligence/types';

function makeChain(overrides: Partial<InfluenceChain> = {}): InfluenceChain {
  return {
    organization: 'Acme Corp',
    lobbyingSpending: 2_500_000,
    contributionAmount: 50_000,
    billId: 'hr-1234',
    billTitle: 'Clean Energy Innovation Act',
    vote: 'yea',
    textSimilarity: 0.72,
    links: [
      { type: 'lobbying', label: 'Lobbied on energy policy', confidence: 0.9, data: {} },
      { type: 'contribution', label: '$50K contributed', confidence: 0.85, data: {} },
      { type: 'committee', label: 'Energy and Commerce', confidence: 1.0, data: {} },
      { type: 'bill_match', label: 'HR 1234', confidence: 0.8, data: {} },
      { type: 'vote', label: 'Voted Yea', confidence: 1.0, data: {} },
    ],
    chainConfidence: 0.85,
    ...overrides,
  };
}

describe('MoneyFlowChain', () => {
  it('renders organization name and lobbying spending', () => {
    render(<MoneyFlowChain chain={makeChain()} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('$2.5M lobbying')).toBeInTheDocument();
  });

  it('renders committee label from links', () => {
    render(<MoneyFlowChain chain={makeChain()} />);
    expect(screen.getByText('Energy and Commerce')).toBeInTheDocument();
  });

  it('renders bill title', () => {
    render(<MoneyFlowChain chain={makeChain()} />);
    expect(screen.getByText('Clean Energy Innovation Act')).toBeInTheDocument();
  });

  it('renders vote badge with correct text for yea', () => {
    render(<MoneyFlowChain chain={makeChain({ vote: 'yea' })} />);
    expect(screen.getByText('YEA')).toBeInTheDocument();
  });

  it('renders vote badge with correct text for nay', () => {
    render(<MoneyFlowChain chain={makeChain({ vote: 'nay' })} />);
    expect(screen.getByText('NAY')).toBeInTheDocument();
  });

  it('renders vote badge with correct text for not_voting', () => {
    render(<MoneyFlowChain chain={makeChain({ vote: 'not_voting' })} />);
    expect(screen.getByText('NOT VOTING')).toBeInTheDocument();
  });

  it('formats dollar amounts correctly', () => {
    render(
      <MoneyFlowChain
        chain={makeChain({
          lobbyingSpending: 1_200_000,
          contributionAmount: 75_000,
        })}
      />
    );
    expect(screen.getByText('$1.2M lobbying')).toBeInTheDocument();
    // $75K appears in both horizontal and vertical edge labels
    const amountLabels = screen.getAllByText('$75K');
    expect(amountLabels.length).toBeGreaterThan(0);
  });

  it('truncates long bill titles at 60 characters', () => {
    const longTitle =
      'The Comprehensive National Energy Security and Climate Resilience Investment Act of 2026';
    render(<MoneyFlowChain chain={makeChain({ billTitle: longTitle })} />);
    const truncated = longTitle.slice(0, 60) + '...';
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });

  it('shows text similarity when present', () => {
    render(<MoneyFlowChain chain={makeChain({ textSimilarity: 0.72 })} />);
    expect(screen.getByText('72% text match')).toBeInTheDocument();
  });

  it('does not show text similarity when null', () => {
    render(<MoneyFlowChain chain={makeChain({ textSimilarity: null })} />);
    expect(screen.queryByText(/text match/)).not.toBeInTheDocument();
  });

  it('renders correct vote badge colors', () => {
    const { container: yeaContainer } = render(
      <MoneyFlowChain chain={makeChain({ vote: 'yea' })} />
    );
    const yeaBadge = yeaContainer.querySelector('.border-\\[\\#0a9338\\]');
    expect(yeaBadge).toBeInTheDocument();

    const { container: nayContainer } = render(
      <MoneyFlowChain chain={makeChain({ vote: 'nay' })} />
    );
    const nayBadge = nayContainer.querySelector('.border-\\[\\#e11d07\\]');
    expect(nayBadge).toBeInTheDocument();

    const { container: nvContainer } = render(
      <MoneyFlowChain chain={makeChain({ vote: 'not_voting' })} />
    );
    const nvBadge = nvContainer.querySelector('.border-gray-400');
    expect(nvBadge).toBeInTheDocument();
  });

  it('falls back to "Committee" when no committee link exists', () => {
    render(
      <MoneyFlowChain
        chain={makeChain({
          links: [
            { type: 'lobbying', label: 'Lobbied', confidence: 0.9, data: {} },
            { type: 'vote', label: 'Voted Yea', confidence: 1.0, data: {} },
          ],
        })}
      />
    );
    // "Committee" appears as both the section label and the fallback value
    const committeeTexts = screen.getAllByText('Committee');
    expect(committeeTexts.length).toBeGreaterThanOrEqual(2);
  });
});

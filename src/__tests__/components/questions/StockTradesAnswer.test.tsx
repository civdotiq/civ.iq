/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for StockTradesAnswer and the 119th-Congress trade filter behind
 * /ask/stock-trades/[id].
 *
 * Invariants:
 * - Only trades made on or after 2025-01-03 (119th Congress) are shown.
 * - "No filings" and "source unreachable" render different states — an
 *   upstream failure must never read as "this member reported no trades".
 * - Each trade shows its value range, owner, both dates and a filing link.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('@/lib/data-sources/senate-disclosure-service', () => ({
  congressTradingMonitor: {},
}));
jest.mock('@/lib/cache', () => ({ cachedFetch: jest.fn() }));

import { StockTradesAnswer } from '@/components/questions/StockTradesAnswer';
import { currentCongressTrades, STOCK_TRADES_SINCE } from '@/lib/questions/stock-trades';
import type { StockTrade } from '@/types/stock-trades';

function makeTrade(overrides: Partial<StockTrade> = {}): StockTrade {
  return {
    filingId: '20035590',
    bioguideId: 'P000197',
    memberName: 'Nancy Pelosi',
    stateDistrict: 'CA11',
    owner: 'Spouse',
    assetDescription: 'Apple Inc. Common Stock',
    ticker: 'AAPL',
    assetType: 'ST',
    assetTypeLabel: 'Stock',
    transactionType: 'Purchase',
    transactionDate: '2026-09-25',
    filingDate: '2026-10-07',
    amount: '$1,001 - $15,000',
    capitalGainsOver200: false,
    isPaperFiling: false,
    daysToDisclose: 12,
    isLateFiling: false,
    sourceUrl: 'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035590.pdf',
    ...overrides,
  };
}

describe('currentCongressTrades', () => {
  it('starts at the first day of the 119th Congress', () => {
    expect(STOCK_TRADES_SINCE).toBe('2025-01-03');
  });

  it('keeps trades on or after 2025-01-03 and drops earlier ones', () => {
    const kept = currentCongressTrades([
      makeTrade({ transactionDate: '2025-01-03' }),
      makeTrade({ transactionDate: '2025-01-02' }),
      makeTrade({ transactionDate: '2024-06-30' }),
      makeTrade({ transactionDate: '2026-02-11' }),
    ]);
    expect(kept.map(t => t.transactionDate)).toEqual(['2025-01-03', '2026-02-11']);
  });
});

describe('StockTradesAnswer', () => {
  it('renders each trade with range, owner, dates and a filing link', () => {
    render(
      <StockTradesAnswer
        trades={[makeTrade()]}
        unavailable={false}
        name="Nancy Pelosi"
        chamber="House"
      />
    );
    expect(screen.getAllByText('AAPL · Apple Inc. Common Stock').length).toBeGreaterThan(0);
    expect(screen.getByText('$1,001 - $15,000')).toBeInTheDocument();
    expect(screen.getByText(/Spouse/)).toBeInTheDocument();
    expect(screen.getByText(/Traded Sep 25, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Filed Oct 7, 2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View filing' })).toHaveAttribute(
      'href',
      'https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/2026/20035590.pdf'
    );
  });

  it('counts purchases and sales (full and partial) separately', () => {
    render(
      <StockTradesAnswer
        trades={[
          makeTrade(),
          makeTrade({ transactionType: 'Sale (Full)', filingId: 'b' }),
          makeTrade({ transactionType: 'Sale (Partial)', filingId: 'b' }),
        ]}
        unavailable={false}
        name="Nancy Pelosi"
        chamber="House"
      />
    );
    const summary = screen.getByText('Trade summary').parentElement!;
    expect(summary).toHaveTextContent('Trades reported, 119th Congress3');
    expect(summary).toHaveTextContent('Purchases1');
    expect(summary).toHaveTextContent('Sales2');
    expect(summary).toHaveTextContent('2 reports');
  });

  it('caps the list at 50 and says how many exist', () => {
    const trades = Array.from({ length: 60 }, (_, i) => makeTrade({ filingId: `f${i}` }));
    render(
      <StockTradesAnswer trades={trades} unavailable={false} name="Nancy Pelosi" chamber="House" />
    );
    expect(screen.getAllByRole('link', { name: 'View filing' })).toHaveLength(50);
    expect(screen.getByText('Showing the 50 most recent of 60 trades.')).toBeInTheDocument();
  });

  it('shows a designed empty state when the member reported no trades', () => {
    render(<StockTradesAnswer trades={[]} unavailable={false} name="Jane Doe" chamber="Senate" />);
    expect(screen.getByText('No stock trades reported in the 119th Congress')).toBeInTheDocument();
    expect(screen.getByText(/from Jane Doe .* Senate eFD/)).toBeInTheDocument();
    expect(screen.queryByText('Trade summary')).not.toBeInTheDocument();
  });

  it('never presents an upstream failure as "no trades"', () => {
    render(<StockTradesAnswer trades={[]} unavailable name="Jane Doe" chamber="House" />);
    expect(screen.getByText(/Data unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(/No stock trades reported/)).not.toBeInTheDocument();
  });
});

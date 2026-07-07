/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for congress-trades-query.ts trade-level filtering.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { tradeMatchesFilters, normalizePartyCode } from '@/lib/data-sources/congress-trades-query';
import type { StockTrade } from '@/types/stock-trades';

const baseTrade: StockTrade = {
  filingId: 'abc-123',
  bioguideId: 'T000476',
  memberName: 'Thomas H Tuberville',
  stateDistrict: 'AL00',
  owner: 'Self',
  assetDescription: 'NVIDIA Corporation',
  ticker: 'NVDA',
  assetType: 'ST',
  assetTypeLabel: 'Stock',
  transactionType: 'Purchase',
  transactionDate: '2026-03-15',
  filingDate: '2026-04-01',
  amount: '$15,001 - $50,000',
  capitalGainsOver200: false,
  isPaperFiling: false,
  daysToDisclose: 17,
  isLateFiling: false,
  sourceUrl: 'https://efdsearch.senate.gov/search/view/ptr/abc-123/',
};

describe('normalizePartyCode', () => {
  it('normalizes full party names to letter codes', () => {
    expect(normalizePartyCode('Democrat')).toBe('D');
    expect(normalizePartyCode('Democratic')).toBe('D');
    expect(normalizePartyCode('Republican')).toBe('R');
    expect(normalizePartyCode('Independent')).toBe('I');
  });

  it('passes through letter codes', () => {
    expect(normalizePartyCode('D')).toBe('D');
    expect(normalizePartyCode('R')).toBe('R');
    expect(normalizePartyCode('I')).toBe('I');
  });

  it('normalizes unknown values to empty string', () => {
    expect(normalizePartyCode('')).toBe('');
    expect(normalizePartyCode(null)).toBe('');
    expect(normalizePartyCode(undefined)).toBe('');
    expect(normalizePartyCode('Libertarian')).toBe('');
  });
});

describe('tradeMatchesFilters', () => {
  it('matches with no filters', () => {
    expect(tradeMatchesFilters(baseTrade, {})).toBe(true);
  });

  it('matches ticker case-insensitively', () => {
    expect(tradeMatchesFilters(baseTrade, { ticker: 'nvda' })).toBe(true);
    expect(tradeMatchesFilters(baseTrade, { ticker: 'AAPL' })).toBe(false);
  });

  it('rejects ticker filter when trade has no ticker', () => {
    expect(tradeMatchesFilters({ ...baseTrade, ticker: null }, { ticker: 'NVDA' })).toBe(false);
  });

  it('filters by transaction type', () => {
    expect(tradeMatchesFilters(baseTrade, { transactionType: 'purchase' })).toBe(true);
    expect(tradeMatchesFilters(baseTrade, { transactionType: 'sale' })).toBe(false);

    const saleFull = { ...baseTrade, transactionType: 'Sale (Full)' };
    const salePartial = { ...baseTrade, transactionType: 'Sale (Partial)' };
    expect(tradeMatchesFilters(saleFull, { transactionType: 'sale' })).toBe(true);
    expect(tradeMatchesFilters(salePartial, { transactionType: 'sale' })).toBe(true);
    expect(tradeMatchesFilters(saleFull, { transactionType: 'purchase' })).toBe(false);

    const exchange = { ...baseTrade, transactionType: 'Exchange' };
    expect(tradeMatchesFilters(exchange, { transactionType: 'exchange' })).toBe(true);
  });

  it('filters by date range (inclusive)', () => {
    expect(tradeMatchesFilters(baseTrade, { from: '2026-03-15' })).toBe(true);
    expect(tradeMatchesFilters(baseTrade, { from: '2026-03-16' })).toBe(false);
    expect(tradeMatchesFilters(baseTrade, { to: '2026-03-15' })).toBe(true);
    expect(tradeMatchesFilters(baseTrade, { to: '2026-03-14' })).toBe(false);
    expect(tradeMatchesFilters(baseTrade, { from: '2026-01-01', to: '2026-12-31' })).toBe(true);
  });

  it('combines filters with AND semantics', () => {
    expect(
      tradeMatchesFilters(baseTrade, {
        ticker: 'NVDA',
        transactionType: 'purchase',
        from: '2026-01-01',
      })
    ).toBe(true);
    expect(
      tradeMatchesFilters(baseTrade, {
        ticker: 'NVDA',
        transactionType: 'sale',
        from: '2026-01-01',
      })
    ).toBe(false);
  });
});

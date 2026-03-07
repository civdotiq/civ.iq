/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { SecFilingsSection } from '@/features/campaign-finance/components/SecFilingsSection';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function Wrapper({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

describe('SecFilingsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filings table when data is available', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        filings: [
          {
            accessionNumber: '0001234567-25-000001',
            filingDate: '2025-01-15',
            reportDate: '2025-01-14',
            form: '4',
            primaryDocument: 'doc.xml',
            description: 'FORM 4',
          },
        ],
        form4Transactions: [],
        company: { cik: '320193', name: 'Apple Inc.', tickers: ['AAPL'] },
        metadata: {
          dataSource: 'sec-edgar',
          generatedAt: '2025-01-15T00:00:00Z',
          totalFilings: 1,
        },
      }),
    });

    render(<SecFilingsSection bioguideId="P000197" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    });

    expect(screen.getByText('(AAPL)')).toBeInTheDocument();
    expect(screen.getByText('EDGAR')).toBeInTheDocument();
  });

  it('renders nothing when no filings and no company', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        filings: [],
        form4Transactions: [],
        company: null,
        metadata: { dataSource: 'sec-edgar', generatedAt: '', totalFilings: 0 },
      }),
    });

    const { container } = render(<SecFilingsSection bioguideId="X000001" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('shows error state with retry button on failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SecFilingsSection bioguideId="X000002" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Unable to load SEC filing data')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('constructs correct EDGAR URLs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        filings: [
          {
            accessionNumber: '0001234567-25-000001',
            filingDate: '2025-01-15',
            reportDate: '2025-01-14',
            form: '4',
            primaryDocument: 'doc.xml',
            description: 'FORM 4',
          },
        ],
        form4Transactions: [],
        company: { cik: '320193', name: 'Test Corp', tickers: ['TEST'] },
        metadata: { dataSource: 'sec-edgar', generatedAt: '', totalFilings: 1 },
      }),
    });

    render(<SecFilingsSection bioguideId="X000003" />, { wrapper: Wrapper });

    await waitFor(() => {
      const link = screen.getByLabelText(/View SEC filing/);
      expect(link).toHaveAttribute(
        'href',
        expect.stringContaining('sec.gov/Archives/edgar/data/320193/')
      );
    });
  });
});

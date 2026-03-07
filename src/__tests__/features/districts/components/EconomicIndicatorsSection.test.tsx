/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { EconomicIndicatorsSection } from '@/features/districts/components/EconomicIndicatorsSection';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function Wrapper({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>;
}

const mockIndicatorsResponse = {
  success: true,
  state: 'NY',
  indicators: [
    {
      seriesId: 'NYUR',
      name: 'Unemployment Rate',
      category: 'employment',
      latestValue: 4.2,
      latestDate: '2025-01-01',
      previousValue: 4.5,
      previousDate: '2024-12-01',
      changePercent: -6.67,
      units: 'Percent',
      frequency: 'Monthly',
      observations: [
        { date: '2024-06-01', value: 4.8 },
        { date: '2024-09-01', value: 4.5 },
        { date: '2025-01-01', value: 4.2 },
      ],
    },
    {
      seriesId: 'NYNGSP',
      name: 'Gross State Product',
      category: 'gdp',
      latestValue: 2000000,
      latestDate: '2024-01-01',
      previousValue: 1900000,
      previousDate: '2023-01-01',
      changePercent: 5.26,
      units: 'Millions of Dollars',
      frequency: 'Annual',
      observations: [
        { date: '2022-01-01', value: 1800000 },
        { date: '2023-01-01', value: 1900000 },
        { date: '2024-01-01', value: 2000000 },
      ],
    },
  ],
  metadata: {
    dataSource: 'fred',
    generatedAt: '2025-01-15T00:00:00Z',
    fredApiAvailable: true,
  },
};

describe('EconomicIndicatorsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders indicator cards with values and trends', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicatorsResponse,
    });

    render(<EconomicIndicatorsSection districtId="NY-14" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Economic Indicators')).toBeInTheDocument();
    });

    expect(screen.getByText('Unemployment Rate')).toBeInTheDocument();
    expect(screen.getByText('Gross State Product')).toBeInTheDocument();
    expect(screen.getByText('4.2%')).toBeInTheDocument();
    expect(screen.getByText('-6.67%')).toBeInTheDocument();
    expect(screen.getByText('+5.26%')).toBeInTheDocument();
    expect(screen.getByText(/Federal Reserve Bank of St. Louis/)).toBeInTheDocument();
  });

  it('renders nothing when no indicators returned', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        state: 'NY',
        indicators: [],
        metadata: { dataSource: 'fred', generatedAt: '', fredApiAvailable: false },
      }),
    });

    const { container } = render(<EconomicIndicatorsSection districtId="XX-01" />, {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  it('shows error state with retry on failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('API error'));

    render(<EconomicIndicatorsSection districtId="XX-02" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Unable to load economic data')).toBeInTheDocument();
    });

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('colors unemployment decrease as green (good)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockIndicatorsResponse,
        indicators: [mockIndicatorsResponse.indicators[0]],
      }),
    });

    render(<EconomicIndicatorsSection districtId="XX-03" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('-6.67%')).toBeInTheDocument();
    });

    const trendElement = screen.getByText('-6.67%');
    expect(trendElement.className).toContain('text-[#0a9338]');
  });

  it('renders sparkline SVGs for indicators with observations', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockIndicatorsResponse,
    });

    render(<EconomicIndicatorsSection districtId="XX-04" />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('Economic Indicators')).toBeInTheDocument();
    });

    const svgs = document.querySelectorAll('svg[role="img"]');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

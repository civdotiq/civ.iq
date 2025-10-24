/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { SortableDataTable } from './SortableDataTable';

interface IndustryData extends Record<string, unknown> {
  sector: string;
  amount: number;
  percentage: number;
}

interface TopIndustriesProps {
  industries: IndustryData[];
  totalRaised: number;
}

/**
 * Top industries breakdown with sortable table
 * Shows which industries are contributing to the campaign
 */
export function TopIndustries({ industries, totalRaised }: TopIndustriesProps) {
  if (!industries || industries.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Top Industries</h3>
        <p className="text-neutral-600">No industry data available for this cycle.</p>
      </div>
    );
  }

  const columns = [
    {
      key: 'sector' as keyof IndustryData,
      label: 'Industry',
      sortable: true,
    },
    {
      key: 'amount' as keyof IndustryData,
      label: 'Total Amount',
      sortable: true,
      format: (value: unknown) => {
        const num = value as number;
        return `$${(num / 1000).toFixed(0)}K`;
      },
    },
    {
      key: 'percentage' as keyof IndustryData,
      label: '% of Total',
      sortable: true,
      format: (value: unknown) => {
        const num = value as number;
        return `${num.toFixed(1)}%`;
      },
    },
  ];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold">Top Industries</h3>
        <p className="text-sm text-neutral-600">
          Industries contributing to this campaign, sorted by contribution amount
        </p>
      </div>

      <SortableDataTable
        data={industries}
        columns={columns}
        defaultSortKey="amount"
        showInitially={5}
      />

      <div className="mt-4 rounded-lg bg-neutral-50 p-4">
        <div className="text-sm text-neutral-700">
          <strong>Total Analyzed:</strong> ${(totalRaised / 1000000).toFixed(2)}M from{' '}
          {industries.length} industries
        </div>
        <div className="mt-2 text-xs text-neutral-600">
          Industry classifications based on employer and occupation data from FEC filings
        </div>
      </div>
    </div>
  );
}

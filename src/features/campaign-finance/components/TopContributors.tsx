/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { SortableDataTable } from './SortableDataTable';

/** Input contributor data - supports both API formats */
interface ContributorInput {
  name: string;
  // camelCase (from comprehensive API)
  totalAmount?: number;
  contributionCount?: number;
  // snake_case (legacy format)
  total_amount?: number;
  count?: number;
  employer?: string;
  occupation?: string;
  city?: string;
  state?: string;
}

/** Normalized contributor data for display */
interface NormalizedContributor extends Record<string, unknown> {
  name: string;
  totalAmount: number;
  contributionCount: number;
  employer: string;
}

interface TopContributorsProps {
  contributors: ContributorInput[];
  loading?: boolean;
  cycle?: number;
}

/**
 * Top contributors list with sortable table
 * Shows individual donors and organizations contributing to the campaign
 */
export function TopContributors({ contributors, loading = false, cycle }: TopContributorsProps) {
  if (loading) {
    return (
      <div className="border border-neutral-200 bg-white p-6">
        <div className="mb-6">
          <div className="h-6 bg-gray-200 w-1/3 mb-2 animate-pulse"></div>
          <div className="h-4 bg-gray-200 w-2/3 animate-pulse"></div>
        </div>
        <SortableDataTable
          data={[]}
          columns={[
            { key: 'name', label: 'Contributor', sortable: true },
            { key: 'totalAmount', label: 'Total Amount', sortable: true },
            { key: 'contributionCount', label: 'Contributions', sortable: true },
            { key: 'employer', label: 'Employer', sortable: true },
          ]}
          loading={true}
        />
      </div>
    );
  }

  if (!contributors || contributors.length === 0) {
    return (
      <div className="border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Top Contributors</h3>
        <p className="text-neutral-600">No contributor data available for this cycle.</p>
      </div>
    );
  }

  // Helper to safely format currency
  const formatCurrency = (value: unknown): string => {
    const num = typeof value === 'number' ? value : Number(value);
    if (isNaN(num) || num === 0) return '$0';
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toLocaleString()}`;
  };

  // Normalize contributors to handle both API formats
  const normalizedContributors: NormalizedContributor[] = contributors.map(c => ({
    name: c.name,
    totalAmount: c.totalAmount ?? c.total_amount ?? 0,
    contributionCount: c.contributionCount ?? c.count ?? 1,
    employer: c.employer ?? '',
  }));

  const columns: Array<{
    key: keyof NormalizedContributor;
    label: string;
    sortable: boolean;
    format?: (value: unknown) => React.ReactNode;
  }> = [
    {
      key: 'name',
      label: 'Contributor',
      sortable: true,
      format: (value: unknown) => {
        const name = String(value);
        const params = new URLSearchParams({ contributor_name: name });
        if (cycle) params.set('two_year_transaction_period', String(cycle));
        return (
          <a
            href={`https://www.fec.gov/data/receipts/individual-contributions/?${params.toString()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3ea2d4] hover:underline"
          >
            {name}
          </a>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      sortable: true,
      format: formatCurrency,
    },
    {
      key: 'contributionCount',
      label: 'Contributions',
      sortable: true,
      format: (value: unknown) => {
        const num = typeof value === 'number' ? value : Number(value);
        return isNaN(num) ? '1' : num.toLocaleString();
      },
    },
    {
      key: 'employer',
      label: 'Employer',
      sortable: true,
      format: (value: unknown) => (value ? String(value) : 'Not disclosed'),
    },
  ];

  return (
    <div className="border border-neutral-200 bg-white p-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold">Top Contributors</h3>
        <p className="text-sm text-neutral-600">
          Individual donors and organizations, sorted by total contribution amount
        </p>
      </div>

      <SortableDataTable
        data={normalizedContributors}
        columns={columns}
        defaultSortKey="totalAmount"
        showInitially={5}
      />

      <div className="mt-4 bg-neutral-50 p-4">
        <div className="text-sm text-neutral-700">
          <strong>Total Contributors:</strong> {contributors.length} unique donors
        </div>
        <div className="mt-2 text-xs text-neutral-600">
          Based on a sample of the most recent individual contributions reported to the FEC — not
          the complete donor history. Industry and geographic totals elsewhere on this tab use
          FEC&rsquo;s exact aggregates across all contributions.
        </div>
      </div>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { SortableDataTable } from './SortableDataTable';

interface ContributorData extends Record<string, unknown> {
  name: string;
  total_amount: number;
  count: number;
  employer?: string;
  occupation?: string;
}

interface TopContributorsProps {
  contributors: ContributorData[];
}

/**
 * Top contributors list with sortable table
 * Shows individual donors and organizations contributing to the campaign
 */
export function TopContributors({ contributors }: TopContributorsProps) {
  if (!contributors || contributors.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold">Top Contributors</h3>
        <p className="text-neutral-600">No contributor data available for this cycle.</p>
      </div>
    );
  }

  const columns = [
    {
      key: 'name' as keyof ContributorData,
      label: 'Contributor',
      sortable: true,
    },
    {
      key: 'total_amount' as keyof ContributorData,
      label: 'Total Amount',
      sortable: true,
      format: (value: unknown) => {
        const num = value as number;
        return `$${(num / 1000).toFixed(1)}K`;
      },
    },
    {
      key: 'count' as keyof ContributorData,
      label: 'Contributions',
      sortable: true,
      format: (value: unknown) => String(value),
    },
    {
      key: 'employer' as keyof ContributorData,
      label: 'Employer',
      sortable: true,
      format: (value: unknown) => (value ? String(value) : 'Not disclosed'),
    },
  ];

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold">Top Contributors</h3>
        <p className="text-sm text-neutral-600">
          Individual donors and organizations, sorted by total contribution amount
        </p>
      </div>

      <SortableDataTable
        data={contributors}
        columns={columns}
        defaultSortKey="total_amount"
        showInitially={5}
      />

      <div className="mt-4 rounded-lg bg-neutral-50 p-4">
        <div className="text-sm text-neutral-700">
          <strong>Total Contributors:</strong> {contributors.length} unique donors
        </div>
        <div className="mt-2 text-xs text-neutral-600">
          Data aggregated from FEC individual contribution records
        </div>
      </div>
    </div>
  );
}

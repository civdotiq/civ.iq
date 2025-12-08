/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo } from 'react';

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  format?: (value: unknown) => React.ReactNode;
}

interface SortableDataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  defaultSortKey?: keyof T;
  showInitially?: number;
  title?: string;
  loading?: boolean;
}

/**
 * Sortable data table with progressive disclosure
 * Follows Otl Aicher design system with clean table layout
 */
export function SortableDataTable<T extends Record<string, unknown>>({
  data,
  columns,
  defaultSortKey,
  showInitially = 5,
  title,
  loading = false,
}: SortableDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<keyof T | undefined>(defaultSortKey);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showAll, setShowAll] = useState(false);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return sortDirection === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [data, sortKey, sortDirection]);

  const displayedData = showAll ? sortedData : sortedData.slice(0, showInitially);

  const handleSort = (key: keyof T) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        {title && (
          <div className="border-b border-neutral-200 px-6 py-4">
            <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse"></div>
          </div>
        )}
        <div className="animate-pulse">
          {/* Header skeleton */}
          <div className="border-b border-neutral-200 bg-neutral-50 px-6 py-3">
            <div className="flex gap-8">
              {columns.map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded w-20"></div>
              ))}
            </div>
          </div>
          {/* Row skeletons */}
          {Array.from({ length: showInitially }).map((_, i) => (
            <div key={i} className="border-b border-neutral-200 px-6 py-4">
              <div className="flex gap-8">
                {columns.map((_, j) => (
                  <div key={j} className="h-4 bg-gray-100 rounded w-24"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      {title && (
        <div className="border-b border-neutral-200 px-6 py-4">
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
      )}

      <div className="overflow-x-auto scroll-indicator">
        <table className="w-full">
          <thead className="border-b border-neutral-200 bg-neutral-50">
            <tr>
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  className={`px-6 py-3 min-h-[44px] text-left text-xs font-medium uppercase ${
                    column.sortable !== false ? 'cursor-pointer hover:bg-neutral-100' : ''
                  }`}
                  onClick={() => column.sortable !== false && handleSort(column.key)}
                >
                  {column.label}
                  {column.sortable !== false && sortKey === column.key && (
                    <span className="ml-2">{sortDirection === 'asc' ? '▲' : '▼'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {displayedData.map((row, idx) => (
              <tr key={idx} className="hover:bg-neutral-50">
                {columns.map(column => (
                  <td key={String(column.key)} className="px-6 py-4 text-sm">
                    {column.format ? column.format(row[column.key]) : String(row[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="md:hidden px-6 py-2 text-xs text-gray-500 text-center border-t border-neutral-100">
        ← Swipe to scroll →
      </div>

      {data.length > showInitially && (
        <div className="border-t border-neutral-200 px-6 py-4">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm font-medium text-civiq-blue hover:text-civiq-blue/80"
          >
            {showAll ? 'Show less' : `Show all ${data.length} items`}
          </button>
        </div>
      )}
    </div>
  );
}

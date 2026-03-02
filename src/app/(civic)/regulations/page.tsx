/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Search, Filter, X, FileText, Loader2 } from 'lucide-react';

interface RegulationItem {
  id: string;
  title: string;
  summary: string;
  type: string;
  publishedDate: string;
  agency: string;
  url: string;
  isOpenForComment: boolean;
  daysUntilClose?: number;
}

interface RegulationsResponse {
  success: boolean;
  items: RegulationItem[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'proposed_rule', label: 'Proposed Rules' },
  { value: 'final_rule', label: 'Final Rules' },
  { value: 'notice', label: 'Notices' },
  { value: 'executive_order', label: 'Executive Orders' },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  executive_order: 'bg-yellow-50 text-yellow-800 border-yellow-500',
  proposed_rule: 'bg-blue-50 text-blue-800 border-[#3ea2d4]',
  final_rule: 'bg-green-50 text-green-800 border-[#0a9338]',
  notice: 'bg-gray-50 text-gray-800 border-gray-400',
};

export default function RegulationsPage() {
  const [data, setData] = useState<RegulationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [agencyFilter, setAgencyFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          per_page: '20',
        });
        if (typeFilter !== 'all') params.set('type', typeFilter);
        if (agencyFilter) params.set('agency', agencyFilter);

        const response = await fetch(`/api/federal-register?${params}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load regulations');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, typeFilter, agencyFilter]);

  // Client-side search filter
  const filteredItems = useMemo(() => {
    if (!data?.items) return [];
    if (!searchQuery.trim()) return data.items;
    const q = searchQuery.toLowerCase();
    return data.items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        item.agency.toLowerCase().includes(q) ||
        item.summary?.toLowerCase().includes(q)
    );
  }, [data?.items, searchQuery]);

  const hasFilters = typeFilter !== 'all' || agencyFilter !== '' || searchQuery !== '';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="profile-hero-name text-3xl mb-2">Federal Register</h1>
          <p className="text-gray-600">
            Rules, proposed rules, notices, and executive orders from the Federal Register
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white border-2 border-black p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="sm:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search regulations..."
                  className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 text-sm focus:outline-none focus:border-[#3ea2d4]"
                />
              </div>
            </div>

            {/* Type Filter */}
            <div>
              <select
                value={typeFilter}
                onChange={e => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border-2 border-gray-300 text-sm focus:outline-none focus:border-[#3ea2d4]"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Agency Filter */}
            <div>
              <input
                type="text"
                value={agencyFilter}
                onChange={e => {
                  setAgencyFilter(e.target.value);
                  setPage(1);
                }}
                placeholder="Filter by agency..."
                className="w-full px-3 py-2 border-2 border-gray-300 text-sm focus:outline-none focus:border-[#3ea2d4]"
              />
            </div>
          </div>

          {/* Active Filters */}
          {hasFilters && (
            <div className="mt-4 flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">
                Showing {filteredItems.length} result{filteredItems.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setAgencyFilter('');
                  setPage(1);
                }}
                className="ml-auto inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">Loading regulations...</span>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-red-600 mb-2">Failed to load regulations</div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-[#3592c0]"
            >
              Try Again
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <div className="text-gray-600">No regulations found</div>
            <div className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map(item => (
              <div key={item.id} className="bg-white border-2 border-black p-4 sm:p-6">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    href={`/regulations/${item.id}`}
                    className="text-lg font-semibold text-gray-900 hover:text-[#3ea2d4]"
                  >
                    {item.title}
                  </Link>
                  <span
                    className={`flex-shrink-0 text-xs font-bold border-2 px-2 py-1 ${TYPE_BADGE_COLORS[item.type] || TYPE_BADGE_COLORS.notice}`}
                  >
                    {item.type.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mb-2">
                  {item.agency} ·{' '}
                  {new Date(item.publishedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {item.isOpenForComment && item.daysUntilClose != null && (
                    <span className="ml-2 text-[#0a9338] font-medium">
                      Open for comment ({item.daysUntilClose}d left)
                    </span>
                  )}
                </div>
                {item.summary && (
                  <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-4 py-2 text-sm border-2 border-gray-300 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {data.pagination.page} of {data.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={!data.pagination.hasMore}
              className="px-4 py-2 text-sm border-2 border-gray-300 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

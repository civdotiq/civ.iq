/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { Header } from '@/shared/components/navigation/Header';
import { StateSelector } from '@/features/state-bills/components/StateSelector';
import {
  BillSearchFilters,
  type BillSearchFilterValues,
} from '@/features/state-bills/components/BillSearchFilters';
import { BillSearchResults } from '@/features/state-bills/components/BillSearchResults';
import type { StateBill } from '@/types/state-legislature';

const INITIAL_FILTERS: BillSearchFilterValues = {
  searchQuery: '',
  chamber: 'all',
  classification: 'all',
  status: 'all',
  subject: '',
};

export default function StateBillsSearchPage() {
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [filters, setFilters] = useState<BillSearchFilterValues>(INITIAL_FILTERS);
  const [bills, setBills] = useState<StateBill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState(1);
  const [hasSearched, setHasSearched] = useState(false);

  const billsPerPage = 20;
  const startIndex = (page - 1) * billsPerPage;
  const endIndex = startIndex + billsPerPage;
  const paginatedBills = bills.slice(startIndex, endIndex);
  const totalPages = Math.ceil(bills.length / billsPerPage);

  // Fetch bills from selected states
  const handleSearch = useCallback(async () => {
    if (selectedStates.length === 0) {
      setError('Please select at least one state to search.');
      return;
    }

    setIsLoading(true);
    setError('');
    setHasSearched(true);
    setBills([]);
    setPage(1);

    try {
      // Fetch bills from each selected state
      const fetchPromises = selectedStates.map(async stateCode => {
        const params = new URLSearchParams();

        if (filters.chamber !== 'all') {
          params.set('chamber', filters.chamber);
        }
        if (filters.classification !== 'all') {
          params.set('classification', filters.classification);
        }
        if (filters.status !== 'all') {
          params.set('status', filters.status);
        }
        if (filters.subject) {
          params.set('subject', filters.subject);
        }

        const url = `/api/state-bills/${stateCode}?${params.toString()}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch bills from ${stateCode}`);
        }

        const data = await response.json();
        return data.bills || [];
      });

      const results = await Promise.all(fetchPromises);
      let allBills = results.flat();

      // Filter by search query if provided
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        allBills = allBills.filter(
          bill =>
            bill.title?.toLowerCase().includes(query) ||
            bill.identifier?.toLowerCase().includes(query) ||
            bill.abstract?.toLowerCase().includes(query)
        );
      }

      // Sort by latest action date
      allBills.sort((a, b) => {
        const dateA =
          a.actions && a.actions.length > 0
            ? new Date(a.actions[a.actions.length - 1].date)
            : new Date(0);
        const dateB =
          b.actions && b.actions.length > 0
            ? new Date(b.actions[b.actions.length - 1].date)
            : new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      setBills(allBills);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search state bills');
    } finally {
      setIsLoading(false);
    }
  }, [selectedStates, filters]);

  // Handle filter changes
  const handleFilterChange = (newFilters: BillSearchFilterValues) => {
    setFilters(newFilters);
  };

  // Handle clear filters
  const handleClearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Trigger search when user presses Enter in search query
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && selectedStates.length > 0 && !isLoading) {
        handleSearch();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [selectedStates, filters, isLoading, handleSearch]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pt-24">
        {/* Page Title */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-civiq-blue" />
            <div>
              <h1 className="text-3xl font-black text-gray-900">State Bill Search</h1>
              <p className="text-gray-600">Search legislation across all 50 states</p>
            </div>
          </div>
        </div>
        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-300 p-6 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-blue-900 mb-1">How to Search</h2>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Select one or more states to search</li>
                <li>Optionally apply filters (chamber, type, status, subject)</li>
                <li>Click &quot;Search Bills&quot; to see results</li>
                <li>Click any bill to view full details</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - Filters */}
          <div className="lg:col-span-1 space-y-6">
            {/* State Selector */}
            <StateSelector
              selectedStates={selectedStates}
              onChange={setSelectedStates}
              multiSelect={true}
            />

            {/* Search Filters */}
            <BillSearchFilters
              filters={filters}
              onChange={handleFilterChange}
              onClear={handleClearFilters}
            />

            {/* Search Button */}
            <button
              type="button"
              onClick={handleSearch}
              disabled={selectedStates.length === 0 || isLoading}
              className="w-full bg-civiq-blue text-white py-4 font-bold border-2 border-black hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Searching...' : 'Search Bills'}
            </button>

            {/* Search Stats */}
            {selectedStates.length > 0 && (
              <div className="bg-white border-2 border-gray-300 p-4">
                <h3 className="font-semibold text-gray-900 mb-2 text-sm">Search Scope</h3>
                <p className="text-sm text-gray-600">
                  {selectedStates.length} {selectedStates.length === 1 ? 'state' : 'states'}{' '}
                  selected
                </p>
              </div>
            )}
          </div>

          {/* Right Content - Results */}
          <div className="lg:col-span-2">
            {!hasSearched ? (
              <div className="bg-white border-2 border-black p-12">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Search</h3>
                  <p className="text-gray-600">
                    Select states and filters, then click &quot;Search Bills&quot; to get started.
                  </p>
                </div>
              </div>
            ) : (
              <BillSearchResults
                bills={paginatedBills}
                isLoading={isLoading}
                error={error}
                page={page}
                totalPages={totalPages}
                totalResults={bills.length}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        </div>

        {/* Footer Note */}
        {hasSearched && bills.length > 0 && (
          <div className="mt-8 bg-gray-100 border-2 border-gray-300 p-4 text-center">
            <p className="text-sm text-gray-600">
              Data provided by OpenStates.org. For the most current information, please visit your
              state&apos;s official legislature website.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

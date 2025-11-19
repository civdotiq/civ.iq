/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';

interface Bill {
  id: string;
  number: string;
  title: string;
  introducedDate: string;
  status: string;
  lastAction: string;
  congress: number;
  type: string;
  policyArea: string;
  url?: string;
  relationship?: 'sponsored' | 'cosponsored';
}

interface BillsResponse {
  sponsored: {
    count: number;
    bills: Bill[];
  };
  cosponsored: {
    count: number;
    bills: Bill[];
  };
  totalSponsored: number;
  totalCosponsored: number;
  totalBills: number;
}

interface BillsTabProps {
  bioguideId: string;
  sharedData?: BillsResponse;
  sharedLoading?: boolean;
  sharedError?: Error | null;
}

export const BillsTab = React.memo(
  ({ bioguideId, sharedData, sharedLoading, sharedError }: BillsTabProps) => {
    // Use shared data if available, otherwise fetch individually using direct bills endpoint
    // Only skip individual fetch if we have sharedData OR sharedLoading is true (batch is in progress)
    // If batch failed (sharedError), we should fetch individually
    const shouldFetchIndividually = !sharedData && (!sharedLoading || sharedError);

    const {
      data: individualData,
      error: fetchError,
      isLoading: fetchLoading,
    } = useSWR<BillsResponse>(
      shouldFetchIndividually ? `/api/representative/${bioguideId}/bills` : null,
      shouldFetchIndividually
        ? async (url: string) => {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.json();
          }
        : null,
      {
        revalidateOnFocus: false,
        dedupingInterval: 60000, // Cache for 1 minute
      }
    );

    const data: BillsResponse | undefined = sharedData || individualData;
    const error = sharedError || fetchError;
    const isLoading = (sharedLoading && !sharedError) || fetchLoading;

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(25);
    const [selectedCongress, setSelectedCongress] = useState(119);
    const [selectedType, setSelectedType] = useState<'all' | 'sponsored' | 'cosponsored'>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [selectedPolicyArea, setSelectedPolicyArea] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const canLinkToBill = useCallback((bill: Bill): boolean => {
      return !!(bill.type && bill.number && bill.congress);
    }, []);

    const getBillId = (bill: Bill): string => {
      if (!bill.type || !bill.number) {
        return `bill-${bill.number?.replace(/\W/g, '-') || 'unknown'}`;
      }
      const cleanType = bill.type.toLowerCase().replace(/\./g, '');
      const cleanNumber = bill.number.match(/\d+/)?.[0] || '';
      return `${bill.congress || '119'}-${cleanType}-${cleanNumber}`;
    };

    if (isLoading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-6 bg-white border-2 border-gray-300 rounded w-1/2"></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
            <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
            <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
            <div className="h-16 bg-white border-2 border-gray-300 rounded"></div>
          </div>
          <div className="space-y-4">
            <div className="h-24 bg-white border-2 border-gray-300 rounded"></div>
            <div className="h-24 bg-white border-2 border-gray-300 rounded"></div>
            <div className="h-24 bg-white border-2 border-gray-300 rounded"></div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">Failed to load sponsored bills</div>
          <div className="text-sm text-gray-500">Please try refreshing the page</div>
        </div>
      );
    }

    if (!data || !data.sponsored || !data.sponsored.bills) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-600 mb-2">No bills data available</div>
          <div className="text-sm text-gray-400">Bill data is sourced from Congress.gov</div>
        </div>
      );
    }

    // Combine both sponsored and cosponsored bills
    const sponsoredBills = data.sponsored?.bills || [];
    const cosponsoredBills = data.cosponsored?.bills || [];

    // Add relationship field to distinguish them
    const allBillsWithRelationship = [
      ...sponsoredBills.map(bill => ({ ...bill, relationship: 'sponsored' as const })),
      ...cosponsoredBills.map(bill => ({ ...bill, relationship: 'cosponsored' as const })),
    ];

    // Sort by introduced date (most recent first)
    const bills = allBillsWithRelationship.sort(
      (a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime()
    );

    // Apply all filters
    const filteredBills = bills.filter(bill => {
      // Congress filter
      if (selectedCongress !== 0 && bill.congress !== selectedCongress) {
        return false;
      }

      // Type filter (sponsored/cosponsored)
      if (selectedType !== 'all' && bill.relationship !== selectedType) {
        return false;
      }

      // Status filter
      if (selectedStatus !== 'all' && bill.status !== selectedStatus) {
        return false;
      }

      // Policy area filter
      if (selectedPolicyArea !== 'all' && bill.policyArea !== selectedPolicyArea) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          bill.title?.toLowerCase().includes(search) ||
          bill.number?.toLowerCase().includes(search) ||
          bill.policyArea?.toLowerCase().includes(search)
        );
      }

      return true;
    });

    const uniqueCongresses = [...new Set(bills.map(bill => bill.congress))]
      .filter(c => typeof c === 'number' && c > 0)
      .sort((a, b) => b - a);

    // Extract unique statuses and policy areas for filters
    const uniqueStatuses = [...new Set(bills.map(bill => bill.status).filter(Boolean))].sort();
    const uniquePolicyAreas = [
      ...new Set(bills.map(bill => bill.policyArea).filter(Boolean)),
    ].sort();

    const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const displayedBills = filteredBills.slice(startIndex, endIndex);

    const allBills = bills.length;
    const enactedBills = filteredBills.filter(
      bill => bill.status && bill.status.toLowerCase().includes('enacted')
    ).length;

    return (
      <div>
        <h2 className="text-xl font-bold mb-6">Legislative Activity</h2>

        {/* Enhanced Filters Section */}
        <div className="mb-6 p-4 bg-white space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700">Filter Bills</h3>
            {(selectedCongress !== 119 ||
              selectedType !== 'all' ||
              selectedStatus !== 'all' ||
              selectedPolicyArea !== 'all' ||
              searchTerm) && (
              <button
                onClick={() => {
                  setSelectedCongress(119);
                  setSelectedType('all');
                  setSelectedStatus('all');
                  setSelectedPolicyArea('all');
                  setSearchTerm('');
                  setCurrentPage(1);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Bills</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by title, bill number, or policy area..."
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Filter Controls Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Congress Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Congress</label>
              <select
                value={selectedCongress}
                onChange={e => {
                  setSelectedCongress(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={119}>Current (119th)</option>
                <option value={0}>All Congresses</option>
                {uniqueCongresses.map(congress => (
                  <option key={congress} value={congress}>
                    {congress}th Congress
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Type</label>
              <select
                value={selectedType}
                onChange={e => {
                  setSelectedType(e.target.value as 'all' | 'sponsored' | 'cosponsored');
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Bills</option>
                <option value="sponsored">Sponsored Only</option>
                <option value="cosponsored">Cosponsored Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedStatus}
                onChange={e => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            {/* Policy Area Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Policy Area</label>
              <select
                value={selectedPolicyArea}
                onChange={e => {
                  setSelectedPolicyArea(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 min-h-[44px] border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Policy Areas</option>
                {uniquePolicyAreas.map(area => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Items per page selector */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredBills.length} of {allBills} total bills
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Items per page:</label>
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{data.totalSponsored}</div>
            <div className="text-sm text-gray-500">Sponsored</div>
            <div className="text-xs text-gray-400">
              {filteredBills.filter(b => b.relationship === 'sponsored').length} shown
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{enactedBills}</div>
            <div className="text-sm text-gray-500">Enacted</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">{data.totalCosponsored}</div>
            <div className="text-sm text-gray-500">Cosponsored</div>
            <div className="text-xs text-gray-400">
              {filteredBills.filter(b => b.relationship === 'cosponsored').length} shown
            </div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{data.totalBills}</div>
            <div className="text-sm text-gray-500">Total Bills</div>
          </div>
        </div>

        {/* Pagination Controls */}
        {filteredBills.length > itemsPerPage && (
          <div className="flex items-center justify-between mb-6 p-4 bg-white">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredBills.length)} of{' '}
              {filteredBills.length} bills
            </div>
            <div className="flex items-center gap-4">
              <select
                value={itemsPerPage}
                onChange={e => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-1 border text-sm"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white border-2 border-gray-300"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white border-2 border-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bills List */}
        {filteredBills.length === 0 ? (
          selectedCongress !== 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">
                No bills found for the {selectedCongress}th Congress
              </p>
              <button
                onClick={() => setSelectedCongress(0)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View all congresses
              </button>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No bills data available</p>
          )
        ) : (
          <div className="space-y-4">
            {displayedBills.map((bill, index) => (
              <div
                key={`${bill.id || 'bill'}-${index}-${bill.number || index}`}
                className="border p-4"
              >
                <h3 className="font-medium">
                  {bill.relationship === 'cosponsored' && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded mr-2">
                      Cosponsored
                    </span>
                  )}
                  {bill.relationship === 'sponsored' && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2">
                      Sponsored
                    </span>
                  )}
                  {canLinkToBill(bill) ? (
                    <Link
                      href={`/bill/${getBillId(bill)}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {bill.number}: {bill.title}
                    </Link>
                  ) : (
                    <span
                      className="text-gray-500"
                      title="Bill details unavailable - incomplete data"
                    >
                      {bill.title || bill.number || 'Unknown Bill'}
                    </span>
                  )}
                  {bill.url && (
                    <a
                      href={bill.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-xs text-gray-500 hover:text-gray-700"
                    >
                      (Congress.gov)
                    </a>
                  )}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Introduced:{' '}
                  {bill.introducedDate
                    ? new Date(bill.introducedDate).toLocaleDateString()
                    : 'Date unknown'}
                </p>
                <p className="text-sm text-gray-600 mt-1">{bill.lastAction}</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-xs bg-blue-100 px-2 py-1 rounded">
                    {bill.type || 'Type: Unknown'}
                  </span>
                  {bill.policyArea && (
                    <span className="text-xs bg-green-100 px-2 py-1 rounded">
                      {bill.policyArea}
                    </span>
                  )}
                  <span className="text-xs bg-yellow-100 px-2 py-1 rounded">
                    {bill.status || 'Status: Unknown'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
);

BillsTab.displayName = 'BillsTab';

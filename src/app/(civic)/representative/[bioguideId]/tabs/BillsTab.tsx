/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useCallback } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { fetcher } from '@/lib/utils/fetcher';

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
}

export function BillsTab({ bioguideId }: BillsTabProps) {
  const { data, error, isLoading } = useSWR<BillsResponse>(
    `/api/representative/${bioguideId}/bills`,
    fetcher
  );

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [selectedCongress, setSelectedCongress] = useState(119);

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
        <div className="h-6 bg-gray-100 rounded w-1/2"></div>
        <div className="grid grid-cols-4 gap-4">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
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

  const bills = data.sponsored.bills;
  const filteredBills =
    selectedCongress === 0 ? bills : bills.filter(bill => bill.congress === selectedCongress);

  const uniqueCongresses = [...new Set(bills.map(bill => bill.congress))]
    .filter(c => typeof c === 'number' && c > 0)
    .sort((a, b) => b - a);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedBills = filteredBills.slice(startIndex, endIndex);

  const totalBills = filteredBills.length;
  const allBills = bills.length;
  const enactedBills = filteredBills.filter(
    bill => bill.status && bill.status.toLowerCase().includes('enacted')
  ).length;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Sponsored Bills</h2>

      {/* Congress Filter */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Filter by Congress</h3>
          {selectedCongress !== 119 && (
            <button
              onClick={() => {
                setSelectedCongress(119);
                setCurrentPage(1);
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset to current Congress
            </button>
          )}
        </div>
        <div className="mt-3">
          <select
            value={selectedCongress}
            onChange={e => {
              setSelectedCongress(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={119}>Current Congress (119th) - 2025-2027</option>
            <option value={0}>All Congresses</option>
            {uniqueCongresses.map(congress => (
              <option key={congress} value={congress}>
                {congress}th Congress {congress === 119 ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
        {selectedCongress === 0 && (
          <div className="mt-2 text-sm text-amber-600">
            Showing all {allBills} bills across entire career
          </div>
        )}
        {selectedCongress > 0 && selectedCongress !== 119 && (
          <div className="mt-2 text-sm text-gray-600">
            Showing {totalBills} bills from the {selectedCongress}th Congress
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold text-blue-600">{totalBills}</div>
          <div className="text-sm text-gray-500">
            Bills {selectedCongress === 0 ? 'Sponsored' : 'Shown'}
          </div>
          {selectedCongress !== 0 && totalBills !== allBills && (
            <div className="text-xs text-gray-400">({allBills} total career)</div>
          )}
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{enactedBills}</div>
          <div className="text-sm text-gray-500">Enacted</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-600">{data.totalCosponsored}</div>
          <div className="text-sm text-gray-500">Cosponsored</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{data.totalBills}</div>
          <div className="text-sm text-gray-500">Total Bills</div>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredBills.length > itemsPerPage && (
        <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
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
              className="px-3 py-1 border rounded-md text-sm"
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
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
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
          {displayedBills.map(bill => (
            <div key={bill.id} className="border rounded-lg p-4">
              <h3 className="font-medium">
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
                  <span className="text-xs bg-green-100 px-2 py-1 rounded">{bill.policyArea}</span>
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

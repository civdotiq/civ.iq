/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import logger from '@/lib/logging/simple-logger';

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
  committee?: string;
  progress?: number;
}

interface BillsTabProps {
  bills: Bill[];
  metadata?: unknown;
  loading?: boolean;
}

export function BillsTab({ bills = [] }: BillsTabProps) {
  const params = useParams();
  const bioguideId = params?.bioguideId as string;

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Congress filter state - default to current congress to reduce overwhelming list
  const [selectedCongress, setSelectedCongress] = useState(119);

  // Apply congress filter
  const filteredBills = React.useMemo(() => {
    if (selectedCongress === 0) {
      return bills; // Show all congresses
    }
    return bills.filter(bill => bill.congress === selectedCongress);
  }, [bills, selectedCongress]);

  // Get unique congress numbers for dropdown
  const uniqueCongresses = React.useMemo(() => {
    return [...new Set(bills.map(bill => bill.congress))]
      .filter(c => typeof c === 'number' && c > 0)
      .sort((a, b) => b - a); // Most recent first
  }, [bills]);

  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);

  // Calculate the bills to display on current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedBills = filteredBills.slice(startIndex, endIndex);

  // Reset to page 1 when congress filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCongress]);

  // Only create links for bills with complete data
  const canLinkToBill = useCallback((bill: Bill): boolean => {
    return !!(bill.type && bill.number && bill.congress);
  }, []);

  // Helper function to generate correct bill ID for routing - Enhanced with fallbacks
  const getBillId = (bill: Bill): string => {
    // Now we should always have a type from the API extraction
    if (!bill.type || !bill.number) {
      logger.error('Bill still missing required fields in getBillId', {
        bioguideId,
        bill: {
          id: bill.id,
          number: bill.number,
          type: bill.type,
          congress: bill.congress,
        },
      });
      return `bill-${bill.number?.replace(/\W/g, '-') || 'unknown'}`;
    }

    const cleanType = bill.type.toLowerCase().replace(/\./g, '');
    const cleanNumber = bill.number.match(/\d+/)?.[0] || '';
    return `${bill.congress || '119'}-${cleanType}-${cleanNumber}`;
  };

  // COMPREHENSIVE DIAGNOSTIC - Inspect actual bill data structure
  useEffect(() => {
    if (bills && bills.length > 0) {
      // Detailed client-side diagnostic logging
      // eslint-disable-next-line no-console
      console.group(`📊 Bill Data Diagnostic for ${bioguideId}`);
      // eslint-disable-next-line no-console
      console.log('Total bills:', bills.length);
      // eslint-disable-next-line no-console
      console.log('First 3 bills raw structure:', bills.slice(0, 3));

      // Analyze data completeness
      const analysis = {
        totalBills: bills.length,
        withType: bills.filter(b => b.type).length,
        withNumber: bills.filter(b => b.number).length,
        withCongress: bills.filter(b => b.congress).length,
        samples: bills.slice(0, 3).map(b => ({
          number: b.number,
          type: b.type,
          congress: b.congress,
          hasAllFields: !!(b.type && b.number && b.congress),
          allKeys: Object.keys(b),
        })),
      };
      // eslint-disable-next-line no-console
      console.table(analysis.samples);
      // eslint-disable-next-line no-console
      console.log('Field completeness:', {
        type: `${analysis.withType}/${analysis.totalBills}`,
        number: `${analysis.withNumber}/${analysis.totalBills}`,
        congress: `${analysis.withCongress}/${analysis.totalBills}`,
      });
      // eslint-disable-next-line no-console
      console.groupEnd();

      // Also send to logger for server-side tracking
      const incompleteBills = bills.filter(b => !b.type || !b.number || !b.congress);
      if (incompleteBills.length > 0) {
        logger.error(
          `[DATA QUALITY] ${incompleteBills.length}/${bills.length} bills have missing data`,
          new Error('Incomplete bill data'),
          {
            bioguideId,
            samples: incompleteBills.slice(0, 3),
            missingFields: incompleteBills.map(b => ({
              id: b.id,
              number: b.number,
              hasType: !!b.type,
              hasNumber: !!b.number,
              hasCongress: !!b.congress,
              rawType: b.type,
              rawCongress: b.congress,
            })),
          }
        );
      }

      const linkableBills = bills.filter(canLinkToBill);
      logger.info(
        `[BILLS TAB] ${linkableBills.length}/${bills.length} bills are clickable for ${bioguideId}`,
        {
          bioguideId,
          totalBills: bills.length,
          linkableBills: linkableBills.length,
        }
      );
    }
  }, [bills, bioguideId, canLinkToBill]);

  // Calculate bill statistics (based on filtered results)
  const totalBills = filteredBills.length;
  const allBills = bills.length;
  const enactedBills = filteredBills.filter(
    bill => bill.status && bill.status.toLowerCase().includes('enacted')
  ).length;
  const avgCosponsors = 0; // This would come from actual data
  const totalSupport = 0; // This would come from actual data

  return (
    <>
      <h2 className="text-lg font-semibold mb-4">Legislative Tracker</h2>

      {/* Congress Filter */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-700">Filter by Congress</h3>
          {selectedCongress !== 119 && (
            <button
              onClick={() => setSelectedCongress(119)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Reset to current Congress
            </button>
          )}
        </div>
        <div className="mt-3">
          <select
            value={selectedCongress}
            onChange={e => setSelectedCongress(Number(e.target.value))}
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
            Showing all {allBills} bills across Bernie&apos;s entire career (this may take a moment
            to load)
          </div>
        )}
        {selectedCongress > 0 && selectedCongress !== 119 && (
          <div className="mt-2 text-sm text-gray-600">
            Showing {totalBills} bills from the {selectedCongress}th Congress
          </div>
        )}
      </div>

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
          <div className="text-3xl font-bold text-yellow-600">{avgCosponsors}</div>
          <div className="text-sm text-gray-500">Avg Cosponsors</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-purple-600">{totalSupport}</div>
          <div className="text-sm text-gray-500">Total Support</div>
        </div>
      </div>

      {/* Pagination Controls at Top */}
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
              <option value={filteredBills.length}>Show all filtered results</option>
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
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {bill.committee || 'Committee: Unknown'}
                </span>
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

      {/* Pagination Controls at Bottom */}
      {filteredBills.length > itemsPerPage && (
        <div className="flex items-center justify-center mt-6 gap-2">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            First
          </button>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Previous
          </button>

          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-3 py-1 border rounded-md text-sm hover:bg-gray-100 ${
                    currentPage === pageNum ? 'bg-blue-500 text-white hover:bg-blue-600' : ''
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Next
          </button>
          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          >
            Last
          </button>
        </div>
      )}
    </>
  );
}

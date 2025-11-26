/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { FileText, Calendar, Building2 } from 'lucide-react';
import { encodeBase64Url } from '@/lib/url-encoding';
import type { StateBill } from '@/types/state-legislature';

interface BillsApiResponse {
  success: boolean;
  bills: StateBill[];
  total: number;
  returned: number;
  legislator: {
    id: string;
    name: string;
    chamber: 'upper' | 'lower';
    district: string;
  };
}

interface StateLegislatorBillsListProps {
  state: string;
  legislatorId: string;
  legislatorName: string;
}

export const StateLegislatorBillsList: React.FC<StateLegislatorBillsListProps> = ({
  state,
  legislatorId,
  legislatorName,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Encode the legislator ID for the API call
  const base64Id = encodeBase64Url(legislatorId);

  // Fetch bills from API
  const { data, error, isLoading } = useSWR<BillsApiResponse>(
    `/api/state-legislature/${state}/legislator/${base64Id}/bills`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    }
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-6 bg-white border-2 border-gray-300 rounded w-1/2"></div>
        <div className="grid grid-cols-2 gap-4">
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

  // Error state
  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Failed to load bills</div>
        <div className="text-sm text-gray-500">Please try refreshing the page</div>
      </div>
    );
  }

  // No data state
  if (!data || !data.bills || data.bills.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <div className="text-gray-600 mb-2">No bills found</div>
        <div className="text-sm text-gray-400">
          {legislatorName} has not sponsored or co-sponsored any bills in the current session.
        </div>
      </div>
    );
  }

  const bills = data.bills;

  // Extract unique subjects, classifications, and sessions for filters
  const uniqueSubjects = [
    ...new Set(bills.flatMap(bill => bill.subject || []).filter(Boolean)),
  ].sort();
  const uniqueClassifications = [
    ...new Set(bills.flatMap(bill => bill.classification || []).filter(Boolean)),
  ].sort();
  const uniqueSessions = [...new Set(bills.map(bill => bill.session).filter(Boolean))].sort(
    (a, b) => b.localeCompare(a)
  ); // Most recent first

  // Apply filters
  const filteredBills = bills.filter(bill => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesTitle = bill.title?.toLowerCase().includes(search);
      const matchesIdentifier = bill.identifier?.toLowerCase().includes(search);
      const matchesSubject = bill.subject?.some(s => s.toLowerCase().includes(search));
      if (!matchesTitle && !matchesIdentifier && !matchesSubject) {
        return false;
      }
    }

    // Subject filter
    if (selectedSubject !== 'all' && !bill.subject?.includes(selectedSubject)) {
      return false;
    }

    // Classification filter
    if (
      selectedClassification !== 'all' &&
      !bill.classification?.some(c => c === selectedClassification)
    ) {
      return false;
    }

    // Session filter
    if (selectedSession !== 'all' && bill.session !== selectedSession) {
      return false;
    }

    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredBills.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const displayedBills = filteredBills.slice(startIndex, endIndex);

  // Get sponsorship role for a bill
  const getSponsorshipRole = (bill: StateBill): 'primary' | 'cosponsor' | null => {
    const sponsorship = bill.sponsorships?.find(
      s => s.legislatorId === legislatorId || s.name === legislatorName
    );
    return sponsorship ? sponsorship.classification : null;
  };

  // Format date
  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'Date unknown';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Date unknown';
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <FileText className="w-6 h-6 text-civiq-blue" />
        SPONSORED LEGISLATION
      </h2>

      {/* Filters Section */}
      <div className="mb-6 p-4 bg-gray-50 border-2 border-gray-300 space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-700">Filter Bills</h3>
          {(searchTerm ||
            selectedSubject !== 'all' ||
            selectedClassification !== 'all' ||
            selectedSession !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSubject('all');
                setSelectedClassification('all');
                setSelectedSession('all');
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
            placeholder="Search by title, bill number, or subject..."
            className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Session Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Session</label>
            <select
              value={selectedSession}
              onChange={e => {
                setSelectedSession(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Sessions</option>
              {uniqueSessions.map(session => (
                <option key={session} value={session}>
                  {session}
                </option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              value={selectedSubject}
              onChange={e => {
                setSelectedSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Subjects</option>
              {uniqueSubjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject}
                </option>
              ))}
            </select>
          </div>

          {/* Classification Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={selectedClassification}
              onChange={e => {
                setSelectedClassification(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {uniqueClassifications.map(classification => (
                <option key={classification} value={classification}>
                  {classification}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Items per page selector */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-sm text-gray-600">
            Showing {filteredBills.length} of {bills.length} total bills
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
            </select>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 border-2 border-gray-300 p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">{bills.length}</div>
          <div className="text-sm text-gray-600">Total Bills</div>
          <div className="text-xs text-gray-400">{filteredBills.length} shown</div>
        </div>
        <div className="bg-gray-50 border-2 border-gray-300 p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {bills.filter(b => getSponsorshipRole(b) === 'primary').length}
          </div>
          <div className="text-sm text-gray-600">Primary Sponsor</div>
        </div>
        <div className="bg-gray-50 border-2 border-gray-300 p-4 text-center">
          <div className="text-3xl font-bold text-yellow-600">
            {bills.filter(b => getSponsorshipRole(b) === 'cosponsor').length}
          </div>
          <div className="text-sm text-gray-600">Co-Sponsor</div>
        </div>
      </div>

      {/* Pagination Controls */}
      {filteredBills.length > itemsPerPage && (
        <div className="flex items-center justify-between mb-6 p-4 bg-white border-2 border-gray-300">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1}-{Math.min(endIndex, filteredBills.length)} of{' '}
            {filteredBills.length} bills
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border-2 border-black text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border-2 border-black text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">No bills found matching your filters</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedSubject('all');
              setSelectedClassification('all');
              setSelectedSession('all');
              setCurrentPage(1);
            }}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedBills.map((bill, index) => {
            const sponsorshipRole = getSponsorshipRole(bill);
            const base64BillId = encodeBase64Url(bill.id);

            return (
              <div
                key={`${bill.id}-${index}`}
                className="border-2 border-gray-300 p-4 hover:border-black transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg mb-1">
                      {sponsorshipRole === 'primary' && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded mr-2">
                          Primary Sponsor
                        </span>
                      )}
                      {sponsorshipRole === 'cosponsor' && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded mr-2">
                          Co-Sponsor
                        </span>
                      )}
                      <Link
                        href={`/state-bills/${state}/${base64BillId}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {bill.identifier}
                      </Link>
                    </h3>
                    <p className="text-gray-900 mb-2">{bill.title}</p>
                    {bill.abstract && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{bill.abstract}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {bill.classification && bill.classification.length > 0 && (
                    <span className="text-xs bg-white border-2 border-gray-300 px-2 py-1 rounded flex items-center gap-1">
                      <Building2 className="w-3 h-3" />
                      {bill.classification[0]}
                    </span>
                  )}
                  {bill.subject && bill.subject.length > 0 && (
                    <span className="text-xs bg-green-100 px-2 py-1 rounded">
                      {bill.subject[0]}
                    </span>
                  )}
                  {bill.first_action_date && (
                    <span className="text-xs bg-white border-2 border-gray-300 px-2 py-1 rounded flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(bill.first_action_date)}
                    </span>
                  )}
                </div>

                {bill.actions &&
                  bill.actions.length > 0 &&
                  (() => {
                    const lastAction = bill.actions[bill.actions.length - 1];
                    return lastAction ? (
                      <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        <span className="font-medium">Latest Action: </span>
                        {lastAction.description} ({formatDate(lastAction.date)})
                      </div>
                    ) : null;
                  })()}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Pagination (if needed) */}
      {filteredBills.length > itemsPerPage && (
        <div className="flex items-center justify-center mt-6 gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border-2 border-black text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border-2 border-black text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

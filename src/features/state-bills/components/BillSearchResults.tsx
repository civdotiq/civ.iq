/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { FileText, Calendar, Users, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { encodeBase64Url } from '@/lib/url-encoding';
import type { StateBill } from '@/types/state-legislature';

interface BillSearchResultsProps {
  bills: StateBill[];
  isLoading: boolean;
  error?: string;
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
}

export const BillSearchResults: React.FC<BillSearchResultsProps> = ({
  bills,
  isLoading,
  error,
  page,
  totalPages,
  totalResults,
  onPageChange,
}) => {
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-12 h-12 text-civiq-blue animate-spin" />
          <p className="text-gray-600">Searching state bills...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white border-2 border-black p-8">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900 mb-1">Search Error</h3>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No results
  if (bills.length === 0) {
    return (
      <div className="bg-white border-2 border-black p-12">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Bills Found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your search filters or selecting different states.
          </p>
        </div>
      </div>
    );
  }

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  };

  // Get status badge color
  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-50 text-gray-800 border-gray-400';

    switch (status) {
      case 'signed':
        return 'bg-green-50 text-green-800 border-green-600';
      case 'passed_legislature':
      case 'passed_upper':
      case 'passed_lower':
        return 'bg-blue-50 text-blue-800 border-blue-600';
      case 'vetoed':
      case 'failed':
        return 'bg-red-50 text-red-800 border-red-600';
      case 'in_committee':
        return 'bg-yellow-50 text-yellow-800 border-yellow-600';
      case 'introduced':
        return 'bg-purple-50 text-purple-800 border-purple-600';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-400';
    }
  };

  // Format status text
  const formatStatus = (status?: string) => {
    if (!status) return 'Unknown';
    return status
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div>
      {/* Results Header */}
      <div className="bg-white border-2 border-black p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">
              Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, totalResults)} of {totalResults}{' '}
              results
            </p>
          </div>
          <div className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </div>
        </div>
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {bills.map(bill => {
          const latestAction =
            bill.actions && bill.actions.length > 0 ? bill.actions[bill.actions.length - 1] : null;
          const primarySponsor = bill.sponsorships?.find(s => s.classification === 'primary');

          return (
            <Link
              key={bill.id}
              href={`/state-bills/${bill.state}/${encodeBase64Url(bill.id)}`}
              className="block bg-white border-2 border-black hover:border-civiq-blue hover:shadow-lg transition-all group"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-block px-2 py-1 bg-gray-900 text-white text-xs font-bold">
                        {bill.state.toUpperCase()}
                      </span>
                      <span className="font-mono text-sm font-bold text-gray-900">
                        {bill.identifier}
                      </span>
                      {bill.status && (
                        <span
                          className={`inline-block px-2 py-1 text-xs font-bold border ${getStatusColor(bill.status)}`}
                        >
                          {formatStatus(bill.status)}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-civiq-blue transition-colors">
                      {bill.title}
                    </h3>
                    {bill.abstract && (
                      <p className="text-sm text-gray-600 line-clamp-2">{bill.abstract}</p>
                    )}
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-400 flex-shrink-0 group-hover:text-civiq-blue transition-colors" />
                </div>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  {/* Chamber */}
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4 text-civiq-blue" />
                    <span>{bill.chamber === 'upper' ? 'Senate' : 'House'}</span>
                  </div>

                  {/* Primary Sponsor */}
                  {primarySponsor && (
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4 text-civiq-green" />
                      <span>{primarySponsor.name}</span>
                    </div>
                  )}

                  {/* Latest Action Date */}
                  {latestAction?.date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-civiq-red" />
                      <span>{formatDate(latestAction.date)}</span>
                    </div>
                  )}
                </div>

                {/* Latest Action */}
                {latestAction && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold">Latest Action:</span>{' '}
                      {latestAction.description}
                    </p>
                  </div>
                )}

                {/* Subjects */}
                {bill.subject && bill.subject.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {bill.subject.slice(0, 3).map((subject, index) => (
                      <span
                        key={index}
                        className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs border border-gray-300"
                      >
                        {subject}
                      </span>
                    ))}
                    {bill.subject.length > 3 && (
                      <span className="inline-block px-2 py-1 text-gray-500 text-xs">
                        +{bill.subject.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 bg-white border-2 border-black p-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="px-4 py-2 border-2 border-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Previous
            </button>

            <div className="flex items-center gap-2">
              {/* Show page numbers around current page */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => onPageChange(pageNum)}
                    className={`w-10 h-10 border-2 font-bold transition-colors ${
                      pageNum === page
                        ? 'bg-civiq-blue text-white border-civiq-blue'
                        : 'border-black hover:bg-gray-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="px-4 py-2 border-2 border-black font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

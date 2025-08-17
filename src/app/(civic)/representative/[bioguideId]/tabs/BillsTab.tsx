/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ExternalLink, Calendar, Users, FileText } from 'lucide-react';
import {
  DataSourceBadge,
  DataTransparencyPanel,
  type DataMetadata,
} from '@/components/ui/DataTransparency';

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
  progress?: number; // 0-100 percentage
}

interface BillsTabProps {
  bills: Bill[];
  metadata?: DataMetadata;
  loading?: boolean;
}

const BILL_CATEGORIES = [
  'All Categories',
  'Healthcare',
  'Education',
  'Defense',
  'Transportation',
  'Technology',
  'Environment',
  'Finance',
  'Agriculture',
  'Immigration',
  'Energy',
  'Justice',
  'Other',
];

const CATEGORY_COLORS = {
  Healthcare: 'bg-red-100 text-red-800 border-red-200',
  Education: 'bg-blue-100 text-blue-800 border-blue-200',
  Defense: 'bg-purple-100 text-purple-800 border-purple-200',
  Transportation: 'bg-green-100 text-green-800 border-green-200',
  Technology: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Environment: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Finance: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Agriculture: 'bg-lime-100 text-lime-800 border-lime-200',
  Immigration: 'bg-orange-100 text-orange-800 border-orange-200',
  Energy: 'bg-amber-100 text-amber-800 border-amber-200',
  Justice: 'bg-slate-100 text-slate-800 border-slate-200',
  Other: 'bg-gray-100 text-gray-800 border-gray-200',
};

const _BILL_STATUS_STEPS = [
  'Introduced',
  'Committee Review',
  'Committee Markup',
  'Floor Vote',
  'Sent to Other Chamber',
  'Conference Committee',
  'Sent to President',
  'Enacted',
];

export function BillsTab({ bills, metadata, loading }: BillsTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories');
  const [showAllBills, setShowAllBills] = useState(false);

  // Filter bills by category
  const filteredBills = useMemo(() => {
    if (!bills?.length) return [];
    if (selectedCategory === 'All Categories') return bills;
    return bills.filter(bill => bill.policyArea === selectedCategory);
  }, [bills, selectedCategory]);

  // Display limited bills initially
  const displayedBills = showAllBills ? filteredBills : filteredBills.slice(0, 10);

  // Calculate bill progress based on status
  const calculateProgress = (status: string): number => {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('enacted') || statusLower.includes('signed')) return 100;
    if (statusLower.includes('president')) return 87;
    if (statusLower.includes('conference')) return 75;
    if (statusLower.includes('senate') || statusLower.includes('house')) return 62;
    if (statusLower.includes('floor') || statusLower.includes('passed')) return 50;
    if (statusLower.includes('markup') || statusLower.includes('ordered')) return 37;
    if (statusLower.includes('committee') || statusLower.includes('referred')) return 25;
    if (statusLower.includes('introduced')) return 12;
    return 12;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.Other;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!bills?.length) {
    return (
      <div className="space-y-6">
        {/* Data Source Attribution */}
        {metadata && (
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Sponsored Bills</h3>
            <DataTransparencyPanel metadata={metadata} layout="horizontal" showAll={false} />
          </div>
        )}

        <div className="text-center py-12">
          <div className="text-gray-500 mb-2">No sponsored bills found</div>
          <div className="text-sm text-gray-400">
            Sponsored legislation will appear here when available from Congress.gov
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Data Source */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Sponsored Bills</h3>
        {metadata && (
          <DataTransparencyPanel metadata={metadata} layout="horizontal" showAll={false} />
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <FileText className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700">Total Bills</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{bills.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">This Congress</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {bills.filter(bill => bill.congress === 119).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium text-gray-700">Enacted</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {bills.filter(bill => bill.status.toLowerCase().includes('enacted')).length}
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter by category:</span>
        </div>
        <div className="relative">
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="appearance-none bg-white border border-gray-300 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {BILL_CATEGORIES.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {displayedBills.map(bill => {
          const progress = bill.progress || calculateProgress(bill.status);
          return (
            <div key={bill.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                {/* Bill Information */}
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {bill.number}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">{bill.title}</h4>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                        <span>Introduced: {formatDate(bill.introducedDate)}</span>
                        <span>•</span>
                        <span>Congress: {bill.congress}th</span>
                        {bill.committee && (
                          <>
                            <span>•</span>
                            <span>Committee: {bill.committee}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Category Tag */}
                  <div className="mb-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(bill.policyArea)}`}
                    >
                      {bill.policyArea}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-700">Bill Progress</span>
                      <span className="text-sm text-gray-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{bill.status}</div>
                  </div>

                  {/* Last Action */}
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Last Action:</span> {bill.lastAction}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  <div className="flex flex-col gap-2">
                    {bill.url && (
                      <a
                        href={bill.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View on Congress.gov
                      </a>
                    )}
                    <button className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                      <FileText className="h-4 w-4 mr-2" />
                      Read Summary
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More Button */}
      {filteredBills.length > 10 && !showAllBills && (
        <div className="text-center">
          <button
            onClick={() => setShowAllBills(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Show all {filteredBills.length} bills
          </button>
        </div>
      )}

      {/* Data Source Attribution */}
      <div className="text-center">
        <div className="text-xs text-gray-500 mb-2">Official Government Data</div>
        <DataSourceBadge source="congress.gov" size="sm" />
      </div>
    </div>
  );
}

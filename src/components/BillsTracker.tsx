'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo, useCallback, CSSProperties } from 'react';
import { VariableSizeList as List } from 'react-window';

interface SponsoredBill {
  billId: string;
  number: string;
  title: string;
  congress: string;
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
  };
  type: string;
  chamber: 'House' | 'Senate';
  status: string;
  policyArea?: string;
  cosponsors?: number;
  sponsorshipType?: 'sponsored' | 'cosponsored';
  committees?: string[];
  subjects?: string[];
  url?: string;
}

interface BillsTrackerProps {
  bills: SponsoredBill[];
  representative: {
    name: string;
    chamber: string;
  };
}

type SponsorshipFilterType = 'all' | 'sponsored' | 'cosponsored';
type SortByType = 'date' | 'cosponsors' | 'status';

interface BillsListProps {
  bills: SponsoredBill[];
  selectedBill: string | null;
  setSelectedBill: (billId: string | null) => void;
  getProgressStage: (
    status: string,
    latestAction: string
  ) => {
    stage: string;
    progress: number;
    label: string;
  };
  _getStatusColor: (stage: string) => string;
  getBillTypeIcon: (type: string) => string;
}

// Virtual scrolling component for bills
const BillsList = ({
  bills,
  selectedBill,
  setSelectedBill,
  getProgressStage,
  _getStatusColor,
  getBillTypeIcon,
}: BillsListProps) => {
  const BillRow = useCallback(
    ({ index, style }: { index: number; style: CSSProperties }) => {
      const bill = bills[index];
      const { stage, progress, label } = getProgressStage(bill.status, bill.latestAction.text);
      const isSelected = selectedBill === bill.billId;

      return (
        <div style={style} className="px-1 py-2">
          <div
            className={`bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
              isSelected ? 'border-civiq-blue shadow-md' : 'border-gray-200 hover:border-gray-300'
            }`}
            onClick={() => setSelectedBill(isSelected ? null : bill.billId)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getBillTypeIcon(bill.type)}</span>
                    <h4 className="font-semibold text-lg text-civiq-blue">{bill.number}</h4>
                    {bill.sponsorshipType && (
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${
                          bill.sponsorshipType === 'sponsored'
                            ? 'bg-civiq-green text-white'
                            : 'bg-civiq-blue text-white'
                        }`}
                      >
                        {bill.sponsorshipType === 'sponsored' ? 'Sponsored' : 'Co-sponsored'}
                      </span>
                    )}
                  </div>
                  <h5 className="text-gray-900 font-medium mb-3 line-clamp-2">{bill.title}</h5>

                  {/* Committee and Topic Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {bill.policyArea && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        {bill.policyArea}
                      </span>
                    )}
                    {bill.committees &&
                      bill.committees.slice(0, 2).map((committee, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full"
                        >
                          {committee}
                        </span>
                      ))}
                    {bill.subjects &&
                      bill.subjects.slice(0, 3).map((subject, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                        >
                          {subject}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="text-right ml-4">
                  <div className="text-sm text-gray-600 mb-1">
                    {bill.cosponsors || 0} cosponsors
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(bill.introducedDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Enhanced Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
                  <span className={progress >= 20 ? 'text-civiq-green' : ''}>Introduced</span>
                  <span className={progress >= 30 ? 'text-civiq-green' : ''}>Committee</span>
                  <span className={progress >= 60 ? 'text-civiq-green' : ''}>House</span>
                  <span className={progress >= 80 ? 'text-civiq-green' : ''}>Senate</span>
                  <span className={progress >= 100 ? 'text-civiq-green' : ''}>Law</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      stage === 'failed'
                        ? 'bg-civiq-red'
                        : progress >= 60
                          ? 'bg-civiq-green'
                          : 'bg-civiq-blue'
                    }`}
                    style={{ width: `${Math.max(progress, 5)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="text-xs font-medium text-gray-700">Status: {label}</div>
                  <div className="text-xs text-gray-500">Progress: {progress}%</div>
                </div>
              </div>

              {/* Latest Action */}
              <div className="text-sm text-gray-600 mb-3">
                <span className="font-medium">Latest Action:</span> {bill.latestAction.text}
                <span className="text-gray-500 ml-2">
                  ({new Date(bill.latestAction.date).toLocaleDateString()})
                </span>
              </div>

              {/* Read More Link */}
              <div className="flex items-center justify-between">
                <button
                  className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
                  onClick={e => {
                    e.stopPropagation();
                    if (bill.url) {
                      window.open(bill.url, '_blank');
                    } else {
                      window.open(
                        `https://congress.gov/bill/${bill.congress}th-congress/${bill.type}/${bill.number.split('.')[1]}`,
                        '_blank'
                      );
                    }
                  }}
                >
                  Read more →
                </button>
                <span className="text-xs text-gray-400">Congress {bill.congress}</span>
              </div>

              {/* Expanded Details */}
              {isSelected && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h6 className="font-medium text-gray-700 mb-2">Bill Details</h6>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div>Type: {bill.type}</div>
                        <div>Chamber: {bill.chamber}</div>
                        <div>Congress: {bill.congress}</div>
                        <div>Introduced: {new Date(bill.introducedDate).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div>
                      <h6 className="font-medium text-gray-700 mb-2">Legislative Progress</h6>
                      <div className="space-y-2">
                        {[
                          { stage: 'introduced', label: 'Introduced', done: progress >= 20 },
                          {
                            stage: 'committee',
                            label: 'Committee Review',
                            done: progress >= 40,
                          },
                          { stage: 'chamber', label: 'Chamber Vote', done: progress >= 60 },
                          { stage: 'enacted', label: 'Enacted', done: progress >= 100 },
                        ].map((step, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <div
                              className={`w-3 h-3 rounded-full ${
                                step.done ? 'bg-green-500' : 'bg-gray-300'
                              }`}
                            />
                            <span className={step.done ? 'text-green-700' : 'text-gray-600'}>
                              {step.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    },
    [bills, selectedBill, setSelectedBill, getProgressStage, getBillTypeIcon]
  );

  if (bills.length === 0) {
    return null;
  }

  // Calculate item height based on whether it's expanded
  const getItemSize = (index: number) => {
    const bill = bills[index];
    const isSelected = selectedBill === bill.billId;
    return isSelected ? 400 : 300; // Approximate heights
  };

  return (
    <div className="bg-gray-50 rounded-lg p-2">
      <List
        height={600} // Max height of the list container
        itemCount={bills.length}
        itemSize={getItemSize}
        width="100%"
      >
        {BillRow}
      </List>
    </div>
  );
};

export function BillsTracker({ bills, representative: _representative }: BillsTrackerProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<SortByType>('date');
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [sponsorshipFilter, setSponsorshipFilter] = useState<SponsorshipFilterType>('all');
  const [showTimelineView, setShowTimelineView] = useState(false);

  const categories = useMemo(() => {
    const areas = bills.map(bill => bill.policyArea).filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(areas))];
  }, [bills]);

  const statuses = useMemo(() => {
    const statusList = bills.map(bill => {
      const status = bill.latestAction.text;
      if (status.toLowerCase().includes('introduced')) return 'Introduced';
      if (status.toLowerCase().includes('committee')) return 'In Committee';
      if (status.toLowerCase().includes('passed')) return 'Passed Chamber';
      if (status.toLowerCase().includes('enacted') || status.toLowerCase().includes('signed'))
        return 'Enacted';
      return 'Other';
    });
    return ['all', ...Array.from(new Set(statusList))];
  }, [bills]);

  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(bill => bill.policyArea === selectedCategory);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(bill => {
        const status = bill.latestAction.text;
        if (statusFilter === 'Introduced') return status.toLowerCase().includes('introduced');
        if (statusFilter === 'In Committee') return status.toLowerCase().includes('committee');
        if (statusFilter === 'Passed Chamber') return status.toLowerCase().includes('passed');
        if (statusFilter === 'Enacted')
          return (
            status.toLowerCase().includes('enacted') || status.toLowerCase().includes('signed')
          );
        return statusFilter === 'Other';
      });
    }

    // Sponsorship type filter
    if (sponsorshipFilter !== 'all') {
      filtered = filtered.filter(bill => bill.sponsorshipType === sponsorshipFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        bill =>
          bill.title.toLowerCase().includes(query) ||
          bill.number.toLowerCase().includes(query) ||
          (bill.policyArea && bill.policyArea.toLowerCase().includes(query))
      );
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime();
        case 'cosponsors':
          return (b.cosponsors || 0) - (a.cosponsors || 0);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [bills, selectedCategory, statusFilter, sponsorshipFilter, searchQuery, sortBy]);

  const getProgressStage = (status: string, latestAction: string) => {
    const actionLower = latestAction.toLowerCase();

    // More comprehensive status detection
    if (actionLower.includes('became public law') || actionLower.includes('signed by president')) {
      return { stage: 'enacted', progress: 100, label: 'Enacted' };
    } else if (actionLower.includes('passed senate') || actionLower.includes('senate passed')) {
      return { stage: 'senate-passed', progress: 80, label: 'Passed Senate' };
    } else if (actionLower.includes('passed house') || actionLower.includes('house passed')) {
      return { stage: 'house-passed', progress: 60, label: 'Passed House' };
    } else if (
      actionLower.includes('ordered to be reported') ||
      actionLower.includes('reported by committee')
    ) {
      return { stage: 'committee-reported', progress: 50, label: 'Reported by Committee' };
    } else if (
      actionLower.includes('committee') ||
      actionLower.includes('markup') ||
      actionLower.includes('subcommittee') ||
      actionLower.includes('referred to')
    ) {
      return { stage: 'committee', progress: 30, label: 'In Committee' };
    } else if (actionLower.includes('introduced')) {
      return { stage: 'introduced', progress: 20, label: 'Introduced' };
    } else if (actionLower.includes('failed') || actionLower.includes('died')) {
      return { stage: 'failed', progress: 0, label: 'Failed' };
    }
    return { stage: 'committee', progress: 30, label: 'In Committee' };
  };

  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'introduced':
        return 'bg-blue-500';
      case 'committee':
        return 'bg-yellow-500';
      case 'house-passed':
        return 'bg-green-400';
      case 'senate-passed':
        return 'bg-green-600';
      case 'enacted':
        return 'bg-green-700';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getBillTypeIcon = (type: string) => {
    if (!type) return '📄';
    const typeUpper = type.toUpperCase();
    if (typeUpper.includes('HR') || typeUpper.includes('HRES')) return '🏛️';
    if (typeUpper.includes('S') || typeUpper.includes('SRES')) return '🏢';
    return '📄';
  };

  const stats = useMemo(() => {
    const total = filteredAndSortedBills.length;
    const byStage = filteredAndSortedBills.reduce(
      (acc, bill) => {
        const { stage } = getProgressStage(bill.status, bill.latestAction.text);
        acc[stage] = (acc[stage] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalCosponsors = filteredAndSortedBills.reduce(
      (sum, bill) => sum + (bill.cosponsors || 0),
      0
    );
    const avgCosponsors = total > 0 ? Math.round(totalCosponsors / total) : 0;

    return { total, byStage, avgCosponsors, totalCosponsors };
  }, [filteredAndSortedBills]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Legislative Tracker</h3>
          <button
            onClick={() => setShowTimelineView(!showTimelineView)}
            className="px-3 py-1 text-sm bg-civiq-blue text-white rounded hover:bg-civiq-blue/90 transition-colors"
          >
            {showTimelineView ? 'List View' : 'Timeline View'}
          </button>
        </div>

        {/* Enhanced Filter Controls */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'All Categories' : category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={sponsorshipFilter}
                onChange={e => setSponsorshipFilter(e.target.value as SponsorshipFilterType)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                <option value="all">All Types</option>
                <option value="sponsored">Sponsored</option>
                <option value="cosponsored">Co-sponsored</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortByType)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              >
                <option value="date">Date Introduced</option>
                <option value="cosponsors">Number of Cosponsors</option>
                <option value="status">Current Status</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search bills..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>
          </div>

          {/* Active Filters */}
          {(selectedCategory !== 'all' ||
            statusFilter !== 'all' ||
            sponsorshipFilter !== 'all' ||
            searchQuery) && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Active filters:</span>
              {selectedCategory !== 'all' && (
                <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">
                  Category: {selectedCategory}
                </span>
              )}
              {statusFilter !== 'all' && (
                <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">
                  Status: {statusFilter}
                </span>
              )}
              {sponsorshipFilter !== 'all' && (
                <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">
                  Type: {sponsorshipFilter}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-1 bg-civiq-blue text-white text-xs rounded">
                  Search: &quot;{searchQuery}&quot;
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setStatusFilter('all');
                  setSponsorshipFilter('all');
                  setSearchQuery('');
                }}
                className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Statistics Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-blue">{stats.total}</div>
            <div className="text-sm text-gray-600">Bills Sponsored</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.byStage.enacted || 0}</div>
            <div className="text-sm text-gray-600">Enacted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{stats.avgCosponsors}</div>
            <div className="text-sm text-gray-600">Avg Cosponsors</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.totalCosponsors}</div>
            <div className="text-sm text-gray-600">Total Support</div>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {showTimelineView && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-6">Legislative Timeline</h4>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>

            <div className="space-y-8">
              {filteredAndSortedBills.map(bill => {
                const { stage, progress } = getProgressStage(bill.status, bill.latestAction.text);
                return (
                  <div key={bill.billId} className="relative flex items-start">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-6 w-4 h-4 rounded-full border-2 bg-white ${getStatusColor(stage).replace('bg-', 'border-')}`}
                    ></div>

                    {/* Content */}
                    <div className="ml-16 flex-1">
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getBillTypeIcon(bill.type)}</span>
                              <h5 className="font-semibold text-gray-900">{bill.number}</h5>
                              {bill.sponsorshipType && (
                                <span
                                  className={`px-2 py-1 text-xs rounded ${
                                    bill.sponsorshipType === 'sponsored'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {bill.sponsorshipType === 'sponsored'
                                    ? 'Sponsored'
                                    : 'Co-sponsored'}
                                </span>
                              )}
                              {bill.policyArea && (
                                <span className="px-2 py-1 bg-white text-gray-700 text-xs rounded border">
                                  {bill.policyArea}
                                </span>
                              )}
                            </div>
                            <h6 className="text-gray-800 mb-2">{bill.title}</h6>
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm text-gray-600 mb-1">
                              {bill.cosponsors || 0} cosponsors
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(bill.introducedDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>

                        {/* Mini progress bar */}
                        <div className="mb-2">
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${getStatusColor(stage)}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Latest:</span> {bill.latestAction.text}
                          <span className="text-gray-500 ml-2">
                            ({new Date(bill.latestAction.date).toLocaleDateString()})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bills List with Progress Visualization */}
      {!showTimelineView && (
        <BillsList
          bills={filteredAndSortedBills}
          selectedBill={selectedBill}
          setSelectedBill={setSelectedBill}
          getProgressStage={getProgressStage}
          _getStatusColor={getStatusColor}
          getBillTypeIcon={getBillTypeIcon}
        />
      )}

      {!showTimelineView && false && (
        <div className="space-y-4">
          {filteredAndSortedBills.map(bill => {
            const { stage, progress, label } = getProgressStage(
              bill.status,
              bill.latestAction.text
            );
            const isSelected = selectedBill === bill.billId;

            return (
              <div
                key={bill.billId}
                className={`bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'border-civiq-blue shadow-md'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedBill(isSelected ? null : bill.billId)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{getBillTypeIcon(bill.type)}</span>
                        <h4 className="font-semibold text-lg text-civiq-blue">{bill.number}</h4>
                        {bill.sponsorshipType && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${
                              bill.sponsorshipType === 'sponsored'
                                ? 'bg-civiq-green text-white'
                                : 'bg-civiq-blue text-white'
                            }`}
                          >
                            {bill.sponsorshipType === 'sponsored' ? 'Sponsored' : 'Co-sponsored'}
                          </span>
                        )}
                      </div>
                      <h5 className="text-gray-900 font-medium mb-3 line-clamp-2">{bill.title}</h5>

                      {/* Committee and Topic Tags */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {bill.policyArea && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            {bill.policyArea}
                          </span>
                        )}
                        {bill.committees &&
                          bill.committees.slice(0, 2).map((committee, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full"
                            >
                              {committee}
                            </span>
                          ))}
                        {bill.subjects &&
                          bill.subjects.slice(0, 3).map((subject, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {subject}
                            </span>
                          ))}
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="text-sm text-gray-600 mb-1">
                        {bill.cosponsors || 0} cosponsors
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(bill.introducedDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-2">
                      <span className={progress >= 20 ? 'text-civiq-green' : ''}>Introduced</span>
                      <span className={progress >= 30 ? 'text-civiq-green' : ''}>Committee</span>
                      <span className={progress >= 60 ? 'text-civiq-green' : ''}>House</span>
                      <span className={progress >= 80 ? 'text-civiq-green' : ''}>Senate</span>
                      <span className={progress >= 100 ? 'text-civiq-green' : ''}>Law</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          stage === 'failed'
                            ? 'bg-civiq-red'
                            : progress >= 60
                              ? 'bg-civiq-green'
                              : 'bg-civiq-blue'
                        }`}
                        style={{ width: `${Math.max(progress, 5)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs font-medium text-gray-700">Status: {label}</div>
                      <div className="text-xs text-gray-500">Progress: {progress}%</div>
                    </div>
                  </div>

                  {/* Latest Action */}
                  <div className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Latest Action:</span> {bill.latestAction.text}
                    <span className="text-gray-500 ml-2">
                      ({new Date(bill.latestAction.date).toLocaleDateString()})
                    </span>
                  </div>

                  {/* Read More Link */}
                  <div className="flex items-center justify-between">
                    <button
                      className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
                      onClick={e => {
                        e.stopPropagation();
                        if (bill.url) {
                          window.open(bill.url, '_blank');
                        } else {
                          window.open(
                            `https://congress.gov/bill/${bill.congress}th-congress/${bill.type}/${bill.number.split('.')[1]}`,
                            '_blank'
                          );
                        }
                      }}
                    >
                      Read more →
                    </button>
                    <span className="text-xs text-gray-400">Congress {bill.congress}</span>
                  </div>

                  {/* Expanded Details */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h6 className="font-medium text-gray-700 mb-2">Bill Details</h6>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>Type: {bill.type}</div>
                            <div>Chamber: {bill.chamber}</div>
                            <div>Congress: {bill.congress}</div>
                            <div>
                              Introduced: {new Date(bill.introducedDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div>
                          <h6 className="font-medium text-gray-700 mb-2">Legislative Progress</h6>
                          <div className="space-y-2">
                            {[
                              { stage: 'introduced', label: 'Introduced', done: progress >= 20 },
                              {
                                stage: 'committee',
                                label: 'Committee Review',
                                done: progress >= 40,
                              },
                              { stage: 'chamber', label: 'Chamber Vote', done: progress >= 60 },
                              { stage: 'enacted', label: 'Enacted', done: progress >= 100 },
                            ].map((step, index) => (
                              <div key={index} className="flex items-center gap-2 text-sm">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    step.done ? 'bg-green-500' : 'bg-gray-300'
                                  }`}
                                />
                                <span className={step.done ? 'text-green-700' : 'text-gray-600'}>
                                  {step.label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filteredAndSortedBills.length === 0 && bills.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-lg font-medium mb-2">No Bills Available</div>
          <div className="text-sm text-gray-400 max-w-md mx-auto">
            This representative may not have sponsored any bills recently, or the data may still be
            loading. Legislative activity varies by representative and session.
          </div>
          <div className="mt-4 text-xs text-gray-400">Data sourced from Congress.gov</div>
        </div>
      )}

      {filteredAndSortedBills.length === 0 && bills.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          <div className="text-lg mb-2">🔍</div>
          <div>No bills found matching the selected criteria.</div>
          <div className="text-sm mt-2">Try adjusting your filters or search terms.</div>
        </div>
      )}

      {filteredAndSortedBills.length > 0 && (
        <div className="text-center text-sm text-gray-500">
          Showing {filteredAndSortedBills.length} of {bills.length} sponsored bills
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        Legislative data sourced from Congress.gov
      </div>
    </div>
  );
}

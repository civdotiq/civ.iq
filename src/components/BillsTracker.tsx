'use client';

import { useState, useMemo } from 'react';

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
}

interface BillsTrackerProps {
  bills: SponsoredBill[];
  representative: {
    name: string;
    chamber: string;
  };
}

export function BillsTracker({ bills, representative }: BillsTrackerProps) {
  const [selectedCategory, setSelectedCategory] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'cosponsors' | 'status'>('date');
  const [selectedBill, setSelectedBill] = useState<string | null>(null);

  const categories = useMemo(() => {
    const areas = bills.map(bill => bill.policyArea).filter(Boolean) as string[];
    return ['all', ...Array.from(new Set(areas))];
  }, [bills]);

  const filteredAndSortedBills = useMemo(() => {
    let filtered = bills;
    
    if (selectedCategory !== 'all') {
      filtered = bills.filter(bill => bill.policyArea === selectedCategory);
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
  }, [bills, selectedCategory, sortBy]);

  const getProgressStage = (status: string, latestAction: string) => {
    const statusLower = status.toLowerCase();
    const actionLower = latestAction.toLowerCase();

    if (actionLower.includes('introduced') || actionLower.includes('referred to committee')) {
      return { stage: 'introduced', progress: 20 };
    } else if (actionLower.includes('committee') || actionLower.includes('markup') || actionLower.includes('subcommittee')) {
      return { stage: 'committee', progress: 40 };
    } else if (actionLower.includes('passed') && actionLower.includes('house')) {
      return { stage: 'house-passed', progress: 60 };
    } else if (actionLower.includes('passed') && actionLower.includes('senate')) {
      return { stage: 'senate-passed', progress: 80 };
    } else if (actionLower.includes('signed') || actionLower.includes('enacted')) {
      return { stage: 'enacted', progress: 100 };
    } else if (actionLower.includes('failed') || actionLower.includes('died')) {
      return { stage: 'failed', progress: 0 };
    }
    return { stage: 'committee', progress: 30 };
  };

  const getStatusColor = (stage: string) => {
    switch (stage) {
      case 'introduced': return 'bg-blue-500';
      case 'committee': return 'bg-yellow-500';
      case 'house-passed': return 'bg-green-400';
      case 'senate-passed': return 'bg-green-600';
      case 'enacted': return 'bg-green-700';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-400';
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
    const byStage = filteredAndSortedBills.reduce((acc, bill) => {
      const { stage } = getProgressStage(bill.status, bill.latestAction.text);
      acc[stage] = (acc[stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalCosponsors = filteredAndSortedBills.reduce((sum, bill) => sum + (bill.cosponsors || 0), 0);
    const avgCosponsors = total > 0 ? Math.round(totalCosponsors / total) : 0;

    return { total, byStage, avgCosponsors, totalCosponsors };
  }, [filteredAndSortedBills]);

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Legislative Tracker</h3>
          <div className="flex gap-2">
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-sm border border-gray-300 rounded px-3 py-1"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-gray-300 rounded px-3 py-1"
            >
              <option value="date">Sort by Date</option>
              <option value="cosponsors">Sort by Cosponsors</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
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

      {/* Bills List with Progress Visualization */}
      <div className="space-y-4">
        {filteredAndSortedBills.map((bill) => {
          const { stage, progress } = getProgressStage(bill.status, bill.latestAction.text);
          const isSelected = selectedBill === bill.billId;
          
          return (
            <div 
              key={bill.billId} 
              className={`bg-white rounded-lg border transition-all duration-200 cursor-pointer ${
                isSelected ? 'border-civiq-blue shadow-md' : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedBill(isSelected ? null : bill.billId)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getBillTypeIcon(bill.type)}</span>
                      <h4 className="font-semibold text-gray-900">{bill.number}</h4>
                      {bill.policyArea && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {bill.policyArea}
                        </span>
                      )}
                    </div>
                    <h5 className="text-gray-800 line-clamp-2">{bill.title}</h5>
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

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Introduced</span>
                    <span>Committee</span>
                    <span>Passed Chamber</span>
                    <span>Enacted</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${getStatusColor(stage)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-600 mt-1 capitalize">
                    Current Status: {stage.replace('-', ' ')}
                  </div>
                </div>

                {/* Latest Action */}
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Latest Action:</span> {bill.latestAction.text}
                  <span className="text-gray-500 ml-2">
                    ({new Date(bill.latestAction.date).toLocaleDateString()})
                  </span>
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
                            { stage: 'committee', label: 'Committee Review', done: progress >= 40 },
                            { stage: 'chamber', label: 'Chamber Vote', done: progress >= 60 },
                            { stage: 'enacted', label: 'Enacted', done: progress >= 100 }
                          ].map((step, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <div className={`w-3 h-3 rounded-full ${
                                step.done ? 'bg-green-500' : 'bg-gray-300'
                              }`} />
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

      {filteredAndSortedBills.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No bills found matching the selected criteria.
        </div>
      )}

      <div className="text-center text-sm text-gray-500">
        Legislative data sourced from Congress.gov
      </div>
    </div>
  );
}
'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FileText, Calendar, ExternalLink, Search, Loader2 } from 'lucide-react';

// Congress.gov bill structure from the API
interface CongressBill {
  congress: number;
  latestAction: {
    actionDate: string;
    text: string;
  };
  number: string;
  originChamber: string;
  originChamberCode: string;
  title: string;
  type: string;
  updateDate: string;
  url: string;
  policyArea?: {
    name: string;
  };
}

interface BillsApiResponse {
  bills: CongressBill[];
  metadata: {
    congress: number;
    totalBills: number;
    source: string;
    generatedAt: string;
  };
}

function CiviqLogo({ className = 'w-10 h-15' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 300 450" xmlns="http://www.w3.org/2000/svg">
      <circle cx="150" cy="100" r="70" fill="#e11d09" />
      <rect x="100" y="200" width="100" height="120" fill="#0a9338" />
      <circle cx="90" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="130" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="170" cy="370" r="12" fill="#3ea0d2" />
      <circle cx="210" cy="370" r="12" fill="#3ea0d2" />
    </svg>
  );
}

export default function LegislationPage() {
  const [bills, setBills] = useState<CongressBill[]>([]);
  const [filteredBills, setFilteredBills] = useState<CongressBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [policyAreaFilter, setPolicyAreaFilter] = useState<string>('');
  const [availablePolicyAreas, setAvailablePolicyAreas] = useState<string[]>([]);

  // Fetch bills from API
  useEffect(() => {
    async function fetchBills() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/bills/latest?limit=50');

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: BillsApiResponse = await response.json();
        const billsData = data.bills || [];
        setBills(billsData);
        setFilteredBills(billsData);

        // Extract unique policy areas for filter dropdown
        const policyAreas = billsData
          .map(bill => bill.policyArea?.name)
          .filter((area): area is string => !!area);
        const uniqueAreas = [...new Set(policyAreas)].sort();
        setAvailablePolicyAreas(uniqueAreas);
      } catch {
        setError('Failed to load bills from Congress.gov');
      } finally {
        setLoading(false);
      }
    }

    fetchBills();
  }, []);

  // Filter bills when search or filters change
  useEffect(() => {
    let result = bills;

    // Search by title or number
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        bill =>
          bill.title.toLowerCase().includes(query) || bill.number.toLowerCase().includes(query)
      );
    }

    // Filter by chamber
    if (chamberFilter) {
      result = result.filter(bill => bill.originChamber === chamberFilter);
    }

    // Filter by type
    if (typeFilter) {
      result = result.filter(bill => bill.type.toLowerCase() === typeFilter.toLowerCase());
    }

    // Filter by policy area / topic
    if (policyAreaFilter) {
      result = result.filter(bill => bill.policyArea?.name === policyAreaFilter);
    }

    setFilteredBills(result);
  }, [bills, searchQuery, chamberFilter, typeFilter, policyAreaFilter]);

  // Get bill type display name
  const getBillTypeDisplay = (type: string): string => {
    const typeMap: Record<string, string> = {
      HR: 'House Bill',
      S: 'Senate Bill',
      HJRES: 'House Joint Resolution',
      SJRES: 'Senate Joint Resolution',
      HCONRES: 'House Concurrent Resolution',
      SCONRES: 'Senate Concurrent Resolution',
      HRES: 'House Resolution',
      SRES: 'Senate Resolution',
    };
    return typeMap[type.toUpperCase()] || type;
  };

  // Format bill number for link
  const formatBillId = (bill: CongressBill): string => {
    return `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`;
  };

  return (
    <>
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 border-b border-gray-100">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <CiviqLogo className="w-8 h-12" />
            <span className="text-2xl font-bold tracking-tight">CIV.IQ</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/representatives"
              className="font-medium hover:text-civiq-blue transition-colors"
            >
              Representatives
            </Link>
            <Link href="/districts" className="font-medium hover:text-civiq-blue transition-colors">
              Districts
            </Link>
            <Link href="/states" className="font-medium hover:text-civiq-blue transition-colors">
              States
            </Link>
            <Link href="/local" className="font-medium hover:text-civiq-blue transition-colors">
              Local
            </Link>
            <Link href="/legislation" className="font-medium text-civiq-blue transition-colors">
              Legislation
            </Link>
            <Link href="/about" className="font-medium hover:text-civiq-blue transition-colors">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen pt-24 px-4 pb-16 bg-white">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-center mb-4">Recent Legislation</h1>

          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-8">
            Browse the latest bills introduced in the 119th Congress. Click any bill to see
            sponsors, cosponsors, and voting records.
          </p>

          {/* Search and Filters */}
          <div className="bg-white border-2 border-black p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="md:col-span-2 lg:col-span-2">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  Search Bills
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="search"
                    type="text"
                    placeholder="Search by title or bill number..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="policyArea"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Topic / Issue
                </label>
                <select
                  id="policyArea"
                  value={policyAreaFilter}
                  onChange={e => setPolicyAreaFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
                >
                  <option value="">All Topics</option>
                  {availablePolicyAreas.map(area => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="chamber" className="block text-sm font-medium text-gray-700 mb-1">
                  Chamber
                </label>
                <select
                  id="chamber"
                  value={chamberFilter}
                  onChange={e => setChamberFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
                >
                  <option value="">All Chambers</option>
                  <option value="House">House</option>
                  <option value="Senate">Senate</option>
                </select>
              </div>
              <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                  Bill Type
                </label>
                <select
                  id="type"
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 focus:ring-2 focus:ring-civiq-blue focus:border-transparent"
                >
                  <option value="">All Types</option>
                  <option value="hr">House Bills (H.R.)</option>
                  <option value="s">Senate Bills (S.)</option>
                  <option value="hjres">House Joint Resolutions</option>
                  <option value="sjres">Senate Joint Resolutions</option>
                  <option value="hres">House Resolutions</option>
                  <option value="sres">Senate Resolutions</option>
                </select>
              </div>
            </div>
            {filteredBills.length !== bills.length && (
              <div className="mt-4 text-sm text-gray-600">
                Showing {filteredBills.length} of {bills.length} bills
                {policyAreaFilter && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    Topic: {policyAreaFilter}
                    <button
                      onClick={() => setPolicyAreaFilter('')}
                      className="ml-1 hover:text-blue-600"
                      aria-label="Clear topic filter"
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Bills List */}
          {loading ? (
            <div className="bg-white border-2 border-black p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-civiq-blue" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Loading bills from Congress.gov...
              </h3>
              <p className="text-gray-600">Fetching the latest legislation data</p>
            </div>
          ) : error ? (
            <div className="bg-white border-2 border-red-300 p-12 text-center">
              <h3 className="text-lg font-medium text-red-900 mb-2">Unable to Load Bills</h3>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="bg-white border-2 border-black p-12 text-center">
              <FileText className="w-8 h-8 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Bills Found</h3>
              <p className="text-gray-600">
                {searchQuery || chamberFilter || typeFilter
                  ? 'Try adjusting your search or filters'
                  : 'No bills available at this time'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBills.map(bill => (
                <Link
                  key={`${bill.type}-${bill.number}`}
                  href={`/bill/${formatBillId(bill)}`}
                  className="block bg-white border-2 border-black p-6 hover:border-civiq-blue hover:bg-blue-50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-semibold">
                          {bill.type}. {bill.number}
                        </h3>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {bill.originChamber}
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getBillTypeDisplay(bill.type)}
                        </span>
                        {bill.policyArea?.name && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {bill.policyArea.name}
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg text-gray-800 mb-3 line-clamp-2">{bill.title}</h4>

                      {/* Latest Action */}
                      <div className="bg-gray-50 p-3 rounded mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">Latest Action</div>
                        <p className="text-sm text-gray-600">{bill.latestAction.text}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(bill.latestAction.actionDate).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>119th Congress</span>
                        <span>•</span>
                        <span>Updated {new Date(bill.updateDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="text-civiq-blue font-medium text-sm flex items-center gap-1">
                        View Details →
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Data Source */}
          {!loading && !error && filteredBills.length > 0 && (
            <div className="mt-8 text-center text-sm text-gray-500">
              <p className="flex items-center justify-center gap-2">
                Data sourced from{' '}
                <a
                  href="https://api.congress.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-civiq-blue hover:underline inline-flex items-center gap-1"
                >
                  Congress.gov API
                  <ExternalLink className="w-3 h-3" />
                </a>
              </p>
            </div>
          )}

          {/* How Bills Become Laws */}
          <div className="mt-16 bg-white border-2 border-black p-8">
            <h2 className="text-2xl font-semibold mb-6 text-center">How a Bill Becomes a Law</h2>
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">1</span>
                </div>
                <p className="font-medium">Introduction</p>
                <p className="text-sm text-gray-600">Bill is introduced in House or Senate</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-yellow-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">2</span>
                </div>
                <p className="font-medium">Committee</p>
                <p className="text-sm text-gray-600">Reviewed and amended</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">3</span>
                </div>
                <p className="font-medium">Floor Vote</p>
                <p className="text-sm text-gray-600">Debate and vote</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">4</span>
                </div>
                <p className="font-medium">Other Chamber</p>
                <p className="text-sm text-gray-600">Process repeats</p>
              </div>
              <div className="hidden md:block text-gray-400">→</div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-2xl font-bold">5</span>
                </div>
                <p className="font-medium">President</p>
                <p className="text-sm text-gray-600">Signs into law</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

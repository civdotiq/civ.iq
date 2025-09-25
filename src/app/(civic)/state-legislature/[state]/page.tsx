'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  Users,
  FileText,
  MapPin,
  Phone,
  Mail,
  ExternalLink,
  Search,
  TrendingUp,
  Calendar,
} from 'lucide-react';

// Logo component
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg
        className="w-10 h-10 transition-transform group-hover:scale-110"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
        <circle cx="50" cy="31" r="22" fill="#ffffff" />
        <circle cx="50" cy="31" r="20" fill="#e11d07" />
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse" />
        <circle
          cx="46"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-100"
        />
        <circle
          cx="54"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-200"
        />
        <circle
          cx="62"
          cy="89"
          r="2"
          fill="#3ea2d4"
          className="animate-pulse animation-delay-300"
        />
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

interface StateLegislator {
  id: string;
  name: string;
  party: 'Democratic' | 'Republican' | 'Independent' | 'Other';
  chamber: 'upper' | 'lower';
  district: string;
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  committees: Array<{
    name: string;
    role?: 'chair' | 'vice-chair' | 'member';
  }>;
  terms: Array<{
    startYear: number;
    endYear: number;
    chamber: 'upper' | 'lower';
  }>;
  bills: {
    sponsored: number;
    cosponsored: number;
  };
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    crossoverVotes: number;
  };
}

interface StateLegislatureData {
  state: string;
  stateName: string;
  lastUpdated: string;
  session: {
    name: string;
    startDate: string;
    endDate: string;
    type: 'regular' | 'special';
  };
  chambers: {
    upper: {
      name: string;
      title: string;
      totalSeats: number;
      democraticSeats: number;
      republicanSeats: number;
      otherSeats: number;
    };
    lower: {
      name: string;
      title: string;
      totalSeats: number;
      democraticSeats: number;
      republicanSeats: number;
      otherSeats: number;
    };
  };
  legislators: StateLegislator[];
  totalCount: number;
}

interface StateBill {
  id: string;
  billNumber: string;
  title: string;
  summary: string;
  chamber: 'upper' | 'lower';
  status: string;
  sponsor: {
    name: string;
    party: string;
    district: string;
  };
  introducedDate: string;
  lastActionDate: string;
  lastAction: string;
  subjects: string[];
  trackingCount: number;
}

function LegislatorCard({
  legislator,
  chamberTitle,
}: {
  legislator: StateLegislator;
  chamberTitle: string;
}) {
  const getPartyColor = (party: string) => {
    switch (party) {
      case 'Democratic':
        return 'bg-blue-100 text-blue-800';
      case 'Republican':
        return 'bg-red-100 text-red-800';
      case 'Independent':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-white border-2 border-gray-300 text-gray-800';
    }
  };

  const partyLinePercentage =
    legislator.votingRecord.totalVotes > 0
      ? Math.round(
          (legislator.votingRecord.partyLineVotes / legislator.votingRecord.totalVotes) * 100
        )
      : 0;

  return (
    <div className="bg-white border border-gray-200 p-6 hover:border-2 border-black transition-border-2 border-black">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center relative overflow-hidden">
          {legislator.photoUrl ? (
            <Image
              src={legislator.photoUrl}
              alt={legislator.name}
              fill
              sizes="64px"
              className="rounded-full object-cover"
            />
          ) : (
            <span className="text-lg font-medium text-gray-600">
              {legislator.name
                .split(' ')
                .map(n => n[0])
                .join('')}
            </span>
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{legislator.name}</h3>
              <p className="text-sm text-gray-600">
                {chamberTitle} • District {legislator.district}
              </p>
            </div>
            <span
              className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPartyColor(legislator.party)}`}
            >
              {legislator.party.charAt(0)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
            <div>
              <span className="text-gray-600">Bills Sponsored:</span>
              <span className="ml-1 font-medium">{legislator.bills.sponsored}</span>
            </div>
            <div>
              <span className="text-gray-600">Bills Cosponsored:</span>
              <span className="ml-1 font-medium">{legislator.bills.cosponsored}</span>
            </div>
            <div>
              <span className="text-gray-600">Party Line Votes:</span>
              <span className="ml-1 font-medium">{partyLinePercentage}%</span>
            </div>
            <div>
              <span className="text-gray-600">Total Votes:</span>
              <span className="ml-1 font-medium">{legislator.votingRecord.totalVotes}</span>
            </div>
          </div>

          {legislator.committees.length > 0 && (
            <div className="mb-3">
              <span className="text-sm text-gray-600">Committees: </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {legislator.committees.slice(0, 3).map((committee, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 bg-white border-2 border-gray-300 text-xs rounded"
                  >
                    {committee.name}
                    {committee.role === 'chair' && <span className="ml-1 text-blue-600">•</span>}
                  </span>
                ))}
                {legislator.committees.length > 3 && (
                  <span className="text-xs text-gray-500">
                    +{legislator.committees.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-gray-600">
            {legislator.email && (
              <a
                href={`mailto:${legislator.email}`}
                className="flex items-center gap-1 hover:text-blue-600"
              >
                <Mail className="w-4 h-4" />
                Email
              </a>
            )}
            {legislator.phone && (
              <a
                href={`tel:${legislator.phone}`}
                className="flex items-center gap-1 hover:text-blue-600"
              >
                <Phone className="w-4 h-4" />
                Call
              </a>
            )}
            {legislator.office && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {legislator.office}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChamberOverview({ chamber, data }: { chamber: 'upper' | 'lower'; data: any }) {
  const chamberData = data.chambers[chamber];
  const totalSeats = chamberData.totalSeats;
  const demPercentage = (chamberData.democraticSeats / totalSeats) * 100;
  const _repPercentage = (chamberData.republicanSeats / totalSeats) * 100;

  const majority =
    chamberData.democraticSeats > chamberData.republicanSeats ? 'Democratic' : 'Republican';
  const majoritySeats = Math.max(chamberData.democraticSeats, chamberData.republicanSeats);
  const minoritySeats = Math.min(chamberData.democraticSeats, chamberData.republicanSeats);

  return (
    <div className="bg-white border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{chamberData.name}</h3>

      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span>Chamber Control</span>
          <span
            className={`font-medium ${majority === 'Democratic' ? 'text-blue-600' : 'text-red-600'}`}
          >
            {majority} (+{majoritySeats - minoritySeats})
          </span>
        </div>
        <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-500"
            style={{ width: `${demPercentage}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-3 text-xs font-medium">
            <span className="text-white">{chamberData.democraticSeats}D</span>
            <span className="text-gray-700">{chamberData.republicanSeats}R</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-2xl font-bold text-blue-600">{chamberData.democraticSeats}</p>
          <p className="text-xs text-gray-600">Democrats</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-red-600">{chamberData.republicanSeats}</p>
          <p className="text-xs text-gray-600">Republicans</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-600">{totalSeats}</p>
          <p className="text-xs text-gray-600">Total Seats</p>
        </div>
      </div>
    </div>
  );
}

function RecentBills({ bills }: { bills: StateBill[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed':
        return 'bg-green-100 text-green-800';
      case 'passed_both':
        return 'bg-blue-100 text-blue-800';
      case 'vetoed':
        return 'bg-red-100 text-red-800';
      case 'dead':
        return 'bg-white border-2 border-gray-300 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="bg-white border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Bills</h3>
        <Link href="#" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          View All Bills →
        </Link>
      </div>

      <div className="space-y-4">
        {bills.slice(0, 5).map(bill => (
          <div key={bill.id} className="border-b border-gray-100 pb-4 last:border-0">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{bill.billNumber}</h4>
                <p className="text-sm text-gray-600 mt-1">{bill.title}</p>
              </div>
              <span
                className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ml-4 ${getStatusColor(bill.status)}`}
              >
                {formatStatus(bill.status)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Sponsor: {bill.sponsor.name}</span>
              <span>•</span>
              <span>{new Date(bill.lastActionDate).toLocaleDateString()}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                {bill.trackingCount} tracking
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StateLegislaturePage() {
  const params = useParams();
  const state = params.state as string;

  const [legislatureData, setLegislatureData] = useState<StateLegislatureData | null>(null);
  const [recentBills, setRecentBills] = useState<StateBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'upper' | 'lower' | 'bills'>('overview');
  const [filters, setFilters] = useState({
    chamber: 'all',
    party: 'all',
    search: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch legislature data
      const [legislatureResponse, billsResponse] = await Promise.all([
        fetch(`/api/state-legislature/${state.toUpperCase()}`),
        fetch(`/api/state-bills/${state.toUpperCase()}?limit=10`),
      ]);

      if (legislatureResponse.ok) {
        const legislatureData = await legislatureResponse.json();
        setLegislatureData(legislatureData);
      }

      if (billsResponse.ok) {
        const billsData = await billsResponse.json();
        setRecentBills(billsData.bills || []);
      }
    } catch {
      // Error will be handled by the error boundary
    } finally {
      setLoading(false);
    }
  }, [state]);

  useEffect(() => {
    if (state) {
      fetchData();
    }
  }, [state, fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading state legislature data...</p>
        </div>
      </div>
    );
  }

  if (!legislatureData) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">State legislature data not available</p>
          <Link href="/states" className="mt-4 text-blue-600 hover:text-blue-700">
            ← Back to States
          </Link>
        </div>
      </div>
    );
  }

  const filteredLegislators = legislatureData.legislators.filter(legislator => {
    if (filters.chamber !== 'all' && legislator.chamber !== filters.chamber) return false;
    if (
      filters.party !== 'all' &&
      !legislator.party.toLowerCase().startsWith(filters.party.toLowerCase())
    )
      return false;
    if (
      filters.search &&
      !legislator.name.toLowerCase().includes(filters.search.toLowerCase()) &&
      !legislator.district.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-2 border-black border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/representatives"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Representatives
              </Link>
              <Link href="/states" className="text-gray-700 hover:text-blue-600 transition-colors">
                States
              </Link>
              <Link
                href="/districts"
                className="text-gray-700 hover:text-blue-600 transition-colors"
              >
                Districts
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold">{legislatureData.state}</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">
                {legislatureData.stateName} State Legislature
              </h1>
              <p className="text-blue-100">
                {legislatureData.session.name} • {legislatureData.legislators.length} Total
                Legislators
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-gray-200 p-6 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{legislatureData.totalCount}</p>
            <p className="text-sm text-gray-600">Total Legislators</p>
          </div>
          <div className="bg-white border border-gray-200 p-6 text-center">
            <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{recentBills.length}</p>
            <p className="text-sm text-gray-600">Active Bills</p>
          </div>
          <div className="bg-white border border-gray-200 p-6 text-center">
            <Calendar className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">2024</p>
            <p className="text-sm text-gray-600">Current Session</p>
          </div>
          <div className="bg-white border border-gray-200 p-6 text-center">
            <ExternalLink className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(
                (new Date().getTime() - new Date(legislatureData.session.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}
            </p>
            <p className="text-sm text-gray-600">Days in Session</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-2 border-black p-1 mb-8">
          <nav className="flex">
            {(['overview', 'upper', 'lower', 'bills'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-white border-2 border-gray-300'
                }`}
              >
                {tab === 'overview'
                  ? 'Overview'
                  : tab === 'upper'
                    ? legislatureData.chambers.upper.name
                    : tab === 'lower'
                      ? legislatureData.chambers.lower.name
                      : 'Recent Bills'}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'overview' && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ChamberOverview chamber="upper" data={legislatureData} />
                <ChamberOverview chamber="lower" data={legislatureData} />
              </div>
              <RecentBills bills={recentBills} />
            </>
          )}

          {(activeTab === 'upper' || activeTab === 'lower') && (
            <>
              {/* Filters */}
              <div className="bg-white border border-gray-200 p-6">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-64">
                    <div className="relative">
                      <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search legislators..."
                        value={filters.search}
                        onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <select
                    value={filters.party}
                    onChange={e => setFilters(prev => ({ ...prev, party: e.target.value }))}
                    className="px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Parties</option>
                    <option value="d">Democrats</option>
                    <option value="r">Republicans</option>
                    <option value="i">Independents</option>
                  </select>
                </div>
              </div>

              {/* Legislators Grid */}
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {legislatureData.chambers[activeTab].name} (
                  {filteredLegislators.filter(l => l.chamber === activeTab).length})
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredLegislators
                    .filter(legislator => legislator.chamber === activeTab)
                    .map(legislator => (
                      <LegislatorCard
                        key={legislator.id}
                        legislator={legislator}
                        chamberTitle={legislatureData.chambers[activeTab].title}
                      />
                    ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'bills' && <RecentBills bills={recentBills} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from official state sources and OpenStates.org
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2019-2025 Mark Sandford. CIV.IQ™ - The Original Civic Information Platform
          </p>
        </div>
      </footer>
    </div>
  );
}

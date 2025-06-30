'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileText, Calendar, Users, TrendingUp, Filter, Search, ExternalLink, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

// Logo component
function CiviqLogo() {
  return (
    <div className="flex items-center group">
      <svg className="w-10 h-10 transition-transform group-hover:scale-110" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4" className="animate-pulse"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-100"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-200"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4" className="animate-pulse animation-delay-300"/>
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

interface StateBill {
  id: string;
  billNumber: string;
  title: string;
  summary: string;
  chamber: 'upper' | 'lower';
  status: 'introduced' | 'committee' | 'floor' | 'passed_chamber' | 'other_chamber' | 'passed_both' | 'signed' | 'vetoed' | 'dead';
  sponsor: {
    name: string;
    party: 'Democratic' | 'Republican' | 'Independent';
    district: string;
  };
  cosponsors: Array<{
    name: string;
    party: 'Democratic' | 'Republican' | 'Independent';
    district: string;
  }>;
  committee?: {
    name: string;
    chairman: string;
  };
  introducedDate: string;
  lastActionDate: string;
  lastAction: string;
  subjects: string[];
  votes?: Array<{
    chamber: 'upper' | 'lower';
    date: string;
    type: 'passage' | 'committee' | 'amendment';
    yesVotes: number;
    noVotes: number;
    absentVotes: number;
    result: 'pass' | 'fail';
  }>;
  fullTextUrl?: string;
  trackingCount: number;
}

interface StateBillsData {
  state: string;
  stateName: string;
  session: string;
  bills: StateBill[];
  totalCount: number;
  lastUpdated: string;
  summary: {
    byStatus: Record<string, number>;
    byChamber: Record<string, number>;
    byParty: Record<string, number>;
  };
}

function BillCard({ bill }: { bill: StateBill }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'bg-green-100 text-green-800 border-green-200';
      case 'passed_both': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vetoed': return 'bg-red-100 text-red-800 border-red-200';
      case 'dead': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'floor': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'committee': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-orange-100 text-orange-800 border-orange-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed': return <CheckCircle className="w-4 h-4" />;
      case 'vetoed': return <XCircle className="w-4 h-4" />;
      case 'dead': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
  };

  const getPartyColor = (party: string) => {
    switch (party) {
      case 'Democratic': return 'text-blue-600';
      case 'Republican': return 'text-red-600';
      default: return 'text-purple-600';
    }
  };

  const getChamberLabel = (chamber: string) => {
    return chamber === 'upper' ? 'Senate' : 'House';
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{bill.billNumber}</h3>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(bill.status)}`}>
              {getStatusIcon(bill.status)}
              {formatStatus(bill.status)}
            </span>
          </div>
          <h4 className="text-base font-medium text-gray-800 mb-2">{bill.title}</h4>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{bill.summary}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Sponsor:</span>
          <span className={`font-medium ${getPartyColor(bill.sponsor.party)}`}>
            {bill.sponsor.name} ({bill.sponsor.party.charAt(0)}) - {bill.sponsor.district}
          </span>
        </div>
        
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Chamber:</span>
          <span className="font-medium">{getChamberLabel(bill.chamber)}</span>
          {bill.committee && (
            <>
              <span className="text-gray-400">•</span>
              <span className="text-gray-600">{bill.committee.name}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-600">Introduced:</span>
          <span className="font-medium">{new Date(bill.introducedDate).toLocaleDateString()}</span>
          <span className="text-gray-400">•</span>
          <span className="text-gray-600">Last Action:</span>
          <span className="font-medium">{new Date(bill.lastActionDate).toLocaleDateString()}</span>
        </div>

        {bill.subjects.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {bill.subjects.slice(0, 4).map((subject, index) => (
              <span key={index} className="inline-flex px-2 py-1 bg-gray-100 text-xs rounded-full">
                {subject}
              </span>
            ))}
            {bill.subjects.length > 4 && (
              <span className="text-xs text-gray-500">+{bill.subjects.length - 4} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            {bill.trackingCount} tracking
          </span>
          {bill.cosponsors.length > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {bill.cosponsors.length} cosponsors
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {bill.fullTextUrl && (
            <a 
              href={bill.fullTextUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              Full Text
            </a>
          )}
        </div>
      </div>

      {bill.votes && bill.votes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Recent Votes</h5>
          {bill.votes.slice(0, 2).map((vote, index) => (
            <div key={index} className="flex items-center justify-between text-sm mb-1">
              <span className="text-gray-600">
                {getChamberLabel(vote.chamber)} - {new Date(vote.date).toLocaleDateString()}
              </span>
              <span className={`font-medium ${vote.result === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                {vote.yesVotes} Yes, {vote.noVotes} No ({vote.result.toUpperCase()})
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusSummary({ summary }: { summary: StateBillsData['summary'] }) {
  const statusLabels = {
    'introduced': 'Introduced',
    'committee': 'In Committee',
    'floor': 'Floor Vote',
    'passed_chamber': 'Passed Chamber',
    'other_chamber': 'Other Chamber',
    'passed_both': 'Passed Both',
    'signed': 'Signed',
    'vetoed': 'Vetoed',
    'dead': 'Dead'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'signed': return 'text-green-600';
      case 'passed_both': return 'text-blue-600';
      case 'vetoed': case 'dead': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Bill Status Summary</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(summary.byStatus).map(([status, count]) => (
          <div key={status} className="text-center">
            <p className={`text-2xl font-bold ${getStatusColor(status)}`}>{count}</p>
            <p className="text-sm text-gray-600">{statusLabels[status as keyof typeof statusLabels] || status}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t border-gray-100">
        <h4 className="text-sm font-medium text-gray-700 mb-3">By Chamber</h4>
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-xl font-bold text-blue-600">{summary.byChamber.upper || 0}</p>
            <p className="text-sm text-gray-600">Senate Bills</p>
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{summary.byChamber.lower || 0}</p>
            <p className="text-sm text-gray-600">House Bills</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StateBillsPage() {
  const params = useParams();
  const state = params.state as string;
  
  const [billsData, setBillsData] = useState<StateBillsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: 'all',
    chamber: 'all',
    subject: 'all',
    search: ''
  });
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (state) {
      fetchBills();
    }
  }, [state, filters, currentPage]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20'
      });
      
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.chamber !== 'all') params.append('chamber', filters.chamber);
      if (filters.subject !== 'all') params.append('subject', filters.subject);

      const response = await fetch(`/api/state-bills/${state.toUpperCase()}?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setBillsData(data);
      }
    } catch (error) {
      console.error('Error fetching state bills:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading state bills...</p>
        </div>
      </div>
    );
  }

  if (!billsData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">State bills data not available</p>
          <Link href="/states" className="mt-4 text-blue-600 hover:text-blue-700">
            ← Back to States
          </Link>
        </div>
      </div>
    );
  }

  const availableSubjects = [...new Set(billsData.bills.flatMap(bill => bill.subjects))].sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <nav className="flex items-center gap-6">
              <Link href="/representatives" className="text-gray-700 hover:text-blue-600 transition-colors">
                Representatives
              </Link>
              <Link href="/states" className="text-gray-700 hover:text-blue-600 transition-colors">
                States
              </Link>
              <Link href="/districts" className="text-gray-700 hover:text-blue-600 transition-colors">
                Districts
              </Link>
              <Link href="/analytics" className="text-gray-700 hover:text-blue-600 transition-colors">
                Analytics
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Page header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg p-8 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <FileText className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold mb-2">{billsData.stateName} State Bills</h1>
              <p className="text-green-100">
                {billsData.session} • {billsData.totalCount} Total Bills
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <StatusSummary summary={billsData.summary} />
            
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Filter className="w-5 h-5" />
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="introduced">Introduced</option>
                    <option value="committee">In Committee</option>
                    <option value="floor">Floor Vote</option>
                    <option value="passed_chamber">Passed Chamber</option>
                    <option value="passed_both">Passed Both</option>
                    <option value="signed">Signed</option>
                    <option value="vetoed">Vetoed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Chamber</label>
                  <select
                    value={filters.chamber}
                    onChange={(e) => setFilters(prev => ({ ...prev, chamber: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Both Chambers</option>
                    <option value="upper">Senate</option>
                    <option value="lower">House</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    value={filters.subject}
                    onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Subjects</option>
                    {availableSubjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            {/* Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search bills by title, sponsor, or bill number..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bills List */}
            <div className="space-y-6">
              {billsData.bills.map((bill) => (
                <BillCard key={bill.id} bill={bill} />
              ))}
            </div>

            {billsData.bills.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-xl text-gray-600 mb-2">No bills found</p>
                <p className="text-gray-500">Try adjusting your filters or search terms.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            Data sourced from official state sources and OpenStates.org
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © 2024 CIV.IQ - Empowering civic engagement through transparency
          </p>
        </div>
      </footer>
    </div>
  );
}
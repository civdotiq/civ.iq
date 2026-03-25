'use client';

import { useState, useEffect } from 'react';
import {
  User,
  FileText,
  Vote,
  DollarSign,
  Newspaper,
  AlertCircle,
  Calendar,
  Phone,
  Globe,
  Clock,
} from 'lucide-react';
import { ClusteredNewsSection } from '@/features/news/components/ClusteredNewsSection';
import { EnhancedRepresentative } from '@/types/representative';
import { RepresentativeContactForm } from '@/features/representatives/components/RepresentativeContactForm';
import { FinanceJurisdictionSection } from '@/features/campaign-finance/components/FinanceJurisdictionSection';

interface CongressBill {
  type?: string;
  number?: string;
  congress?: number;
  title?: string;
  introducedDate?: string;
  latestAction?: { actionDate?: string; text?: string };
  url?: string;
}

interface CongressVote {
  position?: string;
  chamber?: string;
  rollNumber?: number;
  question?: string;
  description?: string;
  date?: string;
  result?: string;
}

interface Contributor {
  name?: string;
  employer?: string;
  total_amount?: number;
  total?: number;
}

interface VotingPattern {
  yes?: number;
  no?: number;
  present?: number;
  notVoting?: number;
}

interface FinanceSummary {
  total_receipts?: number;
  total_disbursements?: number;
  cash_on_hand_end_period?: number;
}

/** Typed union of all tab response shapes. Index signature allows unknown API fields. */
interface TabResponseData {
  // Profile fields (EnhancedRepresentative shape)
  name?: string;
  chamber?: string;
  party?: string;
  state?: string;
  district?: string;
  contact?: { phone?: string; website?: string };
  // Bills fields
  sponsoredLegislation?: CongressBill[];
  bills?: CongressBill[];
  // Votes fields
  votes?: CongressVote[];
  votingPattern?: VotingPattern;
  // Finance fields
  financial_summary?: FinanceSummary[];
  summary?: FinanceSummary;
  top_contributors?: Contributor[];
  topContributors?: Contributor[];
  candidate_info?: Record<string, unknown>;
  // Allow additional unknown API fields
  [key: string]: unknown;
}

interface TabsEnhancedProps {
  bioguideId: string;
  representative: EnhancedRepresentative;
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: TabResponseData;
    news?: unknown[];
  };
}

// Enhanced component for Profile tab
function ProfileContent({
  data,
  representative,
}: {
  data: TabResponseData;
  representative: EnhancedRepresentative;
}) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-civiq-blue" />
            Basic Information
          </h4>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-gray-600">Name:</dt>
              <dd className="font-medium">{data.name || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Chamber:</dt>
              <dd className="font-medium">{data.chamber || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Party:</dt>
              <dd className="font-medium">{data.party || 'N/A'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">State:</dt>
              <dd className="font-medium">{data.state || 'N/A'}</dd>
            </div>
            {data.district && (
              <div className="flex justify-between">
                <dt className="text-gray-600">District:</dt>
                <dd className="font-medium">{data.district}</dd>
              </div>
            )}
          </dl>
        </div>

        {data.contact && (
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 flex items-center gap-2">
              <Phone className="h-5 w-5 text-civiq-blue" />
              Contact Information
            </h4>
            <dl className="space-y-2">
              {data.contact.phone && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Phone:</dt>
                  <dd className="font-medium">{data.contact.phone}</dd>
                </div>
              )}
              {data.contact.website && (
                <div className="flex justify-between">
                  <dt className="text-gray-600">Website:</dt>
                  <dd>
                    <a
                      href={data.contact.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-civiq-blue hover:underline flex items-center gap-1"
                    >
                      <Globe className="h-4 w-4" />
                      Visit
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}
      </div>

      {/* Contact Form Section */}
      <div className="mt-8">
        <RepresentativeContactForm representative={representative} />
      </div>
    </div>
  );
}

// Enhanced component for Bills tab
function BillsContent({ data }: { data: TabResponseData }) {
  // Handle different data structures from API
  let bills: CongressBill[] = [];
  if (data?.sponsoredLegislation && Array.isArray(data.sponsoredLegislation)) {
    bills = data.sponsoredLegislation as CongressBill[];
  } else if (data?.bills && Array.isArray(data.bills)) {
    bills = data.bills as CongressBill[];
  } else if (Array.isArray(data)) {
    bills = data as CongressBill[];
  }

  if (!bills || bills.length === 0) {
    return <div className="text-gray-500">No bills data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-civiq-blue" />
          Sponsored Legislation ({bills.length})
        </h4>
      </div>

      <div className="space-y-3">
        {bills.slice(0, 10).map((bill: CongressBill, index: number) => (
          <div key={index} className="border p-4 hover:bg-white transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-civiq-blue">
                    {bill.type}
                    {bill.number || ` ${bill.congress}-${index + 1}`}
                  </span>
                  <span className="text-xs px-2 py-1 bg-white border-2 border-gray-300">
                    {bill.congress}th Congress
                  </span>
                </div>
                <h5 className="font-medium text-gray-900 mb-2">{bill.title || 'Untitled Bill'}</h5>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {bill.introducedDate || bill.latestAction?.actionDate || 'Date unknown'}
                  </span>
                  {bill.latestAction?.text && (
                    <span className="flex-1 truncate">Latest: {bill.latestAction.text}</span>
                  )}
                </div>
              </div>
              {bill.url && (
                <a
                  href={bill.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-civiq-blue hover:text-civiq-blue"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {bills.length > 10 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          Showing 10 of {bills.length} bills
        </div>
      )}
    </div>
  );
}

// Enhanced component for Votes tab
function VotesContent({ data }: { data: TabResponseData }) {
  const votes = data?.votes as CongressVote[] | undefined;
  const votingPattern = data?.votingPattern;

  if (!votes || votes.length === 0) {
    return <div className="text-gray-500">No voting records available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Voting Summary */}
      {votingPattern && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-civiq-green/10 p-3 text-center">
            <div className="text-2xl font-bold text-civiq-green">
              {Number(votingPattern.yes || 0)}
            </div>
            <div className="text-sm text-gray-600">Yes Votes</div>
          </div>
          <div className="bg-civiq-red/10 p-3 text-center">
            <div className="text-2xl font-bold text-civiq-red">{Number(votingPattern.no || 0)}</div>
            <div className="text-sm text-gray-600">No Votes</div>
          </div>
          <div className="bg-gray-100 p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {Number(votingPattern.present || 0)}
            </div>
            <div className="text-sm text-gray-600">Present</div>
          </div>
          <div className="bg-white p-3 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {Number(votingPattern.notVoting || 0)}
            </div>
            <div className="text-sm text-gray-600">Not Voting</div>
          </div>
        </div>
      )}

      {/* Recent Votes */}
      <div>
        <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
          <Vote className="h-5 w-5 text-civiq-blue" />
          Recent Votes
        </h4>

        <div className="space-y-3">
          {votes.slice(0, 10).map((vote: CongressVote, index: number) => (
            <div
              key={index}
              className="border-2 border-gray-300 p-4 hover:border-civiq-blue transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 text-sm font-bold uppercase tracking-aicher border-2 ${
                        vote.position === 'Yea'
                          ? 'bg-civiq-green/10 text-civiq-green border-civiq-green'
                          : vote.position === 'Nay'
                            ? 'bg-civiq-red/10 text-civiq-red border-civiq-red'
                            : vote.position === 'Present'
                              ? 'bg-gray-100 text-gray-600 border-gray-400'
                              : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      {vote.position}
                    </span>
                    <span className="text-sm text-gray-600">
                      {vote.chamber} • Roll #{vote.rollNumber}
                    </span>
                  </div>
                  <p className="text-gray-900 mb-2">{vote.question || vote.description}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(vote.date || '').toLocaleDateString()}
                    </span>
                    <span>Result: {vote.result}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Enhanced component for Finance tab
function FinanceContent({ data, bioguideId }: { data: TabResponseData; bioguideId: string }) {
  // Handle FEC API structure
  const summary = data?.financial_summary?.[0] || data?.summary;
  const topContributors = data?.top_contributors || data?.topContributors;
  const candidateInfo = data?.candidate_info;

  if (!summary && !candidateInfo) {
    return <div className="text-gray-500">No campaign finance data available</div>;
  }

  return (
    <div className="space-y-6">
      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-civiq-green" />
        Campaign Finance Summary
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary?.total_receipts !== undefined && summary?.total_receipts !== null && (
          <div className="bg-civiq-blue/10 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Receipts</div>
            <div className="text-2xl font-bold text-civiq-blue">
              ${Number(summary.total_receipts || 0).toLocaleString()}
            </div>
          </div>
        )}

        {summary?.total_disbursements !== undefined && summary?.total_disbursements !== null && (
          <div className="bg-civiq-red/10 p-4">
            <div className="text-sm text-gray-600 mb-1">Total Disbursements</div>
            <div className="text-2xl font-bold text-civiq-red">
              ${Number(summary.total_disbursements || 0).toLocaleString()}
            </div>
          </div>
        )}

        {summary?.cash_on_hand_end_period !== undefined &&
          summary?.cash_on_hand_end_period !== null && (
            <div className="bg-civiq-green/10 p-4">
              <div className="text-sm text-gray-600 mb-1">Cash on Hand</div>
              <div className="text-2xl font-bold text-civiq-green">
                ${Number(summary.cash_on_hand_end_period || 0).toLocaleString()}
              </div>
            </div>
          )}
      </div>

      {topContributors && topContributors.length > 0 && (
        <div className="mt-6">
          <h5 className="font-medium text-gray-900 mb-3">Top Contributors</h5>
          <div className="space-y-2">
            {topContributors.slice(0, 5).map((contributor: Contributor, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-white">
                <div>
                  <div className="text-gray-700 font-medium">{contributor.name}</div>
                  {contributor.employer && (
                    <div className="text-sm text-gray-500">{contributor.employer}</div>
                  )}
                </div>
                <span className="font-medium">
                  ${Number(contributor.total_amount || contributor.total || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Money & Oversight — Finance/Jurisdiction Join */}
      <FinanceJurisdictionSection bioguideId={bioguideId} />
    </div>
  );
}

// News tab now uses ClusteredNewsSection directly in the render switch

export function TabsEnhanced({ bioguideId, representative, serverData }: TabsEnhancedProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [data, setData] = useState<TabResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get base URL for API calls - critical for Vercel deployment
  const getBaseUrl = () => {
    // In browser, use NEXT_PUBLIC_APP_URL if available (Vercel production)
    if (typeof window !== 'undefined') {
      if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
      }
      // Fallback to window.location.origin
      return window.location.origin;
    }
    // Server-side fallback (shouldn't be needed in client component)
    return '';
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      // Get base URL outside try block for error logging
      const baseUrl = getBaseUrl();
      let url = '';

      try {
        switch (activeTab) {
          case 'profile':
            // Just show the representative data we already have
            // Spread EnhancedRepresentative into TabResponseData (index-signature type)
            setData(Object.assign({} as TabResponseData, representative));
            setLoading(false);
            return;

          case 'bills':
            // Check for server-provided bills data first
            if (
              serverData?.bills &&
              Array.isArray(serverData.bills) &&
              serverData.bills.length > 0
            ) {
              setData({
                bills: serverData.bills as CongressBill[],
                sponsoredLegislation: serverData.bills as CongressBill[],
              });
              setLoading(false);
              return;
            }
            url = `${baseUrl}/api/representative/${bioguideId}/bills`;
            break;

          case 'votes':
            // Check for server-provided votes data first
            if (
              serverData?.votes &&
              Array.isArray(serverData.votes) &&
              serverData.votes.length > 0
            ) {
              setData({ votes: serverData.votes as CongressVote[] });
              setLoading(false);
              return;
            }
            url = `${baseUrl}/api/representative/${bioguideId}/votes`;
            break;

          case 'finance':
            // Check for server-provided finance data first
            if (serverData?.finance && Object.keys(serverData.finance).length > 0) {
              setData(serverData.finance);
              setLoading(false);
              return;
            }
            url = `${baseUrl}/api/representative/${bioguideId}/finance`;
            break;

          case 'news':
            // Check for server-provided news data first
            if (serverData?.news && Array.isArray(serverData.news) && serverData.news.length > 0) {
              setData({ articles: serverData.news });
              setLoading(false);
              return;
            }
            url = `${baseUrl}/api/representative/${bioguideId}/news`;
            break;

          default:
            setData({ message: 'Select a tab' });
            setLoading(false);
            return;
        }

        const response = await fetch(url, {
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, bioguideId, representative, serverData]);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'bills', label: 'Bills', icon: FileText },
    { id: 'votes', label: 'Votes', icon: Vote },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'news', label: 'News', icon: Newspaper },
  ];

  return (
    <div className="space-y-4">
      {/* Olympic-style Tab Navigation - Aicher System */}
      <div className="aicher-tabs">
        <nav className="flex overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`aicher-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Enhanced Content Area */}
      <div className="bg-white border-2 border-black border p-6 min-h-[400px]">
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Clock className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
              <p className="text-gray-500">Loading {activeTab} data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-civiq-red mx-auto mb-3" />
              <p className="text-civiq-red">
                Error loading {activeTab}: {error}
              </p>
              <button
                onClick={() => setActiveTab(activeTab)}
                className="mt-3 text-sm text-civiq-blue hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {data !== null && !loading && !error && (
          <div>
            {activeTab === 'profile' && (
              <ProfileContent data={data as TabResponseData} representative={representative} />
            )}
            {activeTab === 'bills' && <BillsContent data={data as TabResponseData} />}
            {activeTab === 'votes' && <VotesContent data={data as TabResponseData} />}
            {activeTab === 'finance' && (
              <FinanceContent data={data as TabResponseData} bioguideId={bioguideId} />
            )}
            {activeTab === 'news' && (
              <div className="-mx-6 -my-6">
                <ClusteredNewsSection
                  representative={representative}
                  initialLimit={20}
                  className="p-6"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

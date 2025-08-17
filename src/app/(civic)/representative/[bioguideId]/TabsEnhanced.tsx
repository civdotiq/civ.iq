/* eslint-disable @typescript-eslint/no-explicit-any */
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

interface TabsEnhancedProps {
  bioguideId: string;
  representative: {
    name: string;
    chamber: string;
    party: string;
    state: string;
    district?: string;
  };
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: Record<string, unknown>;
    news?: unknown[];
  };
}

// Enhanced component for Profile tab
function ProfileContent({ data }: { data: Record<string, any> }) {
  if (!data) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="h-5 w-5 text-blue-500" />
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
              <Phone className="h-5 w-5 text-blue-500" />
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
                      className="text-blue-600 hover:underline flex items-center gap-1"
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
    </div>
  );
}

// Enhanced component for Bills tab
function BillsContent({ data }: { data: Record<string, any> }) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 BillsContent received data:', data);
  }

  // Handle different data structures from API
  let bills: unknown[] = [];
  if (data?.sponsoredLegislation && Array.isArray(data.sponsoredLegislation)) {
    bills = data.sponsoredLegislation;
  } else if (data?.bills && Array.isArray(data.bills)) {
    bills = data.bills;
  } else if (Array.isArray(data)) {
    bills = data;
  }

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 BillsContent processed bills:', bills);
  }

  if (!bills || bills.length === 0) {
    return <div className="text-gray-500">No bills data available</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Sponsored Legislation ({bills.length})
        </h4>
      </div>

      <div className="space-y-3">
        {bills.slice(0, 10).map((bill: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-blue-600">
                    {bill.type}
                    {bill.number || ` ${bill.congress}-${index + 1}`}
                  </span>
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded">
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
                  className="ml-4 text-blue-600 hover:text-blue-800"
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
function VotesContent({ data }: { data: Record<string, any> }) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 VotesContent received data:', data);
  }

  const votes = data?.votes as unknown[];
  const votingPattern = data?.votingPattern as Record<string, unknown>;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 VotesContent votes:', votes);
    // eslint-disable-next-line no-console
    console.log('🔍 VotesContent votingPattern:', votingPattern);
  }

  if (!votes || votes.length === 0) {
    return <div className="text-gray-500">No voting records available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Voting Summary */}
      {votingPattern && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {Number(votingPattern.yes || 0)}
            </div>
            <div className="text-sm text-gray-600">Yes Votes</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-600">{Number(votingPattern.no || 0)}</div>
            <div className="text-sm text-gray-600">No Votes</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {Number(votingPattern.present || 0)}
            </div>
            <div className="text-sm text-gray-600">Present</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
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
          <Vote className="h-5 w-5 text-blue-500" />
          Recent Votes
        </h4>

        <div className="space-y-3">
          {votes.slice(0, 10).map((vote: any, index: number) => (
            <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        vote.position === 'Yea'
                          ? 'bg-green-100 text-green-700'
                          : vote.position === 'Nay'
                            ? 'bg-red-100 text-red-700'
                            : vote.position === 'Present'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
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
                      {new Date(vote.date).toLocaleDateString()}
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
function FinanceContent({ data }: { data: Record<string, any> }) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 FinanceContent received data:', data);
  }

  // Handle FEC API structure
  const summary = data?.financial_summary?.[0] || (data?.summary as Record<string, unknown>);
  const topContributors = data?.top_contributors || (data?.topContributors as unknown[]);
  const candidateInfo = data?.candidate_info as Record<string, unknown>;

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 FinanceContent summary:', summary);
    // eslint-disable-next-line no-console
    console.log('🔍 FinanceContent topContributors:', topContributors);
  }

  if (!summary && !candidateInfo) {
    return <div className="text-gray-500">No campaign finance data available</div>;
  }

  return (
    <div className="space-y-6">
      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-green-500" />
        Campaign Finance Summary
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary?.total_receipts !== undefined && summary?.total_receipts !== null && (
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Receipts</div>
            <div className="text-2xl font-bold text-blue-600">
              ${Number(summary.total_receipts || 0).toLocaleString()}
            </div>
          </div>
        )}

        {summary?.total_disbursements !== undefined && summary?.total_disbursements !== null && (
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Total Disbursements</div>
            <div className="text-2xl font-bold text-orange-600">
              ${Number(summary.total_disbursements || 0).toLocaleString()}
            </div>
          </div>
        )}

        {summary?.cash_on_hand_end_period !== undefined &&
          summary?.cash_on_hand_end_period !== null && (
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Cash on Hand</div>
              <div className="text-2xl font-bold text-green-600">
                ${Number(summary.cash_on_hand_end_period || 0).toLocaleString()}
              </div>
            </div>
          )}
      </div>

      {topContributors && topContributors.length > 0 && (
        <div className="mt-6">
          <h5 className="font-medium text-gray-900 mb-3">Top Contributors</h5>
          <div className="space-y-2">
            {topContributors.slice(0, 5).map((contributor: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
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
    </div>
  );
}

// Enhanced component for News tab
function NewsContent({ data }: { data: Record<string, any> }) {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 NewsContent received data:', data);
  }

  const articles = data?.articles as unknown[];

  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('🔍 NewsContent articles:', articles);
  }

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-8">
        <Newspaper className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <div className="text-gray-500">No recent news available</div>
        <div className="text-sm text-gray-400 mt-1">
          News data is sourced from GDELT and may not be available for all representatives
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        <Newspaper className="h-5 w-5 text-blue-500" />
        Recent News ({articles.length})
      </h4>

      <div className="space-y-3">
        {articles.slice(0, 10).map((article: any, index: number) => (
          <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 mb-2 line-clamp-2">{article.title}</h5>
                {article.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{article.description}</p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{article.source?.name || 'Unknown Source'}</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(article.publishedAt || article.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              {article.url && (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 text-blue-600 hover:text-blue-800"
                >
                  <Globe className="h-5 w-5" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>

      {articles.length > 10 && (
        <div className="text-center text-sm text-gray-500 pt-4">
          Showing 10 of {articles.length} articles
        </div>
      )}
    </div>
  );
}

export function TabsEnhanced({ bioguideId, representative, serverData }: TabsEnhancedProps) {
  const [activeTab, setActiveTab] = useState('profile');
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setData(null);

      // STEP 3 DEBUG: Individual tab component data structure
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('\n=== STEP 3: TABS ENHANCED COMPONENT DATA ===');
        // eslint-disable-next-line no-console
        console.log(`🔍 Current tab: ${activeTab}`);
        // eslint-disable-next-line no-console
        console.log('🔍 Server data available:', !!serverData);
        // eslint-disable-next-line no-console
        console.log('🔍 Server data structure:', serverData);
      }

      try {
        let url = '';

        switch (activeTab) {
          case 'profile':
            // Just show the representative data we already have
            if (process.env.NODE_ENV === 'development') {
              // eslint-disable-next-line no-console
              console.log('🔍 Profile data:', representative);
            }
            setData(representative);
            setLoading(false);
            return;

          case 'bills':
            // Check for server-provided bills data first
            if (
              serverData?.bills &&
              Array.isArray(serverData.bills) &&
              serverData.bills.length > 0
            ) {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('🚀 Using SERVER bills data:', serverData.bills);
              }
              setData({ bills: serverData.bills, sponsoredLegislation: serverData.bills });
              setLoading(false);
              return;
            }
            url = `/api/representative/${bioguideId}/bills`;
            break;

          case 'votes':
            // Check for server-provided votes data first
            if (
              serverData?.votes &&
              Array.isArray(serverData.votes) &&
              serverData.votes.length > 0
            ) {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('🚀 Using SERVER votes data:', serverData.votes);
              }
              setData({ votes: serverData.votes });
              setLoading(false);
              return;
            }
            url = `/api/representative/${bioguideId}/votes`;
            break;

          case 'finance':
            // Check for server-provided finance data first
            if (serverData?.finance && Object.keys(serverData.finance).length > 0) {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('🚀 Using SERVER finance data:', serverData.finance);
              }
              setData(serverData.finance);
              setLoading(false);
              return;
            }
            url = `/api/representative/${bioguideId}/finance`;
            break;

          case 'news':
            // Check for server-provided news data first
            if (serverData?.news && Array.isArray(serverData.news) && serverData.news.length > 0) {
              if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log('🚀 Using SERVER news data:', serverData.news);
              }
              setData({ articles: serverData.news });
              setLoading(false);
              return;
            }
            url = `/api/representative/${bioguideId}/news`;
            break;

          default:
            setData({ message: 'Select a tab' });
            setLoading(false);
            return;
        }

        // Fallback to API fetch if no server data available
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log(`🔍 No server data for ${activeTab}, fetching from API:`, url);
        }
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const jsonData = await response.json();
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log(`✅ ${activeTab} API data received:`, jsonData);
        }
        setData(jsonData);
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.error(`❌ Error fetching ${activeTab} data:`, err);
        }
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
      {/* Enhanced Tab Navigation */}
      <div className="border-b border-gray-200 bg-white">
        <nav className="flex space-x-8 px-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Enhanced Content Area */}
      <div className="bg-white rounded-lg shadow-sm border p-6 min-h-[400px]">
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
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
              <p className="text-red-500">
                Error loading {activeTab}: {error}
              </p>
              <button
                onClick={() => setActiveTab(activeTab)}
                className="mt-3 text-sm text-blue-600 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {data !== null && !loading && !error && (
          <div>
            {activeTab === 'profile' && <ProfileContent data={data as Record<string, any>} />}
            {activeTab === 'bills' && <BillsContent data={data as Record<string, any>} />}
            {activeTab === 'votes' && <VotesContent data={data as Record<string, any>} />}
            {activeTab === 'finance' && <FinanceContent data={data as Record<string, any>} />}
            {activeTab === 'news' && <NewsContent data={data as Record<string, any>} />}
          </div>
        )}
      </div>
    </div>
  );
}

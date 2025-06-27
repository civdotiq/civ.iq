'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { VotingTrendsChart } from '@/components/analytics/VotingTrendsChart';
import { CampaignFinanceChart } from '@/components/analytics/CampaignFinanceChart';
import { EffectivenessChart } from '@/components/analytics/EffectivenessChart';

function CiviqLogo() {
  return (
    <div className="flex items-center">
      <svg className="w-10 h-10" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <rect x="36" y="51" width="28" height="30" fill="#0b983c"/>
        <circle cx="50" cy="31" r="22" fill="#ffffff"/>
        <circle cx="50" cy="31" r="20" fill="#e11d07"/>
        <circle cx="38" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="46" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="54" cy="89" r="2" fill="#3ea2d4"/>
        <circle cx="62" cy="89" r="2" fill="#3ea2d4"/>
      </svg>
      <span className="ml-3 text-xl font-bold text-gray-900">CIV.IQ</span>
    </div>
  );
}

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  imageUrl?: string;
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams();
  const bioguideId = searchParams.get('bioguideId');
  const [representative, setRepresentative] = useState<Representative | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<3 | 5 | 8>(5);

  useEffect(() => {
    const fetchRepresentative = async () => {
      if (!bioguideId) {
        setError('No representative ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`/api/representative/${bioguideId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch representative data');
        }
        
        const repData = await response.json();
        setRepresentative(repData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load representative');
        setRepresentative(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRepresentative();
  }, [bioguideId]);

  if (!bioguideId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/">
                <CiviqLogo />
              </Link>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 mt-1">No representative ID provided</p>
            <Link 
              href="/"
              className="inline-block mt-4 text-civiq-blue hover:underline"
            >
              ← Go to search page
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <CiviqLogo />
            </Link>
            <div className="flex items-center gap-4">
              <Link 
                href="/compare" 
                className="text-civiq-green hover:text-civiq-green/80 text-sm font-medium"
              >
                Compare Representatives
              </Link>
              <Link 
                href="/" 
                className="text-civiq-blue hover:text-civiq-blue/80 text-sm font-medium"
              >
                ← Back to Search
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-civiq-blue"></div>
            <p className="mt-4 text-gray-600">Loading analytics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-600 mt-1">{error}</p>
            <Link 
              href="/"
              className="inline-block mt-4 text-civiq-blue hover:underline"
            >
              ← Go to search page
            </Link>
          </div>
        )}

        {representative && (
          <>
            {/* Header Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    {representative.imageUrl ? (
                      <img 
                        src={representative.imageUrl} 
                        alt={representative.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-600 text-sm">Photo</span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                      {representative.name} Analytics
                    </h1>
                    <p className="text-gray-600 mb-2">{representative.title}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        representative.party.toLowerCase().includes('democrat') 
                          ? 'bg-blue-100 text-blue-800' 
                          : representative.party.toLowerCase().includes('republican')
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {representative.party}
                      </span>
                      {representative.district && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                          District {representative.district}
                        </span>
                      )}
                      <span className="px-3 py-1 bg-civiq-blue/10 text-civiq-blue rounded-full text-sm font-medium">
                        {representative.chamber}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Time Range Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Time Range:</span>
                  <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(parseInt(e.target.value) as 3 | 5 | 8)}
                    className="px-3 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value={3}>3 Years</option>
                    <option value={5}>5 Years</option>
                    <option value={8}>8 Years</option>
                  </select>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <Link 
                  href={`/representative/${representative.bioguideId}`}
                  className="text-civiq-blue hover:underline text-sm font-medium"
                >
                  View Full Profile →
                </Link>
                <span className="text-gray-300">|</span>
                <span className="text-sm text-gray-600">
                  Comprehensive analytics and trends over {timeRange} years
                </span>
              </div>
            </div>

            {/* Analytics Grid */}
            <div className="space-y-8">
              {/* Voting Trends */}
              <VotingTrendsChart 
                bioguideId={bioguideId} 
                years={timeRange}
                className="w-full"
              />

              {/* Campaign Finance */}
              <CampaignFinanceChart 
                bioguideId={bioguideId} 
                years={timeRange + 1} // Slightly longer for finance data
                className="w-full"
              />

              {/* Legislative Effectiveness */}
              <EffectivenessChart 
                bioguideId={bioguideId} 
                years={timeRange}
                className="w-full"
              />
            </div>

            {/* Additional Insights */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">About This Analysis</h3>
              <div className="prose prose-sm text-gray-600">
                <p>
                  This comprehensive analytics dashboard provides insights into {representative.name}'s 
                  performance across multiple dimensions over the past {timeRange} years.
                </p>
                <ul className="mt-4 space-y-2">
                  <li>
                    <strong>Voting Trends:</strong> Tracks party loyalty, voting activity, and positions on key legislation
                  </li>
                  <li>
                    <strong>Campaign Finance:</strong> Analyzes fundraising patterns, contribution sources, and spending behaviors
                  </li>
                  <li>
                    <strong>Legislative Effectiveness:</strong> Measures success in sponsoring bills, passing legislation, and policy specializations
                  </li>
                </ul>
                <p className="mt-4 text-xs text-gray-500">
                  Data sources: Congress.gov, FEC filings, and legislative effectiveness research. 
                  Some data may be simulated for demonstration purposes.
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
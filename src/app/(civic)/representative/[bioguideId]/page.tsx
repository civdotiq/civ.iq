/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

export const dynamic = 'force-dynamic';

// Server-side data fetching with absolute URLs
async function getRepresentativeData(bioguideId: string) {
  // eslint-disable-next-line no-console
  console.log('[SSR] Fetching full data for:', bioguideId);

  // Use absolute URL for server-side fetch
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === 'development'
      ? 'http://localhost:3000'
      : 'https://civdotiq.org';

  const apiUrl = `${baseUrl}/api/representative/${bioguideId}/batch`;

  // eslint-disable-next-line no-console
  console.log('[SSR] Fetching from:', apiUrl);

  try {
    const response = await fetch(apiUrl, {
      cache: 'force-cache',
    } as RequestInit);

    // eslint-disable-next-line no-console
    console.log('[SSR] Response status:', response.status);

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error('[SSR] Fetch failed:', response.status, response.statusText);
      // Return fallback data structure
      return {
        member: { bioguideId, error: true },
        bills: [],
        votes: [],
        committees: [],
        news: [],
        finance: null,
        success: false,
      };
    }

    const data = await response.json();

    // eslint-disable-next-line no-console
    console.log('[SSR] Successfully fetched data:', !!data.member);

    return data;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SSR] Fetch error:', error);
    // Even on error, return structure for full profile
    return {
      member: { bioguideId, error: true },
      bills: [],
      votes: [],
      committees: [],
      news: [],
      finance: null,
      success: false,
    };
  }
}

// Full Representative Profile Component
function RepresentativeProfile({ data, bioguideId }: { data: any; bioguideId: string }) {
  const member = data.member;
  const displayName = member.name || `${member.firstName || ''} ${member.lastName || ''}`.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <div className="flex items-center">
              <svg className="w-8 h-8" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <rect x="36" y="51" width="28" height="30" fill="#0b983c" />
                <circle cx="50" cy="31" r="22" fill="#ffffff" />
                <circle cx="50" cy="31" r="20" fill="#e11d07" />
                <circle cx="38" cy="89" r="2" fill="#3ea2d4" />
                <circle cx="46" cy="89" r="2" fill="#3ea2d4" />
                <circle cx="54" cy="89" r="2" fill="#3ea2d4" />
                <circle cx="62" cy="89" r="2" fill="#3ea2d4" />
              </svg>
              <span className="ml-2 text-lg font-bold text-gray-900">CIV.IQ</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-start space-x-6">
                <RepresentativePhoto
                  bioguideId={bioguideId}
                  name={displayName}
                  className="w-24 h-24"
                />
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
                  <p className="text-xl text-gray-600 mt-1">
                    {member.title || 'Representative'} • {member.partyName} • {member.state}
                    {member.district && ` District ${member.district}`}
                  </p>
                  <p className="text-lg text-gray-500 mt-2">
                    {member.chamber === 'House of Representatives' ? 'House' : 'Senate'}
                  </p>
                </div>
              </div>
            </div>

            {/* Voting Records */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Votes</h2>
              {data.votes && data.votes.length > 0 ? (
                <div className="space-y-3">
                  {data.votes.slice(0, 5).map((vote: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {vote.question || vote.description}
                          </h3>
                          <p className="text-sm text-gray-600">{vote.date}</p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-sm font-medium ${
                            vote.position === 'Yes'
                              ? 'bg-green-100 text-green-800'
                              : vote.position === 'No'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {vote.position}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent voting data available</p>
              )}
            </div>

            {/* Sponsored Bills */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Sponsored Legislation</h2>
              {data.bills && data.bills.length > 0 ? (
                <div className="space-y-3">
                  {data.bills.slice(0, 5).map((bill: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 pb-3">
                      <h3 className="font-semibold text-gray-900">
                        {bill.number} - {bill.title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {bill.introducedDate} • {bill.latestAction?.text}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent sponsored legislation available</p>
              )}
            </div>

            {/* Additional sections placeholder */}
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Committee Memberships</h2>
              {data.committees && data.committees.length > 0 ? (
                <div className="space-y-2">
                  {data.committees.map((committee: any, index: number) => (
                    <div key={index} className="text-gray-700">
                      {committee.name}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No committee information available</p>
              )}
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent News</h2>
              {data.news && data.news.length > 0 ? (
                <div className="space-y-3">
                  {data.news.map((article: any, index: number) => (
                    <div key={index} className="border-b border-gray-200 pb-3">
                      <h3 className="font-semibold text-gray-900">{article.title}</h3>
                      <p className="text-sm text-gray-600">{article.date}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No recent news available</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Information</h3>
              <div className="space-y-2">
                {member.phone && <p className="text-gray-700">📞 {member.phone}</p>}
                {member.email && <p className="text-gray-700">✉️ {member.email}</p>}
                {member.url && (
                  <p className="text-gray-700">
                    🌐{' '}
                    <a
                      href={member.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      Official Website
                    </a>
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Campaign Finance</h3>
              {data.finance ? (
                <div className="space-y-2">
                  <p className="text-gray-700">Total Raised: ${data.finance.totalRaised}</p>
                  <p className="text-gray-700">Total Spent: ${data.finance.totalSpent}</p>
                </div>
              ) : (
                <p className="text-gray-500">No finance data available</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default async function RepresentativePage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  const { bioguideId } = await params;

  const data = await getRepresentativeData(bioguideId);

  // ALWAYS render full profile, even with partial data
  return <RepresentativeProfile data={data} bioguideId={bioguideId} />;
}

export async function generateMetadata({ params }: { params: Promise<{ bioguideId: string }> }) {
  const { bioguideId } = await params;

  return {
    title: `Representative ${bioguideId} | CIV.IQ`,
    description: `View detailed information about federal representative ${bioguideId}`,
  };
}

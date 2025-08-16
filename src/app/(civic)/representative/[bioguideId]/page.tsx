/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
// import { RepresentativeProfileClient } from './client-wrapper';
import { SimpleClientWrapper } from './simple-client-wrapper';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RepresentativePageSidebar } from '@/features/representatives/components/RepresentativePageSidebar';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import {
  DataSourceBadge,
  DataTransparencyPanel,
  extractTransparencyMetadata,
  type DataMetadata,
} from '@/components/ui/DataTransparency';
// Note: Using console directly in Server Components to avoid React rendering issues
// import { logger } from '@/lib/logging/logger-client';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';

export const dynamic = 'force-dynamic';

function CiviqLogo() {
  return (
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
  );
}

interface RepresentativeDetails {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  committees?: Array<{
    name: string;
    role?: string;
    thomas_id?: string;
    id?: string;
  }>;
  fullName?: {
    first: string;
    middle?: string;
    last: string;
    suffix?: string;
    nickname?: string;
    official?: string;
  };
  bio?: {
    birthday?: string;
    gender?: 'M' | 'F';
    religion?: string;
  };
  currentTerm?: {
    start: string;
    end: string;
    office?: string;
    phone?: string;
    address?: string;
    website?: string;
    contactForm?: string;
    rssUrl?: string;
    stateRank?: 'junior' | 'senior';
    class?: number;
  };
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
    instagram?: string;
    mastodon?: string;
  };
}

// Server-side data fetching with direct service import (no HTTP networking)
async function getRepresentativeData(bioguideId: string): Promise<RepresentativeDetails> {
  try {
    if (!bioguideId || typeof bioguideId !== 'string') {
      const error = 'Invalid bioguideId provided';
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Representative data fetch failed:', error, {
          bioguideId,
          endpoint: 'representative',
          component: 'RepresentativeProfilePage',
        });
      }
      notFound();
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Fetching representative data via direct service call', {
        bioguideId: bioguideId.toUpperCase(),
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
      });
    }

    // Direct service call - no HTTP networking during SSR
    const enhancedData = await getEnhancedRepresentative(bioguideId.toUpperCase());

    if (!enhancedData) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('Representative not found in congress-legislators data', {
          bioguideId: bioguideId.toUpperCase(),
          component: 'RepresentativeProfilePage',
        });
      }
      notFound();
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('Representative data fetched successfully via direct service', {
        bioguideId: enhancedData.bioguideId,
        hasName: !!enhancedData.name,
        hasCommittees: !!enhancedData.committees,
        hasSocialMedia: !!enhancedData.socialMedia,
        hasCurrentTerm: !!enhancedData.currentTerm,
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
      });
    }

    return enhancedData;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Representative data fetch completely failed', {
        bioguideId,
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
        errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
        error,
      });
    }
    notFound();
  }
}

// Main Server Component - renders immediately with SSR data
export default async function RepresentativeProfilePage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  let bioguideId: string;

  try {
    const resolvedParams = await params;
    bioguideId = resolvedParams.bioguideId;

    if (!bioguideId || typeof bioguideId !== 'string') {
      notFound();
    }
  } catch {
    notFound();
  }

  // Server-side data fetching - this runs on the server and streams HTML
  const representative = await getRepresentativeData(bioguideId);

  // Handle fetch errors gracefully - representative data is required
  if (!representative) {
    notFound();
  }

  // Server-side data fetching for initial load performance
  // Construct absolute URL for server-side fetch (Node.js requires absolute URLs)
  // Use localhost for development, but this will be replaced with proper base URL in production
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const billsUrl = `${baseUrl}/api/representative/${bioguideId}/bills`;
  const votesUrl = `${baseUrl}/api/representative/${bioguideId}/votes`;

  // Fetch bills data server-side
  let billsData: unknown[] = [];
  let billsResponseData: unknown = null;
  let billsMetadata: DataMetadata | null = null;
  try {
    const billsResponse = await fetch(billsUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (billsResponse.ok) {
      billsResponseData = await billsResponse.json();
      const responseObj = billsResponseData as Record<string, unknown>;

      // Extract metadata for transparency
      billsMetadata = extractTransparencyMetadata(responseObj);

      billsData = Array.isArray(responseObj?.sponsoredLegislation)
        ? responseObj.sponsoredLegislation
        : Array.isArray(responseObj?.bills)
          ? responseObj.bills
          : Array.isArray(billsResponseData)
            ? billsResponseData
            : [];

      // STEP 1 DEBUG: Server component bills data structure
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('\n=== STEP 1: SERVER COMPONENT BILLS DATA ===');
        // eslint-disable-next-line no-console
        console.log('🔍 Raw bills response:', JSON.stringify(billsResponseData, null, 2));
        // eslint-disable-next-line no-console
        console.log('🔍 Extracted bills array:', billsData);
        // eslint-disable-next-line no-console
        console.log(
          '🔍 Bills count:',
          Array.isArray(billsData) ? billsData.length : 'Not an array'
        );
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Bills fetch failed:', `HTTP ${billsResponse.status}`);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Bills fetch error:', error);
    }
    billsData = [];
  }

  // Fetch votes data server-side
  let votingData: unknown[] = [];
  let votesResponseData: unknown = null;
  let votesMetadata: DataMetadata | null = null;
  try {
    const votesResponse = await fetch(votesUrl, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (votesResponse.ok) {
      votesResponseData = await votesResponse.json();
      const votesObj = votesResponseData as Record<string, unknown>;

      // Extract metadata for transparency
      votesMetadata = extractTransparencyMetadata(votesObj);

      votingData = Array.isArray(votesObj?.votes) ? votesObj.votes : [];

      // STEP 1 DEBUG: Server component votes data structure
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('\n=== STEP 1: SERVER COMPONENT VOTES DATA ===');
        // eslint-disable-next-line no-console
        console.log('🔍 Raw votes response:', JSON.stringify(votesResponseData, null, 2));
        // eslint-disable-next-line no-console
        console.log('🔍 Extracted votes array:', votingData);
        // eslint-disable-next-line no-console
        console.log(
          '🔍 Votes count:',
          Array.isArray(votingData) ? votingData.length : 'Not an array'
        );
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Votes fetch failed:', `HTTP ${votesResponse.status}`);
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('Votes fetch error:', error);
    }
    votingData = [];
  }
  const financeData: Record<string, unknown> = {};
  const newsData: unknown[] = [];
  const partyAlignmentData: Record<string, unknown> = {};
  const partialErrors: Record<string, string> = {};

  // Validate essential representative data - be more lenient
  if (
    !representative ||
    (!representative.name && !representative.firstName && !representative.lastName)
  ) {
    notFound();
  }

  // Set display name if needed
  if (!representative.name && representative.firstName && representative.lastName) {
    representative.name = `${representative.firstName} ${representative.lastName}`;
  }

  // Debug logging removed - was causing RSC serialization issues

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header - renders immediately from server */}
        <div className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between py-4">
              <Link href="/" className="flex items-center">
                <CiviqLogo />
              </Link>
              <div className="flex items-center space-x-4">
                <Link href="/representatives" className="text-sm text-gray-600 hover:text-gray-900">
                  All Representatives
                </Link>
                <div className="text-xs text-gray-400">Server rendered via direct service call</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - Critical path rendered immediately */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Profile Header - Above the fold content */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <RepresentativePhoto
                  bioguideId={representative.bioguideId}
                  name={representative.name}
                  size="xl"
                />
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900">
                  {representative.name || 'Representative'}
                </h1>
                <div className="flex items-center space-x-4 text-gray-600 mt-2">
                  <span
                    className={`px-2 py-1 rounded text-sm font-medium ${
                      representative.party === 'Republican'
                        ? 'bg-red-100 text-red-800'
                        : representative.party === 'Democrat'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {representative.party || 'Independent'}
                  </span>
                  <span>{representative.title || 'Representative'}</span>
                  <span>
                    {representative.state || 'Unknown'}
                    {representative.district ? `-${representative.district}` : ''}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="flex space-x-3">
                  {representative.website && (
                    <a
                      href={representative.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Website
                    </a>
                  )}
                  {representative.currentTerm?.contactForm && (
                    <a
                      href={representative.currentTerm.contactForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Contact
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Data Transparency Section */}
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600 mb-3 font-medium">Data Sources</div>
              <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-gray-500 font-medium">Representative Info</span>
                  <DataSourceBadge source="congress-legislators" size="sm" />
                </div>
                {billsMetadata && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500 font-medium">Bills & Legislation</span>
                    <DataTransparencyPanel
                      metadata={billsMetadata}
                      layout="horizontal"
                      showAll={false}
                      className="text-xs"
                    />
                  </div>
                )}
                {votesMetadata && (
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-500 font-medium">Voting Records</span>
                    <DataTransparencyPanel
                      metadata={votesMetadata}
                      layout="horizontal"
                      showAll={false}
                      className="text-xs"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display for Partial Failures */}
          {Object.keys(partialErrors).length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    Some data could not be loaded
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>The following information may be incomplete:</p>
                    <ul className="list-disc list-inside mt-1">
                      {Object.entries(partialErrors).map(([key, error]) => (
                        <li key={key} className="capitalize">
                          {key.replace('-', ' ')}:{' '}
                          {typeof error === 'string' ? error : 'Failed to load'}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Two-Column Layout: Main Content + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-3">
              <SimpleClientWrapper
                representative={representative}
                bioguideId={bioguideId}
                serverData={{
                  bills: billsData,
                  votes: votingData,
                  finance: financeData,
                  news: newsData,
                }}
              />
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <RepresentativePageSidebar
                representative={{
                  name: representative.name || 'Representative',
                  state: representative.state || 'Unknown',
                  district: representative.district,
                  chamber: representative.chamber || 'House',
                  bioguideId: bioguideId,
                }}
                additionalData={{
                  votes: votingData,
                  bills: billsData,
                  finance: financeData,
                  news: newsData,
                  partyAlignment: partyAlignmentData,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bioguideId: string }> }) {
  const { bioguideId } = await params;

  return {
    title: `Representative ${bioguideId} | CIV.IQ`,
    description: `View detailed information about federal representative ${bioguideId}`,
  };
}

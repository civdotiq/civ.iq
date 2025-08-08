/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RepresentativeProfileClient } from './client-wrapper';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { RepresentativePageSidebar } from '@/features/representatives/components/RepresentativePageSidebar';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { logger } from '@/lib/logging/logger-client';

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

// Server-side data fetching with Next.js 15 caching
async function getRepresentativeData(bioguideId: string) {
  try {
    if (!bioguideId || typeof bioguideId !== 'string') {
      const error = 'Invalid bioguideId provided';
      logger.error('Representative data fetch failed', new Error(error), {
        bioguideId,
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
      });
      throw new Error(error);
    }

    logger.info('Fetching representative data', {
      bioguideId,
      endpoint: 'representative',
      component: 'RepresentativeProfilePage',
    });

    // Use absolute URL for server-side fetch - let Next.js handle internal routing
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === 'development'
        ? `http://localhost:${process.env.PORT || 3001}`
        : 'https://civdotiq.org';

    const response = await fetch(`${baseUrl}/api/representative/${bioguideId}`, {
      // Use GET method to match the API implementation
      method: 'GET',
      // Explicitly exclude credentials to prevent 401 errors
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        // Explicitly remove any auth headers that might be inherited
      },
      // Next.js 15 caching - cache for 5 minutes, revalidate on-demand
      next: {
        revalidate: 300,
        tags: [`representative-${bioguideId}`, 'representative'],
      },
    } as RequestInit & { next?: { revalidate?: number; tags?: string[] } });

    if (!response) {
      const error = 'No response received from API';
      logger.error('Representative API fetch failed', new Error(error), {
        bioguideId,
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
      });
      throw new Error(error);
    }

    if (!response.ok) {
      logger.warn('Representative API returned non-OK status', {
        bioguideId,
        status: response.status,
        statusText: response.statusText,
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
      });

      if (response.status === 404) {
        logger.info('Representative not found, triggering 404', {
          bioguideId,
          component: 'RepresentativeProfilePage',
        });
        notFound();
      }
      throw new Error(
        `Failed to fetch representative data: ${response.status} ${response.statusText}`
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      const error = 'Invalid JSON response from API';
      logger.error('Representative API JSON parse failed', parseError, {
        bioguideId,
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
      });
      throw new Error(error);
    }

    if (!data) {
      const error = 'No data received from API';
      logger.error('Representative API returned empty data', new Error(error), {
        bioguideId,
        endpoint: 'representative',
        component: 'RepresentativeProfilePage',
      });
      throw new Error(error);
    }

    logger.info('Representative data fetched successfully', {
      bioguideId,
      success: data.success !== false,
      hasRepresentative: !!data.representative,
      representativeKeys: data.representative ? Object.keys(data.representative) : [],
      endpoint: 'representative',
      component: 'RepresentativeProfilePage',
    });

    // The regular API returns { representative: {...}, success: true } - use it directly
    const representative = data.representative || { bioguideId, error: true };

    logger.info('Using representative data from API', {
      bioguideId,
      hasName: !!representative.name,
      hasCommittees: !!representative.committees,
      endpoint: 'representative',
      component: 'RepresentativeProfilePage',
    });

    // Transform the API response into the expected nested structure for the page
    return {
      success: data.success !== false,
      data: {
        profile: {
          representative,
        },
        votes: [], // Will be fetched separately if needed
        bills: [], // Will be fetched separately if needed
        finance: {}, // Will be fetched separately if needed
        news: [], // Will be fetched separately if needed
        'party-alignment': {}, // Will be fetched separately if needed
        committees: representative.committees || [],
      },
      errors: data.errors || {},
      executionTime: 0,
    };
  } catch (error) {
    // Log the error but return a safe error structure instead of throwing
    logger.error('Representative data fetch completely failed', error, {
      bioguideId,
      endpoint: 'representative',
      component: 'RepresentativeProfilePage',
      errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
    });

    return {
      success: false,
      data: {},
      errors: { fetch: error instanceof Error ? error.message : 'Unknown error occurred' },
      executionTime: 0,
    };
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
  const batchData = await getRepresentativeData(bioguideId);

  // Handle fetch errors gracefully - allow partial failures
  if (!batchData || !batchData.data?.profile?.representative) {
    notFound();
  }

  const representative = batchData.data.profile.representative as RepresentativeDetails;
  const votingData = batchData.data.votes || [];
  const billsData = batchData.data.bills || [];
  const financeData = batchData.data.finance || {};
  const newsData = batchData.data.news || [];
  const partyAlignmentData = batchData.data['party-alignment'] || {};
  const partialErrors = batchData.errors || {};

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
                <div className="text-xs text-gray-400">
                  Server rendered in {batchData.executionTime}ms
                </div>
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
              <RepresentativeProfileClient
                representative={representative}
                initialData={{
                  votes: votingData,
                  bills: billsData,
                  finance: financeData,
                  news: newsData,
                  partyAlignment: partyAlignmentData,
                }}
                partialErrors={partialErrors}
                bioguideId={bioguideId}
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

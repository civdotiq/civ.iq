/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { notFound } from 'next/navigation';
import { RepresentativeClient } from './components/RepresentativeClient';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { extractTransparencyMetadata } from '@/components/ui/DataTransparency';
// Note: Using console directly in Server Components to avoid React rendering issues
// import { logger } from '@/lib/logging/logger-client';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';

export const dynamic = 'force-dynamic';

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
      const _error = 'Invalid bioguideId provided';
      if (process.env.NODE_ENV === 'development') {
        // Server component error handling - no console.error
      }
      notFound();
    }

    if (process.env.NODE_ENV === 'development') {
      // Server component - fetching representative data
    }

    // Direct service call - no HTTP networking during SSR
    const enhancedData = await getEnhancedRepresentative(bioguideId.toUpperCase());

    if (!enhancedData) {
      if (process.env.NODE_ENV === 'development') {
        // Representative not found in congress-legislators data
      }
      notFound();
    }

    if (process.env.NODE_ENV === 'development') {
      // Representative data fetched successfully
    }

    return enhancedData;
  } catch {
    if (process.env.NODE_ENV === 'development') {
      // Representative data fetch failed - return not found
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
      const _billsMetadata = extractTransparencyMetadata(responseObj);

      billsData = Array.isArray(responseObj?.sponsoredLegislation)
        ? responseObj.sponsoredLegislation
        : Array.isArray(responseObj?.bills)
          ? responseObj.bills
          : Array.isArray(billsResponseData)
            ? billsResponseData
            : [];

      // Server component bills data extracted successfully
    } else {
      // Bills fetch failed with HTTP error
    }
  } catch {
    // Bills fetch error occurred
    billsData = [];
  }

  // Fetch votes data server-side
  let votingData: unknown[] = [];
  let votesResponseData: unknown = null;
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
      const _votesMetadata = extractTransparencyMetadata(votesObj);

      votingData = Array.isArray(votesObj?.votes) ? votesObj.votes : [];

      // Server component votes data extracted successfully
    } else {
      // Votes fetch failed with HTTP error
    }
  } catch {
    // Votes fetch error occurred
    votingData = [];
  }
  const financeData: Record<string, unknown> = {};
  const newsData: unknown[] = [];
  const _partyAlignmentData: Record<string, unknown> = {};
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
      {/* Error Display for Partial Failures */}
      {Object.keys(partialErrors).length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-6">
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
              <h3 className="text-sm font-medium text-yellow-800">Some data could not be loaded</h3>
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

      {/* Representative Client Component */}
      <RepresentativeClient
        representative={representative}
        serverData={{
          bills: billsData,
          votes: votingData,
          finance: financeData,
          news: newsData,
        }}
        partialErrors={partialErrors}
      />
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

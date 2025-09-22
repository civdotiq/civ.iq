/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { notFound } from 'next/navigation';
import { SimpleRepresentativeProfile } from '@/features/representatives/components/SimpleRepresentativeProfile';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';
import { ChunkLoadErrorBoundary } from '@/components/shared/common/ChunkLoadErrorBoundary';
import { SiteHeader } from '@/components/shared/layout/SiteHeader';
import Link from 'next/link';
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
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('DEBUG: Invalid bioguideId:', bioguideId);
      }
      notFound();
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: Calling getEnhancedRepresentative with:', bioguideId.toUpperCase());
    }

    // Direct service call - no HTTP networking during SSR
    const enhancedData = await getEnhancedRepresentative(bioguideId.toUpperCase());

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: getEnhancedRepresentative returned:', {
        isNull: enhancedData === null,
        isUndefined: enhancedData === undefined,
        type: typeof enhancedData,
        hasName: enhancedData?.name,
        hasFirstName: enhancedData?.firstName,
        hasLastName: enhancedData?.lastName,
        keys: enhancedData ? Object.keys(enhancedData).slice(0, 10) : [],
      });
    }

    if (!enhancedData) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('DEBUG: enhancedData is null/undefined - calling notFound()');
      }
      notFound();
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: Returning enhanced data successfully');
    }
    return enhancedData;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: Exception in getRepresentativeData:', error);
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

  // Validate essential representative data - be more lenient
  if (!representative) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: representative is null/undefined');
    }
    notFound();
  }

  if (!representative.name && !representative.firstName && !representative.lastName) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('DEBUG: missing name fields:', {
        name: representative.name,
        firstName: representative.firstName,
        lastName: representative.lastName,
        keys: Object.keys(representative).slice(0, 10),
      });
    }
    notFound();
  }

  // Set display name if needed
  if (!representative.name && representative.firstName && representative.lastName) {
    representative.name = `${representative.firstName} ${representative.lastName}`;
  }

  // Debug logging removed - was causing RSC serialization issues

  return (
    <>
      <SiteHeader />

      <main id="main-content">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <div></div>
            <Link
              href="/"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
            >
              ← Back to Search
            </Link>
          </div>
        </div>

        <ChunkLoadErrorBoundary>
          <ErrorBoundary>
            <SimpleRepresentativeProfile representative={representative} />
          </ErrorBoundary>
        </ChunkLoadErrorBoundary>
      </main>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bioguideId: string }> }) {
  const { bioguideId } = await params;

  return {
    title: `Representative ${bioguideId} | CIV.IQ`,
    description: `View detailed information about federal representative ${bioguideId}`,
  };
}

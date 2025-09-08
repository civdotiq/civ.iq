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
    <>
      <SiteHeader />

      <main id="main-content">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Search
          </Link>
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

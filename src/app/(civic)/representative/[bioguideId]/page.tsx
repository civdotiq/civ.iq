/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { notFound } from 'next/navigation';
import dynamicImport from 'next/dynamic';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';
import { ChunkLoadErrorBoundary } from '@/components/shared/common/ChunkLoadErrorBoundary';
import { SiteHeader } from '@/components/shared/layout/SiteHeader';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { BreadcrumbsWithContext } from '@/components/shared/navigation/BreadcrumbsWithContext';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 3600; // Revalidate every hour

// Dynamic import for the main profile component to reduce initial bundle size
const SimpleRepresentativeProfile = dynamicImport(
  () =>
    import('@/features/representatives/components/SimpleRepresentativeProfile').then(mod => ({
      default: mod.SimpleRepresentativeProfile,
    })),
  {
    loading: () => (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-grid-2 md:px-grid-4 py-grid-3">
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 border-2 border-gray-300 mb-grid-3"></div>
            <div className="h-16 bg-gray-200 border-2 border-gray-300 mb-grid-3"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-grid-4">
              <div className="h-96 bg-gray-200 border-2 border-gray-300"></div>
              <div className="h-96 bg-gray-200 border-2 border-gray-300"></div>
            </div>
          </div>
        </div>
      </div>
    ),
  }
);

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
  votingMember: boolean;
  role: 'Representative' | 'Senator' | 'Delegate' | 'Resident Commissioner';
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

  // Breadcrumb navigation with preserved search context
  const breadcrumbItems = [
    { label: 'Search', href: '/' },
    { label: 'Your Representatives', href: '/results', preserveSearch: true },
    { label: representative.name, href: '#' },
  ];

  return (
    <>
      <SiteHeader />

      <main id="main-content">
        <div className="container mx-auto px-grid-2 md:px-grid-4 py-grid-3">
          <BreadcrumbsWithContext items={breadcrumbItems} className="mb-grid-3" />
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

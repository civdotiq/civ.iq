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
import { PersonSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';
import {
  RelatedLinks,
  Infobox,
  FreshnessTimestamp,
  CategoryTags,
} from '@/components/seo/WikipediaStyleSEO';
import type { RelatedLink, InfoboxField } from '@/components/seo/WikipediaStyleSEO';

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
      notFound();
    }

    // Direct service call - no HTTP networking during SSR
    const enhancedData = await getEnhancedRepresentative(bioguideId.toUpperCase());

    if (!enhancedData) {
      notFound();
    }

    return enhancedData;
  } catch {
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
    notFound();
  }

  if (!representative.name && !representative.firstName && !representative.lastName) {
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

  // Build social media links for schema
  const sameAs: string[] = [];
  if (representative.socialMedia?.twitter) {
    sameAs.push(`https://twitter.com/${representative.socialMedia.twitter}`);
  }
  if (representative.socialMedia?.facebook) {
    sameAs.push(`https://facebook.com/${representative.socialMedia.facebook}`);
  }
  if (representative.website) {
    sameAs.push(representative.website);
  }

  // Build committee memberships for schema
  const memberOf = representative.committees?.map(c => ({
    name: c.name,
    url: c.id ? `https://civdotiq.org/committee/${c.id}` : undefined,
  }));

  // Build RelatedLinks for internal link network (Wikipedia "See Also" pattern)
  const relatedLinks: RelatedLink[] = [];

  // Link to congressional district (if House member)
  if (representative.chamber === 'House' && representative.district) {
    relatedLinks.push({
      href: `/districts/${representative.state}${representative.district.padStart(2, '0')}`,
      title: `${representative.state} Congressional District ${representative.district}`,
      description: 'View district demographics and boundaries',
      type: 'district',
    });
  }

  // Links to committees they serve on
  if (representative.committees && representative.committees.length > 0) {
    representative.committees.slice(0, 4).forEach(committee => {
      if (committee.id || committee.thomas_id) {
        relatedLinks.push({
          href: `/committee/${committee.id || committee.thomas_id}`,
          title: committee.name,
          description: committee.role || 'Committee Member',
          type: 'committee',
        });
      }
    });
  }

  // Link to state delegation
  relatedLinks.push({
    href: `/delegation/${representative.state}`,
    title: `${representative.state} Congressional Delegation`,
    description: `All representatives and senators from ${representative.state}`,
    type: 'state',
  });

  // Link to Congress overview
  relatedLinks.push({
    href: '/congress',
    title: representative.chamber === 'Senate' ? 'U.S. Senate' : 'U.S. House of Representatives',
    description: `Browse all ${representative.chamber} members`,
    type: 'representative',
  });

  // Build Infobox fields for quick facts sidebar
  const infoboxFields: InfoboxField[] = [
    { label: 'Party', value: representative.party },
    {
      label: 'State',
      value: representative.state,
      link: `/delegation/${representative.state}`,
    },
  ];

  if (representative.district) {
    infoboxFields.push({
      label: 'District',
      value: representative.district,
      link: `/districts/${representative.state}${representative.district.padStart(2, '0')}`,
    });
  }

  if (representative.terms && representative.terms.length > 0) {
    const firstTerm = representative.terms[0];
    if (firstTerm?.startYear) {
      infoboxFields.push({
        label: 'In Office Since',
        value: firstTerm.startYear,
      });
    }
  }

  if (representative.committees && representative.committees.length > 0) {
    infoboxFields.push({
      label: 'Committees',
      value: `${representative.committees.length}`,
      link: '#committees',
    });
  }

  if (representative.bio?.birthday) {
    infoboxFields.push({
      label: 'Born',
      value: new Date(representative.bio.birthday).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    });
  }

  // Category tags for SEO clustering
  const categoryTags = [
    { name: representative.party, href: `/congress?party=${representative.party}` },
    { name: representative.state, href: `/delegation/${representative.state}` },
    { name: representative.chamber, href: `/congress?chamber=${representative.chamber}` },
    { name: '119th Congress', href: '/congress' },
  ];

  return (
    <>
      {/* Structured Data for SEO */}
      <PersonSchema
        name={representative.name}
        jobTitle={`${representative.role} - ${representative.state}${representative.district ? ` District ${representative.district}` : ''}`}
        description={`${representative.party} ${representative.role} representing ${representative.state} in the U.S. Congress`}
        image={representative.imageUrl}
        url={`https://civdotiq.org/representative/${bioguideId}`}
        worksFor={{
          name:
            representative.chamber === 'Senate'
              ? 'United States Senate'
              : 'United States House of Representatives',
          url: representative.chamber === 'Senate' ? 'https://senate.gov' : 'https://house.gov',
        }}
        memberOf={memberOf}
        sameAs={sameAs.length > 0 ? sameAs : undefined}
        affiliation={representative.party}
        birthDate={representative.bio?.birthday}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Representatives', url: 'https://civdotiq.org/results' },
          { name: representative.name, url: `https://civdotiq.org/representative/${bioguideId}` },
        ]}
      />

      <SiteHeader />

      <main id="main-content" className="density-default">
        <div className="container mx-auto px-grid-2 md:px-grid-4 py-grid-3">
          <BreadcrumbsWithContext items={breadcrumbItems} className="mb-grid-3" />
        </div>

        <ChunkLoadErrorBoundary>
          <ErrorBoundary>
            <SimpleRepresentativeProfile representative={representative} />
          </ErrorBoundary>
        </ChunkLoadErrorBoundary>

        {/* Wikipedia-style SEO Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          {/* Infobox - Quick Facts Sidebar */}
          <div className="mb-8">
            <Infobox
              title={representative.name}
              subtitle={`${representative.party} ${representative.role}`}
              image={representative.imageUrl}
              imageAlt={`Official photo of ${representative.name}`}
              fields={infoboxFields}
            />
          </div>

          {/* Related Links - "See Also" Section */}
          <RelatedLinks links={relatedLinks} title="Related Pages" />

          {/* Freshness Timestamp */}
          <div className="mt-6">
            <FreshnessTimestamp lastUpdated={new Date()} dataSource="Congress.gov API" />
          </div>

          {/* Category Tags */}
          <CategoryTags categories={categoryTags} />
        </div>
      </main>
    </>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ bioguideId: string }> }) {
  const { bioguideId } = await params;

  try {
    // Fetch representative data for rich metadata
    const representative = await getRepresentativeData(bioguideId);

    const title = `${representative.name} (${representative.party}-${representative.state}) | CIV.IQ`;
    const description = `Campaign finance, voting records, and legislative activity for ${representative.name}. Real government data from official sources.`;
    const url = `https://civdotiq.org/representative/${bioguideId}`;
    const ogImageUrl = `/api/og/representative/${bioguideId}?type=overview`;

    return {
      title,
      description,
      openGraph: {
        title: `${representative.name} - Federal ${representative.role}`,
        description,
        url,
        siteName: 'CIV.IQ',
        type: 'profile',
        images: [
          {
            url: ogImageUrl,
            width: 1200,
            height: 630,
            alt: `${representative.name} profile data`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImageUrl],
        site: '@civdotiq',
      },
    };
  } catch {
    // Fallback metadata if representative data fetch fails
    return {
      title: `Representative ${bioguideId} | CIV.IQ`,
      description: `View detailed information about federal representative ${bioguideId}`,
    };
  }
}

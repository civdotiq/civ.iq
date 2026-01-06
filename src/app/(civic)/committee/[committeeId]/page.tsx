/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import { Users, MapPin, Calendar, ExternalLink, Phone } from 'lucide-react';
import { getCommitteeDisplayName } from '@/types/committee';
import type { Committee, CommitteeAPIResponse } from '@/types/committee';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';
import { Breadcrumb, SimpleBreadcrumb } from '@/components/shared/ui/Breadcrumb';
import { getServerBaseUrl } from '@/lib/server-url';
import { GovernmentOrganizationSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';
import {
  FAQSection,
  RelatedLinks,
  FreshnessTimestamp,
  CategoryTags,
} from '@/components/seo/WikipediaStyleSEO';
import type { RelatedLink } from '@/components/seo/WikipediaStyleSEO';

// Dynamically import client components
const SubcommitteeCard = dynamic(
  () => import('@/features/legislation/components/SubcommitteeCard'),
  {
    ssr: true,
    loading: () => (
      <div className="border border-gray-200 p-4 animate-pulse">
        <div className="h-6 w-1/2 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-full bg-gray-200 rounded"></div>
      </div>
    ),
  }
);

const CommitteeMembers = dynamic(
  () => import('@/features/legislation/components/CommitteeMembers'),
  {
    ssr: true,
    loading: () => (
      <div className="bg-white border-2 border-black p-6 animate-pulse">
        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 w-1/3 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 w-1/4 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    ),
  }
);

interface CommitteePageProps {
  params: Promise<{ committeeId: string }>;
  searchParams: Promise<{ from?: string; name?: string; refresh?: string }>;
}

// Fetch committee data
async function getCommitteeData(committeeId: string, refresh?: boolean): Promise<Committee | null> {
  try {
    const baseUrl = getServerBaseUrl();
    const url = refresh
      ? `${baseUrl}/api/committee/${committeeId}?refresh=true`
      : `${baseUrl}/api/committee/${committeeId}`;

    const response = await fetch(url, {
      // Bypass ISR cache when refresh=true, otherwise revalidate every hour
      next: refresh ? { revalidate: 0 } : { revalidate: 3600 },
    });

    if (!response.ok) {
      return null;
    }

    const data: CommitteeAPIResponse = await response.json();
    return data.committee;
  } catch {
    return null;
  }
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CommitteePageProps): Promise<Metadata> {
  const { committeeId } = await params;
  const committee = await getCommitteeData(committeeId);

  const title = committee ? committee.name : getCommitteeDisplayName(committeeId);
  const description = committee
    ? `Learn about the ${committee.name}, its members, leadership, and jurisdiction in the ${committee.chamber}.`
    : `Information about ${getCommitteeDisplayName(committeeId)}`;

  return {
    title: `${title} | CIV.IQ`,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}

// Loading component for committee data
function CommitteeLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Header skeleton */}
        <div className="bg-white border-2 border-black p-8 mb-8">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Leadership skeleton */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border-2 border-black p-6">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="bg-white border-2 border-black p-6">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Members table skeleton */}
        <div className="bg-white border-2 border-black p-6">
          <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-4 border rounded">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse mb-2"></div>
                  <div className="h-3 w-1/4 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Committee content component
async function CommitteeContent({
  committeeId,
  fromBioguideId,
  fromRepName,
  refresh,
}: {
  committeeId: string;
  fromBioguideId?: string;
  fromRepName?: string;
  refresh?: boolean;
}) {
  const committee = await getCommitteeData(committeeId, refresh);

  if (!committee) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {fromBioguideId && fromRepName ? (
            <Breadcrumb
              currentPage="Committee Not Found"
              fromBioguideId={fromBioguideId}
              fromRepName={fromRepName}
            />
          ) : (
            <SimpleBreadcrumb />
          )}

          <div className="bg-white border-2 border-black p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Committee Not Found</h1>
            <p className="text-gray-600 mb-6">
              Sorry, we couldn&apos;t find information for committee &quot;{committeeId}&quot;.
            </p>
            <p className="text-sm text-gray-500">
              This committee may not exist or data may be temporarily unavailable.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white density-default">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        {fromBioguideId && fromRepName ? (
          <Breadcrumb
            currentPage={committee.name}
            fromBioguideId={fromBioguideId}
            fromRepName={fromRepName}
          />
        ) : (
          <SimpleBreadcrumb />
        )}

        {/* Committee Header */}
        <div className="bg-white border-2 border-black p-8 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{committee.name}</h1>
              <div className="flex items-center text-gray-600 mb-4">
                <MapPin className="w-5 h-5 mr-2" />
                <span className="font-medium">{committee.chamber}</span>
                <span className="mx-2">•</span>
                <span>{committee.type} Committee</span>
              </div>
              <p className="text-gray-700 leading-relaxed">{committee.jurisdiction}</p>
            </div>

            {committee.url && (
              <Link
                href={committee.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Congress.gov
              </Link>
            )}
          </div>

          {/* Contact Information */}
          {(committee.phone || committee.address) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Contact Information</h3>
              <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                {committee.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{committee.phone}</span>
                  </div>
                )}
                {committee.address && (
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    <span>{committee.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Leadership Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {committee.leadership.chair && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Chairperson
              </h2>
              <div className="flex items-center space-x-4">
                <RepresentativePhoto
                  bioguideId={committee.leadership.chair.representative.bioguideId}
                  name={committee.leadership.chair.representative.name}
                  size="lg"
                />
                <div>
                  <Link
                    href={`/representative/${committee.leadership.chair.representative.bioguideId}`}
                    className="text-lg font-medium text-blue-600 hover:text-blue-800"
                  >
                    {committee.leadership.chair.representative.name}
                  </Link>
                  <p className="text-gray-600">
                    {committee.leadership.chair.representative.party} •{' '}
                    {committee.leadership.chair.representative.state}
                    {committee.leadership.chair.representative.district &&
                      `-${committee.leadership.chair.representative.district}`}
                  </p>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    Since {new Date(committee.leadership.chair.joinedDate).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {committee.leadership.rankingMember && (
            <div className="bg-white border-2 border-black p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Ranking Member
              </h2>
              <div className="flex items-center space-x-4">
                <RepresentativePhoto
                  bioguideId={committee.leadership.rankingMember.representative.bioguideId}
                  name={committee.leadership.rankingMember.representative.name}
                  size="lg"
                />
                <div>
                  <Link
                    href={`/representative/${committee.leadership.rankingMember.representative.bioguideId}`}
                    className="text-lg font-medium text-blue-600 hover:text-blue-800"
                  >
                    {committee.leadership.rankingMember.representative.name}
                  </Link>
                  <p className="text-gray-600">
                    {committee.leadership.rankingMember.representative.party} •{' '}
                    {committee.leadership.rankingMember.representative.state}
                    {committee.leadership.rankingMember.representative.district &&
                      `-${committee.leadership.rankingMember.representative.district}`}
                  </p>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Calendar className="w-4 h-4 mr-1" />
                    Since {new Date(committee.leadership.rankingMember.joinedDate).getFullYear()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Committee Members with Enhanced Features */}
        <CommitteeMembers committee={committee} />

        {/* Subcommittees */}
        {committee.subcommittees.length > 0 && (
          <div className="bg-white border-2 border-black p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Subcommittees ({committee.subcommittees.length})
            </h2>

            <div className="grid gap-4">
              {committee.subcommittees.map(subcommittee => (
                <SubcommitteeCard key={subcommittee.id} subcommittee={subcommittee} />
              ))}
            </div>
          </div>
        )}

        {/* Structured Data for SEO */}
        <GovernmentOrganizationSchema
          name={committee.name}
          description={committee.jurisdiction}
          url={`https://civdotiq.org/committee/${committeeId}`}
          parentOrganization={
            committee.chamber === 'Senate'
              ? 'United States Senate'
              : 'United States House of Representatives'
          }
        />
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: 'https://civdotiq.org' },
            { name: 'Committees', url: 'https://civdotiq.org/committees' },
            { name: committee.name, url: `https://civdotiq.org/committee/${committeeId}` },
          ]}
        />

        {/* Wikipedia-style SEO Section */}
        <div className="mt-8 space-y-6">
          {/* FAQ Section */}
          <FAQSection
            faqs={[
              {
                question: `What does the ${committee.name} do?`,
                answer:
                  committee.jurisdiction ||
                  `The ${committee.name} is a ${committee.type.toLowerCase()} committee in the ${committee.chamber} that oversees legislation and policy within its jurisdiction.`,
              },
              {
                question: `Who chairs the ${committee.name}?`,
                answer: committee.leadership.chair
                  ? `${committee.leadership.chair.representative.name} (${committee.leadership.chair.representative.party}-${committee.leadership.chair.representative.state}) serves as the chairperson.`
                  : 'The committee chair information is currently unavailable.',
              },
              {
                question: `How many members are on the ${committee.name}?`,
                answer: committee.members
                  ? `The ${committee.name} has ${committee.members.length} members from both parties.`
                  : 'Member information is available on the committee detail page.',
              },
              {
                question: `How many subcommittees does the ${committee.name} have?`,
                answer:
                  committee.subcommittees.length > 0
                    ? `The ${committee.name} has ${committee.subcommittees.length} subcommittees that focus on specific areas within its jurisdiction.`
                    : `The ${committee.name} does not have subcommittees.`,
              },
            ]}
            title="Frequently Asked Questions"
          />

          {/* Related Links */}
          <RelatedLinks
            links={
              [
                ...(committee.leadership.chair
                  ? [
                      {
                        href: `/representative/${committee.leadership.chair.representative.bioguideId}`,
                        title: committee.leadership.chair.representative.name,
                        description: 'Committee Chairperson',
                        type: 'representative' as const,
                      },
                    ]
                  : []),
                ...(committee.leadership.rankingMember
                  ? [
                      {
                        href: `/representative/${committee.leadership.rankingMember.representative.bioguideId}`,
                        title: committee.leadership.rankingMember.representative.name,
                        description: 'Ranking Member',
                        type: 'representative' as const,
                      },
                    ]
                  : []),
                {
                  href: '/committees',
                  title: 'All Congressional Committees',
                  description: 'Browse all House and Senate committees',
                  type: 'committee',
                },
                {
                  href: '/congress',
                  title: 'U.S. Congress',
                  description: 'Overview of the 119th Congress',
                  type: 'representative',
                },
              ] as RelatedLink[]
            }
            title="Related Pages"
          />

          {/* Freshness Timestamp */}
          <FreshnessTimestamp lastUpdated={new Date()} dataSource="Congress.gov" />

          {/* Category Tags */}
          <CategoryTags
            categories={[
              { name: committee.chamber, href: `/committees?chamber=${committee.chamber}` },
              { name: `${committee.type} Committee`, href: '/committees' },
              { name: '119th Congress', href: '/congress' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// Main committee page component
export default async function CommitteePage({ params, searchParams }: CommitteePageProps) {
  const { committeeId } = await params;
  const { from: fromBioguideId, name: fromRepName, refresh } = await searchParams;

  return (
    <Suspense fallback={<CommitteeLoading />}>
      <CommitteeContent
        committeeId={committeeId}
        fromBioguideId={fromBioguideId}
        fromRepName={fromRepName}
        refresh={refresh === 'true'}
      />
    </Suspense>
  );
}

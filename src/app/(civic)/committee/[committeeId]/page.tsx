/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Users, MapPin, Calendar, ExternalLink, Phone } from 'lucide-react';
import { getCommitteeDisplayName } from '@/types/committee';
import type { Committee, CommitteeAPIResponse } from '@/types/committee';
import RepresentativePhoto from '@/features/representatives/components/RepresentativePhoto';

// Dynamically import the SubcommitteeCard component (client component)
const SubcommitteeCard = dynamic(
  () => import('@/features/legislation/components/SubcommitteeCard'),
  {
    ssr: true,
    loading: () => (
      <div className="border border-gray-200 rounded-lg p-4 animate-pulse">
        <div className="h-6 w-1/2 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-full bg-gray-200 rounded"></div>
      </div>
    ),
  }
);

interface CommitteePageProps {
  params: Promise<{ committeeId: string }>;
}

// Fetch committee data
async function getCommitteeData(committeeId: string): Promise<Committee | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/committee/${committeeId}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button skeleton */}
        <div className="mb-6">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Header skeleton */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="h-8 w-2/3 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-6 w-1/3 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Leadership skeleton */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mb-4"></div>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse"></div>
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
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
        <div className="bg-white rounded-lg shadow-lg p-6">
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
async function CommitteeContent({ committeeId }: { committeeId: string }) {
  const committee = await getCommitteeData(committeeId);

  if (!committee) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            href="/representatives"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Representatives
          </Link>

          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          href="/representatives"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Representatives
        </Link>

        {/* Committee Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
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
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
            <div className="bg-white rounded-lg shadow-lg p-6">
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
            <div className="bg-white rounded-lg shadow-lg p-6">
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

        {/* Committee Members */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Committee Members ({committee.members.length})
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Representative
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    State/District
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {committee.members.map(member => (
                  <tr key={member.representative.bioguideId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <RepresentativePhoto
                          bioguideId={member.representative.bioguideId}
                          name={member.representative.name}
                          size="sm"
                          className="mr-3"
                        />
                        <div>
                          <Link
                            href={`/representative/${member.representative.bioguideId}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {member.representative.name}
                          </Link>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          member.representative.party === 'Democrat' ||
                          member.representative.party === 'D'
                            ? 'bg-blue-100 text-blue-800'
                            : member.representative.party === 'Independent'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {member.representative.party}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.representative.state}
                      {member.representative.district && `-${member.representative.district}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.role}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(member.joinedDate).getFullYear()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Subcommittees */}
        {committee.subcommittees.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6">
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
      </div>
    </div>
  );
}

// Main committee page component
export default async function CommitteePage({ params }: CommitteePageProps) {
  const { committeeId } = await params;

  return (
    <Suspense fallback={<CommitteeLoading />}>
      <CommitteeContent committeeId={committeeId} />
    </Suspense>
  );
}

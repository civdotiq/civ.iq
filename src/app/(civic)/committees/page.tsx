/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Suspense } from 'react';
import Link from 'next/link';
import { Metadata } from 'next';
import { Users, Building2, Scale } from 'lucide-react';
import { getServerBaseUrl } from '@/lib/server-url';

export const metadata: Metadata = {
  title: 'Congressional Committees | CIV.IQ',
  description:
    'Browse all House, Senate, and Joint committees in the U.S. Congress. Explore their jurisdictions, leadership, and responsibilities.',
  openGraph: {
    title: 'Congressional Committees',
    description:
      'Browse all House, Senate, and Joint committees in the U.S. Congress. Explore their jurisdictions, leadership, and responsibilities.',
    type: 'website',
  },
};

interface Committee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  type: 'standing' | 'select' | 'special' | 'joint';
  jurisdiction: string;
  chair?: {
    name: string;
    bioguideId?: string;
    party: string;
    state: string;
  };
  rankingMember?: {
    name: string;
    bioguideId?: string;
    party: string;
    state: string;
  };
  subcommittees?: Array<{
    code: string;
    name: string;
  }>;
}

interface CommitteeData {
  houseCommittees: Committee[];
  senateCommittees: Committee[];
  jointCommittees: Committee[];
  statistics: {
    totalCommittees: number;
    totalSubcommittees: number;
    houseCount: number;
    senateCount: number;
    jointCount: number;
  };
  metadata: {
    lastUpdated: string;
    dataSource: string;
    congress: string;
  };
}

// Fetch committees data
async function getCommitteesData(): Promise<CommitteeData | null> {
  try {
    const baseUrl = getServerBaseUrl();
    const response = await fetch(`${baseUrl}/api/committees`, {
      next: { revalidate: 86400 }, // Revalidate every 24 hours
    });

    if (!response.ok) {
      return null;
    }

    const data: CommitteeData = await response.json();
    return data;
  } catch {
    return null;
  }
}

// Loading skeleton
function CommitteesLoading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-12">
          <div className="h-10 w-64 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="h-6 w-96 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white border-2 border-black p-6">
              <div className="h-12 w-12 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Committees skeleton */}
        <div className="space-y-8">
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4"></div>
              <div className="grid gap-4">
                {[1, 2, 3].map(j => (
                  <div key={j} className="border-2 border-gray-200 p-6">
                    <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Committee card component
function CommitteeCard({ committee }: { committee: Committee }) {
  return (
    <Link
      href={`/committee/${committee.code}`}
      className="block bg-white border-2 border-black p-6 hover:bg-gray-50 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {committee.name}
        </h3>
        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-700 uppercase tracking-wide">
          {committee.type}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{committee.jurisdiction}</p>

      <div className="flex flex-wrap gap-4 text-sm">
        {committee.chair && (
          <div>
            <span className="text-gray-500">Chair:</span>{' '}
            <span className="font-medium text-gray-900">
              {committee.chair.name} ({committee.chair.party}-{committee.chair.state})
            </span>
          </div>
        )}
        {committee.subcommittees && committee.subcommittees.length > 0 && (
          <div className="text-gray-500">
            {committee.subcommittees.length} subcommittee
            {committee.subcommittees.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </Link>
  );
}

// Chamber section component
function ChamberSection({
  title,
  committees,
  icon: Icon,
  color,
}: {
  title: string;
  committees: Committee[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <section className="mb-12">
      <div className="flex items-center mb-6">
        <div className={`${color} p-3 mr-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">{committees.length} committees</p>
        </div>
      </div>

      <div className="grid gap-4">
        {committees.map(committee => (
          <CommitteeCard key={committee.code} committee={committee} />
        ))}
      </div>
    </section>
  );
}

// Main content component
async function CommitteesContent() {
  const data = await getCommitteesData();

  if (!data) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white border-2 border-black p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Unable to Load Committees</h1>
            <p className="text-gray-600">
              Sorry, we could not load committee data at this time. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Congressional Committees</h1>
          <p className="text-xl text-gray-600 mb-2">
            Explore all committees in the {data.metadata.congress}
          </p>
          <p className="text-sm text-gray-500">
            Data from {data.metadata.dataSource} • Last updated:{' '}
            {new Date(data.metadata.lastUpdated).toLocaleDateString()}
          </p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border-2 border-black p-6">
            <Building2 className="w-12 h-12 text-blue-600 mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {data.statistics.houseCount}
            </div>
            <div className="text-sm text-gray-600">House Committees</div>
          </div>

          <div className="bg-white border-2 border-black p-6">
            <Scale className="w-12 h-12 text-green-600 mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {data.statistics.senateCount}
            </div>
            <div className="text-sm text-gray-600">Senate Committees</div>
          </div>

          <div className="bg-white border-2 border-black p-6">
            <Users className="w-12 h-12 text-purple-600 mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {data.statistics.jointCount}
            </div>
            <div className="text-sm text-gray-600">Joint Committees</div>
          </div>
        </div>

        {/* House Committees */}
        {data.houseCommittees.length > 0 && (
          <ChamberSection
            title="House Committees"
            committees={data.houseCommittees}
            icon={Building2}
            color="bg-blue-600"
          />
        )}

        {/* Senate Committees */}
        {data.senateCommittees.length > 0 && (
          <ChamberSection
            title="Senate Committees"
            committees={data.senateCommittees}
            icon={Scale}
            color="bg-green-600"
          />
        )}

        {/* Joint Committees */}
        {data.jointCommittees.length > 0 && (
          <ChamberSection
            title="Joint Committees"
            committees={data.jointCommittees}
            icon={Users}
            color="bg-purple-600"
          />
        )}

        {/* Info Box */}
        <div className="bg-gray-50 border-2 border-gray-200 p-6 mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            About Congressional Committees
          </h3>
          <p className="text-gray-700 leading-relaxed mb-4">
            Congressional committees are specialized groups of members who review legislation,
            conduct oversight, and hold hearings on specific policy areas. Standing committees are
            permanent and focus on particular jurisdictions, while select and special committees are
            temporary and address specific issues.
          </p>
          <p className="text-sm text-gray-600">
            Click on any committee to view detailed information including members, subcommittees,
            and recent activity.
          </p>
        </div>
      </div>
    </div>
  );
}

// Main page component
export default async function CommitteesPage() {
  return (
    <Suspense fallback={<CommitteesLoading />}>
      <CommitteesContent />
    </Suspense>
  );
}

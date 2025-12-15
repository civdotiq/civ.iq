/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { Users, Building2, Scale } from 'lucide-react';
import committeeBiographies from '@/data/committee-biographies.json';

// Fully static page - no revalidation needed
export const dynamic = 'force-static';

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
  type: 'standing';
  jurisdiction: string;
}

// Transform static data to committee format
function getCommitteesFromStaticData(): {
  houseCommittees: Committee[];
  senateCommittees: Committee[];
  jointCommittees: Committee[];
} {
  const houseCommittees: Committee[] = [];
  const senateCommittees: Committee[] = [];
  const jointCommittees: Committee[] = [];

  for (const [code, data] of Object.entries(committeeBiographies.biographies)) {
    const bio = data as {
      committeeName: string;
      chamber: string;
      jurisdiction?: string;
      wikipedia?: { extract?: string };
    };

    // Extract jurisdiction from Wikipedia extract or use stored jurisdiction
    let jurisdiction = bio.jurisdiction || '';
    if (!jurisdiction && bio.wikipedia?.extract) {
      // Use first sentence of Wikipedia extract as jurisdiction
      const firstSentence = bio.wikipedia.extract.split('.')[0];
      if (firstSentence && firstSentence.length < 300) {
        jurisdiction = firstSentence + '.';
      } else {
        jurisdiction = 'Congressional committee with legislative oversight responsibilities.';
      }
    }

    const committee: Committee = {
      code,
      name: bio.committeeName,
      chamber: bio.chamber as 'House' | 'Senate' | 'Joint',
      type: 'standing',
      jurisdiction,
    };

    if (bio.chamber === 'House') {
      houseCommittees.push(committee);
    } else if (bio.chamber === 'Senate') {
      senateCommittees.push(committee);
    } else {
      jointCommittees.push(committee);
    }
  }

  // Sort alphabetically by name
  houseCommittees.sort((a, b) => a.name.localeCompare(b.name));
  senateCommittees.sort((a, b) => a.name.localeCompare(b.name));
  jointCommittees.sort((a, b) => a.name.localeCompare(b.name));

  return { houseCommittees, senateCommittees, jointCommittees };
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

      <p className="text-sm text-gray-600 line-clamp-2">{committee.jurisdiction}</p>
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

// Main page component - fully static
export default function CommitteesPage() {
  const { houseCommittees, senateCommittees, jointCommittees } = getCommitteesFromStaticData();
  const totalCommittees = houseCommittees.length + senateCommittees.length + jointCommittees.length;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Congressional Committees</h1>
          <p className="text-xl text-gray-600 mb-2">
            Explore all {totalCommittees} committees in the 119th Congress
          </p>
          <p className="text-sm text-gray-500">Data from Congress.gov and Wikipedia</p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border-2 border-black p-6">
            <Building2 className="w-12 h-12 text-blue-600 mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{houseCommittees.length}</div>
            <div className="text-sm text-gray-600">House Committees</div>
          </div>

          <div className="bg-white border-2 border-black p-6">
            <Scale className="w-12 h-12 text-green-600 mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{senateCommittees.length}</div>
            <div className="text-sm text-gray-600">Senate Committees</div>
          </div>

          <div className="bg-white border-2 border-black p-6">
            <Users className="w-12 h-12 text-[#3ea2d4] mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{jointCommittees.length}</div>
            <div className="text-sm text-gray-600">Joint Committees</div>
          </div>
        </div>

        {/* House Committees */}
        {houseCommittees.length > 0 && (
          <ChamberSection
            title="House Committees"
            committees={houseCommittees}
            icon={Building2}
            color="bg-blue-600"
          />
        )}

        {/* Senate Committees */}
        {senateCommittees.length > 0 && (
          <ChamberSection
            title="Senate Committees"
            committees={senateCommittees}
            icon={Scale}
            color="bg-green-600"
          />
        )}

        {/* Joint Committees */}
        {jointCommittees.length > 0 && (
          <ChamberSection
            title="Joint Committees"
            committees={jointCommittees}
            icon={Users}
            color="bg-[#3ea2d4]"
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
// Build: 1765830236

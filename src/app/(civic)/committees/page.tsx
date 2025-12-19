/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { Users, Building2, Scale, ChevronDown } from 'lucide-react';
import committeesData from '@/data/committees-with-subcommittees.json';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

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

interface Subcommittee {
  code: string;
  name: string;
}

interface Committee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  type: 'standing';
  jurisdiction: string;
  subcommittees: Subcommittee[];
}

// Transform static data to committee format
function getCommitteesFromStaticData(): {
  houseCommittees: Committee[];
  senateCommittees: Committee[];
  jointCommittees: Committee[];
  totalSubcommittees: number;
} {
  const houseCommittees: Committee[] = [];
  const senateCommittees: Committee[] = [];
  const jointCommittees: Committee[] = [];
  let totalSubcommittees = 0;

  for (const [code, data] of Object.entries(committeesData.committees)) {
    const bio = data as {
      committeeName: string;
      chamber: string;
      jurisdiction?: string;
      wikipedia?: { extract?: string };
      subcommittees?: Subcommittee[];
    };

    // Extract jurisdiction from Wikipedia extract or use stored jurisdiction
    let jurisdiction = bio.jurisdiction || '';
    if (!jurisdiction && bio.wikipedia?.extract) {
      const firstSentence = bio.wikipedia.extract.split('.')[0];
      if (firstSentence && firstSentence.length < 300) {
        jurisdiction = firstSentence + '.';
      } else {
        jurisdiction = 'Congressional committee with legislative oversight responsibilities.';
      }
    }

    const subcommittees = bio.subcommittees || [];
    totalSubcommittees += subcommittees.length;

    const committee: Committee = {
      code,
      name: bio.committeeName,
      chamber: bio.chamber as 'House' | 'Senate' | 'Joint',
      type: 'standing',
      jurisdiction,
      subcommittees,
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

  return { houseCommittees, senateCommittees, jointCommittees, totalSubcommittees };
}

// Committee card component with collapsible subcommittees
function CommitteeCard({ committee }: { committee: Committee }) {
  const hasSubcommittees = committee.subcommittees.length > 0;

  return (
    <div className="bg-white border-2 border-black">
      <Link
        href={`/committee/${committee.code}`}
        className="block p-6 hover:bg-gray-50 transition-colors group"
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

      {hasSubcommittees && (
        <details className="border-t-2 border-gray-200">
          <summary className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 select-none">
            <span>{committee.subcommittees.length} Subcommittees</span>
            <ChevronDown className="w-4 h-4 transition-transform details-chevron" />
          </summary>
          <ul className="px-6 pb-4 space-y-1">
            {committee.subcommittees.map(sub => (
              <li key={sub.code} className="text-sm pl-4 border-l-2 border-gray-200">
                <Link
                  href={`/committee/${sub.code}`}
                  className="text-gray-600 hover:text-blue-600 hover:underline transition-colors"
                >
                  {sub.name}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

// Chamber section component
function ChamberSection({
  id,
  title,
  committees,
  icon: Icon,
  color,
}: {
  id: string;
  title: string;
  committees: Committee[];
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  const totalSubs = committees.reduce((sum, c) => sum + c.subcommittees.length, 0);

  return (
    <section id={id} className="mb-12 scroll-mt-8">
      <div className="flex items-center mb-6">
        <div className={`${color} p-3 mr-4`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">
            {committees.length} committees &middot; {totalSubs} subcommittees
          </p>
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
  const { houseCommittees, senateCommittees, jointCommittees, totalSubcommittees } =
    getCommitteesFromStaticData();
  const totalCommittees = houseCommittees.length + senateCommittees.length + jointCommittees.length;

  return (
    <div className="min-h-screen bg-white">
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Committees', url: 'https://civdotiq.org/committees' },
        ]}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Committees</span>
        </nav>

        {/* Page Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Congressional Committees</h1>
          <p className="text-xl text-gray-600 mb-2">
            Explore all {totalCommittees} committees and {totalSubcommittees} subcommittees in the
            119th Congress
          </p>
          <p className="text-sm text-gray-500">Data from Congress.gov and Wikipedia</p>
        </div>

        {/* Statistics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Link
            href="#house"
            className="bg-white border-2 border-black p-6 hover:bg-gray-50 hover:border-blue-600 transition-colors group"
          >
            <Building2 className="w-12 h-12 text-blue-600 mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{houseCommittees.length}</div>
            <div className="text-sm text-gray-600 group-hover:text-blue-600">House Committees</div>
          </Link>

          <Link
            href="#senate"
            className="bg-white border-2 border-black p-6 hover:bg-gray-50 hover:border-green-600 transition-colors group"
          >
            <Scale className="w-12 h-12 text-green-600 mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{senateCommittees.length}</div>
            <div className="text-sm text-gray-600 group-hover:text-green-600">
              Senate Committees
            </div>
          </Link>

          <Link
            href="#joint"
            className="bg-white border-2 border-black p-6 hover:bg-gray-50 hover:border-[#3ea2d4] transition-colors group"
          >
            <Users className="w-12 h-12 text-[#3ea2d4] mb-4" />
            <div className="text-3xl font-bold text-gray-900 mb-1">{jointCommittees.length}</div>
            <div className="text-sm text-gray-600 group-hover:text-[#3ea2d4]">Joint Committees</div>
          </Link>
        </div>

        {/* House Committees */}
        {houseCommittees.length > 0 && (
          <ChamberSection
            id="house"
            title="House Committees"
            committees={houseCommittees}
            icon={Building2}
            color="bg-blue-600"
          />
        )}

        {/* Senate Committees */}
        {senateCommittees.length > 0 && (
          <ChamberSection
            id="senate"
            title="Senate Committees"
            committees={senateCommittees}
            icon={Scale}
            color="bg-green-600"
          />
        )}

        {/* Joint Committees */}
        {jointCommittees.length > 0 && (
          <ChamberSection
            id="joint"
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
            and recent activity. Expand each committee to see its subcommittees.
          </p>
        </div>
      </div>
    </div>
  );
}

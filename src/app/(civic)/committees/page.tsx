/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { Metadata } from 'next';
import { Users, Building2, Scale } from 'lucide-react';
import committeesData from '@/data/committees-with-subcommittees.json';
import { BreadcrumbSchema, ItemListSchema, CollectionPageSchema } from '@/components/seo/JsonLd';
import CommitteeFilter from './CommitteeFilter';

// Fully static page - no revalidation needed
export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'Congressional Committees',
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
      <CollectionPageSchema
        name="Congressional Committees"
        description="All House, Senate, and Joint committees in the U.S. Congress with jurisdictions and subcommittees."
        url="https://civdotiq.org/committees"
      />
      <ItemListSchema
        name="Congressional Committees"
        url="https://civdotiq.org/committees"
        items={[...houseCommittees, ...senateCommittees, ...jointCommittees].map(c => ({
          name: c.name,
          url: `https://civdotiq.org/committee/${c.code}`,
        }))}
        itemType="GovernmentOrganization"
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

        <CommitteeFilter
          committees={[...houseCommittees, ...senateCommittees, ...jointCommittees]}
        />

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

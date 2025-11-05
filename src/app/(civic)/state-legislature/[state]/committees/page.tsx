/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { StateCommitteeCard } from '@/features/state-legislature/components/StateCommitteeCard';
import { getChamberName } from '@/types/state-legislature';
import type { StateCommitteesApiResponse } from '@/types/state-legislature';
import { Building2, Users } from 'lucide-react';

interface PageProps {
  params: Promise<{
    state: string;
  }>;
  searchParams: Promise<{
    chamber?: 'upper' | 'lower';
  }>;
}

// Fetch committees
async function getCommittees(
  state: string,
  chamber?: 'upper' | 'lower'
): Promise<StateCommitteesApiResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const chamberParam = chamber ? `?chamber=${chamber}` : '';

  try {
    const response = await fetch(
      `${baseUrl}/api/state-legislature/${state}/committees${chamberParam}`,
      {
        next: { revalidate: 86400 }, // 24 hours
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch committees: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch {
    return null;
  }
}

// Generate metadata
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { state } = await params;
  const { chamber } = await searchParams;
  const chamberName = chamber ? getChamberName(state, chamber) : 'Legislature';

  return {
    title: `${state.toUpperCase()} ${chamberName} Committees | CIV.IQ`,
    description: `Browse committees in the ${state.toUpperCase()} state ${chamberName.toLowerCase()}. View committee leadership, membership rosters, and jurisdiction information.`,
    openGraph: {
      title: `${state.toUpperCase()} ${chamberName} Committees`,
      description: `Explore state legislative committees with full membership rosters and leadership information`,
      type: 'website',
    },
  };
}

export default async function StateCommitteesPage({ params, searchParams }: PageProps) {
  const { state } = await params;
  const { chamber: searchChamber } = await searchParams;
  const data = await getCommittees(state, searchChamber);

  if (!data || !data.success) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-2 border-red-500 p-6 text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-2">Error Loading Committees</h1>
          <p className="text-red-700">
            {data?.error || 'Failed to load committee data. Please try again later.'}
          </p>
        </div>
      </main>
    );
  }

  const { committees, total, chamber } = data;
  const chamberName = chamber ? getChamberName(state, chamber) : 'Legislature';

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center gap-2 text-gray-600">
          <li>
            <Link href="/" className="hover:text-civiq-blue">
              Home
            </Link>
          </li>
          <li>/</li>
          <li>
            <Link href={`/state-legislature/${state}`} className="hover:text-civiq-blue">
              {state.toUpperCase()} Legislature
            </Link>
          </li>
          <li>/</li>
          <li className="font-semibold text-gray-900">Committees</li>
        </ol>
      </nav>

      {/* Header */}
      <div className="bg-white border-2 border-black mb-6">
        <div className="p-6 md:p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-civiq-blue/10 border-2 border-civiq-blue flex items-center justify-center">
                <Building2 className="w-8 h-8 text-civiq-blue" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                {state.toUpperCase()} {chamberName} Committees
              </h1>
              <p className="text-gray-600">
                Browse {total} committees with full membership rosters and leadership information
              </p>
            </div>
          </div>

          {/* Chamber Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-bold text-gray-700">FILTER BY CHAMBER:</span>
            <div className="flex gap-2">
              <Link
                href={`/state-legislature/${state}/committees`}
                className={`px-4 py-2 border-2 font-bold text-sm transition-colors ${
                  !chamber
                    ? 'bg-civiq-blue text-white border-civiq-blue'
                    : 'bg-white text-gray-700 border-black hover:border-civiq-blue'
                }`}
              >
                ALL
              </Link>
              <Link
                href={`/state-legislature/${state}/committees?chamber=upper`}
                className={`px-4 py-2 border-2 font-bold text-sm transition-colors ${
                  chamber === 'upper'
                    ? 'bg-civiq-blue text-white border-civiq-blue'
                    : 'bg-white text-gray-700 border-black hover:border-civiq-blue'
                }`}
              >
                {getChamberName(state, 'upper').toUpperCase()}
              </Link>
              <Link
                href={`/state-legislature/${state}/committees?chamber=lower`}
                className={`px-4 py-2 border-2 font-bold text-sm transition-colors ${
                  chamber === 'lower'
                    ? 'bg-civiq-blue text-white border-civiq-blue'
                    : 'bg-white text-gray-700 border-black hover:border-civiq-blue'
                }`}
              >
                {getChamberName(state, 'lower').toUpperCase()}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Committee List */}
      {committees.length > 0 ? (
        <div className="space-y-4">
          {committees.map(committee => (
            <StateCommitteeCard key={committee.id} committee={committee} state={state} />
          ))}
        </div>
      ) : (
        <div className="bg-white border-2 border-black p-8 text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">No Committees Found</h2>
          <p className="text-gray-600">
            No committees found for the selected chamber. Try a different filter.
          </p>
        </div>
      )}
    </main>
  );
}

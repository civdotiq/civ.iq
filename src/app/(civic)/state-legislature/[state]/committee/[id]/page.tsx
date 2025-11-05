/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StateCommitteeProfile } from '@/features/state-legislature/components/StateCommitteeProfile';
import type { StateCommittee } from '@/types/state-legislature';

interface PageProps {
  params: Promise<{
    state: string;
    id: string;
  }>;
}

// Fetch committee data
async function getCommittee(state: string, id: string): Promise<StateCommittee | null> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/state-legislature/${state}/committee/${id}`, {
      next: { revalidate: 86400 }, // 24 hours
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch committee: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.committee : null;
  } catch {
    return null;
  }
}

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, id } = await params;
  const committee = await getCommittee(state, id);

  if (!committee) {
    return {
      title: 'Committee Not Found',
      description: 'The requested committee could not be found.',
    };
  }

  return {
    title: `${committee.name} | ${state.toUpperCase()} Legislature`,
    description: `View committee membership, leadership, and information for ${committee.name} in the ${state.toUpperCase()} state legislature. See full roster, party composition, and more.`,
    openGraph: {
      title: committee.name,
      description: `${state.toUpperCase()} state legislative committee with ${committee.members?.length || 0} members`,
      type: 'website',
    },
  };
}

export default async function StateCommitteePage({ params }: PageProps) {
  const { state, id } = await params;
  const committee = await getCommittee(state, id);

  if (!committee) {
    notFound();
  }

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
          <li>
            <Link href={`/state-legislature/${state}/committees`} className="hover:text-civiq-blue">
              Committees
            </Link>
          </li>
          <li>/</li>
          <li className="font-semibold text-gray-900">{committee.name}</li>
        </ol>
      </nav>

      <StateCommitteeProfile committee={committee} state={state} />
    </main>
  );
}

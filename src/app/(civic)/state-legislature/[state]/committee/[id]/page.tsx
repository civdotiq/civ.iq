/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StateCommitteeProfile } from '@/features/state-legislature/components/StateCommitteeProfile';
import type { StateCommittee, StateParty } from '@/types/state-legislature';
import { openStatesAPI } from '@/lib/openstates-api';
import { decodeBase64Url } from '@/lib/url-encoding';
import { getStateName } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';
import { GovernmentOrganizationSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

interface PageProps {
  params: Promise<{
    state: string;
    id: string;
  }>;
}

// Fetch committee data directly from service layer (no HTTP calls during SSR)
async function getCommittee(state: string, base64Id: string): Promise<StateCommittee | null> {
  try {
    // Decode Base64 ID to get OCD committee ID
    const committeeId = decodeBase64Url(base64Id);

    logger.info('[StateCommitteePage] Fetching committee', { state, committeeId });

    // Get committee from OpenStates API (pass state for faster lookup)
    const committee = await openStatesAPI.getCommitteeById(committeeId, true, state);

    if (!committee) {
      logger.warn('[StateCommitteePage] Committee not found', { state, committeeId });
      return null;
    }

    // Helper to normalize party string to StateParty
    const normalizeParty = (party: string | null | undefined): StateParty | undefined => {
      if (!party) return undefined;
      if (party === 'Democratic' || party === 'Democrat') return 'Democratic';
      if (party === 'Republican') return 'Republican';
      if (party === 'Independent') return 'Independent';
      if (party === 'Green') return 'Green';
      if (party === 'Libertarian') return 'Libertarian';
      return 'Other';
    };

    // Transform to StateCommittee interface
    const transformedCommittee: StateCommittee = {
      id: committee.id,
      name: committee.name,
      chamber: committee.chamber as 'upper' | 'lower',
      state: state.toUpperCase(),
      classification: committee.classification === 'committee' ? ('standing' as const) : undefined,
      members: committee.memberships?.map(m => ({
        legislator_id: m.person_id || '',
        legislator_name: m.person_name,
        role: m.role as 'Chair' | 'Vice Chair' | 'Ranking Member' | 'Member',
        party: normalizeParty(m.person?.party),
      })),
      website: committee.links?.[0]?.url,
      sources: committee.sources?.map(s => ({
        url: s.url,
        note: s.note || undefined,
      })),
      parent_id: committee.parent_id || undefined,
    };

    logger.info('[StateCommitteePage] Successfully fetched committee', {
      state,
      committeeId,
      name: transformedCommittee.name,
      memberCount: transformedCommittee.members?.length || 0,
    });

    return transformedCommittee;
  } catch (error) {
    logger.error('[StateCommitteePage] Failed to fetch committee', error as Error, {
      state,
      base64Id,
    });
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

  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Structured Data for SEO */}
      <GovernmentOrganizationSchema
        name={committee.name}
        description={`${committee.chamber === 'upper' ? 'Senate' : 'House'} committee in the ${stateName} state legislature`}
        url={`https://civdotiq.org/state-legislature/${state}/committee/${id}`}
        parentOrganization={`${stateName} State Legislature`}
        member={committee.members?.map(m => ({
          name: m.legislator_name,
          role: m.role,
        }))}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: stateName, url: `https://civdotiq.org/state-legislature/${state}` },
          { name: 'Committees', url: `https://civdotiq.org/state-legislature/${state}/committees` },
          {
            name: committee.name,
            url: `https://civdotiq.org/state-legislature/${state}/committee/${id}`,
          },
        ]}
      />

      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/" className="hover:text-blue-600">
          Home
        </Link>
        <span className="mx-2">›</span>
        <Link href="/states" className="hover:text-blue-600">
          States
        </Link>
        <span className="mx-2">›</span>
        <Link href={`/state-legislature/${state}`} className="hover:text-blue-600">
          {state.toUpperCase()} Legislature
        </Link>
        <span className="mx-2">›</span>
        <Link href={`/state-legislature/${state}/committees`} className="hover:text-blue-600">
          Committees
        </Link>
        <span className="mx-2">›</span>
        <span className="font-medium text-gray-900">{committee.name}</span>
      </nav>

      <StateCommitteeProfile committee={committee} state={state} />
    </main>
  );
}

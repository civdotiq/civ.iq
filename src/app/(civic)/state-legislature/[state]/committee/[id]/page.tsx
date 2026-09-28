/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { StateCommitteeProfile } from '@/features/state-legislature/components/StateCommitteeProfile';
import { lookupStateCommittee } from '@/lib/state-committee-lookup';
import { getStateName } from '@/lib/data/us-states';
import { GovernmentOrganizationSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';

interface PageProps {
  params: Promise<{
    state: string;
    id: string;
  }>;
}

// One lookup per request, shared by generateMetadata and the page, so an
// upstream failure is not retried twice per render.
const getCommittee = cache(lookupStateCommittee);

// Generate metadata
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, id } = await params;
  const result = await getCommittee(state, id);

  if (result.status === 'unavailable') {
    return {
      title: `Committee data unavailable | ${state.toUpperCase()} Legislature`,
      robots: { index: false },
    };
  }
  if (result.status === 'not_found') {
    return {
      title: 'Committee Not Found',
      description: 'The requested committee could not be found.',
    };
  }
  const { committee } = result;

  return {
    title: `${committee.name} | ${state.toUpperCase()} Legislature`,
    alternates: {
      canonical: `https://civdotiq.org/state-legislature/${state.toLowerCase()}/committee/${id}`,
    },
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
  const result = await getCommittee(state, id);

  if (result.status === 'not_found') {
    notFound();
  }

  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();

  if (result.status === 'unavailable') {
    return (
      <main className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'States', href: '/states' },
            { label: `${state.toUpperCase()} Legislature`, href: `/state-legislature/${state}` },
            { label: 'Committees', href: `/state-legislature/${state}/committees` },
          ]}
          className="mb-6"
        />
        <div className="bg-white border-2 border-black border-l-4 border-l-amber-600 p-6">
          <h1 className="text-2xl font-bold mb-2">Committee data temporarily unavailable</h1>
          <p className="text-gray-700">
            We could not reach Open States, the source for {stateName} committee rosters, so this
            committee&apos;s details cannot be shown right now. Please try again later.
          </p>
        </div>
      </main>
    );
  }

  const { committee } = result;

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
          { name: 'States', url: 'https://civdotiq.org/states' },
          {
            name: `${stateName} Legislature`,
            url: `https://civdotiq.org/state-legislature/${state}`,
          },
          { name: 'Committees', url: `https://civdotiq.org/state-legislature/${state}/committees` },
          {
            name: committee.name,
            url: `https://civdotiq.org/state-legislature/${state}/committee/${id}`,
          },
        ]}
      />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'States', href: '/states' },
          { label: `${state.toUpperCase()} Legislature`, href: `/state-legislature/${state}` },
          { label: 'Committees', href: `/state-legislature/${state}/committees` },
          { label: committee.name, href: `/state-legislature/${state}/committee/${id}` },
        ]}
        className="mb-6"
      />

      <StateCommitteeProfile committee={committee} state={state} />
    </main>
  );
}

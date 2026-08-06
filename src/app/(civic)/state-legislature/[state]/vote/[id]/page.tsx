/**
 * State Vote Detail Page
 * Displays comprehensive information about a legislative vote
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import { getStateName } from '@/lib/data/us-states';
import { StateVoteDetailView } from '@/features/state-legislature/components/StateVoteDetailView';
import { LegislativeEventSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';

interface PageProps {
  params: Promise<{
    state: string;
    id: string;
  }>;
  /**
   * `bill` carries the Base64 id of the bill the vote belongs to. OpenStates
   * has no vote-by-id endpoint, so a roll call is only reachable through its
   * bill and a vote id on its own is not enough to render this page.
   */
  searchParams?: Promise<{ bill?: string }>;
}

/**
 * Fetch vote data directly from core service
 */
async function getVote(state: string, base64Id: string, base64BillId?: string) {
  try {
    if (!base64BillId) {
      logger.warn(`[StateVotePage] No bill id supplied for vote: ${state}/${base64Id}`);
      return null;
    }

    // Decode Base64 ID to get vote event ID
    const voteId = decodeBase64Url(base64Id);
    const billId = decodeBase64Url(base64BillId);

    logger.info(`[StateVotePage] Fetching vote: ${state}/${voteId} on bill ${billId}`);

    // Call core service directly (no HTTP overhead)
    const vote = await StateLegislatureCoreService.getStateVoteById(state, voteId, billId);

    if (vote) {
      logger.info(`[StateVotePage] Successfully fetched vote: ${vote.motion_text}`);
    } else {
      logger.warn(`[StateVotePage] Vote not found: ${state}/${voteId}`);
    }

    return vote;
  } catch (error) {
    logger.error(`[StateVotePage] Error fetching vote:`, error);
    return null;
  }
}

/**
 * Generate metadata for SEO
 */
export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const { state, id } = await params;
  const vote = await getVote(state, id, (await searchParams)?.bill);

  if (!vote) {
    return {
      title: 'Vote Not Found',
    };
  }

  const title = `${vote.motion_text.substring(0, 60)} - ${state.toUpperCase()} Vote`;
  const description = `Vote on ${vote.motion_text} in the ${state.toUpperCase()} ${vote.organization_name}. Result: ${vote.result}`;

  return {
    title,
    description,
    alternates: {
      // The bill stays on the canonical URL: without it the page cannot be
      // rendered, so a URL that drops it is not the same page.
      canonical: `https://civdotiq.org/state-legislature/${state.toLowerCase()}/vote/${id}?bill=${(await searchParams)?.bill ?? ''}`,
    },
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

/**
 * State Vote Detail Page Component
 */
export default async function StateVotePage({ params, searchParams }: PageProps) {
  const { state, id } = await params;
  const billParam = (await searchParams)?.bill;
  const vote = await getVote(state, id, billParam);

  if (!vote) {
    notFound();
  }

  const motionLabel =
    vote.motion_text.substring(0, 50) + (vote.motion_text.length > 50 ? '...' : '');
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();
  const yesCount = vote.counts.find(c => c.option === 'yes')?.value ?? 0;
  const noCount = vote.counts.find(c => c.option === 'no')?.value ?? 0;
  // Self-references keep the bill: the page does not resolve without it.
  const votePath = `/state-legislature/${state}/vote/${id}?bill=${billParam ?? ''}`;
  const voteUrl = `https://civdotiq.org${votePath}`;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Structured Data for SEO */}
      <LegislativeEventSchema
        name={`${vote.organization_name}: ${vote.motion_text}`}
        description={`${vote.motion_text} — Result: ${vote.result}. Yes: ${yesCount}, No: ${noCount}.`}
        startDate={vote.start_date}
        organizer={vote.organization_name}
        location={`${stateName} State Capitol`}
        url={voteUrl}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'States', url: 'https://civdotiq.org/states' },
          { name: stateName, url: `https://civdotiq.org/state-legislature/${state}` },
          { name: motionLabel, url: voteUrl },
        ]}
      />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'States', href: '/states' },
          { label: state.toUpperCase(), href: `/state-legislature/${state}` },
          { label: motionLabel, href: votePath },
        ]}
        className="mb-6"
      />

      <StateVoteDetailView vote={vote} state={state} />
    </div>
  );
}

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
}

/**
 * Fetch vote data directly from core service
 */
async function getVote(state: string, base64Id: string) {
  try {
    // Decode Base64 ID to get vote event ID
    const voteId = decodeBase64Url(base64Id);

    logger.info(`[StateVotePage] Fetching vote: ${state}/${voteId}`);

    // Call core service directly (no HTTP overhead)
    const vote = await StateLegislatureCoreService.getStateVoteById(state, voteId);

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
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state, id } = await params;
  const vote = await getVote(state, id);

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
export default async function StateVotePage({ params }: PageProps) {
  const { state, id } = await params;
  const vote = await getVote(state, id);

  if (!vote) {
    notFound();
  }

  const motionLabel =
    vote.motion_text.substring(0, 50) + (vote.motion_text.length > 50 ? '...' : '');
  const stateName = getStateName(state.toUpperCase()) || state.toUpperCase();
  const yesCount = vote.counts.find(c => c.option === 'yes')?.value ?? 0;
  const noCount = vote.counts.find(c => c.option === 'no')?.value ?? 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Structured Data for SEO */}
      <LegislativeEventSchema
        name={`${vote.organization_name}: ${vote.motion_text}`}
        description={`${vote.motion_text} — Result: ${vote.result}. Yes: ${yesCount}, No: ${noCount}.`}
        startDate={vote.start_date}
        organizer={vote.organization_name}
        location={`${stateName} State Capitol`}
        url={`https://civdotiq.org/state-legislature/${state}/vote/${id}`}
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'States', url: 'https://civdotiq.org/states' },
          { name: stateName, url: `https://civdotiq.org/state-legislature/${state}` },
          { name: motionLabel, url: `https://civdotiq.org/state-legislature/${state}/vote/${id}` },
        ]}
      />

      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'States', href: '/states' },
          { label: state.toUpperCase(), href: `/state-legislature/${state}` },
          { label: motionLabel, href: `/state-legislature/${state}/vote/${id}` },
        ]}
        className="mb-6"
      />

      <StateVoteDetailView vote={vote} state={state} />
    </div>
  );
}

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
import { BreadcrumbsWithContext } from '@/components/shared/navigation/BreadcrumbsWithContext';
import { StateVoteDetailView } from '@/features/state-legislature/components/StateVoteDetailView';

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

  // Create breadcrumb items
  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'State Legislature', href: '/state-legislature' },
    {
      label: state.toUpperCase(),
      href: `/state-legislature/${state}`,
    },
    {
      label: vote.motion_text.substring(0, 50) + (vote.motion_text.length > 50 ? '...' : ''),
      href: '',
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <BreadcrumbsWithContext items={breadcrumbItems} className="mb-6" />

      <StateVoteDetailView vote={vote} state={state} />
    </div>
  );
}

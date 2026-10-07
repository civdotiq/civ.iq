/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Detailed Vote Analysis Page (route shell)
 *
 * Branches between the legacy vote detail UI and the redesigned RollCallDetail
 * (PR 10) on the `?v=new` flag. The redesign-aware data layer reuses the same
 * `vote.service` so federal House + Senate roll calls share one ingestion path.
 */

import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import logger from '@/lib/logging/simple-logger';
import { lookupVote, type VoteLookup } from '@/lib/services/vote.service';
import { LegacyVoteDetailPage } from '@/components/votes/LegacyVoteDetail';
import { RollCallDetail, loadRollCallDetailData } from '@/components/votes/RollCallDetail';

interface VoteDetailPageProps {
  params: Promise<{ voteId: string }>;
  searchParams: Promise<{ from?: string; name?: string; v?: string }>;
}

/**
 * One lookup per request, shared by generateMetadata and the page. Only a
 * proven miss (not_found) 404s; an upstream failure renders the page, which
 * shows its own "couldn't load" state.
 */
const getVoteLookup = cache(async (voteId: string): Promise<VoteLookup> => {
  try {
    return await lookupVote(voteId);
  } catch (error) {
    logger.error('Error fetching vote details', error as Error, { voteId });
    return { status: 'unavailable' };
  }
});

async function fetchVoteDetails(voteId: string) {
  const lookup = await getVoteLookup(voteId);
  return lookup.status === 'found' ? lookup.vote : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ voteId: string }>;
}): Promise<Metadata> {
  const { voteId } = await params;

  try {
    const lookup = await getVoteLookup(voteId);
    if (lookup.status === 'not_found') {
      return {
        title: 'Vote Not Found',
        description: 'The requested vote could not be found.',
      };
    }
    if (lookup.status === 'unavailable') {
      return {
        title: 'Vote Details',
        description: 'View detailed vote results including member positions and party breakdown.',
      };
    }
    const { vote } = lookup;

    const title = `${vote.chamber} Roll Call #${vote.rollNumber}: ${vote.title} — ${vote.result}`;
    const description = `The ${vote.chamber} voted ${vote.result.toLowerCase()} on ${vote.question}. Yeas: ${vote.yeas}, Nays: ${vote.nays}. View all member positions and party breakdown.`;
    const url = `https://civdotiq.org/vote/${voteId}`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url,
        type: 'article',
        siteName: 'CIV.IQ',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
      alternates: {
        canonical: url,
      },
    };
  } catch {
    return {
      title: 'Vote Details',
      description: 'View detailed vote results including member positions and party breakdown.',
    };
  }
}

export default async function VoteDetailPage({ params, searchParams }: VoteDetailPageProps) {
  const { voteId } = await params;
  const { from: fromBioguideId, name: fromRepName, v } = await searchParams;

  if ((await getVoteLookup(voteId)).status === 'not_found') notFound();

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    const data = await loadRollCallDetailData({
      voteId,
      fromBioguideId,
      fromRepName,
    });
    if (!data) {
      const empty = await fetchVoteDetails(voteId);
      return (
        <LegacyVoteDetailPage
          voteId={voteId}
          voteDetail={empty}
          fromBioguideId={fromBioguideId}
          fromRepName={fromRepName}
        />
      );
    }
    return <RollCallDetail data={data} />;
  }

  const voteDetail = await fetchVoteDetails(voteId);
  return (
    <LegacyVoteDetailPage
      voteId={voteId}
      voteDetail={voteDetail}
      fromBioguideId={fromBioguideId}
      fromRepName={fromRepName}
    />
  );
}

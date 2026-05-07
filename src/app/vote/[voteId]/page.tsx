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

import { Metadata } from 'next';
import logger from '@/lib/logging/simple-logger';
import { getVoteDetailsService, type UnifiedVoteDetail } from '@/lib/services/vote.service';
import { LegacyVoteDetailPage } from '@/components/votes/LegacyVoteDetail';
import { RollCallDetail, loadRollCallDetailData } from '@/components/votes/RollCallDetail';

interface VoteDetailPageProps {
  params: Promise<{ voteId: string }>;
  searchParams: Promise<{ from?: string; name?: string; v?: string }>;
}

async function fetchVoteDetails(voteId: string): Promise<UnifiedVoteDetail | null> {
  try {
    return (await getVoteDetailsService(voteId)) as UnifiedVoteDetail | null;
  } catch (error) {
    logger.error('Error fetching vote details', error as Error, { voteId });
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ voteId: string }>;
}): Promise<Metadata> {
  const { voteId } = await params;

  try {
    const vote = await fetchVoteDetails(voteId);
    if (!vote) {
      return {
        title: 'Vote Not Found',
        description: 'The requested vote could not be found.',
      };
    }

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

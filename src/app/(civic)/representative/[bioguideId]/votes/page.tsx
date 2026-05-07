/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';
import { ChunkLoadErrorBoundary } from '@/components/shared/common/ChunkLoadErrorBoundary';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { VotingRecordPage } from '@/components/officials/VotingRecordPage';

export const runtime = 'nodejs';
export const revalidate = 3600;

export default async function RepresentativeVotingRecordPage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  let bioguideId: string;
  try {
    const resolved = await params;
    bioguideId = resolved.bioguideId;
    if (!bioguideId || typeof bioguideId !== 'string') notFound();
  } catch {
    notFound();
  }

  const representative = await getEnhancedRepresentative(bioguideId);
  if (!representative || !representative.name) notFound();

  return (
    <ErrorBoundary>
      <ChunkLoadErrorBoundary>
        <VotingRecordPage representative={representative} />
      </ChunkLoadErrorBoundary>
    </ErrorBoundary>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}): Promise<Metadata> {
  const { bioguideId } = await params;

  try {
    const representative = await getEnhancedRepresentative(bioguideId);
    if (!representative) {
      return {
        title: `Voting record · ${bioguideId}`,
        description: `Roll-call voting record for federal official ${bioguideId}.`,
      };
    }
    const chamberLabel = representative.chamber === 'Senate' ? 'Senator' : 'Representative';
    const districtLabel = representative.district ? `, District ${representative.district}` : '';
    const title = `${representative.name} — Voting record (${representative.party}-${representative.state})`;
    const description = `Roll-call voting record for ${chamberLabel} ${representative.name} (${representative.state}${districtLabel}) in the 119th Congress. Filter by topic, year, and outcome.`;
    const url = `https://civdotiq.org/representative/${bioguideId}/votes`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        url,
        siteName: 'CIV.IQ',
        type: 'profile',
      },
      twitter: {
        card: 'summary' as const,
        title,
        description,
        site: '@civdotiq',
      },
    };
  } catch {
    return {
      title: `Voting record · ${bioguideId}`,
      description: `Roll-call voting record for federal official ${bioguideId}.`,
    };
  }
}

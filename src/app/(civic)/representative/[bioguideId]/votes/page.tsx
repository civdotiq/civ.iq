/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ErrorBoundary } from '@/components/shared/common/ErrorBoundary';
import { ChunkLoadErrorBoundary } from '@/components/shared/common/ChunkLoadErrorBoundary';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { VotingRecordPage } from '@/components/officials/VotingRecordPage';
import { SITE_OG_IMAGES } from '@/lib/social/site-og-image';
import { commonName } from '@/features/representatives/utils/common-name';

export const runtime = 'nodejs';
export const revalidate = 3600;

// Empty generateStaticParams activates on-demand ISR — without it a
// dynamic-segment route renders per-request and `revalidate` is ignored.
export async function generateStaticParams(): Promise<Array<{ bioguideId: string }>> {
  return [];
}

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
    // This page owns "[name] voting record" searches (Search Console, 2026-10):
    // the title leads with that phrase, under the name the member goes by.
    const name = commonName(representative);
    const title = `${name} voting record (119th Congress)`;
    const description = `${name}'s voting record: roll-call votes by ${chamberLabel} ${name} (${representative.party}, ${representative.state}${districtLabel}) in the 119th Congress, from ${representative.chamber === 'Senate' ? 'Senate.gov' : 'House Clerk'} records. Filter by topic, year, and outcome.`;
    const url = `https://civdotiq.org/representative/${bioguideId}/votes`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        images: SITE_OG_IMAGES,
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

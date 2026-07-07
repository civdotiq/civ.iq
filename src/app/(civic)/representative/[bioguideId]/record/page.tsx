/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Incumbent Record Card — canonical page
 *
 * The five-second layer on top of the full profile: a nutrition-label
 * document of the member's record with per-number provenance. Every row
 * links into the existing profile tabs for drill-down; this page is a
 * front door, not a replacement.
 */

import { cache } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BreadcrumbsWithContext } from '@/components/shared/navigation/BreadcrumbsWithContext';
import { RecordCardLabel } from '@/features/record-card/components/RecordCardLabel';
import { getRecordCardData } from '@/features/record-card/record-card-data';
import { getStateName } from '@/lib/data/us-states';

export const runtime = 'nodejs';
export const revalidate = 3600; // ISR: hourly, matching the profile page

// generateMetadata and the page body share one composition per request
const getData = cache(async (bioguideId: string) => {
  if (!bioguideId || !/^[A-Za-z]\d{6}$/.test(bioguideId)) notFound();
  const data = await getRecordCardData(bioguideId);
  if (!data) notFound();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}): Promise<Metadata> {
  const { bioguideId } = await params;
  const data = await getData(bioguideId);
  const { member } = data;

  const seat =
    member.chamber === 'House'
      ? `${member.state}-${(member.district ?? '').padStart(2, '0')}`
      : `${getStateName(member.state) ?? member.state} Senator`;
  const title = `${member.name} — Incumbent Record Card (${seat})`;
  const description =
    `${member.name}'s congressional record from government sources: bills, votes, ` +
    `campaign money, and district federal funding. Every number cited to ` +
    `Congress.gov, the FEC, and USASpending.`;

  return {
    title,
    description,
    alternates: { canonical: `https://civdotiq.org/representative/${member.bioguideId}/record` },
    openGraph: {
      title,
      description,
      type: 'profile',
      images: [
        {
          url: `https://civdotiq.org/api/card/${member.bioguideId}?type=record`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function RecordCardPage({
  params,
}: {
  params: Promise<{ bioguideId: string }>;
}) {
  const { bioguideId } = await params;
  const data = await getData(bioguideId);
  const { member } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[828px] px-grid-2 py-grid-3 md:px-grid-3">
        <BreadcrumbsWithContext
          items={[
            { label: 'Representatives', href: '/representatives' },
            { label: member.name, href: `/representative/${member.bioguideId}` },
            { label: 'Record card', href: `/representative/${member.bioguideId}/record` },
          ]}
        />

        <div className="mt-grid-3">
          <RecordCardLabel data={data} />
        </div>

        <p className="mt-grid-3 text-sm tracking-[0.025em] text-gray-600">
          This card is the summary.{' '}
          <Link
            href={`/representative/${member.bioguideId}`}
            className="text-civiq-blue hover:underline"
          >
            Open the full profile
          </Link>{' '}
          for the complete voting record, finance detail, and district data behind every number.
        </p>
      </div>
    </div>
  );
}

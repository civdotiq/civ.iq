/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Federal election race route — server component (PR 19, un-gated for
 * the 2026 cycle).
 *
 * Race ids are uppercase, hyphen-separated:
 *   {year}-{office}-{state|NATIONAL}[-{district}]
 *   e.g. 2026-US_SENATE-MI, 2026-US_HOUSE-PA-07, 2024-US_SENATE-OH
 *
 * Invalid ids call notFound() so crawlers get a real 404, not a styled
 * stub with a 200 (see project_loading-tsx-soft-404). 2026 ids are
 * additionally validated against the committed FEC race-skeleton corpus,
 * so made-up district numbers 404 instead of rendering an empty shell.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { ElectionPage } from '@/components/elections/ElectionPage';
import { officeLabel, parseRaceId, raceTitle } from '@/components/elections/ElectionPage/data';
import { RACES_2026 } from '@/data/elections-2026-races';
import { getStateName } from '@/lib/data/us-states';

interface PageProps {
  params: Promise<{ id: string }>;
}

const RACE_IDS_2026 = new Set(RACES_2026.map(r => r.raceId));

function isKnownRaceId(raceId: string): boolean {
  const parsed = parseRaceId(raceId);
  if (!parsed) return false;
  // The 2026 corpus is authoritative for its cycle; other years keep
  // format-level validation only (2024 pages resolve against live FEC).
  if (parsed.year === 2026) return RACE_IDS_2026.has(raceId);
  return true;
}

function humanRaceName(raceId: string): string {
  const parsed = parseRaceId(raceId);
  if (!parsed) return raceId;
  const stateName = getStateName(parsed.state) ?? parsed.state;
  if (parsed.office === 'US_HOUSE' && parsed.district) {
    return `${parsed.year} U.S. House race, ${raceTitle(parsed).split(' · ')[0]} (${stateName})`;
  }
  return `${parsed.year} ${officeLabel(parsed.office)} race in ${stateName}`;
}

export default async function ElectionRoute({ params }: PageProps) {
  const { id } = await params;
  const raceId = (id ?? '').trim().toUpperCase();

  if (!isKnownRaceId(raceId)) {
    notFound();
  }

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Elections', url: 'https://civdotiq.org/elections' },
          { name: humanRaceName(raceId), url: `https://civdotiq.org/elections/${raceId}` },
        ]}
      />
      <ElectionPage raceId={raceId} />
    </>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const raceId = (id ?? '').trim().toUpperCase();
  if (!isKnownRaceId(raceId)) {
    return {
      title: 'Race not found',
      description:
        'Federal race ids are formatted as {year}-{office}-{state} or {year}-US_HOUSE-{state}-{district}.',
    };
  }
  const title = humanRaceName(raceId);
  const description = `${title}: FEC-filed candidates, cycle fundraising totals, donor breakdown, and 2024 result where covered. Filing with the FEC is not ballot access.`;
  return {
    title,
    description,
    alternates: { canonical: `https://civdotiq.org/elections/${raceId}` },
    openGraph: {
      title,
      description,
      url: `https://civdotiq.org/elections/${raceId}`,
      siteName: 'CIV.IQ',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
      site: '@civdotiq',
    },
  };
}

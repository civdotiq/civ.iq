/**
 * Lobbying Organization Profile Page
 *
 * Displays a comprehensive profile of a lobbying organization assembled from
 * Senate LDA filings, cross-referenced with FEC data and enriched with Wikipedia.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { OpenDataStrip } from '@/components/shared/ui/OpenDataStrip';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';
import { LobbyOrgClient } from './LobbyOrgClient';
import { LobbyOrgSchema } from './LobbyOrgSchema';
import { getLobbyingOrgProfile } from '@/app/api/lobby/[registrantId]/route';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ registrantId: string }>;
}

export default async function LobbyOrgPage({ params }: PageProps) {
  const { registrantId } = await params;

  if (!registrantId || !/^\d+$/.test(registrantId)) {
    notFound();
  }

  const profile = await getLobbyingOrgProfile(registrantId);
  if (!profile) notFound();

  const pageUrl = `https://civdotiq.org/lobby/${registrantId}`;

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        <LobbyOrgSchema profile={profile} url={pageUrl} />
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: 'https://civdotiq.org' },
            { name: 'Lobbying', url: 'https://civdotiq.org/lobby' },
            { name: profile.name, url: pageUrl },
          ]}
        />

        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Lobbying', href: '/lobby' },
            { label: profile.name, href: `/lobby/${registrantId}` },
          ]}
          className="mb-6"
        />

        <LobbyOrgClient profile={profile} />

        <OpenDataStrip apiUrl={`/api/lobby/${registrantId}`} />
      </main>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  try {
    const { registrantId } = await params;
    const profile = await getLobbyingOrgProfile(registrantId);

    if (!profile) {
      return { title: `Lobbying Organization ${registrantId}` };
    }

    const spendingStr =
      profile.totalSpending >= 1_000_000
        ? `$${(profile.totalSpending / 1_000_000).toFixed(1)}M`
        : `$${(profile.totalSpending / 1_000).toFixed(0)}K`;

    const topIssues = profile.issueAreas
      .slice(0, 3)
      .map(i => i.label)
      .join(', ');

    const title = `${profile.name} — Lobbying Profile`;
    const description = `${profile.name} has filed ${profile.totalFilings} lobbying disclosure reports with the U.S. Senate, reporting ${spendingStr} in lobbying spending. Top issues: ${topIssues || 'various policy areas'}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://civdotiq.org/lobby/${registrantId}`,
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
  } catch {
    return {
      title: 'Lobbying Organization',
      description: 'View lobbying disclosures and activity from U.S. Senate filings.',
    };
  }
}

/**
 * Lobbying Organization Profile Page
 *
 * Displays a comprehensive profile of a lobbying organization assembled from
 * Senate LDA filings, cross-referenced with FEC data and enriched with Wikipedia.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { OpenDataStrip } from '@/components/shared/ui/OpenDataStrip';
import { BreadcrumbSchema, OrganizationSchema } from '@/components/seo/JsonLd';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';
import { LobbyOrgClient } from './LobbyOrgClient';
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

  const lobbySameAs: string[] = [];
  if (profile.wiki?.website) lobbySameAs.push(profile.wiki.website);
  if (profile.wiki?.wikidataId) {
    lobbySameAs.push(`https://www.wikidata.org/wiki/${profile.wiki.wikidataId}`);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        <OrganizationSchema
          name={profile.name}
          url={pageUrl}
          id={`${pageUrl}#organization`}
          logo={null}
          description={`Lobbying organization registered with the U.S. Senate. ${profile.totalFilings.toLocaleString()} filings on record.`}
          mainEntityOfPage={pageUrl}
          sameAs={lobbySameAs}
          foundingDate={profile.wiki?.foundingDate ?? undefined}
          address={profile.wiki?.headquarters ? { locality: profile.wiki.headquarters } : undefined}
          memberOf={{
            name: 'Senate Lobbying Disclosure',
            url: 'https://lda.gov',
            type: 'GovernmentOrganization',
          }}
        />
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
            { label: 'Lobbying' },
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
    // The filing count is LDA's own total, while spending sums only the
    // filings retrieved. Pairing them without qualification would attribute a
    // partial sum to the full count, so the sentence says which it covers.
    const spendingClause =
      profile.filingsRead < profile.totalFilings
        ? `, reporting ${spendingStr} in lobbying spending across the ${profile.filingsRead.toLocaleString()} most recent`
        : `, reporting ${spendingStr} in lobbying spending`;
    const description = `${profile.name} has filed ${profile.totalFilings.toLocaleString()} lobbying disclosure reports with the U.S. Senate${spendingClause}. Top issues: ${topIssues || 'various policy areas'}.`;

    return {
      title,
      description,
      alternates: { canonical: `https://civdotiq.org/lobby/${registrantId}` },
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

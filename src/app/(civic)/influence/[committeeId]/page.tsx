/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Influence Committee Profile Page
 *
 * Server-rendered page showing committee details, financial totals,
 * resolved recipients, sector classification, and lobbying connections.
 */

import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { resolveCommitteeRecipients } from '@/lib/fec/recipient-resolver';
import { categorizePACByName } from '@/lib/fec/industry-taxonomy';
import { OpenDataStrip } from '@/components/shared/ui/OpenDataStrip';
import { Breadcrumbs } from '@/components/shared/navigation/Breadcrumbs';
import { CommitteeProfileClient } from './CommitteeProfileClient';
import type { CommitteeProfile } from '@/types/influence';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { PACPageSchema } from './PACPageSchema';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface PageProps {
  params: Promise<{ committeeId: string }>;
  searchParams: Promise<{ cycle?: string }>;
}

async function getCommitteeProfile(
  committeeId: string,
  cycle: number
): Promise<CommitteeProfile | null> {
  try {
    const [committeeInfo, totals, recipients] = await Promise.all([
      fecApiService.getCommitteeInfo(committeeId),
      fecApiService.getCommitteeTotals(committeeId, cycle),
      resolveCommitteeRecipients(committeeId, cycle),
    ]);

    if (!committeeInfo) return null;

    return {
      committee: {
        committeeId: committeeInfo.committee_id,
        name: committeeInfo.name,
        type: committeeInfo.committee_type,
        typeFull: committeeInfo.committee_type_full,
        designation: committeeInfo.designation,
        designationFull: committeeInfo.designation ?? '',
        party: committeeInfo.party,
        state: committeeInfo.state ?? '',
        treasurerName: '',
        cycles: committeeInfo.cycles,
        fecUrl: `https://www.fec.gov/data/committee/${committeeId}/`,
      },
      totals: totals
        ? {
            cycle: totals.cycle,
            receipts: totals.receipts,
            disbursements: totals.disbursements,
            cashOnHand: totals.last_cash_on_hand_end_period,
            individualContributions: totals.individual_contributions,
            otherCommitteeContributions: totals.other_political_committee_contributions,
            independentExpenditures: totals.independent_expenditures,
          }
        : null,
      recipients,
      metadata: {
        cycle,
        lastUpdated: totals?.coverage_end_date ?? new Date().toISOString(),
        totalRecipients: recipients.length,
        resolvedRecipients: recipients.filter(r => r.bioguideId !== null).length,
        fecTransparencyLink: `https://www.fec.gov/data/committee/${committeeId}/`,
      },
    };
  } catch {
    return null;
  }
}

function getPACTypeExplanation(designation: string | undefined): string | null {
  if (!designation) return null;
  switch (designation) {
    case 'B':
      return 'This is a Lobbyist/Registrant PAC, meaning it is operated by a registered federal lobbyist or lobbying firm.';
    case 'D':
      return 'This is a Leadership PAC, meaning it is associated with a current or former elected official. Leadership PACs raise money to support other candidates.';
    case 'J':
      return 'This is a Joint Fundraising Committee that raises money to distribute among multiple candidates or committees.';
    case 'U':
      return 'This is an Unauthorized committee — it is not authorized by any candidate.';
    default:
      return null;
  }
}

export default async function CommitteeProfilePage({ params, searchParams }: PageProps) {
  const { committeeId } = await params;
  const resolvedSearchParams = await searchParams;
  const cycle = parseInt(resolvedSearchParams.cycle ?? '2026', 10);

  if (!committeeId || !/^C\d+$/.test(committeeId)) {
    notFound();
  }

  const profile = await getCommitteeProfile(committeeId, cycle);
  if (!profile) notFound();

  // Sector classification
  const classification = categorizePACByName(profile.committee.name);
  const pacTypeExplanation = getPACTypeExplanation(profile.committee.designation);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        <PACPageSchema
          name={profile.committee.name}
          description={`${profile.committee.typeFull} — ${profile.committee.designationFull}. FEC ID: ${profile.committee.committeeId}`}
          url={`https://civdotiq.org/influence/${committeeId}`}
          sector={classification?.sector ?? null}
        />
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: 'https://civdotiq.org' },
            { name: 'Influence', url: 'https://civdotiq.org/influence' },
            { name: profile.committee.name, url: `https://civdotiq.org/influence/${committeeId}` },
          ]}
        />

        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Influence', href: '/influence' },
            { label: profile.committee.name, href: `/influence/${committeeId}` },
          ]}
          className="mb-6"
        />

        <CommitteeProfileClient
          profile={profile}
          sector={classification?.sector ?? null}
          pacTypeExplanation={pacTypeExplanation}
        />

        <OpenDataStrip apiUrl={`/api/influence/${committeeId}?cycle=${cycle}`} />
      </main>
    </div>
  );
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  try {
    const { committeeId } = await params;
    const resolvedSearchParams = await searchParams;
    const cycle = resolvedSearchParams.cycle ?? '2026';

    const committeeInfo = await fecApiService.getCommitteeInfo(committeeId);
    if (!committeeInfo) {
      return { title: `Committee ${committeeId}` };
    }

    const classification = categorizePACByName(committeeInfo.name);
    const sectorStr = classification?.sector ? ` in the ${classification.sector} sector` : '';

    const title = `${committeeInfo.name} — Campaign contributions`;
    const description = `See where ${committeeInfo.name}${sectorStr} sends money. View all Congressional recipients, amounts, and party breakdown for the ${cycle} cycle.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://civdotiq.org/influence/${committeeId}`,
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
      title: 'Committee',
      description: 'View committee campaign contributions and recipients.',
    };
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Influence Committee Profile Page
 *
 * Server-rendered page showing committee details, financial totals,
 * and all resolved recipients linked to CIV.IQ representative profiles.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { resolveCommitteeRecipients } from '@/lib/fec/recipient-resolver';
import { OpenDataStrip } from '@/components/shared/ui/OpenDataStrip';
import { CommitteeProfileClient } from './CommitteeProfileClient';
import type { CommitteeProfile } from '@/types/influence';
import { GovernmentOrganizationSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';

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
        lastUpdated: new Date().toISOString(),
        totalRecipients: recipients.length,
        resolvedRecipients: recipients.filter(r => r.bioguideId !== null).length,
        fecTransparencyLink: `https://www.fec.gov/data/committee/${committeeId}/`,
      },
    };
  } catch {
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

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Structured Data for SEO */}
        <GovernmentOrganizationSchema
          name={profile.committee.name}
          description={`${profile.committee.typeFull} — ${profile.committee.designationFull}. FEC ID: ${profile.committee.committeeId}`}
          url={`https://civdotiq.org/influence/${committeeId}`}
          parentOrganization={profile.committee.party || 'Federal Election Commission'}
        />
        <BreadcrumbSchema
          items={[
            { name: 'Home', url: 'https://civdotiq.org' },
            { name: 'Influence', url: 'https://civdotiq.org/influence' },
            { name: profile.committee.name, url: `https://civdotiq.org/influence/${committeeId}` },
          ]}
        />

        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/influence" className="hover:text-[#3ea2d4]">
            Influence
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {profile.committee.name}
          </span>
        </nav>

        <CommitteeProfileClient profile={profile} />

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
      return { title: `Committee ${committeeId} | CIV.IQ` };
    }

    const title = `${committeeInfo.name} - Campaign Contributions | CIV.IQ`;
    const description = `See where ${committeeInfo.name} sends money. View all Congressional recipients, amounts, and party breakdown for the ${cycle} cycle.`;

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
      title: `Committee | CIV.IQ`,
      description: 'View committee campaign contributions and recipients.',
    };
  }
}

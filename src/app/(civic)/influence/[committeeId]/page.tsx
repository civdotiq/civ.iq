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

/** Derive the parent organization name from a PAC name by stripping common suffixes. */
function deriveParentOrgName(pacName: string): string {
  return pacName
    .replace(/\s+(PAC|POLITICAL ACTION COMMITTEE|FUND|COMMITTEE)$/i, '')
    .replace(/\s+(FOR GOOD GOVERNMENT|FOR AMERICA|EMPLOYEES?)$/i, '')
    .trim();
}

/** Fetch a short Wikipedia summary for the parent organization behind a PAC. */
async function fetchParentOrgSummary(pacName: string): Promise<string | null> {
  const orgName = deriveParentOrgName(pacName);
  if (orgName.length < 4 || orgName === pacName) return null;

  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: orgName,
        srlimit: '3',
        origin: '*',
      });

    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5_000) });
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string }> };
    };
    const title = searchData.query?.search?.[0]?.title;
    if (!title) return null;

    const extractUrl =
      `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'extracts',
        exintro: 'true',
        explaintext: 'true',
        titles: title,
        origin: '*',
      });

    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(5_000) });
    if (!extractRes.ok) return null;

    const extractData = (await extractRes.json()) as {
      query?: { pages?: Record<string, { extract?: string; missing?: boolean }> };
    };
    const pages = extractData.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing) return null;

    return page.extract?.slice(0, 400) ?? null;
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

  // Sector classification + Wikipedia summary for parent org (parallel)
  const classification = categorizePACByName(profile.committee.name);
  const pacTypeExplanation = getPACTypeExplanation(profile.committee.designation);
  const parentOrgSummary = await fetchParentOrgSummary(profile.committee.name);

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
          parentOrgSummary={parentOrgSummary}
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

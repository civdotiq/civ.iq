/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { notFound, permanentRedirect } from 'next/navigation';
import { DistrictPage as RedesignedDistrictPage } from '@/components/districts/DistrictPage';
import { canonicalizeDistrictId } from '@/lib/helpers/url-builders';
import { checkDistrictId } from '@/lib/districts/known-districts';
import { loadDistrictPage } from '@/lib/districts/load-district-page';
import type { DistrictDetails } from '@/lib/districts/district-details';
import { getStateName } from '@/lib/data/us-states';
import { partyAdjective } from '@/lib/party-label';
import { congressionalDistrictLede } from '@/lib/seo/answer-first';
import { ACS_5YR_VINTAGE } from '@/lib/census-vintage';
import { getDistrictDates } from '@/lib/districts/district-dates';
import { profileDatesLine } from '@/lib/provenance/profile-dates-line';
import { AdministrativeAreaSchema } from '@/components/seo/JsonLd';
import DistrictPageClient from './DistrictPageClient';
import { SeatWithoutMember } from './SeatWithoutMember';

const NON_VOTING: Record<string, string> = {
  DC: 'Delegate',
  GU: 'Delegate',
  VI: 'Delegate',
  AS: 'Delegate',
  MP: 'Delegate',
  PR: 'Resident Commissioner',
};

/** Answer-first opening from the facts the district page shows. */
function districtLede(district: DistrictDetails): string | null {
  const rep = district.representative;
  const surname = rep.name.trim().split(/\s+/).pop() ?? rep.name;
  // The 2024 result is only about this member if they won it.
  const winner = district.political.lastElection.candidates?.[0];
  const wonIt = winner && winner.name.toUpperCase().includes(surname.toUpperCase());
  const d = district.demographics;
  return congressionalDistrictLede({
    stateName: getStateName(district.state) || district.state,
    district: district.number,
    member: rep.name
      ? {
          name: rep.name,
          surname,
          party: partyAdjective(rep.party),
          role: NON_VOTING[district.state.toUpperCase()],
        }
      : null,
    lastElection: wonIt ? { winnerName: winner.name, pct: winner.pct } : null,
    demographics: d
      ? {
          population: d.population,
          medianIncome: d.medianIncome,
          medianAge: d.medianAge,
          collegePct: d.bachelor_degree_percent,
          povertyPct: d.poverty_rate,
          surveyYear: ACS_5YR_VINTAGE,
        }
      : null,
  });
}

/** The district's JSON-LD; dateModified only when the page has the record it comes from. */
function DistrictSchema({
  state,
  district,
  canonical,
  dateModified,
}: {
  state: string;
  district: string;
  canonical: string;
  dateModified?: string | null;
}) {
  const stateName = getStateName(state) || state;
  const districtLabel = district === 'AL' ? 'At-Large' : `District ${district}`;
  const url = `https://civdotiq.org/districts/${canonical}`;
  return (
    <AdministrativeAreaSchema
      name={`${stateName} ${districtLabel} Congressional District`}
      description={`${districtLabel} congressional district in ${stateName}. View current representative, demographics, voting history, and federal spending data.`}
      url={url}
      mainEntityOfPage={url}
      containedInPlace={stateName}
      dateModified={dateModified}
    />
  );
}

interface DistrictPageProps {
  params: Promise<{ districtId: string }>;
  searchParams: Promise<{ v?: string }>;
}

export default async function DistrictPage({ params, searchParams }: DistrictPageProps) {
  const { districtId } = await params;
  const { v } = await searchParams;

  // Middleware has already 308'd spelling variants (NY-8, ny8) to the canonical id.
  const parsed = canonicalizeDistrictId(districtId);
  if (!parsed) notFound();

  // Checked against the local seat list before any fetch, so the status is real.
  const check = checkDistrictId(parsed.state, parsed.district);
  if (check.kind === 'unknown') notFound();
  if (check.kind === 'at-large') permanentRedirect(`/districts/${check.canonical}`);

  // PR 14: redesigned district page behind ?v=new (or NEXT_PUBLIC_CIVIQ_V
  // outside production). Old design path stays the default.
  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const schemaProps = {
    state: parsed.state,
    district: parsed.district,
    canonical: parsed.canonical,
  };
  if (v === 'new' || isPreviewEnv) {
    return (
      <>
        <DistrictSchema {...schemaProps} />
        <RedesignedDistrictPage districtId={parsed.canonical} />
      </>
    );
  }

  const data = await loadDistrictPage(parsed.canonical);
  if (data.status === 'no-member') {
    return (
      <>
        <DistrictSchema {...schemaProps} />
        <SeatWithoutMember state={parsed.state} district={parsed.district} />
      </>
    );
  }

  // Unavailable: the browser fetches the record, and the page carries no dates.
  const dates = data.status === 'found' ? getDistrictDates(data.district) : null;
  return (
    <>
      <DistrictSchema {...schemaProps} dateModified={dates?.latestRecord} />
      <DistrictPageClient
        districtId={parsed.canonical}
        initialDistrict={data.status === 'found' ? data.district : null}
        lede={data.status === 'found' ? districtLede(data.district) : null}
        datesLine={profileDatesLine(dates)}
      />
    </>
  );
}

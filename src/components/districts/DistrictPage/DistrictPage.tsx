/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Redesigned DistrictPage (PR 14). Renders behind ?v=new on the existing
 * /districts/[districtId] route. Six sections, in reference order:
 *   1. Hero strip (label + numbers)
 *   2. Map placeholder + demographics block
 *   3. Seated rep compact card → links to full profile
 *   4. Neighboring districts strip
 *   5. Federal money flowing in (USASpending.gov)
 *   6. ZIP list (compact monospace grid)
 *
 * Real Mapbox/MapLibre is intentionally a follow-up PR.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CqDisclaimer, CqLabel, CqPlainReading, CqSourceTag } from '@/components/cq';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { HeroStrip } from './HeroStrip';
import { MapPlaceholder } from './MapPlaceholder';
import { DemographicsBlock } from './DemographicsBlock';
import { SeatedRepCard } from './SeatedRepCard';
import { NeighborsStrip } from './NeighborsStrip';
import { FederalMoneyTable } from './FederalMoneyTable';
import { ZipGrid } from './ZipGrid';
import { districtDisplayLabel, isoToReadable, parseDistrictId, stateLongName } from './data';
import type {
  DistrictDetailsResponse,
  DistrictPageProps,
  GovernmentSpendingResponse,
  NeighborsResponse,
  ZipsResponse,
} from './types';

const fetcher = async <T,>(url: string): Promise<T | null> => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return (await res.json()) as T;
};

export function DistrictPage({ districtId }: DistrictPageProps) {
  const parsed = parseDistrictId(districtId);
  const fetchKey = parsed ? districtId : null;

  // All hooks declared unconditionally so React's hook-order invariant
  // holds. When fetchKey is null SWR skips the request.
  const { data: details, isLoading: detailsLoading } = useSWR<DistrictDetailsResponse | null>(
    fetchKey ? `/api/districts/${fetchKey}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const {
    data: spending,
    isLoading: spendingLoading,
    error: spendingError,
  } = useSWR<GovernmentSpendingResponse | null>(
    fetchKey ? `/api/districts/${fetchKey}/government-spending` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: neighbors, isLoading: neighborsLoading } = useSWR<NeighborsResponse | null>(
    fetchKey ? `/api/districts/${fetchKey}/neighbors` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: zips, isLoading: zipsLoading } = useSWR<ZipsResponse | null>(
    fetchKey ? `/api/districts/${fetchKey}/zips` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (!parsed) {
    return (
      <div
        style={{
          background: 'var(--bg1)',
          color: 'var(--fg1)',
          fontFamily: 'var(--font-primary)',
          padding: '32px 36px 56px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            border: '2px solid var(--ink)',
            padding: '20px 18px',
            background: 'var(--bg2)',
            fontSize: 13,
            color: 'var(--fg2)',
          }}
        >
          District ID “{districtId}” is not in the expected format (e.g. NY-08, AK-AL).
        </div>
      </div>
    );
  }

  const label = districtDisplayLabel(parsed);
  const stateName = stateLongName(parsed.state);

  const fedInvestment = spending?.government?.federalInvestment;
  const totalSpending = fedInvestment?.totalAnnualSpending ?? 0;
  const contractsAndGrants = fedInvestment?.contractsAndGrants ?? 0;
  const projects = fedInvestment?.majorProjects ?? [];
  const dataAsOf =
    details?.metadata?.timestamp ??
    spending?.metadata?.timestamp ??
    neighbors?.metadata?.timestamp ??
    null;

  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Districts', url: 'https://civdotiq.org/districts' },
          { name: stateName, url: `https://civdotiq.org/states/${parsed.state}` },
          { name: label, url: `https://civdotiq.org/districts/${districtId}` },
        ]}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/districts"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All districts
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <CqSourceTag compact source="Census ACS" id="5-year" />
          <CqSourceTag compact source="USASpending" id="DSAC rollup" />
          <CqSourceTag compact source="Census TIGER" id="boundaries" />
        </div>
      </div>

      {/* HERO + MAP */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          border: '2px solid var(--ink)',
          marginBottom: 28,
        }}
      >
        <div style={{ borderRight: '1px solid var(--line)', minWidth: 0 }}>
          <HeroStrip parsed={parsed} details={details ?? null} loading={detailsLoading} />
        </div>
        <MapPlaceholder parsed={parsed} />
      </div>

      {/* SEATED REP */}
      <SeatedRepCard
        representative={details?.district.representative}
        districtLabel={label}
        loading={detailsLoading}
      />

      {/* NEIGHBORS + DEMOGRAPHICS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
          marginBottom: 32,
        }}
      >
        <NeighborsStrip neighbors={neighbors?.neighbors ?? null} loading={neighborsLoading} />
        <DemographicsBlock
          demographics={details?.district.demographics ?? null}
          loading={detailsLoading}
        />
      </div>

      {/* FEDERAL MONEY */}
      <div style={{ marginBottom: 32 }}>
        <FederalMoneyTable
          totalSpending={totalSpending}
          contractsAndGrants={contractsAndGrants}
          projects={projects}
          loading={spendingLoading}
          failed={!!spendingError}
        />
      </div>

      {/* ZIP LIST */}
      <ZipGrid zips={zips?.zips ?? null} loading={zipsLoading} />

      <div style={{ marginTop: 28 }}>
        <CqPlainReading>
          {detailsLoading
            ? `Loading district profile for ${label}…`
            : details?.district.demographics
              ? `${label} covers ${details.district.geography.counties.length} ${
                  details.district.geography.counties.length === 1 ? 'county' : 'counties'
                } in ${stateName} with about ${details.district.demographics.population.toLocaleString(
                  'en-US'
                )} residents. Federal awards published for the district total ${
                  totalSpending > 0
                    ? `$${(totalSpending / 1e6).toLocaleString('en-US', {
                        maximumFractionDigits: 1,
                      })}M`
                    : 'no published amount'
                } across ${contractsAndGrants.toLocaleString('en-US')} contracts and grants.`
              : `District profile for ${label} did not load. Refresh the page to retry the upstream feeds.`}
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.92}
          asof={isoToReadable(dataAsOf)}
          method="Census TIGER/Line · ACS 5-year · USASpending DSAC · 119th Congress ZIP map"
        >
          {' '}
          District boundaries reflect the 2022-2023 redistricting. ZIP-to-district mapping is
          approximate; some ZIPs span multiple districts. Boundary preview is a static schematic —
          real interactive map is a follow-up release.
          <CqLabel> </CqLabel>
        </CqDisclaimer>
      </div>
    </div>
  );
}

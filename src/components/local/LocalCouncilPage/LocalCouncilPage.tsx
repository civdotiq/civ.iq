/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Local city council page (PR 20). Reduced-scope per 2026-05-11 prompt:
 *
 * - Party tally chips CUT — Legistar /OfficeRecords carries no party
 *   field. Several covered cities (Minneapolis, Portland, Oakland,
 *   Seattle, Boston) hold officially nonpartisan council elections.
 * - Members table is 4 columns, NOT 6 — drops Party / Neighborhood /
 *   Attendance / Sponsorship cols (none in Legistar at chamber level).
 * - Session-file aside CUT — Speaker / Term / Sessions / Bills YTD
 *   have no Legistar wrapper today.
 * - Headline metrics strip is 2 cells (members, bills last 60 days),
 *   NOT 5 — half-blanked strip would look broken.
 * - Recent legislation table is 4 columns, NOT 5 — Vote tally cut
 *   (Legistar /Matters lacks roll-call totals).
 * - Committees sidebar panel CUT — no Legistar /Bodies wrapper yet.
 *   Returns when that wrapper lands.
 * - Ward map is a static SVG placeholder; real Mapbox/MapLibre wiring
 *   is a follow-up PR (chat10 decision #8).
 *
 * Each cut is documented per the project's "Real Data Only" rule.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { CqChip, CqDisclaimer, CqLabel, CqSourceTag } from '@/components/cq';
import type { LegistarCityConfig } from '@/types/legistar';
import { HeadlineMetrics } from './HeadlineMetrics';
import { MembersTable } from './MembersTable';
import { RecentLegislationTable } from './RecentLegislationTable';
import { WardMapPlaceholder } from './WardMapPlaceholder';
import { formatDateLong } from './data';
import type { FetchResult, LocalCouncilPayload, LocalLegislationPayload } from './types';

interface LocalCouncilPageProps {
  cityConfig: LegistarCityConfig;
}

async function fetcher<T>(url: string): Promise<FetchResult<T>> {
  const res = await fetch(url);
  if (res.status === 404) return { data: null, unavailable: true };
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return { data: (await res.json()) as T, unavailable: false };
}

export function LocalCouncilPage({ cityConfig }: LocalCouncilPageProps) {
  const encodedId = encodeURIComponent(cityConfig.id);

  const { data: councilResult, isLoading: councilLoading } = useSWR<
    FetchResult<LocalCouncilPayload>
  >(
    `city:council:${cityConfig.id}`,
    () => fetcher<LocalCouncilPayload>(`/api/city/${encodedId}/council`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const { data: legislationResult, isLoading: legislationLoading } = useSWR<
    FetchResult<LocalLegislationPayload>
  >(
    `city:legislation:${cityConfig.id}`,
    () => fetcher<LocalLegislationPayload>(`/api/city/${encodedId}/legislation?days=60&top=20`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const council = councilResult?.data ?? null;
  const legislation = legislationResult?.data ?? null;

  const members = council?.members ?? null;
  const activeMembers = council?.activeMembers ?? null;
  const totalMembers = council?.totalMembers ?? null;
  const legislationItems = legislation?.legislation ?? null;
  const billsLast60Days = legislationItems?.length ?? null;

  const dataAsOf =
    council?.metadata.generatedAt ?? legislation?.metadata.generatedAt ?? new Date().toISOString();

  return (
    <main
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1280,
        margin: '0 auto',
      }}
    >
      {/* Top rail */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 14,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/local"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All local government
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <CqSourceTag compact source="Legistar" id={cityConfig.name} />
        </div>
      </div>

      {/* Crumb-line + as-of */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          marginBottom: 16,
          gap: 12,
        }}
      >
        <CqLabel>
          Local government · {cityConfig.state} · {cityConfig.name}
        </CqLabel>
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          As of {formatDateLong(dataAsOf)}
        </span>
      </div>

      {/* Hero — single column (session-file aside cut, see Correction 3) */}
      <div
        style={{
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <CqChip variant="ink" size="sm">
            Local · Legislative
          </CqChip>
          <CqChip variant="info" filled={false} size="sm">
            {totalMembers !== null ? `${totalMembers} members` : 'Members loading'}
          </CqChip>
          <CqChip variant="ink" filled={false} size="sm">
            {cityConfig.state}
          </CqChip>
        </div>
        <h1
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 0.98,
            margin: '0 0 12px',
            textTransform: 'uppercase',
          }}
        >
          {cityConfig.name}
          <br />
          City Council
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.5,
            color: 'var(--fg2)',
            margin: 0,
            maxWidth: 640,
          }}
        >
          The legislative body of {cityConfig.name}, {cityConfig.state}. Council members are elected
          from city districts or wards and adopt local ordinances, resolutions, and the municipal
          budget.
        </p>
      </div>

      {/* Headline metrics — two cells */}
      <HeadlineMetrics
        activeMembers={activeMembers}
        billsLast60Days={billsLast60Days}
        membersLoading={councilLoading || !councilResult}
        billsLoading={legislationLoading || !legislationResult}
      />

      {/* Body grid: roster + ward map */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: 32,
          marginBottom: 32,
        }}
      >
        <section>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'baseline',
              marginBottom: 12,
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <div>
              <CqLabel>Members · roster</CqLabel>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Council roster</div>
            </div>
            <CqSourceTag compact source="Legistar · OfficeRecords" id={cityConfig.name} />
          </div>
          <MembersTable members={members} loading={councilLoading || !councilResult} />
        </section>

        <aside>
          <WardMapPlaceholder cityName={cityConfig.name} />
        </aside>
      </div>

      {/* Recent legislation — full width */}
      <section style={{ marginBottom: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 12,
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div>
            <CqLabel>Recent legislation · last 60 days</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              What the council has been voting on
            </div>
          </div>
          <CqSourceTag compact source="Legistar · Matters" id={cityConfig.name} />
        </div>
        <RecentLegislationTable
          legislation={legislationItems}
          loading={legislationLoading || !legislationResult}
          cityName={cityConfig.name}
        />
      </section>

      {/* Disclaimer */}
      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.9}
          asof={formatDateLong(dataAsOf)}
          method="Legistar /OfficeRecords (members) · Legistar /Matters (recent legislation, trailing 60 days)"
        >
          {' '}
          Party, attendance percentage, sponsorship counts, committee assignments, the council
          speaker, session totals, and per-bill vote tallies are not rendered on this page because
          Legistar does not provide them at the chamber level without per-matter follow-up calls.
          Several covered cities hold officially nonpartisan council elections; party chips would be
          wrong even where Legistar carried them. Ward boundaries return when a GIS layer lands.
        </CqDisclaimer>
      </div>
    </main>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  CqChip,
  CqDisclaimer,
  CqLabel,
  CqPlainReading,
  CqSourceTag,
  CqStat,
} from '@/components/cq';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { SectorLeaderboard } from '@/components/intelligence/SectorLeaderboard';
import { ContributorsTable } from './ContributorsTable';
import { BillsTable } from './BillsTable';
import { combinedContributors, formatCompactDollars, sectorToLeaderboardSlug } from './data';
import type {
  IndustryConnectionsResponse,
  IndustryOrganizationsResponse,
  IndustrySectorPageProps,
} from './types';

const fetcher = async <T,>(url: string): Promise<T | null> => {
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return (await res.json()) as T;
};

function sectorInitials(displayName: string): string {
  return displayName
    .split(/[\s/&]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');
}

function isoToReadable(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function IndustrySectorPage({ sector, sectorSlug, displayName }: IndustrySectorPageProps) {
  const leaderboardSlug = sectorToLeaderboardSlug(sector);
  const encodedIndustrySlug = encodeURIComponent(sectorSlug);

  const { data: orgs, isLoading: orgsLoading } = useSWR<IndustryOrganizationsResponse | null>(
    `/api/industry/${encodedIndustrySlug}/organizations`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: connections, isLoading: connectionsLoading } =
    useSWR<IndustryConnectionsResponse | null>(
      `/api/industry/${encodedIndustrySlug}/connections?limit=20`,
      fetcher,
      { revalidateOnFocus: false }
    );

  const contributorRows = combinedContributors(orgs ?? undefined, 8);
  const bills = connections?.recentBills ?? [];
  const dataAsOf = orgs?.metadata?.generatedAt ?? connections?.metadata?.generatedAt;
  const corpusLobbying = orgs?.corpusLobbying;

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
          { name: 'Industries', url: 'https://civdotiq.org/industry' },
          { name: displayName, url: `https://civdotiq.org/industry/${sectorSlug}` },
        ]}
      />

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
          href="/industry"
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← All industries
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <CqSourceTag compact source="FEC" id="industry roll-up" />
          <CqSourceTag compact source="Senate LDA" id={leaderboardSlug} />
          <CqSourceTag compact source="Congress.gov" id="bill index" />
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px minmax(0, 1fr) 280px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <div
          style={{
            width: 160,
            height: 160,
            position: 'relative',
            border: '2px solid var(--ink)',
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--bg2) 0 8px, var(--bg3) 8px 16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: 6,
              background: 'var(--color-warning)',
            }}
          />
          <div
            style={{
              fontSize: 56,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: 'var(--fg1)',
            }}
          >
            {sectorInitials(displayName)}
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <CqLabel>Industry sector · current cycle</CqLabel>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.0,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            {displayName}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--fg2)',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.55,
            }}
          >
            {orgs
              ? [
                  orgs.corpusLobbying
                    ? `${orgs.corpusLobbying.organizationCount.toLocaleString()} lobbying organizations`
                    : null,
                  connections ? `${connections.recentBills.length} bills tracked` : null,
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Sector roll-up unavailable'
              : 'Loading sector roll-up…'}
          </p>
          <div style={{ marginTop: 14, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CqChip variant="ink" filled={false} size="sm">
              {sector}
            </CqChip>
            {connections && connections.relatedPolicyAreas.length > 0 && (
              <CqChip variant="info" filled={false} size="sm">
                {connections.relatedPolicyAreas.length} policy area
                {connections.relatedPolicyAreas.length === 1 ? '' : 's'}
              </CqChip>
            )}
          </div>
        </div>
        <aside style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <CqLabel>This cycle · summary</CqLabel>
          <ul
            style={{
              listStyle: 'none',
              margin: '10px 0 0',
              padding: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            {[
              [
                'Lobbying organizations',
                orgs?.corpusLobbying
                  ? orgs.corpusLobbying.organizationCount.toLocaleString()
                  : 'Unavailable',
              ],
              ['Bills tracked', String(connections?.recentBills.length ?? 0)],
            ].map(([k, v], i) => (
              <li
                key={String(k)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                }}
              >
                <span style={{ color: 'var(--fg3)' }}>{k}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: 'var(--fg1)',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {v}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Headline stats. Lobbying spend is corpus-backed (complete Senate LDA
          corpus) and only shown when available; the sample-based figure removed
          in Phase 0b is never rendered. */}
      {(() => {
        const corpusSpend = orgs?.corpusLobbying;
        const stats = [
          ...(corpusSpend
            ? [
                {
                  key: 'lobby-spend',
                  label: 'Lobbying spend',
                  value: formatCompactDollars(corpusSpend.windowTotal),
                  caption: `LDA issue areas · ${corpusSpend.quarters[0]}–${corpusSpend.quarters[corpusSpend.quarters.length - 1]}`,
                  color: 'ink' as const,
                },
              ]
            : []),
          ...(corpusSpend
            ? [
                {
                  key: 'lobby-orgs',
                  label: 'Lobbying orgs',
                  value: corpusSpend.organizationCount.toLocaleString(),
                  caption: `${corpusSpend.filingCount.toLocaleString()} filings on these issue areas`,
                  color: 'ink' as const,
                },
              ]
            : []),
          {
            key: 'bills-tracked',
            label: 'Bills tracked',
            value: String(connections?.recentBills.length ?? 0),
            caption: connections
              ? `${connections.committees.length} committee${connections.committees.length === 1 ? '' : 's'}`
              : 'Loading…',
            color: 'ink' as const,
          },
        ];
        return (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))`,
              borderBottom: '2px solid var(--ink)',
            }}
          >
            {stats.map((s, i) => (
              <div
                key={s.key}
                style={{
                  padding: '20px 18px',
                  borderLeft: i === 0 ? 0 : '1px solid var(--line)',
                }}
              >
                <CqStat
                  label={s.label}
                  value={s.value}
                  caption={s.caption}
                  color={s.color}
                  size={28}
                />
              </div>
            ))}
          </div>
        );
      })()}

      {/* Contributors. Per-member sector money is not shown: the only
          per-member figure is a 250-contribution sample, not a total. */}
      <div style={{ marginTop: 32 }}>
        <section>
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Top contributors · firms + PACs</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Who is giving</div>
          </div>
          <ContributorsTable rows={contributorRows} loading={orgsLoading} />
        </section>
      </div>

      {/* House vote rates on the sector's bills (unranked, money-free) */}
      <section style={{ marginTop: 32 }}>
        <SectorLeaderboard initialSector={sector} />
      </section>

      {/* Bills */}
      <section style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <CqLabel>
              Bills · {connections?.recentBills.length ?? 0} matched · top{' '}
              {Math.min(8, bills.length)} shown
            </CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              What {displayName.toLowerCase()} touches in Congress
            </div>
          </div>
          <Link
            href={`/legislation?policyArea=${encodeURIComponent(connections?.relatedPolicyAreas[0] ?? '')}`}
            style={{
              fontSize: 11,
              color: 'var(--civiq-blue-active)',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
              fontFamily: 'var(--font-mono)',
            }}
          >
            All matching bills →
          </Link>
        </div>
        <BillsTable bills={bills.slice(0, 8)} loading={connectionsLoading} />
      </section>

      <div style={{ marginTop: 24 }}>
        <CqPlainReading>
          {corpusLobbying
            ? `${corpusLobbying.organizationCount.toLocaleString()} organizations reported ${formatCompactDollars(corpusLobbying.windowTotal)} in lobbying on ${displayName.toLowerCase()} issue areas from ${corpusLobbying.quarters[0]} to ${corpusLobbying.quarters[corpusLobbying.quarters.length - 1]}, across ${corpusLobbying.filingCount.toLocaleString()} filings.`
            : `${displayName} lobbying figures are loading or unavailable right now.`}
        </CqPlainReading>
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.9}
          asof={isoToReadable(dataAsOf)}
          method="FEC committee classification + Senate LDA filings + Congress.gov bill index"
        >
          {' '}
          Industry roll-up combines FEC PAC classifications with LDA registrant filings and
          Congress.gov bill matches. Per-member sector contribution totals are not shown: the
          available figures are contribution samples, not totals.
        </CqDisclaimer>
      </div>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
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
import { RecipientsTable } from './RecipientsTable';
import { ContributorsTable } from './ContributorsTable';
import { BillsTable } from './BillsTable';
import {
  combinedContributors,
  computePartyTotals,
  formatCompactDollars,
  sectorToLeaderboardSlug,
  topRecipients,
} from './data';
import type {
  IndustryConnectionsResponse,
  IndustryOrganizationsResponse,
  IndustrySectorPageProps,
  SectorLeaderboardResponse,
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

  const { data: leaderboard, isLoading: leaderboardLoading } =
    useSWR<SectorLeaderboardResponse | null>(
      `/api/intelligence/sector/${leaderboardSlug}/leaderboard?limit=100`,
      fetcher,
      { revalidateOnFocus: false }
    );

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

  const [showAllRecipients, setShowAllRecipients] = useState(false);

  const partyTotals = leaderboard ? computePartyTotals(leaderboard.entries) : null;
  const totalDonations = partyTotals?.total ?? 0;
  const recipients = leaderboard
    ? showAllRecipients
      ? leaderboard.entries
      : topRecipients(leaderboard.entries, 8)
    : [];
  const contributorRows = combinedContributors(orgs ?? undefined, 8);
  const bills = connections?.recentBills ?? [];
  const dataAsOf =
    leaderboard?.dataAsOf ?? orgs?.metadata?.generatedAt ?? connections?.metadata?.generatedAt;

  const dPct = partyTotals && partyTotals.total > 0 ? (partyTotals.d / partyTotals.total) * 100 : 0;
  const rPct = partyTotals && partyTotals.total > 0 ? (partyTotals.r / partyTotals.total) * 100 : 0;
  const otherPct =
    partyTotals && partyTotals.total > 0 ? (partyTotals.other / partyTotals.total) * 100 : 0;

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
              ? `${orgs.metrics.activePACCount} PACs · ${orgs.metrics.activeLobbyingOrgCount} lobbying registrants${
                  connections ? ` · ${connections.recentBills.length} bills tracked` : ''
                }`
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
              ['Total to legislators', formatCompactDollars(totalDonations)],
              ['To Democrats', formatCompactDollars(partyTotals?.d ?? 0)],
              ['To Republicans', formatCompactDollars(partyTotals?.r ?? 0)],
              ['Lobbying spend', formatCompactDollars(orgs?.metrics.totalLobbyingSpending ?? 0)],
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

      {/* Headline stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          borderBottom: '2px solid var(--ink)',
        }}
      >
        {[
          {
            key: 'cycle-contribs',
            label: 'Cycle contributions',
            value: formatCompactDollars(totalDonations),
            caption: leaderboard
              ? `${leaderboard.entries.length} legislator${leaderboard.entries.length === 1 ? '' : 's'} included`
              : 'Loading…',
            color: 'blue' as const,
          },
          {
            key: 'lobby-spend',
            label: 'Lobbying spend',
            value: formatCompactDollars(orgs?.metrics.totalLobbyingSpending ?? 0),
            caption: 'Senate LDA filings',
            color: 'ink' as const,
          },
          {
            key: 'active-pacs',
            label: 'Active PACs',
            value: String(orgs?.metrics.activePACCount ?? 0),
            caption: 'Classified by FEC committee',
            color: 'ink' as const,
          },
          {
            key: 'lobby-orgs',
            label: 'Lobbying orgs',
            value: String(orgs?.metrics.activeLobbyingOrgCount ?? 0),
            caption: 'Registrants on LDA filings',
            color: 'ink' as const,
          },
          {
            key: 'bills-tracked',
            label: 'Bills tracked',
            value: String(connections?.recentBills.length ?? 0),
            caption: connections
              ? `${connections.committees.length} committee${connections.committees.length === 1 ? '' : 's'}`
              : 'Loading…',
            color: 'ink' as const,
          },
        ].map((s, i) => (
          <div
            key={s.key}
            style={{
              padding: '20px 18px',
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
            }}
          >
            <CqStat label={s.label} value={s.value} caption={s.caption} color={s.color} size={28} />
          </div>
        ))}
      </div>

      {/* Party split bar */}
      <section style={{ marginTop: 28 }}>
        <CqLabel>Party split · cycle contributions</CqLabel>
        {partyTotals && partyTotals.total > 0 ? (
          <>
            <div
              role="img"
              aria-label={`${dPct.toFixed(0)} percent to Democrats, ${rPct.toFixed(0)} percent to Republicans`}
              style={{
                display: 'flex',
                height: 36,
                border: '2px solid var(--ink)',
                marginTop: 8,
                overflow: 'hidden',
              }}
            >
              {dPct > 0 && (
                <div
                  style={{
                    width: `${dPct}%`,
                    background: 'var(--civiq-green)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: rPct > 0 || otherPct > 0 ? '2px solid var(--ink)' : 'none',
                  }}
                >
                  {dPct >= 14 && (
                    <span
                      style={{
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {dPct.toFixed(0)}% · {formatCompactDollars(partyTotals.d)} to D
                    </span>
                  )}
                </div>
              )}
              {rPct > 0 && (
                <div
                  style={{
                    width: `${rPct}%`,
                    background: 'var(--civiq-red)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRight: otherPct > 0 ? '2px solid var(--ink)' : 'none',
                  }}
                >
                  {rPct >= 14 && (
                    <span
                      style={{
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: 'var(--font-mono)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {rPct.toFixed(0)}% · {formatCompactDollars(partyTotals.r)} to R
                    </span>
                  )}
                </div>
              )}
              {otherPct > 0 && (
                <div
                  style={{
                    width: `${otherPct}%`,
                    background: 'var(--fg3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                />
              )}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              D · {formatCompactDollars(partyTotals.d)} · {dPct.toFixed(1)}% &nbsp; R ·{' '}
              {formatCompactDollars(partyTotals.r)} · {rPct.toFixed(1)}% &nbsp; Other ·{' '}
              {formatCompactDollars(partyTotals.other)} · {otherPct.toFixed(1)}%
            </div>
          </>
        ) : (
          <div
            style={{
              marginTop: 8,
              border: '2px solid var(--ink)',
              padding: '16px 18px',
              background: 'var(--bg2)',
              fontSize: 13,
              color: 'var(--fg2)',
              lineHeight: 1.55,
            }}
          >
            Party-split data not yet available. Splits compute as legislator vote-finance
            correlations populate the cache.
          </div>
        )}
      </section>

      {/* Recipients + Contributors */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 32,
          marginTop: 32,
        }}
      >
        <section>
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Top recipients · cycle contributions</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
              Lawmakers receiving the most
            </div>
          </div>
          <RecipientsTable entries={recipients} loading={leaderboardLoading} />
          {leaderboard && leaderboard.entries.length > 8 && (
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => setShowAllRecipients(prev => !prev)}
                style={{
                  fontSize: 11,
                  color: 'var(--civiq-blue-active)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                  fontFamily: 'var(--font-mono)',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {showAllRecipients ? 'Show fewer ↑' : `View all ${leaderboard.entries.length} →`}
              </button>
            </div>
          )}
        </section>

        <section>
          <div style={{ marginBottom: 14 }}>
            <CqLabel>Top contributors · firms + PACs</CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Who is giving</div>
          </div>
          <ContributorsTable rows={contributorRows} loading={orgsLoading} />
        </section>
      </div>

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
            href={`/bills?policyArea=${encodeURIComponent(connections?.relatedPolicyAreas[0] ?? '')}`}
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
          {leaderboard && partyTotals && partyTotals.total > 0
            ? `${displayName} contributions split ${dPct.toFixed(0)}% to Democrats and ${rPct.toFixed(0)}% to Republicans across ${leaderboard.entries.length} legislators in the current cycle.`
            : `${displayName} sector data is still warming. Sector-aligned legislator data populates as individual representative profiles compute their vote-finance correlations.`}
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
          Congress.gov bill matches. Sector contributions reflect cached vote-finance insights;
          totals grow as more representative profiles are analyzed.
        </CqDisclaimer>
      </div>
    </div>
  );
}

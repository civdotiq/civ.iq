'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  CqButton,
  CqChip,
  CqDisclaimer,
  CqLabel,
  CqPortrait,
  CqSourceTag,
  CqStat,
} from '@/components/cq';
import { ContactStrip } from './ContactStrip';
import { RecordPanel } from './RecordPanel';
import { MoneyPanel } from './MoneyPanel';
import { BillsPanel } from './BillsPanel';
import { CommitteesPanel } from './CommitteesPanel';
import { MeetingsPanel } from './MeetingsPanel';
import { partyKey, partyLong } from './types';
import type { ProfileHybridProps } from './types';

interface SummaryBatchResponse {
  data?: {
    bills?: {
      currentCongress?: { count?: number };
      totalCurrentCongress?: number;
    };
    votes?: {
      votes?: unknown[];
      totalResults?: number;
    };
    finance?: {
      totalRaised?: number;
      cycle?: number;
      metadata?: { dataFromCycle?: number; matchedCycle?: number };
    };
  };
}

const summaryBatch = (bioguideId: string) => async (): Promise<SummaryBatchResponse> => {
  const r = await fetch(`/api/representative/${bioguideId}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoints: ['bills', 'votes', 'finance'],
      options: { bills: { summaryOnly: true } },
    }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

function formatCurrencyShort(amount: number | undefined): string | null {
  if (amount === undefined || amount === null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

type TabKey = 'record' | 'money' | 'bills' | 'committees' | 'meetings';

const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['record', 'Voting record'],
  ['money', 'Money'],
  ['bills', 'Bills sponsored'],
  ['committees', 'Committees'],
  ['meetings', 'Lobbyist meetings'],
];

const SOURCES: ReadonlyArray<{ name: string; id?: string }> = [
  { name: 'Congress.gov', id: 'API v3' },
  { name: 'FEC.gov', id: 'cycle filings' },
  { name: 'Senate LDA', id: 'disclosures' },
];

export function ProfileHybrid({ representative: r }: ProfileHybridProps) {
  const [tab, setTab] = useState<TabKey>('record');
  const pKey = partyKey(r.party);
  const role = r.role ?? (r.chamber === 'Senate' ? 'Senator' : 'Representative');
  const districtLabel = r.district ? `${r.state}-${String(r.district).padStart(2, '0')}` : r.state;

  const terms = r.terms ?? [];
  const since = terms[terms.length - 1]?.startYear;
  const currentTerm = terms[0];
  const currentCongress = currentTerm?.congress;
  const nextElection = r.nextElection ?? currentTerm?.endYear;
  const leftOfficeYear = currentTerm?.endYear;
  const isHistorical =
    r.isHistorical === true ||
    (leftOfficeYear !== undefined && Number(leftOfficeYear) < new Date().getFullYear());

  const committeesCount = r.committees?.length ?? 0;
  const caucusesCount = r.caucuses?.length ?? 0;

  const { data: summary, isLoading: summaryLoading } = useSWR<SummaryBatchResponse>(
    `summary-batch:${r.bioguideId}`,
    summaryBatch(r.bioguideId),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const billsSponsoredCount =
    summary?.data?.bills?.currentCongress?.count ?? summary?.data?.bills?.totalCurrentCongress;
  const rollCallVotesCount =
    summary?.data?.votes?.totalResults ?? summary?.data?.votes?.votes?.length;
  const totalRaised = summary?.data?.finance?.totalRaised;
  const financeCycle =
    summary?.data?.finance?.cycle ??
    summary?.data?.finance?.metadata?.matchedCycle ??
    summary?.data?.finance?.metadata?.dataFromCycle;
  const raisedLabel = totalRaised !== undefined ? formatCurrencyShort(totalRaised) : null;

  const hasDcOffice = !!(r.contact?.dcOffice ?? r.currentTerm?.address ?? r.currentTerm?.phone);
  const districtOfficeCount = r.contact?.districtOffices?.length ?? 0;
  const officesTotal = (hasDcOffice ? 1 : 0) + districtOfficeCount;
  const websiteHost = r.website
    ? r.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : undefined;

  const dataAsOf = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        padding: '32px 36px 56px',
        maxWidth: 1200,
        margin: '0 auto',
      }}
    >
      {isHistorical && (
        <div
          style={{
            borderLeft: '6px solid var(--color-warning)',
            border: '2px solid var(--ink)',
            background: 'var(--bg2)',
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
          role="note"
          aria-label="Historical record notice"
        >
          <CqLabel color="amber">Historical record</CqLabel>
          <span style={{ fontSize: 13, color: 'var(--fg1)', lineHeight: 1.4 }}>
            Former {role} · no longer in Congress
            {leftOfficeYear ? ` (left office ${leftOfficeYear})` : ''}. Current-Congress stats and
            recent activity below will be empty.
          </span>
        </div>
      )}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 14,
        }}
      >
        <CqLabel>
          ← {isHistorical ? 'Historical' : 'Federal'} · {r.chamber} · {r.state}
          {r.district ? ` · District ${r.district}` : ''}
        </CqLabel>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {SOURCES.map(s => (
            <CqSourceTag key={s.name} compact source={s.name} id={s.id} />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px 1fr 220px',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <CqPortrait
          name={r.name}
          size={120}
          party={pKey}
          src={r.imageUrl}
          alt={`${r.name} portrait`}
        />
        <div>
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 12,
              alignItems: 'center',
              flexWrap: 'wrap',
            }}
          >
            <CqChip variant={pKey} size="sm">
              {partyLong(r.party)} · {districtLabel}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {role}
            </CqChip>
            {currentTerm?.stateRank && (
              <CqChip variant="info" filled={false} size="sm">
                {currentTerm.stateRank} senator
              </CqChip>
            )}
          </div>
          <h1
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.0,
              margin: '0 0 8px',
              textTransform: 'uppercase',
            }}
          >
            {r.name}
          </h1>
          <p
            style={{
              fontSize: 14,
              color: 'var(--fg2)',
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {since ? `In office since ${since}` : 'Tenure unavailable'}
            {nextElection ? ` · Next election ${nextElection}` : ''}
            {currentCongress ? ` · ${currentCongress} Congress` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <CqButton variant="secondary" size="sm">
            Compare
          </CqButton>
          {r.website && (
            <a
              href={r.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <CqButton variant="primary" size="sm">
                Contact rep →
              </CqButton>
            </a>
          )}
          <span
            style={{
              fontSize: 10,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginTop: 4,
              textAlign: 'right',
            }}
          >
            {officesTotal > 0
              ? `${officesTotal} office${officesTotal === 1 ? '' : 's'}`
              : 'Offices unlisted'}
            {websiteHost ? ` · ${websiteHost}` : ''}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <StatCell index={0}>
          <CqStat
            label="Bills sponsored"
            value={
              summaryLoading
                ? '…'
                : billsSponsoredCount !== undefined && billsSponsoredCount > 0
                  ? billsSponsoredCount
                  : '—'
            }
            caption={
              summaryLoading
                ? 'Loading…'
                : billsSponsoredCount !== undefined && billsSponsoredCount > 0
                  ? `${currentCongress ?? 119} Congress`
                  : 'Data unavailable'
            }
          />
        </StatCell>
        <StatCell index={1}>
          <CqStat
            label="Roll-call votes"
            value={
              summaryLoading
                ? '…'
                : rollCallVotesCount !== undefined && rollCallVotesCount > 0
                  ? rollCallVotesCount
                  : '—'
            }
            caption={
              summaryLoading
                ? 'Loading…'
                : rollCallVotesCount !== undefined && rollCallVotesCount > 0
                  ? 'Recent floor votes'
                  : 'Data unavailable'
            }
          />
        </StatCell>
        <StatCell index={2}>
          <CqStat
            label="Raised, cycle"
            value={summaryLoading ? '…' : (raisedLabel ?? '—')}
            color="blue"
            caption={
              summaryLoading
                ? 'Loading…'
                : raisedLabel
                  ? `${financeCycle ?? 2024} cycle · FEC`
                  : 'Data unavailable'
            }
          />
        </StatCell>
        <StatCell index={3}>
          <CqStat
            label="Committees"
            value={committeesCount > 0 ? committeesCount : '—'}
            caption={
              committeesCount > 0
                ? r.committees
                    ?.slice(0, 2)
                    .map(c => c.name)
                    .join(', ')
                : 'Data unavailable'
            }
          />
        </StatCell>
        <StatCell index={4}>
          <CqStat
            label="Caucuses"
            value={caucusesCount > 0 ? caucusesCount : '—'}
            caption={caucusesCount > 0 ? 'House caucus disclosures' : 'Data unavailable'}
          />
        </StatCell>
      </div>

      <ContactStrip representative={r} />

      <div
        role="tablist"
        aria-label="Profile sections"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          background: 'var(--bg1)',
          display: 'flex',
          borderTop: '2px solid var(--ink)',
          borderBottom: '2px solid var(--ink)',
          flexWrap: 'wrap',
        }}
      >
        {TABS.map(([k, label]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${k}`}
              id={`tab-${k}`}
              onClick={() => setTab(k)}
              style={{
                background: active ? 'var(--ink)' : 'transparent',
                color: active ? '#fff' : 'var(--fg1)',
                border: 0,
                padding: '14px 18px',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                cursor: 'pointer',
                fontFamily: 'var(--font-primary)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        id={`panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`tab-${tab}`}
        style={{ paddingTop: 24 }}
      >
        {tab === 'record' && <RecordPanel representative={r} />}
        {tab === 'money' && <MoneyPanel representative={r} />}
        {tab === 'bills' && <BillsPanel representative={r} />}
        {tab === 'committees' && <CommitteesPanel representative={r} />}
        {tab === 'meetings' && <MeetingsPanel representative={r} />}
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.96}
          asof={dataAsOf}
          method="Direct ingestion · Congress.gov, FEC.gov, Senate LDA"
        />
      </div>
    </div>
  );
}

function StatCell({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div style={{ padding: '20px 18px', borderLeft: index === 0 ? 0 : '1px solid var(--line)' }}>
      {children}
    </div>
  );
}

'use client';

import { useState } from 'react';
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

  const committeesCount = r.committees?.length ?? 0;
  const caucusesCount = r.caucuses?.length ?? 0;

  const dcOffices = r.contact?.dcOffice ? 1 : 0;
  const districtOfficeCount = r.contact?.districtOffices?.length ?? 0;
  const officesTotal = dcOffices + districtOfficeCount;
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
          ← Federal · {r.chamber} · {r.state}
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
            value={<UnknownStat caption="Loaded from /bills" />}
            caption="Loads with panel"
          />
        </StatCell>
        <StatCell index={1}>
          <CqStat
            label="Roll-call votes"
            value={<UnknownStat caption="Loaded from /votes" />}
            caption="Loads with panel"
          />
        </StatCell>
        <StatCell index={2}>
          <CqStat
            label="Raised, cycle"
            value={<UnknownStat caption="Loaded from /finance" />}
            color="blue"
            caption="Loads with panel"
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

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          borderBottom: '2px solid var(--ink)',
          background: 'var(--bg2)',
        }}
      >
        {[
          { l: `Votes w/ ${partyLong(r.party)}`, v: '—', c: 'var(--fg4)' },
          { l: 'Votes w/ chamber majority', v: '—', c: 'var(--fg4)' },
          { l: 'Bipartisan co-sponsorships', v: '—', c: 'var(--fg4)' },
        ].map((row, i) => (
          <div
            key={row.l}
            style={{
              padding: '10px 18px',
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <CqLabel>{row.l}</CqLabel>
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: row.c,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {row.v}
            </span>
          </div>
        ))}
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

function UnknownStat({ caption }: { caption: string }) {
  return (
    <span
      title={caption}
      style={{
        color: 'var(--fg4)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      —
    </span>
  );
}

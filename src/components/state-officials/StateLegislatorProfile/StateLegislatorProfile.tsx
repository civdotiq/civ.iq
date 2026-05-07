/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

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
import { partyKey, partyLong } from './types';
import type { StateLegislatorProfileProps } from './types';

type TabKey = 'record' | 'money' | 'bills' | 'committees';

const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['record', 'Voting record'],
  ['money', 'Money'],
  ['bills', 'Bills sponsored'],
  ['committees', 'Committees'],
];

const SOURCES: ReadonlyArray<{ name: string; id?: string }> = [
  { name: 'OpenStates', id: 'legislator' },
  { name: 'Wikidata', id: 'biography' },
  { name: 'State website', id: 'roster' },
];

export function StateLegislatorProfile({
  legislator: l,
  legislatorIdBase64,
  stateCode,
  stateName,
}: StateLegislatorProfileProps) {
  const [tab, setTab] = useState<TabKey>('record');
  const pKey = partyKey(l.party);
  const role = l.chamber === 'upper' ? 'State Senator' : 'State Representative';
  const districtLabel = l.district ? `${stateCode}-${l.district}` : stateCode;

  const currentTerm = l.currentTerm;
  const since = (l.terms ?? [])[0]?.startYear ?? currentTerm?.start?.slice(0, 4);
  const termEnd = currentTerm?.end?.slice(0, 4);
  const sessionLabel = currentTerm
    ? `${currentTerm.start.slice(0, 4)}–${termEnd ?? ''}`
    : undefined;

  const committeesCount = l.committees?.length ?? 0;
  const leadershipCount = l.leadershipRoles?.length ?? 0;

  const sponsoredCount = l.legislation?.sponsored;
  const cosponsoredCount = l.legislation?.cosponsored;
  const totalVotes = l.votingRecord?.totalVotes;

  const districtOfficeCount = l.contact?.districtOffices?.length ?? 0;
  const capitolOffice = l.contact?.capitolOffice ? 1 : 0;
  const officesTotal = capitolOffice + districtOfficeCount;
  const websiteHost = l.website
    ? l.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
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
        maxWidth: 1280,
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
          ← State · {stateName} · {l.chamber === 'upper' ? 'Senate' : 'House'} · District{' '}
          {l.district}
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
        <CqPortrait name={l.name} size={120} party={pKey} alt={`${l.name} portrait`} />
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
              {partyLong(l.party)} · {districtLabel}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {role}
            </CqChip>
            <CqChip variant="ink" filled size="sm">
              State
            </CqChip>
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
            {l.name}
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
            {termEnd ? ` · Term ends ${termEnd}` : ''}
            {sessionLabel ? ` · ${sessionLabel} session` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <CqButton variant="secondary" size="sm">
            Compare
          </CqButton>
          {l.website && (
            <a
              href={l.website}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <CqButton variant="primary" size="sm">
                Contact legislator →
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
            value={typeof sponsoredCount === 'number' ? sponsoredCount : '—'}
            caption={
              typeof cosponsoredCount === 'number'
                ? `${cosponsoredCount} co-sponsored`
                : 'Loads with panel'
            }
          />
        </StatCell>
        <StatCell index={1}>
          <CqStat
            label="Floor votes"
            value={typeof totalVotes === 'number' ? totalVotes : '—'}
            caption="OpenStates · this session"
          />
        </StatCell>
        <StatCell index={2}>
          <CqStat
            label="Raised, cycle"
            value={<UnknownStat caption="State finance pending" />}
            color="blue"
            caption="FollowTheMoney unavailable"
          />
        </StatCell>
        <StatCell index={3}>
          <CqStat
            label="Committees"
            value={committeesCount > 0 ? committeesCount : '—'}
            caption={
              committeesCount > 0
                ? l.committees
                    ?.slice(0, 2)
                    .map(c => c.name)
                    .join(', ')
                : 'Data unavailable'
            }
          />
        </StatCell>
        <StatCell index={4}>
          <CqStat
            label="Leadership"
            value={leadershipCount > 0 ? leadershipCount : '—'}
            caption={leadershipCount > 0 ? 'Chamber roles' : 'No leadership roles'}
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
          { l: `Yes votes (${partyLong(l.party).toLowerCase()})`, v: '—' },
          { l: 'Bills passed chamber', v: '—' },
          { l: 'Cross-aisle co-sponsorships', v: '—' },
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
                color: 'var(--fg4)',
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
              }}
            >
              {row.v}
            </span>
          </div>
        ))}
      </div>

      <ContactStrip legislator={l} />

      <div
        role="tablist"
        aria-label="Legislator profile sections"
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
        {tab === 'record' && (
          <RecordPanel
            legislator={l}
            legislatorIdBase64={legislatorIdBase64}
            stateCode={stateCode}
          />
        )}
        {tab === 'money' && <MoneyPanel />}
        {tab === 'bills' && (
          <BillsPanel legislatorIdBase64={legislatorIdBase64} stateCode={stateCode} />
        )}
        {tab === 'committees' && <CommitteesPanel legislator={l} />}
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.92}
          asof={dataAsOf}
          method="Direct ingestion · OpenStates · Wikidata · state legislature website"
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

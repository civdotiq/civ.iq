'use client';

import { useState } from 'react';
import { CqButton, CqChip, CqDisclaimer, CqLabel, CqSourceTag, CqStat } from '@/components/cq';
import { CommitteeMark } from './CommitteeMark';
import { CompositionAside, LeadershipCallout, MembersPanel } from './MembersPanel';
import { BillsPanel } from './BillsPanel';
import { HearingsPanel } from './HearingsPanel';
import { SubsPanel } from './SubsPanel';
import { committeeAbbr, formatDate, formatYear } from './helpers';
import type { CommitteeDetailProps } from './types';

type TabKey = 'members' | 'bills' | 'hearings' | 'subs';

const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['members', 'Members'],
  ['bills', 'Bills referred'],
  ['hearings', 'Hearings'],
  ['subs', 'Subcommittees'],
];

const SOURCES: ReadonlyArray<{ name: string; id?: string }> = [
  { name: 'Congress.gov', id: 'committee API' },
  { name: 'House Clerk', id: 'rosters' },
  { name: 'Senate Clerk', id: 'rosters' },
];

export function CommitteeDetail({ committee, activity, committeeId }: CommitteeDetailProps) {
  const [tab, setTab] = useState<TabKey>('members');

  const memberCount = committee.members?.length ?? 0;
  const subCount = committee.subcommittees?.length ?? 0;
  const billsCount = activity.bills.length;
  const meetingsCount = activity.meetings.length;
  const established = formatYear(committee.established);
  const dataAsOf = formatDate(committee.lastUpdated || activity.fetchedAt);
  const congressLabel =
    activity.bills[0]?.billId.split('-')[0] ?? new Date().getUTCFullYear().toString();
  const abbr = committeeAbbr(committee, committeeId);

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
        <CqLabel>← Federal · {committee.chamber} · Committees</CqLabel>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {SOURCES.map(s => (
            <CqSourceTag key={s.name} compact source={s.name} id={s.id} />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '120px minmax(0, 1fr) 220px',
          gap: 32,
          alignItems: 'flex-start',
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <CommitteeMark abbr={abbr} congress={`119th`} />

        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <CqChip variant="info" filled={false} size="sm">
              {committee.chamber} · {committee.type}
            </CqChip>
            {subCount > 0 && (
              <CqChip variant="ink" filled={false} size="sm">
                {subCount} subcommittee{subCount === 1 ? '' : 's'}
              </CqChip>
            )}
            {memberCount > 0 && (
              <CqChip variant="ink" filled={false} size="sm">
                {memberCount} members
              </CqChip>
            )}
          </div>
          <h1
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.05,
              margin: '0 0 10px',
              textTransform: 'uppercase',
              wordBreak: 'break-word',
            }}
          >
            {committee.name}
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
            {committee.established ? `Established ${established} · ` : ''}
            {committee.jurisdiction
              ? `Jurisdiction: ${committee.jurisdiction}`
              : 'Jurisdiction unavailable'}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          {committee.url ? (
            <a
              href={committee.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <CqButton variant="primary" size="sm">
                Congress.gov →
              </CqButton>
            </a>
          ) : (
            <CqButton variant="primary" size="sm" disabled>
              Source unavailable
            </CqButton>
          )}
          <span
            style={{
              fontSize: 10,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: 'var(--tracking-label)',
              textTransform: 'uppercase',
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            File · {committeeId.toUpperCase()}
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
          borderBottom: '1px solid var(--line)',
        }}
      >
        <StatCell index={0}>
          <CqStat
            label="Members"
            value={memberCount > 0 ? memberCount : '—'}
            caption={memberCount > 0 ? membershipCaption(committee) : 'Roster pending'}
            size={32}
          />
        </StatCell>
        <StatCell index={1}>
          <CqStat
            label="Subcommittees"
            value={subCount}
            caption={subCount > 0 ? 'Standing subordinate panels' : 'None'}
            size={32}
          />
        </StatCell>
        <StatCell index={2}>
          <CqStat
            label="Recent bills"
            value={billsCount > 0 ? billsCount : '—'}
            caption={billsCount > 0 ? 'Last 180 days · Congress.gov' : 'No recent referrals'}
            size={32}
          />
        </StatCell>
        <StatCell index={3}>
          <CqStat
            label="Recent meetings"
            value={meetingsCount > 0 ? meetingsCount : '—'}
            caption={meetingsCount > 0 ? `As of ${formatDate(activity.fetchedAt)}` : 'None listed'}
            size={32}
          />
        </StatCell>
        <StatCell index={4}>
          <CqStat
            label="Established"
            value={established === '—' ? '—' : established}
            caption={established === '—' ? 'Date unavailable' : `${committee.chamber} chamber`}
            color="blue"
            size={32}
          />
        </StatCell>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          borderBottom: '2px solid var(--ink)',
          background: 'var(--bg2)',
        }}
      >
        <KeyValueRow
          index={0}
          label="Chair"
          value={committee.leadership.chair?.representative.name ?? '—'}
        />
        <KeyValueRow
          index={1}
          label="Ranking"
          value={committee.leadership.rankingMember?.representative.name ?? '—'}
        />
        <KeyValueRow index={2} label="Type" value={committee.type} />
      </div>

      <div
        role="tablist"
        aria-label="Committee sections"
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
        {tab === 'members' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 320px',
              gap: 32,
              alignItems: 'flex-start',
            }}
          >
            <MembersPanel committee={committee} />
            <aside>
              <CompositionAside committee={committee} />
              <LeadershipCallout committee={committee} />
            </aside>
          </div>
        )}
        {tab === 'bills' && <BillsPanel bills={activity.bills} congress={congressLabel} />}
        {tab === 'hearings' && (
          <HearingsPanel meetings={activity.meetings} fetchedAt={activity.fetchedAt} />
        )}
        {tab === 'subs' && <SubsPanel committee={committee} />}
      </div>

      <div style={{ marginTop: 36, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.95}
          asof={dataAsOf}
          method="Direct ingestion · Congress.gov + House/Senate Clerks"
        />
      </div>
    </div>
  );
}

function StatCell({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '20px 18px',
        borderLeft: index === 0 ? 0 : '1px solid var(--line)',
        minWidth: 0,
      }}
    >
      {children}
    </div>
  );
}

function KeyValueRow({ index, label, value }: { index: number; label: string; value: string }) {
  return (
    <div
      style={{
        padding: '10px 18px',
        borderLeft: index === 0 ? 0 : '1px solid var(--line)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        minWidth: 0,
      }}
    >
      <CqLabel>{label}</CqLabel>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: value === '—' ? 'var(--fg4)' : 'var(--fg1)',
          fontVariantNumeric: 'tabular-nums',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

function membershipCaption(committee: {
  members: { representative: { party: string } }[];
}): string {
  let d = 0;
  let r = 0;
  let i = 0;
  for (const m of committee.members) {
    const p = (m.representative.party ?? '').toLowerCase();
    if (p.startsWith('d')) d += 1;
    else if (p.startsWith('r')) r += 1;
    else i += 1;
  }
  const parts = [`${d}D`, `${r}R`];
  if (i > 0) parts.push(`${i}I`);
  return parts.join(' · ');
}

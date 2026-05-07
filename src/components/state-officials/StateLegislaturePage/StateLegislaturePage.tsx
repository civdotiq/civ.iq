/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqChip, CqDisclaimer, CqLabel, CqSourceTag, CqStat } from '@/components/cq';
import { StateMark } from '@/components/states/StateOverview/StateMark';
import type {
  StateChamberSummary,
  StateLegislatureCalendarEvent,
  StateLegislaturePageData,
  StateLegislatureRecentBill,
} from './types';

const SOURCES: ReadonlyArray<{ name: string; id?: string }> = [
  { name: 'OpenStates', id: 'state legislature' },
  { name: 'Wikidata', id: 'leadership' },
];

interface StateLegislaturePageProps {
  data: StateLegislaturePageData;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatShortDate(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function StateLegislaturePage({ data }: StateLegislaturePageProps) {
  const {
    stateCode,
    stateName,
    upper,
    lower,
    totalSeats,
    isUnicameral,
    session,
    upcomingEvents,
    recentBills,
    fetchedAt,
  } = data;

  const dataAsOf = formatDate(fetchedAt);

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
        <Link
          href={`/states/${stateCode.toLowerCase()}`}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← {stateName} overview
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {SOURCES.map(s => (
            <CqSourceTag key={s.name} compact source={s.name} id={s.id} />
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '160px 1fr 280px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <StateMark abbr={stateCode} size={160} />
        <div>
          <CqLabel>
            {isUnicameral ? 'Unicameral' : 'Bicameral'}
            {session?.name ? ` · ${session.name}` : ''}
            {totalSeats > 0 ? ` · ${totalSeats} members` : ''}
          </CqLabel>
          <h1
            style={{
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 0.95,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            {stateName}
            <br />
            Legislature
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
            {session?.startDate
              ? `Convened ${formatDate(session.startDate)}`
              : 'Session dates unavailable'}
            {session?.endDate ? ` · Adjournment ${formatDate(session.endDate)}` : ''}
          </p>
        </div>
        <aside style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <CqLabel>Session at a glance</CqLabel>
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
              ['Status', session?.status ?? '—'],
              ['Days into session', session?.daysIntoSession ?? '—'],
              ['Days until adjourn', session?.daysUntilAdjournment ?? '—'],
              ['Total members', totalSeats > 0 ? totalSeats : '—'],
            ].map(([k, v], i) => (
              <li
                key={String(k)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                <span style={{ color: 'var(--fg3)' }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: lower ? '1fr 1fr' : '1fr',
          gap: 0,
          marginTop: 32,
          border: '2px solid var(--ink)',
        }}
      >
        {upper && <ChamberCard chamber={upper} chamberKind="upper" first />}
        {lower && <ChamberCard chamber={lower} chamberKind="lower" first={!upper} />}
      </div>

      {!upper && !lower && (
        <div
          style={{
            marginTop: 32,
            border: '2px solid var(--ink)',
            padding: 28,
            textAlign: 'center',
            fontSize: 13,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Data unavailable — chamber composition not returned by OpenStates for this jurisdiction.
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32,
          marginTop: 32,
        }}
      >
        <CalendarSection events={upcomingEvents} />
        <RecentBillsSection bills={recentBills} stateCode={stateCode} />
      </div>

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.92}
          asof={dataAsOf}
          method="Direct ingestion · OpenStates · state legislature website"
        />
      </div>
    </div>
  );
}

function ChamberCard({
  chamber,
  chamberKind,
  first,
}: {
  chamber: StateChamberSummary;
  chamberKind: 'upper' | 'lower';
  first: boolean;
}) {
  const total = chamber.totalSeats;
  const dem = chamber.democraticSeats;
  const rep = chamber.republicanSeats;
  const other = chamber.otherSeats;
  const cols = chamberKind === 'upper' ? Math.min(21, total) : Math.min(30, total);
  const demLead = dem > rep;
  const majority = demLead ? 'd' : rep > dem ? 'r' : 'i';
  const majorityLabel =
    majority === 'd' ? 'D Majority' : majority === 'r' ? 'R Majority' : 'No majority';

  return (
    <div
      style={{
        padding: 24,
        borderLeft: first ? 0 : '2px solid var(--ink)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
        }}
      >
        <div>
          <CqLabel>State {chamberKind === 'upper' ? 'Senate' : 'House'}</CqLabel>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              marginTop: 4,
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            {chamber.name}
          </div>
        </div>
        <CqChip variant={majority} filled size="sm">
          {majorityLabel}
        </CqChip>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gap: 3,
          padding: 12,
          background: 'var(--bg2)',
          border: '1px solid var(--line)',
          marginTop: 8,
        }}
        aria-hidden="true"
      >
        {Array.from({ length: total }, (_, k) => {
          const color =
            k < dem
              ? 'var(--civiq-green)'
              : k < dem + other
                ? 'var(--data-vlau)'
                : 'var(--civiq-red)';
          return <div key={k} style={{ aspectRatio: '1', background: color }} />;
        })}
      </div>

      <div
        style={{
          marginTop: 12,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }}
      >
        <CqStat
          label="Democrat"
          value={dem}
          caption={`${total > 0 ? Math.round((dem / total) * 100) : 0}%${demLead ? ' · majority' : ''}`}
          color="green"
          size={24}
        />
        <CqStat
          label="Republican"
          value={rep}
          caption={`${total > 0 ? Math.round((rep / total) * 100) : 0}%${rep > dem ? ' · majority' : ''}`}
          color="red"
          size={24}
        />
        <CqStat label="Total seats" value={total} caption={chamber.title || '—'} size={24} />
      </div>
    </div>
  );
}

function CalendarSection({ events }: { events: StateLegislatureCalendarEvent[] }) {
  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <CqLabel>Session calendar · upcoming</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Next sessions + hearings</div>
      </div>
      {events.length === 0 ? (
        <div
          style={{
            border: '2px solid var(--ink)',
            padding: 24,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Data unavailable — OpenStates returned no upcoming events.
        </div>
      ) : (
        <div style={{ border: '2px solid var(--ink)' }}>
          {events.map((e, i) => (
            <div
              key={e.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '80px 1fr',
                gap: 14,
                padding: '14px 16px',
                borderTop: i === 0 ? 0 : '1px solid var(--line)',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--civiq-blue-active)',
                  letterSpacing: 'var(--tracking-label)',
                  textTransform: 'uppercase',
                }}
              >
                {formatShortDate(e.start_date)}
              </span>
              <div>
                <div style={{ fontSize: 13 }}>{e.name}</div>
                {e.location?.name && (
                  <div
                    style={{
                      fontSize: 10,
                      color: 'var(--fg3)',
                      fontFamily: 'var(--font-mono)',
                      marginTop: 2,
                    }}
                  >
                    {e.location.name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecentBillsSection({
  bills,
  stateCode,
}: {
  bills: StateLegislatureRecentBill[];
  stateCode: string;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 14,
        }}
      >
        <div>
          <CqLabel>Recent activity · both chambers</CqLabel>
          <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Bills moving</div>
        </div>
        <Link
          href={`/state-bills/${stateCode}`}
          style={{
            fontSize: 11,
            color: 'var(--civiq-blue-active)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          All bills →
        </Link>
      </div>
      {bills.length === 0 ? (
        <div
          style={{
            border: '2px solid var(--ink)',
            padding: 24,
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Data unavailable — OpenStates returned no recent bills.
        </div>
      ) : (
        <div style={{ border: '2px solid var(--ink)' }}>
          {bills.map((b, i) => {
            const passed = b.status?.toLowerCase().startsWith('passed');
            return (
              <div
                key={b.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 1fr 90px',
                  gap: 12,
                  padding: '14px 16px',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700 }}>
                  {b.identifier}
                </span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{b.title}</div>
                  {b.sponsorName && (
                    <div
                      style={{
                        fontSize: 10,
                        color: 'var(--fg3)',
                        fontFamily: 'var(--font-mono)',
                        marginTop: 2,
                      }}
                    >
                      Sponsor: {b.sponsorName}
                      {b.sponsorParty
                        ? ` (${b.sponsorParty.toUpperCase()}${b.sponsorDistrict ? `-${b.sponsorDistrict}` : ''})`
                        : ''}
                    </div>
                  )}
                </div>
                <CqChip variant={passed ? 'd' : 'info'} filled={passed} size="sm">
                  {b.status}
                </CqChip>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

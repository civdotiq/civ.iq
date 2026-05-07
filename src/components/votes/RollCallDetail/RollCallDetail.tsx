/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import {
  CqChip,
  CqDisclaimer,
  CqLabel,
  CqPlainReading,
  CqSourceTag,
  CqStat,
} from '@/components/cq';
import { LegislativeEventSchema, BreadcrumbSchema } from '@/components/seo/JsonLd';
import { VoteFooter } from '@/components/seo/VoteFooter';
import { MemberGrid } from './MemberGrid';
import type { PartyTally, RollCallDetailData } from './types';

interface RollCallDetailProps {
  data: RollCallDetailData;
}

function ordinal(n: number | string): string {
  const num = typeof n === 'string' ? parseInt(n, 10) : n;
  if (!Number.isFinite(num)) return String(n);
  const v = num % 100;
  if (v >= 11 && v <= 13) return `${num}th`;
  switch (num % 10) {
    case 1:
      return `${num}st`;
    case 2:
      return `${num}nd`;
    case 3:
      return `${num}rd`;
    default:
      return `${num}th`;
  }
}

function sessionLabel(session: string): string {
  if (!session) return '';
  if (session === '1' || session === '2') return `${ordinal(session)} session`;
  return session;
}

function formatRecorded(date: string, time?: string): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return time ? `${date} · ${time}` : date;
  const datePart = parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return time ? `${datePart} · ${time}` : datePart;
}

function pct(value: number, total: number): string {
  if (!total) return '—';
  return `${Math.round((value / total) * 100)}%`;
}

function outcomeChipVariant(result: string): 'd' | 'r' | 'info' {
  const normalized = result.toLowerCase();
  if (
    normalized.includes('passed') ||
    normalized.includes('agreed') ||
    normalized.includes('confirmed')
  ) {
    return 'd';
  }
  if (normalized.includes('failed') || normalized.includes('rejected')) {
    return 'r';
  }
  return 'info';
}

function PartyBreakdownCard({
  partyKey,
  label,
  tally,
  accent,
}: {
  partyKey: 'D' | 'R' | 'I';
  label: string;
  tally: PartyTally;
  accent: string;
}) {
  if (tally.total === 0) return null;
  const cohesion = tally.total
    ? Math.round((Math.max(tally.yea, tally.nay) / tally.total) * 100)
    : 0;
  const yeaWidth = tally.total ? `${(tally.yea / tally.total) * 100}%` : '0%';
  const nayWidth = tally.total ? `${(tally.nay / tally.total) * 100}%` : '0%';

  return (
    <div style={{ border: '2px solid var(--ink)', background: 'var(--bg1)' }}>
      <div
        style={{
          background: accent,
          color: '#fff',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
          }}
        >
          {label} caucus
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
          {tally.total} member{tally.total === 1 ? '' : 's'} voted
        </span>
      </div>
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14 }}>
          <CqStat label="Yea" value={tally.yea} color="green" size={28} />
          <CqStat label="Nay" value={tally.nay} color="red" size={28} />
          <CqStat label="Present" value={tally.present} color="ink" size={28} />
          <CqStat label="Not voting" value={tally.absent} color="ink" size={28} />
        </div>
        <div style={{ display: 'flex', height: 8, marginTop: 14, background: 'var(--bg3)' }}>
          <div style={{ width: yeaWidth, background: 'var(--civiq-green)' }} />
          <div style={{ width: nayWidth, background: 'var(--civiq-red)' }} />
        </div>
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          Cohesion · {cohesion}%
          <span aria-hidden="true" style={{ display: 'none' }}>
            {partyKey}
          </span>
        </div>
      </div>
    </div>
  );
}

function buildPlainReading(data: RollCallDetailData): string {
  const { vote, partyTallies, totals } = data;
  const chamber = vote.chamber;
  const result = vote.result || 'Pending';
  const dCohesion = partyTallies.democrat.total
    ? Math.round(
        (Math.max(partyTallies.democrat.yea, partyTallies.democrat.nay) /
          partyTallies.democrat.total) *
          100
      )
    : 0;
  const rCohesion = partyTallies.republican.total
    ? Math.round(
        (Math.max(partyTallies.republican.yea, partyTallies.republican.nay) /
          partyTallies.republican.total) *
          100
      )
    : 0;

  if (totals.total === 0) {
    return `${chamber} roll call recorded. Member-level positions are still being parsed.`;
  }
  return `${chamber} roll call ${result.toLowerCase()} with ${totals.yea} yea and ${totals.nay} nay across ${totals.voting} members voting. Democratic cohesion ${dCohesion}%, Republican cohesion ${rCohesion}%.`;
}

function billLink(data: RollCallDetailData): string | null {
  const bill = data.vote.bill;
  if (!bill?.number) return null;
  const billType =
    bill.type?.toLowerCase().replace(/\./g, '') || (data.vote.chamber === 'House' ? 'hr' : 's');
  const billNumber = bill.number.replace(/[^\d]/g, '');
  if (!billNumber) return null;
  return `/bill/${data.vote.congress}-${billType}-${billNumber}`;
}

export function RollCallDetail({ data }: RollCallDetailProps) {
  const { vote, totals, partyTallies, voteId } = data;
  const dataAsOf = formatRecorded(vote.metadata?.processingDate ?? vote.date, undefined);
  const recordedAt = formatRecorded(vote.date, vote.time);
  const billHref = billLink(data);

  const headlineLabel = `Roll call · ${ordinal(vote.congress)} Congress${
    vote.session ? ` · ${sessionLabel(vote.session)}` : ''
  }`;

  const sources = [
    {
      key: 'clerk',
      source: vote.chamber === 'House' ? 'House Clerk' : 'Senate.gov',
      id: `roll-call ${vote.rollNumber}`,
    },
    {
      key: 'congress',
      source: 'Congress.gov',
      id: vote.metadata?.apiUrl ? 'API' : `${vote.congress}/${vote.session}/${vote.rollNumber}`,
    },
  ];

  const yeaWidth = totals.voting ? `${(totals.yea / totals.voting) * 100}%` : '0%';
  const nayWidth = totals.voting ? `${(totals.nay / totals.voting) * 100}%` : '0%';

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
      <LegislativeEventSchema
        name={`${vote.chamber} Roll Call #${vote.rollNumber}: ${vote.title}`}
        description={`${vote.question} — Result: ${vote.result}. Yeas: ${vote.yeas}, Nays: ${vote.nays}.`}
        startDate={vote.date}
        url={`https://civdotiq.org/vote/${voteId}`}
        organizer={
          vote.chamber === 'Senate'
            ? 'United States Senate'
            : 'United States House of Representatives'
        }
      />
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Votes', url: 'https://civdotiq.org/legislation' },
          {
            name: `Roll Call #${vote.rollNumber}`,
            url: `https://civdotiq.org/vote/${voteId}`,
          },
        ]}
      />

      {/* Top rail: back-link + sources */}
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
          href={billHref ?? '/legislation'}
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 'var(--tracking-label)',
            textTransform: 'uppercase',
            color: 'var(--fg3)',
            textDecoration: 'none',
          }}
        >
          ← {billHref ? 'Back to bill' : 'All votes'}
        </Link>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {sources.map(s => (
            <CqSourceTag key={s.key} compact source={s.source} id={s.id} />
          ))}
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 320px',
          gap: 32,
          paddingBottom: 24,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <div>
          <CqLabel>{headlineLabel}</CqLabel>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 700,
              letterSpacing: 'var(--tracking-display)',
              lineHeight: 1.0,
              margin: '8px 0 12px',
              textTransform: 'uppercase',
            }}
          >
            {vote.title}
          </h1>
          <p
            style={{
              fontSize: 16,
              color: 'var(--fg2)',
              margin: 0,
              lineHeight: 1.5,
              maxWidth: 720,
            }}
          >
            Question: <strong style={{ color: 'var(--fg1)' }}>&ldquo;{vote.question}&rdquo;</strong>
          </p>
          <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <CqChip variant={outcomeChipVariant(vote.result)} filled size="sm">
              {vote.result}
            </CqChip>
            <CqChip variant="ink" filled={false} size="sm">
              {vote.chamber} · Roll call {vote.rollNumber}
            </CqChip>
            {vote.requiredMajority && (
              <CqChip variant="info" filled={false} size="sm">
                {vote.requiredMajority} required
              </CqChip>
            )}
          </div>
        </div>
        <aside style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <CqLabel>Vote document</CqLabel>
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
              ['Recorded', recordedAt],
              ['Chamber', vote.chamber],
              ['Congress', `${ordinal(vote.congress)} · session ${vote.session}`],
              [
                'Question',
                vote.question.length > 36 ? `${vote.question.slice(0, 33)}…` : vote.question,
              ],
              ['Required', vote.requiredMajority ?? 'Simple majority'],
              ['Outcome', vote.result || '—'],
            ].map(([k, v], i) => (
              <li
                key={k}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '6px 0',
                  borderTop: i === 0 ? 0 : '1px solid var(--line)',
                }}
              >
                <span style={{ color: 'var(--fg3)' }}>{k}</span>
                <span style={{ fontWeight: 700, color: 'var(--fg1)', textAlign: 'right' }}>
                  {v}
                </span>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Tally */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          borderBottom: '1px solid var(--line)',
        }}
      >
        {[
          {
            key: 'yea',
            label: 'Yea',
            value: totals.yea,
            color: 'green' as const,
            caption: `${pct(totals.yea, totals.voting)} of voting`,
          },
          {
            key: 'nay',
            label: 'Nay',
            value: totals.nay,
            color: 'red' as const,
            caption: `${pct(totals.nay, totals.voting)} of voting`,
          },
          {
            key: 'present',
            label: 'Present',
            value: totals.present,
            color: 'ink' as const,
            caption: 'Present, not voting',
          },
          {
            key: 'absent',
            label: 'Not voting',
            value: totals.absent,
            color: 'ink' as const,
            caption: 'Absent or excused',
          },
        ].map((s, i) => (
          <div
            key={s.key}
            style={{
              padding: '20px 18px',
              borderLeft: i === 0 ? 0 : '1px solid var(--line)',
            }}
          >
            <CqStat label={s.label} value={s.value} caption={s.caption} color={s.color} size={36} />
          </div>
        ))}
      </div>

      {/* Tally bar */}
      <div
        style={{
          display: 'flex',
          height: 40,
          border: '2px solid var(--ink)',
          marginTop: 20,
          background: 'var(--bg2)',
        }}
      >
        {totals.yea > 0 && (
          <div
            style={{
              width: yeaWidth,
              background: 'var(--civiq-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRight: totals.nay > 0 ? '2px solid var(--ink)' : 0,
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                letterSpacing: 'var(--tracking-label)',
              }}
            >
              {totals.yea} YEA
            </span>
          </div>
        )}
        {totals.nay > 0 && (
          <div
            style={{
              width: nayWidth,
              background: 'var(--civiq-red)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                letterSpacing: 'var(--tracking-label)',
              }}
            >
              {totals.nay} NAY
            </span>
          </div>
        )}
      </div>

      {/* Party breakdown */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            partyTallies.independent.total > 0 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
          gap: 24,
          marginTop: 32,
        }}
      >
        <PartyBreakdownCard
          partyKey="D"
          label="Democrat"
          tally={partyTallies.democrat}
          accent="var(--civiq-green)"
        />
        <PartyBreakdownCard
          partyKey="R"
          label="Republican"
          tally={partyTallies.republican}
          accent="var(--civiq-red)"
        />
        <PartyBreakdownCard
          partyKey="I"
          label="Independent"
          tally={partyTallies.independent}
          accent="var(--civiq-blue-active)"
        />
      </div>

      {/* Member positions */}
      <div style={{ marginTop: 32 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div>
            <CqLabel>
              Member positions · {data.members.length} on record · vote totals shown above
            </CqLabel>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>How each member voted</div>
          </div>
          <div
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              color: 'var(--fg3)',
              maxWidth: 320,
              textAlign: 'right',
            }}
          >
            Color = party. Glyph = vote (✓ Yea / ✗ Nay / − Present / ○ Not voting).
          </div>
        </div>
        <MemberGrid members={data.members} />
      </div>

      {/* Plain reading */}
      <div style={{ marginTop: 28 }}>
        <CqPlainReading>{buildPlainReading(data)}</CqPlainReading>
      </div>

      {/* Bill context */}
      {vote.bill?.number && (
        <div
          style={{
            marginTop: 24,
            padding: '16px 18px',
            border: '2px solid var(--ink)',
            background: 'var(--bg1)',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <div>
            <CqLabel>About the bill</CqLabel>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, color: 'var(--fg1)' }}>
              {vote.bill.type ? `${vote.bill.type} ` : ''}
              {vote.bill.number}
              {vote.bill.title ? ` — ${vote.bill.title}` : ''}
            </div>
            {vote.bill.summary && (
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--fg2)',
                  marginTop: 8,
                  lineHeight: 1.5,
                }}
              >
                {vote.bill.summary}
              </p>
            )}
          </div>
          {billHref && (
            <Link
              href={billHref}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 'var(--tracking-label)',
                textTransform: 'uppercase',
                color: 'var(--civiq-blue-active)',
                textDecoration: 'none',
                whiteSpace: 'nowrap',
                border: '2px solid var(--civiq-blue-active)',
                padding: '8px 14px',
                borderRadius: 'var(--radius-interactive)',
              }}
            >
              View bill →
            </Link>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '2px solid var(--ink)' }}>
        <CqDisclaimer
          confidence={0.99}
          asof={dataAsOf}
          method={`Captured at vote close from ${vote.metadata?.source ?? 'official chamber XML'}`}
        >
          {' '}
          Late corrections, if any, are reflected when the official record is republished.
        </CqDisclaimer>
      </div>

      {/* SEO footer (preserved from legacy) */}
      <div style={{ marginTop: 32 }}>
        <VoteFooter
          chamber={vote.chamber}
          congress={vote.congress}
          rollNumber={vote.rollNumber}
          result={vote.result}
          date={vote.date}
          bill={
            vote.bill
              ? {
                  number: vote.bill.number,
                  type: vote.bill.type,
                  title: vote.bill.title,
                }
              : undefined
          }
          notableVoters={[]}
        />
      </div>
    </div>
  );
}

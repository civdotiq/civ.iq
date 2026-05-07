/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import { partyKey, partyLong, partyColorVar } from './types';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

interface RecordPanelProps {
  legislator: EnhancedStateLegislator;
  legislatorIdBase64: string;
  stateCode: string;
}

interface PersonVote {
  vote_id: string;
  identifier: string;
  motion_text: string;
  start_date: string;
  result: 'pass' | 'fail' | 'passed' | 'failed';
  option: 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused';
  bill_identifier: string | null;
  bill_title: string | null;
  bill_id: string | null;
  organization_name: string;
  chamber: 'upper' | 'lower';
}

interface VotesApiResponse {
  success: boolean;
  votes: PersonVote[];
  total: number;
  statistics: {
    total: number;
    yes: number;
    no: number;
    abstain: number;
    absent: number;
  };
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

function chipVariantFor(option: string): 'd' | 'r' | 'i' {
  if (option === 'yes') return 'd';
  if (option === 'no') return 'r';
  return 'i';
}

function optionLabel(option: string): string {
  if (option === 'yes') return 'Yes';
  if (option === 'no') return 'No';
  if (option === 'abstain') return 'Abstain';
  if (option === 'not voting') return 'NV';
  if (option === 'absent') return 'Absent';
  if (option === 'excused') return 'Excused';
  return '—';
}

function formatDate(date: string | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RecordPanel({ legislator: l, legislatorIdBase64, stateCode }: RecordPanelProps) {
  const pKey = partyKey(l.party);
  const pColor = partyColorVar(pKey);

  const { data, isLoading } = useSWR<VotesApiResponse>(
    `/api/state-legislature/${stateCode}/legislator/${legislatorIdBase64}/votes?page=1&per_page=20`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );

  const votes = data?.votes ?? [];
  const recent = votes.slice(0, 7);
  const totalVotes = data?.total ?? votes.length;
  const stats = data?.statistics;
  const yesPct = stats && stats.total > 0 ? Math.round((stats.yes / stats.total) * 100) : undefined;
  const mostRecent = recent[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
      <div>
        <PanelHeader
          eyebrow={
            totalVotes > 0
              ? `${totalVotes} floor vote${totalVotes === 1 ? '' : 's'} on file`
              : 'Voting record'
          }
          title="Recent floor votes"
          source={{ name: 'OpenStates', id: 'votes' }}
        />
        {isLoading ? (
          <div
            style={{
              padding: '40px 0',
              textAlign: 'center',
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}
          >
            Loading votes…
          </div>
        ) : recent.length === 0 ? (
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
            Data unavailable — no floor votes returned for this legislator.
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 80px 110px 110px',
                gap: 12,
                padding: '10px 0',
                borderTop: '2px solid var(--ink)',
                borderBottom: '1px solid var(--line)',
              }}
            >
              {['Bill', 'Title', 'Vote', 'Outcome', 'Date'].map(h => (
                <CqLabel key={h}>{h}</CqLabel>
              ))}
            </div>
            {recent.map((v, idx) => {
              const billNum = v.bill_identifier ?? v.identifier ?? '—';
              const title = v.bill_title ?? v.motion_text ?? '—';
              const outcome =
                typeof v.result === 'string'
                  ? v.result.charAt(0).toUpperCase() + v.result.slice(1)
                  : '—';
              return (
                <div
                  key={`${v.vote_id}-${idx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '110px 1fr 80px 110px 110px',
                    gap: 12,
                    padding: '14px 0',
                    borderBottom: '1px solid var(--line)',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{billNum}</span>
                  <span style={{ fontSize: 13 }}>{title}</span>
                  <CqChip variant={chipVariantFor(v.option)} size="sm" filled={false}>
                    {optionLabel(v.option)}
                  </CqChip>
                  <span style={{ fontSize: 11, color: 'var(--fg2)' }}>{outcome}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--fg3)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatDate(v.start_date)}
                  </span>
                </div>
              );
            })}
            {typeof yesPct === 'number' && stats && (
              <div style={{ marginTop: 16 }}>
                <CqPlainReading>
                  {l.lastName || l.name} voted yes on {yesPct}% of {stats.total} floor votes in the
                  most recent fetch from OpenStates.
                </CqPlainReading>
              </div>
            )}
          </>
        )}
      </div>

      <aside>
        <div style={{ border: '2px solid var(--ink)', padding: 18, marginBottom: 16 }}>
          <CqLabel>Vote breakdown</CqLabel>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <BreakdownRow
              label={`yes (with ${partyLong(l.party).toLowerCase()})`}
              count={stats?.yes}
              total={stats?.total}
              color={pColor}
            />
            <BreakdownRow label="no" count={stats?.no} total={stats?.total} color="var(--fg1)" />
            <BreakdownRow
              label="abstain / NV"
              count={stats?.abstain}
              total={stats?.total}
              color="var(--civiq-blue)"
            />
            <BreakdownRow
              label="absent"
              count={stats?.absent}
              total={stats?.total}
              color="var(--fg3)"
            />
          </div>
        </div>

        {mostRecent && (
          <div
            style={{
              borderLeft: '6px solid var(--civiq-blue)',
              background: 'var(--bg2)',
              padding: '14px 16px',
            }}
          >
            <CqLabel>Most recent vote</CqLabel>
            <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, lineHeight: 1.3 }}>
              {mostRecent.bill_identifier
                ? `${mostRecent.bill_identifier} · ${mostRecent.bill_title ?? mostRecent.motion_text ?? ''}`
                : (mostRecent.motion_text ?? '—')}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
              }}
            >
              {formatDate(mostRecent.start_date)} · {optionLabel(mostRecent.option)} ·{' '}
              {mostRecent.result ?? '—'}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function BreakdownRow({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number | undefined;
  total: number | undefined;
  color: string;
}) {
  const known = typeof count === 'number' && typeof total === 'number' && total > 0;
  const pct = known ? Math.round((count / total) * 100) : 0;
  const display = known ? `${count} · ${pct}%` : '—';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span
          style={{ fontFamily: 'var(--font-mono)', color: known ? 'var(--fg1)' : 'var(--fg4)' }}
        >
          {display}
        </span>
      </div>
      <div style={{ height: 6, background: 'var(--bg3)', marginTop: 4 }}>
        <div
          style={{ width: `${known ? pct : 0}%`, height: '100%', background: color }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

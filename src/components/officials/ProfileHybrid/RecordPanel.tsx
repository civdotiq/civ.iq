'use client';

import useSWR from 'swr';
import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import { partyKey, partyLong, partyColorVar } from './types';
import type { EnhancedRepresentative } from '@/types/representative';

interface RecordPanelProps {
  representative: EnhancedRepresentative;
}

interface VotePosition {
  rollNumber?: string | number;
  date?: string;
  chamber?: string;
  question?: string;
  description?: string;
  result?: string;
  position?: string;
  bill?: { number?: string; title?: string };
}

interface VotesResponse {
  votes?: VotePosition[];
  totalResults?: number;
}

interface BatchResponse {
  data?: { votes?: VotesResponse };
}

interface PartyAlignmentResponse {
  overall_alignment?: number;
  votes_with_party?: number;
  total_votes_analyzed?: number;
  metadata?: { dataSource?: string };
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

const batchVotes = (bioguideId: string) => async () => {
  const r = await fetch(`/api/representative/${bioguideId}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoints: ['votes'] }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

function chipStyleFor(position: string | undefined): {
  variant: 'ink' | 'i';
  filled: boolean;
} {
  if (position === 'Yea' || position === 'Yes') return { variant: 'ink', filled: true };
  if (position === 'Nay' || position === 'No') return { variant: 'ink', filled: false };
  return { variant: 'i', filled: false };
}

function formatDate(date: string | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RecordPanel({ representative: r }: RecordPanelProps) {
  const pKey = partyKey(r.party);
  const pColor = partyColorVar(pKey);

  const { data: batch, isLoading: batchLoading } = useSWR<BatchResponse>(
    `record-batch:${r.bioguideId}`,
    batchVotes(r.bioguideId),
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  const { data: alignment } = useSWR<PartyAlignmentResponse>(
    `/api/representative/${r.bioguideId}/party-alignment`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const votes = batch?.data?.votes?.votes ?? [];
  const recent = votes.slice(0, 7);
  const totalVotes = batch?.data?.votes?.totalResults ?? votes.length;
  const alignmentPct = alignment?.overall_alignment;
  const alignmentValid =
    typeof alignmentPct === 'number' && alignment?.metadata?.dataSource !== 'unavailable';

  const mostRecent = recent[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
      <div>
        <PanelHeader
          eyebrow={
            totalVotes > 0
              ? `${totalVotes} roll-call vote${totalVotes === 1 ? '' : 's'} on file`
              : 'Voting record'
          }
          title="Recent floor votes"
          source={{ name: 'Congress.gov', id: 'roll-call' }}
        />
        {batchLoading ? (
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
            Data unavailable — no floor votes returned for this member.
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
              const billNum = v.bill?.number ?? `Roll ${v.rollNumber ?? '—'}`;
              const title = v.bill?.title ?? v.question ?? v.description ?? '—';
              const chip = chipStyleFor(v.position);
              return (
                <div
                  key={`${v.rollNumber ?? 'r'}-${idx}`}
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
                  <CqChip variant={chip.variant} size="sm" filled={chip.filled}>
                    {v.position ?? '—'}
                  </CqChip>
                  <span style={{ fontSize: 11, color: 'var(--fg2)' }}>{v.result ?? '—'}</span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--fg3)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {formatDate(v.date)}
                  </span>
                </div>
              );
            })}
            {alignmentValid && (
              <div style={{ marginTop: 16 }}>
                <CqPlainReading>
                  {r.lastName || r.name} voted with the {partyLong(r.party)} caucus on{' '}
                  {alignmentPct?.toFixed(0)}% of {alignment?.total_votes_analyzed ?? 0} qualifying
                  votes analyzed.
                </CqPlainReading>
              </div>
            )}
          </>
        )}
      </div>

      <aside>
        <div style={{ border: '2px solid var(--ink)', padding: 18, marginBottom: 16 }}>
          <CqLabel>Vote alignment</CqLabel>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <AlignmentRow
              label={`with ${partyLong(r.party)}`}
              pct={alignmentValid ? alignmentPct : undefined}
              color={pColor}
            />
            <AlignmentRow label="with chamber majority" pct={undefined} color="var(--fg1)" />
            <AlignmentRow label="attendance" pct={undefined} color="var(--civiq-blue)" />
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
              {mostRecent.bill?.number
                ? `${mostRecent.bill.number} · ${mostRecent.bill.title ?? mostRecent.question ?? ''}`
                : (mostRecent.question ?? mostRecent.description ?? '—')}
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                marginTop: 4,
              }}
            >
              {formatDate(mostRecent.date)} · {mostRecent.position ?? '—'} ·{' '}
              {mostRecent.result ?? '—'}
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function AlignmentRow({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number | undefined;
  color: string;
}) {
  const known = typeof pct === 'number';
  const display = known ? `${pct.toFixed(0)}%` : '—';
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

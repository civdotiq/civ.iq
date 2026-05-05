import type { Bill, BillVote } from '@/types/bill';
import { CqChip, CqLabel, CqPlainReading } from '@/components/cq';
import { PanelHeader } from './PanelHeader';
import { findFinalPassageVote, formatDate } from './helpers';

interface VotePanelProps {
  bill: Bill;
}

export function VotePanel({ bill }: VotePanelProps) {
  const vote = findFinalPassageVote(bill.votes ?? []);

  if (!vote) {
    return (
      <section style={{ marginTop: 32 }}>
        <PanelHeader
          eyebrow={`${bill.chamber} · ${bill.congress} Congress`}
          title="Roll-call vote"
          source={{ name: 'House Clerk + Senate.gov', id: 'roll calls' }}
        />
        <CqPlainReading label="DATA UNAVAILABLE.">
          No recorded floor vote has occurred yet. Votes appear here after the House Clerk or Senate
          publishes the roll call.
        </CqPlainReading>
      </section>
    );
  }

  const totals = vote.votes ?? { yea: 0, nay: 0, present: 0, notVoting: 0 };
  const breakdown = vote.breakdown;
  const denominator = Math.max(1, totals.yea + totals.nay);

  const segments = breakdown
    ? [
        {
          key: 'D-yea',
          label: 'D · Yea',
          n: breakdown.democratic.yea,
          color: 'var(--civiq-green)',
          stripe: false,
        },
        {
          key: 'R-yea',
          label: 'R · Yea',
          n: breakdown.republican.yea,
          color: 'var(--civiq-red)',
          stripe: false,
        },
        {
          key: 'I-yea',
          label: 'I · Yea',
          n: breakdown.independent.yea,
          color: 'var(--data-vlau)',
          stripe: false,
        },
        {
          key: 'D-nay',
          label: 'D · Nay',
          n: breakdown.democratic.nay,
          color: 'var(--civiq-green)',
          stripe: true,
        },
        {
          key: 'R-nay',
          label: 'R · Nay',
          n: breakdown.republican.nay,
          color: 'var(--civiq-red)',
          stripe: true,
        },
        {
          key: 'I-nay',
          label: 'I · Nay',
          n: breakdown.independent.nay,
          color: 'var(--data-vlau)',
          stripe: true,
        },
      ].filter(seg => seg.n > 0)
    : [];

  return (
    <section style={{ marginTop: 32 }}>
      <PanelHeader
        eyebrow={`Roll-call vote · ${vote.chamber} · ${vote.question} · ${formatDate(vote.date)}`}
        title={`${vote.result} · ${totals.yea}–${totals.nay}`}
        source={{
          name: 'House Clerk + Senate.gov',
          id: vote.rollNumber ? `roll ${vote.rollNumber}` : 'roll call',
        }}
      />

      {segments.length > 0 && (
        <div
          role="img"
          aria-label={`Vote breakdown: ${totals.yea} yea, ${totals.nay} nay`}
          style={{
            display: 'flex',
            height: 48,
            border: '2px solid var(--ink)',
            marginBottom: 16,
            background: 'var(--bg2)',
            overflow: 'hidden',
          }}
        >
          {segments.map((seg, i) => {
            const pct = (seg.n / denominator) * 100;
            return (
              <div
                key={seg.key}
                title={`${seg.label}: ${seg.n}`}
                style={{
                  flexBasis: `${pct}%`,
                  flexGrow: 0,
                  flexShrink: 0,
                  background: seg.color,
                  borderRight: i < segments.length - 1 ? '2px solid var(--ink)' : 'none',
                  backgroundImage: seg.stripe
                    ? `repeating-linear-gradient(45deg, ${seg.color} 0 6px, var(--bg3) 6px 12px)`
                    : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 0,
                }}
              >
                {pct >= 6 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: seg.stripe ? 'var(--fg1)' : '#fff',
                      fontFamily: 'var(--font-mono)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {seg.n}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {breakdown ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 0,
            border: '1px solid var(--line)',
            borderRight: 0,
            borderBottom: 0,
          }}
        >
          <PartyRow
            label="Democratic"
            color="var(--civiq-green)"
            yea={breakdown.democratic.yea}
            nay={breakdown.democratic.nay}
          />
          <PartyRow
            label="Republican"
            color="var(--civiq-red)"
            yea={breakdown.republican.yea}
            nay={breakdown.republican.nay}
          />
          <PartyRow
            label="Independent"
            color="var(--data-vlau)"
            yea={breakdown.independent.yea}
            nay={breakdown.independent.nay}
          />
        </div>
      ) : (
        <CqPlainReading label="PARTY BREAKDOWN UNAVAILABLE.">
          The chamber clerk reported only aggregate yea/nay totals — not member-level positions —
          for this roll call.
        </CqPlainReading>
      )}

      <SampleVotes vote={vote} />
    </section>
  );
}

function PartyRow({
  label,
  color,
  yea,
  nay,
}: {
  label: string;
  color: string;
  yea: number;
  nay: number;
}) {
  const total = yea + nay;
  return (
    <div
      style={{
        padding: '12px 14px',
        borderRight: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 8,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color }}>{yea}</span>
        <span style={{ fontSize: 11, color: 'var(--fg3)' }}>yea</span>
        <span style={{ fontSize: 11, color: 'var(--fg3)' }}>·</span>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{nay}</span>
        <span style={{ fontSize: 11, color: 'var(--fg3)' }}>nay</span>
        {total > 0 && (
          <span
            style={{
              marginLeft: 'auto',
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {Math.round((yea / total) * 100)}% yea
          </span>
        )}
      </div>
    </div>
  );
}

function SampleVotes({ vote }: { vote: BillVote }) {
  const sample = (vote.representativeVotes ?? []).slice(0, 6);
  if (sample.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <CqLabel>Sample of votes</CqLabel>
      <div style={{ marginTop: 12 }}>
        {sample.map((s, i) => {
          const partyCode = s.representative.party?.toUpperCase().charAt(0) ?? '';
          const variant: 'd' | 'r' | 'ink' =
            s.position === 'Yea'
              ? partyCode === 'D'
                ? 'd'
                : partyCode === 'R'
                  ? 'r'
                  : 'ink'
              : 'ink';
          return (
            <div
              key={`${s.representative.bioguideId}-${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 80px',
                gap: 12,
                alignItems: 'center',
                padding: '12px 0',
                borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.representative.name}</div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {partyCode} · {s.representative.state}
                  {s.representative.district
                    ? `-${String(s.representative.district).padStart(2, '0')}`
                    : ''}
                </div>
              </div>
              <CqChip variant={variant} filled={false} size="sm">
                {s.position}
              </CqChip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

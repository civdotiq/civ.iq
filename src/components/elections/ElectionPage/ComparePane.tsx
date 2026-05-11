/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Side-by-side finance pane. Left or right half of the bordered
 * "Money raised" container. The headline raised value renders in the
 * candidate's party color (load-bearing partisan identity per the
 * design-system carve-out), and three CqBar rows break the receipts
 * into individual / PAC / small-donor (<$200).
 *
 * The reference's "Top industry" / "Top outside group" lines are cut
 * — no FEC industry rollup endpoint is wired here.
 */

import { CqChip, CqLabel } from '@/components/cq';
import type { ElectionFinanceCandidateBlock, ElectionRaceCandidate } from './types';
import {
  displayName,
  formatCompactDollars,
  formatPct,
  partyChipVariant,
  partyColorVar,
} from './data';

interface ComparePaneProps {
  candidate: ElectionRaceCandidate | null;
  finance: ElectionFinanceCandidateBlock | null;
  side: 'left' | 'right';
  loading: boolean;
}

export function ComparePane({ candidate, finance, side, loading }: ComparePaneProps) {
  const partyVariant = candidate ? partyChipVariant(candidate.party) : 'i';
  const partyLong = candidate?.partyLong ?? '—';
  const accent = candidate ? partyColorVar(candidate.party) : 'var(--fg3)';
  const short = candidate ? displayName(candidate.name).split(' ').slice(-1)[0] || '—' : '—';

  return (
    <div
      style={{
        padding: '24px 28px',
        background: side === 'left' ? 'var(--bg1)' : 'var(--bg2)',
        borderRight: side === 'left' ? '1px solid var(--line)' : 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 16,
          alignItems: 'baseline',
          gap: 8,
        }}
      >
        <CqLabel>{short}</CqLabel>
        <CqChip variant={partyVariant} size="sm">
          {partyLong}
        </CqChip>
      </div>
      <div
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: accent,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          minHeight: 48,
        }}
      >
        {loading && !finance ? '…' : formatCompactDollars(finance?.receipts ?? null)}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          marginTop: 6,
          marginBottom: 18,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        Cash on hand · {formatCompactDollars(finance?.cashOnHand ?? null)}
        {' · '}
        Burn rate · {formatCompactDollars(finance?.disbursements ?? null)}
      </div>

      <CompareBar
        label="Individual donors"
        pct={finance?.individualPct ?? null}
        accent={accent}
        loading={loading && !finance}
      />
      <CompareBar
        label="PAC contributions"
        pct={finance?.pacPct ?? null}
        accent={accent}
        loading={loading && !finance}
      />
      <CompareBar
        label="Small donors (<$200)"
        pct={finance?.smallDonorPct ?? null}
        accent={accent}
        loading={loading && !finance}
        sub={
          finance?.smallDonorTotal !== null && finance?.smallDonorTotal !== undefined
            ? formatCompactDollars(finance.smallDonorTotal)
            : null
        }
      />
    </div>
  );
}

interface CompareBarProps {
  label: string;
  pct: number | null;
  accent: string;
  loading: boolean;
  sub?: string | null;
}

function CompareBar({ label, pct, accent, loading, sub }: CompareBarProps) {
  const clamped = pct === null || !Number.isFinite(pct) ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          marginBottom: 4,
          gap: 8,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--fg1)' }}>{label}</span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--fg2)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {loading && pct === null ? '…' : formatPct(pct)}
          {sub ? ` · ${sub}` : ''}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(clamped)}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: 8, background: 'var(--bg3)' }}
      >
        <div style={{ width: `${clamped}%`, height: '100%', background: accent }} />
      </div>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Single party block (awarder agency or recipient vendor) for the
 * "OBLIGATES →" trio at the top of the federal-award page.
 *
 * Color rule: awarder stripe is always blue (agencies are not
 * partisan on award detail). Recipient stripe is green for private
 * vendors and ink for inter-government transfers — see
 * `isGovernmentRecipient` in ./data.ts for the documented exception
 * to the project-wide "red/green = party only" rule.
 */

import { CqLabel } from '@/components/cq';

export interface PartyCardMetaRow {
  key: string;
  value: string;
}

interface PartyCardProps {
  eyebrow: string;
  name: string;
  short: string;
  meta: PartyCardMetaRow[];
  accent: string;
  loading?: boolean;
}

export function PartyCard({ eyebrow, name, short, meta, accent, loading }: PartyCardProps) {
  const displayName = loading ? 'Loading…' : name || '—';
  const displayShort = loading ? '' : short || '—';

  return (
    <div style={{ padding: '20px 24px', position: 'relative' }}>
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 4,
          background: accent,
        }}
      />
      <CqLabel>{eyebrow}</CqLabel>
      <div
        style={{
          fontSize: 22,
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: 6,
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '-0.01em',
          color: 'var(--fg1)',
        }}
      >
        {displayName}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--fg2)',
          minHeight: 16,
        }}
      >
        {displayShort}
      </div>
      <ul
        style={{
          listStyle: 'none',
          margin: '12px 0 0',
          padding: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
        }}
      >
        {meta.map(row => (
          <li
            key={row.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '5px 0',
              borderTop: '1px solid var(--line)',
              gap: 12,
            }}
          >
            <span style={{ color: 'var(--fg3)' }}>{row.key}</span>
            <span
              style={{
                fontWeight: 700,
                textAlign: 'right',
                color: 'var(--fg1)',
                fontVariantNumeric: 'tabular-nums',
                wordBreak: 'break-word',
              }}
            >
              {row.value || '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * "Most-active money recipients" panel — replaces the reference
 * IssueTopic.jsx "Most-active sponsors" panel which would require a
 * sponsor-by-policyArea aggregation we do not have yet.
 *
 * TODO: replace with a real sponsor/opposition split when per-bill-by-topic
 * sponsorship aggregation lands. Current proxy: top sector recipients from
 * the leaderboard endpoint.
 */

import Link from 'next/link';
import { formatCompactDollars, partyKey } from './data';
import type { LeaderboardEntry } from './types';

interface RecipientsListProps {
  entries: LeaderboardEntry[];
  loading: boolean;
}

const VISIBLE = 6;

export function RecipientsList({ entries, loading }: RecipientsListProps) {
  return (
    <div style={{ border: '2px solid var(--ink)' }}>
      <div
        style={{
          background: 'var(--ink)',
          color: '#fff',
          padding: '10px 14px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
        }}
      >
        Most-active money recipients
      </div>
      {loading && entries.length === 0 ? (
        <SkeletonRows />
      ) : entries.length === 0 ? (
        <div
          style={{
            padding: '16px 18px',
            background: 'var(--bg2)',
            fontSize: 12,
            color: 'var(--fg2)',
            lineHeight: 1.55,
          }}
        >
          No sector leaderboard data available for this policy area.
        </div>
      ) : (
        entries.slice(0, VISIBLE).map((entry, i) => {
          const k = partyKey(entry.party);
          const partyVar =
            k === 'd'
              ? 'var(--civiq-green)'
              : k === 'r'
                ? 'var(--civiq-red)'
                : 'var(--civiq-blue-active)';
          const last = i === Math.min(VISIBLE, entries.length) - 1;
          return (
            <Link
              key={entry.bioguideId}
              href={`/representative/${entry.bioguideId}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 88px',
                gap: 10,
                padding: '12px 14px',
                borderBottom: last ? 0 : '1px solid var(--line)',
                alignItems: 'center',
                textDecoration: 'none',
                color: 'var(--fg1)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.name}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    marginTop: 2,
                  }}
                >
                  {entry.party.toUpperCase()} · {entry.state} · {entry.chamber}
                </div>
              </div>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: partyVar,
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompactDollars(entry.sectorDonationAmount)}
              </span>
            </Link>
          );
        })
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 88px',
            gap: 10,
            padding: '12px 14px',
            borderBottom: i === 3 ? 0 : '1px solid var(--line)',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6, marginBottom: 6 }} />
            <div style={{ height: 9, background: 'var(--bg3)', opacity: 0.4, width: '60%' }} />
          </div>
          <div style={{ height: 12, background: 'var(--bg3)', opacity: 0.6 }} />
        </div>
      ))}
    </>
  );
}

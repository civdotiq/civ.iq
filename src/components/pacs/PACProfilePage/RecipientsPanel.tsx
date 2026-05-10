/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * "Top recipients of disbursements" panel for the PAC profile (PR 17).
 *
 * Names render plain — disbursement payloads do not include the
 * recipient's bioguide id, and committee→candidate→bioguide resolution
 * for every row would slow the page. Linking recipients to
 * /representative/[bioguideId] is a follow-up that lands when a
 * recipient-resolution helper exists. Per memory: do not party-colour
 * amounts here — recipient party isn't reliably in the payload.
 */

import { CqLabel } from '@/components/cq';
import { formatCompactDollars, formatCount } from './data';
import type { RecipientRow } from './types';

interface RecipientsPanelProps {
  recipients: RecipientRow[];
  loading: boolean;
  cycle: number;
}

export function RecipientsPanel({ recipients, loading, cycle }: RecipientsPanelProps) {
  const rows = recipients.slice(0, 8);
  return (
    <div id="recipients">
      <div style={{ marginBottom: 12 }}>
        <CqLabel>
          Top recipients · {cycle - 1}–{cycle} cycle
        </CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>Where the money went</div>
      </div>
      {loading && rows.length === 0 ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {rows.map((row, i) => (
            <div
              key={`${row.recipientId}:${i}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '32px 1fr 90px 70px',
                gap: 10,
                padding: '12px 0',
                borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg1)' }}>
                  {row.recipientName || '—'}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--fg3)',
                    fontFamily: 'var(--font-mono)',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {row.recipientId} · {formatCount(row.count)} disbursements
                </div>
              </div>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  fontWeight: 700,
                  textAlign: 'right',
                  color: 'var(--fg1)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatCompactDollars(row.total)}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--fg3)',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                #{i + 1}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkeletonRows() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '32px 1fr 90px 70px',
            gap: 10,
            padding: '12px 0',
            borderTop: i === 0 ? '2px solid var(--ink)' : '1px solid var(--line)',
            alignItems: 'center',
          }}
        >
          <div style={{ height: 12, background: 'var(--bg3)' }} />
          <div style={{ height: 14, background: 'var(--bg3)', width: '70%' }} />
          <div style={{ height: 12, background: 'var(--bg3)' }} />
          <div style={{ height: 12, background: 'var(--bg3)' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: '2px solid var(--ink)',
        padding: '24px 18px',
        fontSize: 12,
        color: 'var(--fg2)',
        lineHeight: 1.6,
      }}
    >
      Data unavailable. The committee may not have filed disbursements this cycle, or FEC has not
      yet aggregated them. Check the FEC filings link above for raw schedules.
    </div>
  );
}

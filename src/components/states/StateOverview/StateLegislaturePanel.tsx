/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { CqLabel, CqPlainReading } from '@/components/cq';
import type { StateChamber, StateLegislatureSummary } from './types';

interface StateLegislaturePanelProps {
  stateCode: string;
  legislature: StateLegislatureSummary | null;
}

export function StateLegislaturePanel({ stateCode, legislature }: StateLegislaturePanelProps) {
  return (
    <section style={{ marginBottom: 28 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 12,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <CqLabel>State legislature</CqLabel>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 700,
              margin: '4px 0 0',
              letterSpacing: '-0.01em',
            }}
          >
            Chamber control
          </h2>
        </div>
        <Link
          href={`/state-legislature/${stateCode.toLowerCase()}`}
          style={{
            fontSize: 11,
            color: 'var(--civiq-blue-active)',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
          }}
        >
          Full roster →
        </Link>
      </div>

      {!legislature ? (
        <CqPlainReading label="DATA UNAVAILABLE.">
          State legislature data temporarily unavailable from OpenStates for this jurisdiction.
        </CqPlainReading>
      ) : (
        <div style={{ border: '2px solid var(--ink)', padding: 18 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {legislature.upper && <ChamberBar chamber={legislature.upper} />}
            {legislature.lower && <ChamberBar chamber={legislature.lower} />}
            {legislature.isUnicameral && (
              <p
                style={{
                  fontSize: 11,
                  color: 'var(--fg3)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Unicameral legislature.
              </p>
            )}
            <TrifectaLine legislature={legislature} />
          </div>
          {legislature.sessionName && legislature.sessionName !== 'Data Unavailable' && (
            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: '1px solid var(--line)',
                fontSize: 11,
                color: 'var(--fg3)',
                fontFamily: 'var(--font-mono)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              Current session: {legislature.sessionName}
              {legislature.sessionStatus ? ` · ${legislature.sessionStatus}` : ''}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ChamberBar({ chamber }: { chamber: StateChamber }) {
  const total = chamber.totalSeats;
  const dem = chamber.democraticSeats;
  const rep = chamber.republicanSeats;
  const other = chamber.otherSeats;
  const demPct = total > 0 ? (dem / total) * 100 : 0;
  const repPct = total > 0 ? (rep / total) * 100 : 0;
  const otherPct = total > 0 ? (other / total) * 100 : 0;
  const demLead = dem > rep;
  const margin = Math.abs(dem - rep);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--fg1)' }}>{chamber.name}</span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: 'var(--tracking-label)',
          }}
        >
          {demLead ? 'D' : 'R'}+{margin} of {total}
        </span>
      </div>
      <div
        style={{
          display: 'flex',
          height: 16,
          border: '1px solid var(--line)',
          background: 'var(--bg2)',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        {demPct > 0 && <div style={{ width: `${demPct}%`, background: 'var(--party-democrat)' }} />}
        {otherPct > 0 && <div style={{ width: `${otherPct}%`, background: 'var(--data-vlau)' }} />}
        {repPct > 0 && <div style={{ width: `${repPct}%`, background: 'var(--civiq-red)' }} />}
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 4,
          fontSize: 10,
          color: 'var(--fg3)',
          fontFamily: 'var(--font-mono)',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
        }}
      >
        <span>{dem} D</span>
        {other > 0 && <span>{other} I/Other</span>}
        <span>{rep} R</span>
      </div>
    </div>
  );
}

function TrifectaLine({ legislature }: { legislature: StateLegislatureSummary }) {
  if (!legislature.upper || !legislature.lower) return null;
  const upperDemLead = legislature.upper.democraticSeats > legislature.upper.republicanSeats;
  const lowerDemLead = legislature.lower.democraticSeats > legislature.lower.republicanSeats;
  const aligned = upperDemLead === lowerDemLead;
  const color = aligned
    ? upperDemLead
      ? 'var(--party-democrat)'
      : 'var(--civiq-red)'
    : 'var(--fg2)';
  const text = aligned
    ? `${upperDemLead ? 'Democratic' : 'Republican'} control of both chambers`
    : 'Divided — chambers controlled by different parties';
  return (
    <p
      style={{
        fontSize: 12,
        color: 'var(--fg2)',
        margin: 0,
        paddingTop: 4,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          color: 'var(--fg1)',
          marginRight: 6,
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-label)',
          fontSize: 11,
        }}
      >
        Legislature control:
      </span>
      <span style={{ color, fontWeight: 600 }}>{text}</span>
    </p>
  );
}

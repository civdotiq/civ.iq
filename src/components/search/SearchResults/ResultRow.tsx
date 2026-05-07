import Link from 'next/link';
import { CqChip, CqLabel } from '@/components/cq';
import type { OfficialResult } from './data';

interface ResultRowProps {
  o: OfficialResult;
  first: boolean;
}

function partyVariant(party: string): 'd' | 'r' | 'i' {
  const p = party.toLowerCase();
  if (p.startsWith('d')) return 'd';
  if (p.startsWith('r')) return 'r';
  return 'i';
}

function partyStripe(party: string): string {
  const v = partyVariant(party);
  if (v === 'd') return 'var(--civiq-green)';
  if (v === 'r') return 'var(--civiq-red)';
  return 'var(--fg3)';
}

function chipLabel(o: OfficialResult): string {
  const variant = partyVariant(o.party).toUpperCase();
  const districtPart = o.chamber === 'House' && o.district ? `-${o.district}` : '';
  return `${variant} · ${o.state}${districtPart}`;
}

export function ResultRow({ o, first }: ResultRowProps) {
  const variant = partyVariant(o.party);
  const role = o.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative';
  const districtTag = o.chamber === 'House' && o.district ? `${o.state}-${o.district}` : o.state;

  return (
    <Link
      href={`/representative/${o.bioguideId}`}
      style={{
        display: 'grid',
        gridTemplateColumns: '64px 1fr 140px 80px',
        gap: 16,
        padding: '18px 0',
        borderTop: first ? 0 : '1px solid var(--line)',
        alignItems: 'center',
        textDecoration: 'none',
        color: 'var(--fg1)',
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          position: 'relative',
          border: '2px solid var(--ink)',
          background: 'var(--bg1)',
          backgroundImage:
            'repeating-linear-gradient(45deg, var(--bg2) 0 6px, var(--bg3) 6px 12px)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: partyStripe(o.party),
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {o.initials}
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
          <CqChip variant={variant} size="sm">
            {chipLabel(o)}
          </CqChip>
          <CqLabel>{role}</CqLabel>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em' }}>{o.name}</div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
            letterSpacing: '0.04em',
          }}
        >
          {districtTag} · Match: name + state
        </div>
      </div>
      <div>
        <CqLabel>Profile</CqLabel>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: 'var(--civiq-blue)',
            marginTop: 4,
          }}
        >
          View record →
        </div>
      </div>
      <div
        style={{
          fontSize: 18,
          color: 'var(--fg3)',
          textAlign: 'right',
        }}
        aria-hidden
      >
        →
      </div>
    </Link>
  );
}

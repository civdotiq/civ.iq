import type { ReactNode } from 'react';
import { CqLabel } from '@/components/cq';
import type { PartyKey } from './types';

type RowAccent = 'neutral' | 'party';

interface CompareRowProps {
  label: string;
  la: ReactNode;
  lb: ReactNode;
  small?: boolean;
  loading?: boolean;
  accent?: RowAccent;
  partyA?: PartyKey;
  partyB?: PartyKey;
  numericA?: number;
  numericB?: number;
}

const SKELETON = '·····';

function partyColorVar(key: PartyKey | undefined): string {
  if (key === 'd') return 'var(--civiq-green)';
  if (key === 'r') return 'var(--civiq-red)';
  return 'var(--fg1)';
}

function pickColor(
  side: 'a' | 'b',
  accent: RowAccent,
  partyA: PartyKey | undefined,
  partyB: PartyKey | undefined,
  numericA: number | undefined,
  numericB: number | undefined
): string {
  if (accent === 'party') {
    return partyColorVar(side === 'a' ? partyA : partyB);
  }
  if (
    typeof numericA === 'number' &&
    typeof numericB === 'number' &&
    numericA > 0 &&
    numericB > 0 &&
    numericA !== numericB
  ) {
    const aHigher = numericA > numericB;
    const sideHigher = side === 'a' ? aHigher : !aHigher;
    return sideHigher ? 'var(--civiq-blue-active)' : 'var(--fg1)';
  }
  return 'var(--fg1)';
}

export function CompareRow({
  label,
  la,
  lb,
  small = false,
  loading = false,
  accent = 'neutral',
  partyA,
  partyB,
  numericA,
  numericB,
}: CompareRowProps) {
  const colorA = loading
    ? 'var(--fg4)'
    : pickColor('a', accent, partyA, partyB, numericA, numericB);
  const colorB = loading
    ? 'var(--fg4)'
    : pickColor('b', accent, partyA, partyB, numericA, numericB);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 200px 1fr',
        borderBottom: '1px solid var(--line)',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          padding: '14px 20px',
          textAlign: 'right',
          fontSize: small ? 12 : 16,
          fontWeight: 700,
          color: colorA,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: small ? 0 : '-0.01em',
          wordBreak: 'break-word',
        }}
      >
        {loading ? SKELETON : la}
      </div>
      <div
        style={{
          padding: '14px 12px',
          textAlign: 'center',
          borderLeft: '1px solid var(--line)',
          borderRight: '1px solid var(--line)',
          background: 'var(--bg2)',
        }}
      >
        <CqLabel>{label}</CqLabel>
      </div>
      <div
        style={{
          padding: '14px 20px',
          textAlign: 'left',
          fontSize: small ? 12 : 16,
          fontWeight: 700,
          color: colorB,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: small ? 0 : '-0.01em',
          wordBreak: 'break-word',
        }}
      >
        {loading ? SKELETON : lb}
      </div>
    </div>
  );
}

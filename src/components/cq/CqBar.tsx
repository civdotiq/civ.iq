import type { ReactNode } from 'react';

type BarColor = 'blue' | 'red' | 'green' | 'amber' | 'vlau' | 'greige';

interface CqBarProps {
  label: ReactNode;
  pct: number;
  amount: ReactNode;
  color?: BarColor;
  sub?: ReactNode;
}

const COLOR_VAR: Record<BarColor, string> = {
  blue: 'var(--civiq-blue)',
  red: 'var(--civiq-red)',
  green: 'var(--civiq-green)',
  amber: 'var(--color-warning)',
  vlau: 'var(--data-vlau)',
  greige: 'var(--data-greige)',
};

export function CqBar({ label, pct, amount, color = 'blue', sub }: CqBarProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 1fr 60px 90px',
        gap: 14,
        alignItems: 'center',
        padding: '10px 0',
        borderBottom: '1px solid var(--line)',
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg1)' }}>{label}</div>
        {sub && (
          <div
            style={{
              fontSize: 10,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              marginTop: 2,
            }}
          >
            {sub}
          </div>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ height: 14, background: 'var(--bg3)', position: 'relative' }}
      >
        <div style={{ height: '100%', background: COLOR_VAR[color], width: `${clamped}%` }} />
      </div>
      <span
        style={{
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--fg3)',
          textAlign: 'right',
        }}
      >
        {clamped}%
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          textAlign: 'right',
        }}
      >
        {amount}
      </span>
    </div>
  );
}

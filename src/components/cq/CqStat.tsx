import type { ReactNode } from 'react';
import { CqLabel } from './CqLabel';

type StatColor = 'ink' | 'blue' | 'red' | 'green' | 'amber';

interface CqStatProps {
  label: ReactNode;
  value: ReactNode;
  caption?: ReactNode;
  color?: StatColor;
  size?: number;
  align?: 'left' | 'right' | 'center';
}

const COLOR_VAR: Record<StatColor, string> = {
  ink: 'var(--fg1)',
  blue: 'var(--civiq-blue)',
  red: 'var(--civiq-red)',
  green: 'var(--civiq-green)',
  amber: 'var(--color-warning)',
};

export function CqStat({
  label,
  value,
  caption,
  color = 'ink',
  size = 36,
  align = 'left',
}: CqStatProps) {
  return (
    <div style={{ textAlign: align }}>
      <CqLabel>{label}</CqLabel>
      <div
        style={{
          fontSize: size,
          fontWeight: 700,
          color: COLOR_VAR[color],
          lineHeight: 1.05,
          marginTop: 4,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: 'var(--tracking-display)',
        }}
      >
        {value}
      </div>
      {caption && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--fg3)',
            marginTop: 4,
            fontFamily: 'var(--font-mono)',
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

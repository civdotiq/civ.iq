import type { ReactNode } from 'react';

export type CqChipVariant = 'd' | 'r' | 'i' | 'info' | 'warn' | 'ink';

interface CqChipProps {
  variant?: CqChipVariant;
  filled?: boolean;
  size?: 'sm' | 'md';
  children: ReactNode;
}

const VARIANT_FG: Record<CqChipVariant, string> = {
  d: 'var(--civiq-green)',
  r: 'var(--civiq-red)',
  i: 'var(--fg3)',
  info: 'var(--civiq-blue-active)',
  warn: 'var(--color-error)',
  ink: 'var(--ink)',
};

export function CqChip({ variant = 'ink', filled = true, size = 'md', children }: CqChipProps) {
  const fg = VARIANT_FG[variant];
  const dims =
    size === 'sm' ? { fontSize: 10, padding: '2px 7px' } : { fontSize: 11, padding: '4px 10px' };
  const surface = filled
    ? { background: fg, color: '#fff', border: `1px solid ${fg}` }
    : { background: 'var(--bg1)', color: fg, border: `1px solid ${fg}` };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-label)',
        borderRadius: 'var(--radius-interactive)',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...dims,
        ...surface,
      }}
    >
      {children}
    </span>
  );
}

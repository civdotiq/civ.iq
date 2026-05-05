import type { ButtonHTMLAttributes, ReactNode } from 'react';

type CqButtonVariant = 'primary' | 'secondary' | 'ghost';
type CqButtonSize = 'sm' | 'md';

interface CqButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: CqButtonVariant;
  size?: CqButtonSize;
  children: ReactNode;
}

const PALETTE: Record<CqButtonVariant, { bg: string; fg: string; bc: string }> = {
  primary: { bg: 'var(--civiq-blue)', fg: '#fff', bc: 'var(--civiq-blue)' },
  secondary: { bg: 'var(--bg1)', fg: 'var(--ink)', bc: 'var(--ink)' },
  ghost: { bg: 'transparent', fg: 'var(--fg1)', bc: 'transparent' },
};

export function CqButton({
  variant = 'primary',
  size = 'md',
  children,
  style,
  type = 'button',
  ...rest
}: CqButtonProps) {
  const palette = PALETTE[variant];
  const dims =
    size === 'sm' ? { padding: '8px 14px', fontSize: 11 } : { padding: '12px 18px', fontSize: 12 };

  return (
    <button
      {...rest}
      type={type}
      style={{
        fontFamily: 'var(--font-primary)',
        fontWeight: 700,
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        background: palette.bg,
        color: palette.fg,
        border: `2px solid ${palette.bc}`,
        borderRadius: 'var(--radius-interactive)',
        cursor: 'pointer',
        transition:
          'background-color var(--duration-default) var(--timing-aicher), color var(--duration-default) var(--timing-aicher)',
        ...dims,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

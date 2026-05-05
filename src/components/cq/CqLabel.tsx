import type { CSSProperties, ReactNode } from 'react';

type CqLabelColor = 'default' | 'ink' | 'blue' | 'red' | 'green' | 'amber';

interface CqLabelProps {
  children: ReactNode;
  color?: CqLabelColor;
  style?: CSSProperties;
  as?: 'span' | 'div';
}

const COLOR_VAR: Record<CqLabelColor, string> = {
  default: 'var(--fg3)',
  ink: 'var(--fg1)',
  blue: 'var(--civiq-blue)',
  red: 'var(--civiq-red)',
  green: 'var(--civiq-green)',
  amber: 'var(--color-warning)',
};

export function CqLabel({ children, color = 'default', style, as: Tag = 'span' }: CqLabelProps) {
  return (
    <Tag
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        color: COLOR_VAR[color],
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}

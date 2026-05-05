import type { ReactNode } from 'react';

interface CqPlainReadingProps {
  children: ReactNode;
  label?: string;
}

export function CqPlainReading({ children, label = 'PLAIN READING.' }: CqPlainReadingProps) {
  return (
    <div
      style={{
        padding: '14px 18px',
        background: 'var(--bg2)',
        borderLeft: '3px solid var(--civiq-blue)',
        fontSize: 13,
        color: 'var(--fg2)',
        lineHeight: 1.5,
      }}
    >
      <strong style={{ color: 'var(--fg1)', marginRight: 6 }}>{label}</strong>
      {children}
    </div>
  );
}

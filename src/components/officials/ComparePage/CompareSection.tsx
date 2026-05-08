import type { ReactNode } from 'react';

interface CompareSectionProps {
  title: string;
  children: ReactNode;
}

export function CompareSection({ title, children }: CompareSectionProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          background: 'var(--ink)',
          color: '#fff',
          padding: '8px 14px',
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: 'var(--tracking-label)',
          textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {title}
      </div>
      <div>{children}</div>
    </div>
  );
}

import type { ReactNode } from 'react';

interface CqBreadcrumbProps {
  crumbs: ReadonlyArray<string>;
  right?: ReactNode;
}

export function CqBreadcrumb({ crumbs, right }: CqBreadcrumbProps) {
  return (
    <div
      style={{
        background: 'var(--fg1)',
        color: '#fff',
        padding: '10px 36px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 'var(--tracking-label)',
        textTransform: 'uppercase',
        fontFamily: 'var(--font-mono)',
      }}
    >
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={`${i}-${c}`} style={{ display: 'inline-flex', gap: 10 }}>
              {i > 0 && <span style={{ color: '#6b7280' }}>·</span>}
              <span
                aria-current={last ? 'page' : undefined}
                style={{
                  color: last ? '#fff' : '#9ca3af',
                  fontWeight: last ? 700 : 600,
                }}
              >
                {c}
              </span>
            </span>
          );
        })}
      </div>
      {right && <div style={{ display: 'flex', gap: 18, color: '#9ca3af' }}>{right}</div>}
    </div>
  );
}

import type { ReactNode } from 'react';
import { CqHeader, type CqNavKey } from './CqHeader';
import { CqBreadcrumb } from './CqBreadcrumb';
import { CqFooter } from './CqFooter';

interface CqPageProps {
  currentNav?: CqNavKey;
  crumbs?: ReadonlyArray<string>;
  crumbRight?: ReactNode;
  contentPad?: string;
  compiledOn?: string;
  children: ReactNode;
}

export function CqPage({
  currentNav,
  crumbs,
  crumbRight,
  contentPad = '32px 36px 56px',
  compiledOn,
  children,
}: CqPageProps) {
  return (
    <div
      style={{
        background: 'var(--bg1)',
        color: 'var(--fg1)',
        fontFamily: 'var(--font-primary)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <CqHeader current={currentNav} />
      {crumbs && crumbs.length > 0 && <CqBreadcrumb crumbs={crumbs} right={crumbRight} />}
      <main style={{ padding: contentPad, flex: 1 }}>{children}</main>
      <CqFooter compiledOn={compiledOn} />
    </div>
  );
}

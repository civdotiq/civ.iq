import type { ReactNode } from 'react';
import { CqLabel, CqSourceTag } from '@/components/cq';

interface PanelHeaderProps {
  eyebrow: ReactNode;
  title: ReactNode;
  source?: { name: string; id?: string };
  right?: ReactNode;
}

export function PanelHeader({ eyebrow, title, source, right }: PanelHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 14,
        gap: 16,
      }}
    >
      <div>
        <CqLabel>{eyebrow}</CqLabel>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{title}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {source && <CqSourceTag compact source={source.name} id={source.id} />}
        {right}
      </div>
    </div>
  );
}

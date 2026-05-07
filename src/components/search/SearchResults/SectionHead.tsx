import type { ReactNode } from 'react';
import { CqLabel } from '@/components/cq';

interface SectionHeadProps {
  label: ReactNode;
  right?: ReactNode;
}

export function SectionHead({ label, right }: SectionHeadProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingBottom: 8,
        borderBottom: '2px solid var(--ink)',
      }}
    >
      <CqLabel>{label}</CqLabel>
      {right}
    </div>
  );
}

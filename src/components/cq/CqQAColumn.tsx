import type { ReactNode } from 'react';

interface CqQAColumnProps {
  children: ReactNode;
  gap?: number;
}

export function CqQAColumn({ children, gap = 32 }: CqQAColumnProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
      }}
    >
      {children}
    </div>
  );
}

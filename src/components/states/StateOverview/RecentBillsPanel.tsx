/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqLabel, CqPlainReading } from '@/components/cq';

interface RecentBillsPanelProps {
  stateName: string;
}

export function RecentBillsPanel({ stateName }: RecentBillsPanelProps) {
  return (
    <section>
      <div style={{ marginBottom: 12 }}>
        <CqLabel>119th Congress · sponsored from {stateName}</CqLabel>
        <h2
          style={{
            fontSize: 22,
            fontWeight: 700,
            margin: '4px 0 0',
            letterSpacing: '-0.01em',
          }}
        >
          Recent bills
        </h2>
      </div>
      <CqPlainReading label="DATA UNAVAILABLE.">
        Bills sponsored by this state&apos;s federal delegation render on each member&apos;s profile
        page today; the per-state aggregate ships in a follow-up.
      </CqPlainReading>
    </section>
  );
}

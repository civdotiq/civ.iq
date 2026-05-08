/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqChip } from '@/components/cq';

interface TopicHeroProps {
  displayName: string;
  industrySectorLabel: string | null;
  policyArea: string;
}

export function TopicHero({ displayName, industrySectorLabel, policyArea }: TopicHeroProps) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <CqChip variant="ink" size="sm">
          Topic · Federal
        </CqChip>
        <CqChip variant="info" filled={false} size="sm">
          119th Congress
        </CqChip>
        {industrySectorLabel && (
          <CqChip variant="ink" filled={false} size="sm">
            {industrySectorLabel}
          </CqChip>
        )}
      </div>
      <h1
        style={{
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: 'var(--tracking-display)',
          lineHeight: 0.95,
          margin: '0 0 12px',
          textTransform: 'uppercase',
        }}
      >
        {displayName}
      </h1>
      <p
        style={{
          fontSize: 15,
          lineHeight: 1.55,
          color: 'var(--fg2)',
          margin: 0,
          maxWidth: 640,
        }}
      >
        Federal legislation, regulations, oversight committees, and industry contributions filed
        under the Congress.gov policy area <strong>{policyArea}</strong>.
      </p>
    </div>
  );
}

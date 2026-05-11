/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { CqChip, CqLabel } from '@/components/cq';
import type { VariantHeaderProps } from './types';

export function VariantHeader({
  label,
  title,
  count,
  countNoun,
  subChip,
  hint,
}: VariantHeaderProps) {
  return (
    <div
      style={{
        paddingBottom: 20,
        borderBottom: '2px solid var(--ink)',
        marginBottom: 24,
      }}
    >
      <CqLabel>{label}</CqLabel>
      <h1
        style={{
          fontSize: 48,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1.0,
          margin: '6px 0 12px',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </h1>
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <CqChip variant="ink" filled={false} size="sm">
          {count.toLocaleString('en-US')} {countNoun}
        </CqChip>
        {subChip && (
          <CqChip variant="info" filled={false} size="sm">
            {subChip}
          </CqChip>
        )}
        {hint && (
          <span
            style={{
              fontSize: 11,
              color: 'var(--fg3)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

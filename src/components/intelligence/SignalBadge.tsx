/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import type { InsightSignal } from '@/lib/intelligence/types';

/**
 * SignalBadge — displays insight signal classification.
 *
 * Visual hierarchy per signal type:
 * - alert: Amber border + background — demands attention
 * - pattern: Blue border — notable finding
 * - tracking: Gray border — ongoing observation
 * - baseline: Gray, lighter — reference measurement
 */

const SIGNAL_CONFIG: Record<InsightSignal, { label: string; classes: string }> = {
  alert: {
    label: 'ALERT',
    classes: 'border-amber-500 bg-amber-50 text-amber-700',
  },
  pattern: {
    label: 'PATTERN',
    classes: 'border-[#3ea2d4] bg-[#3ea2d4]/10 text-[#3ea2d4]',
  },
  tracking: {
    label: 'TRACKING',
    classes: 'border-gray-400 bg-gray-50 text-gray-500',
  },
  baseline: {
    label: 'BASELINE',
    classes: 'border-gray-300 bg-gray-50 text-gray-400',
  },
};

interface SignalBadgeProps {
  signal: InsightSignal;
  className?: string;
}

export function SignalBadge({ signal, className = '' }: SignalBadgeProps) {
  const config = SIGNAL_CONFIG[signal];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 border-2 aicher-heading-wide type-xs ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
}

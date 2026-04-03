/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Temporal Edge Chart
 *
 * Minimal bar chart showing edge value over time (quarterly buckets).
 * Aicher/Ulm design: no gradients, no shadows, 2px bars, grid-aligned.
 * Used in graph sidebar and representative profile pages.
 */

'use client';

import type { TemporalBucket, TemporalTrend } from '@/lib/mesh/temporal-types';

interface TemporalEdgeChartProps {
  buckets: TemporalBucket[];
  trend?: TemporalTrend;
  /** Label shown above the chart */
  label?: string;
  /** Height of the chart in pixels (default: 64) */
  height?: number;
  /** Whether to show period labels (default: true) */
  showLabels?: boolean;
  /** Format value for tooltip display */
  formatValue?: (value: number) => string;
}

const TREND_COLORS: Record<TemporalTrend, string> = {
  increasing: '#0a9338',
  decreasing: '#e11d07',
  stable: '#3ea2d4',
  new: '#3ea2d4',
  ended: '#999',
};

const DEFAULT_FORMAT = (v: number): string =>
  v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v.toFixed(0)}`;

export default function TemporalEdgeChart({
  buckets,
  trend = 'stable',
  label,
  height = 64,
  showLabels = true,
  formatValue = DEFAULT_FORMAT,
}: TemporalEdgeChartProps) {
  if (buckets.length === 0) {
    return null;
  }

  const sorted = [...buckets].sort((a, b) => a.period.localeCompare(b.period));
  const maxValue = Math.max(...sorted.map(b => b.value), 1);
  const barColor = TREND_COLORS[trend];
  const barWidth = Math.max(2, Math.floor(120 / sorted.length));
  const gap = Math.max(2, Math.floor(barWidth / 3));

  return (
    <div
      style={{ fontFamily: 'var(--font-braun-linear, sans-serif)' }}
      role="img"
      aria-label={`${label || 'Temporal trend'} chart. ${buckets.length} periods. Trend: ${trend}.`}
    >
      {label && (
        <div
          style={{
            fontSize: '11px',
            fontWeight: 500,
            marginBottom: '4px',
            letterSpacing: '0.02em',
          }}
        >
          {label}
          {trend !== 'stable' && (
            <span
              style={{
                fontSize: '10px',
                color: barColor,
                marginLeft: '8px',
                fontWeight: 400,
              }}
            >
              {trend}
            </span>
          )}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          height: `${height}px`,
          gap: `${gap}px`,
          borderBottom: '2px solid currentColor',
        }}
      >
        {sorted.map(bucket => {
          const barHeight = Math.max(2, (bucket.value / maxValue) * (height - 4));
          return (
            <div
              key={bucket.period}
              title={`${bucket.period}: ${formatValue(bucket.value)} (${bucket.eventCount} events)`}
              style={{
                width: `${barWidth}px`,
                height: `${barHeight}px`,
                backgroundColor: barColor,
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>
      {showLabels && sorted.length <= 12 && (
        <div
          style={{
            display: 'flex',
            gap: `${gap}px`,
            marginTop: '2px',
          }}
        >
          {sorted.map(bucket => (
            <div
              key={bucket.period}
              style={{
                width: `${barWidth}px`,
                fontSize: '8px',
                textAlign: 'center',
                color: '#999',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {bucket.period.replace(/^\d{4}-/, '')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

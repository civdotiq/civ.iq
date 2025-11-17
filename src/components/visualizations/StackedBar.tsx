/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * StackedBar - Aicher-Inspired Horizontal Stacked Bar Chart
 *
 * A horizontal bar chart showing proportional segments, perfect for displaying
 * composition data (e.g., racial demographics, vote breakdowns).
 * Follows Dieter Rams' principle: "Good design is honest" - shows the whole (100%)
 * and how it breaks down, allowing instant comparison.
 *
 * Design Principles:
 * - Clean horizontal layout (Aicher system)
 * - No decoration, pure data visualization
 * - Accessible with tooltips and ARIA labels
 * - Space-efficient (more economical than donut charts)
 * - Colors follow Aicher palette
 *
 * @example
 * <StackedBar
 *   segments={[
 *     { label: 'White', percentage: 73.8, color: '#5A8DDE' },
 *     { label: 'Asian', percentage: 16.9, color: '#6BDE5A' },
 *     { label: 'Black', percentage: 3.7, color: '#DE5A6B' },
 *     { label: 'Hispanic', percentage: 3.1, color: '#DED65A' },
 *     { label: 'Other', percentage: 2.5, color: '#B0B0B0' },
 *   ]}
 *   height={24}
 *   showLabels
 * />
 */

export interface StackedBarSegment {
  /**
   * Label for this segment (e.g., "White", "Asian")
   */
  label: string;

  /**
   * Percentage value (should add up to ~100 across all segments)
   */
  percentage: number;

  /**
   * Fill color (Aicher palette recommended)
   */
  color: string;
}

interface StackedBarProps {
  /**
   * Array of segments that make up the bar
   * Percentages should add up to approximately 100
   */
  segments: StackedBarSegment[];

  /**
   * Height of the bar in pixels
   * @default 24
   */
  height?: number;

  /**
   * Whether to show labels below the bar
   * @default false
   */
  showLabels?: boolean;

  /**
   * Overall accessible label for the chart
   * @default "Composition breakdown"
   */
  ariaLabel?: string;
}

export default function StackedBar({
  segments,
  height = 24,
  showLabels = false,
  ariaLabel = 'Composition breakdown',
}: StackedBarProps) {
  // Calculate total percentage (should be close to 100)
  const totalPercentage = segments.reduce((sum, seg) => sum + seg.percentage, 0);

  // Normalize percentages if they don't add up to exactly 100
  const normalizedSegments = segments.map(seg => ({
    ...seg,
    normalizedPercentage: (seg.percentage / totalPercentage) * 100,
  }));

  // Bar container styles (pure geometric form)
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    width: '100%',
    height: `${height}px`,
    overflow: 'hidden',
    border: '1px solid #d0d0d0',
  };

  // Generate descriptive text for screen readers
  const ariaDescription = segments
    .map(seg => `${seg.label}: ${seg.percentage.toFixed(1)}%`)
    .join(', ');

  return (
    <div className="w-full">
      {/* Stacked Bar */}
      <div style={containerStyle} role="img" aria-label={`${ariaLabel}: ${ariaDescription}`}>
        {normalizedSegments.map((segment, index) => {
          const segmentStyle: React.CSSProperties = {
            width: `${segment.normalizedPercentage}%`,
            backgroundColor: segment.color,
            transition: 'opacity 0.2s ease',
            cursor: 'default',
            position: 'relative',
          };

          return (
            <div
              key={`${segment.label}-${index}`}
              style={segmentStyle}
              title={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
              aria-label={`${segment.label}: ${segment.percentage.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Optional labels below the bar - responsive grid */}
      {showLabels && (
        <div className="flex flex-wrap gap-2 sm:gap-3 mt-2 sm:mt-3">
          {segments.map((segment, index) => (
            <div
              key={`label-${segment.label}-${index}`}
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm"
            >
              {/* Color indicator square (Aicher geometric form) */}
              <div
                className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0"
                style={{
                  backgroundColor: segment.color,
                  border: '1px solid rgba(0, 0, 0, 0.1)',
                }}
                aria-hidden="true"
              />
              <span className="text-gray-700">
                <strong>{segment.percentage.toFixed(1)}%</strong>{' '}
                <span className="hidden sm:inline">{segment.label}</span>
                <span className="sm:hidden">{segment.label.substring(0, 3)}</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

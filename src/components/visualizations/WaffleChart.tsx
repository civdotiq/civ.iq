/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * WaffleChart - Aicher-Inspired Percentage Visualization
 *
 * A 10×10 grid visualization where each square represents 1% of the total.
 * Based on Otto Neurath's Isotype system, which heavily influenced Otl Aicher's
 * work. Follows Dieter Rams' principle: "Good design is honest."
 *
 * Design Principles:
 * - Pure geometric forms (squares, no rounded corners)
 * - 8px grid system (Aicher standard)
 * - Minimal, no decoration
 * - Accessible with ARIA labels
 * - Honest representation (1 square = 1%)
 *
 * @example
 * <WaffleChart
 *   percentage={51.3}
 *   color="#3ea2d4"
 *   label="Urban Population"
 * />
 */

interface WaffleChartProps {
  /**
   * Percentage value to visualize (0-100)
   */
  percentage: number;

  /**
   * Fill color for active squares (Aicher palette recommended)
   * @default "#3ea2d4" (aicher-blue)
   */
  color?: string;

  /**
   * Accessible label for screen readers
   */
  label: string;

  /**
   * Size variant
   * @default "default"
   */
  size?: 'small' | 'default' | 'large';
}

export default function WaffleChart({
  percentage,
  color = '#3ea2d4',
  label,
  size = 'default',
}: WaffleChartProps) {
  // Clamp percentage to 0-100 range
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Round to nearest integer for square count (1 square = 1%)
  const filledSquares = Math.round(clampedPercentage);

  // Size mapping (follows 8px grid system)
  const sizeMap = {
    small: {
      squareSize: 6, // 6px squares
      gap: 1, // 1px gap
      mobileSquareSize: 4, // smaller on mobile
      mobileGap: 1,
    },
    default: {
      squareSize: 8, // 8px squares (Aicher standard)
      gap: 2, // 2px gap
      mobileSquareSize: 6, // smaller on mobile
      mobileGap: 1,
    },
    large: {
      squareSize: 12, // 12px squares
      gap: 2, // 2px gap
      mobileSquareSize: 8, // smaller on mobile
      mobileGap: 2,
    },
  };

  const { squareSize, gap, mobileSquareSize, mobileGap } = sizeMap[size];

  // Base square styles (pure geometric form - no border-radius)
  const getSquareStyle = (isFilled: boolean): React.CSSProperties => ({
    backgroundColor: isFilled ? color : '#e0e0e0',
    border: `1px solid ${isFilled ? 'rgba(0, 0, 0, 0.1)' : '#d0d0d0'}`,
    transition: 'opacity 0.2s ease',
  });

  return (
    <div
      className="inline-block"
      role="img"
      aria-label={`${clampedPercentage.toFixed(1)}% ${label}`}
      title={`${clampedPercentage.toFixed(1)}% ${label}`}
    >
      {/* Mobile-optimized grid */}
      <div className="grid grid-cols-10 sm:hidden" style={{ gap: `${mobileGap}px` }}>
        {Array.from({ length: 100 }, (_, index) => (
          <div
            key={`mobile-${index}`}
            style={{
              ...getSquareStyle(index < filledSquares),
              width: `${mobileSquareSize}px`,
              height: `${mobileSquareSize}px`,
            }}
          />
        ))}
      </div>
      {/* Desktop grid */}
      <div className="hidden sm:grid grid-cols-10" style={{ gap: `${gap}px` }}>
        {Array.from({ length: 100 }, (_, index) => (
          <div
            key={`desktop-${index}`}
            style={{
              ...getSquareStyle(index < filledSquares),
              width: `${squareSize}px`,
              height: `${squareSize}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

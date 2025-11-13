/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * U.S. National Averages (Census Bureau, ACS 2022)
 * Used for contextual comparisons across all demographic displays
 */
export const US_AVERAGES = {
  medianIncome: 74580,
  medianAge: 38.9,
  urbanPercentage: 80.0,
  povertyRate: 11.5,
  bachelorDegreePercent: 33.7,
  diversityIndex: 61.1,
};

interface ComparisonIndicatorProps {
  value: number;
  average: number;
  higherIsBetter?: boolean;
  suffix?: string;
  className?: string;
}

/**
 * ComparisonIndicator Component
 *
 * Shows how a demographic metric compares to the U.S. national average
 * - Displays percentage difference and direction (↑/↓)
 * - Color codes: green for better, orange for worse
 * - Shows "≈ U.S. average" when within 2% tolerance
 */
export function ComparisonIndicator({
  value,
  average,
  higherIsBetter = true,
  suffix = '',
  className = '',
}: ComparisonIndicatorProps) {
  const difference = value - average;
  const percentDiff = ((difference / average) * 100).toFixed(1);
  const isAbove = difference > 0;
  const isBetter = higherIsBetter ? isAbove : !isAbove;

  // Within 2% is "about average"
  if (Math.abs(difference) < average * 0.02) {
    return (
      <div className={`text-xs text-gray-600 mt-1 ${className}`}>
        ≈ U.S. average ({average.toLocaleString()}
        {suffix})
      </div>
    );
  }

  return (
    <div className={`text-xs mt-1 ${isBetter ? 'text-green-600' : 'text-orange-600'} ${className}`}>
      {isAbove ? '↑' : '↓'} {Math.abs(parseFloat(percentDiff))}% {isAbove ? 'above' : 'below'} U.S.
      avg ({average.toLocaleString()}
      {suffix})
    </div>
  );
}

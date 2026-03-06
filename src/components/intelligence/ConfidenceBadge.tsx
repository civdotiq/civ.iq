/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * ConfidenceBadge — displays insight confidence level.
 *
 * Green (>0.8): "High confidence"
 * Amber (0.6-0.8): "Moderate confidence"
 * Hidden (<0.6): returns null
 */

interface ConfidenceBadgeProps {
  confidence: number;
  className?: string;
}

export function ConfidenceBadge({ confidence, className = '' }: ConfidenceBadgeProps) {
  if (confidence < 0.6) return null;

  const isHigh = confidence >= 0.8;
  const label = isHigh ? 'High confidence' : 'Moderate confidence';
  const colorClasses = isHigh
    ? 'border-[#0a9338] bg-green-50 text-[#0a9338]'
    : 'border-amber-500 bg-amber-50 text-amber-700';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 aicher-heading type-xs ${colorClasses} ${className}`}
      title={`Confidence score: ${(confidence * 100).toFixed(0)}%`}
    >
      <span className={`w-2 h-2 ${isHigh ? 'bg-[#0a9338]' : 'bg-amber-500'}`} aria-hidden="true" />
      {label}
    </span>
  );
}

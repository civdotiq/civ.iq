/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';

interface CongressBadgeProps {
  congress?: number;
  startYear?: string;
  endYear?: string;
  className?: string;
  variant?: 'default' | 'compact' | 'full';
}

/**
 * Congress Badge Component
 *
 * Displays the current congressional session information to users.
 * Always shows 119th Congress (2025-2027) unless overridden.
 */
export function CongressBadge({
  congress = 119,
  startYear = '2025',
  endYear = '2027',
  className = '',
  variant = 'default',
}: CongressBadgeProps) {
  const baseClasses = 'inline-flex items-center px-2 py-1 text-xs font-medium ';
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 border border-blue-200',
    compact: 'bg-white border-2 border-gray-300 text-gray-700 border border-gray-200',
    full: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  };

  const congressText = variant === 'compact' ? `${congress}th` : `${congress}th Congress`;

  const yearText =
    variant === 'full'
      ? ` (${startYear}-${endYear})`
      : variant === 'default'
        ? ` (${startYear}-${endYear})`
        : '';

  return (
    <span
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
      title={`${congress}th Congress: ${startYear}-${endYear}`}
    >
      <span className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path fillRule="evenodd" d="M10 2L3 7v11h4v-6h6v6h4V7l-7-5z" clipRule="evenodd" />
        </svg>
        {congressText}
        {yearText}
      </span>
    </span>
  );
}

/**
 * Current Congress Badge - Always shows 119th Congress
 */
export function CurrentCongressBadge({
  className,
  variant,
}: Omit<CongressBadgeProps, 'congress' | 'startYear' | 'endYear'>) {
  return (
    <CongressBadge
      congress={119}
      startYear="2025"
      endYear="2027"
      className={className}
      variant={variant}
    />
  );
}

export default CongressBadge;

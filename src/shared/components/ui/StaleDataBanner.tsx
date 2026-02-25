/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { FC } from 'react';

interface StaleDataBannerProps {
  source: string;
  staleSince: string;
  className?: string;
}

/**
 * Warning banner shown when displaying stale (last-known-good) data
 * because an upstream government API is temporarily unavailable.
 *
 * Design: Yellow border-left 2px, bg #fefce8, text #713f12.
 * No rounded corners. 8px padding. Aicher/Ulm compliant.
 */
export const StaleDataBanner: FC<StaleDataBannerProps> = ({
  source,
  staleSince,
  className = '',
}) => {
  const formattedDate = formatRelativeDate(staleSince);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`border-l-2 p-2 text-xs ${className}`}
      style={{
        borderLeftColor: '#d4a017',
        backgroundColor: '#fefce8',
        color: '#713f12',
      }}
    >
      Data from {source} as of {formattedDate}. Source temporarily unavailable.
    </div>
  );
};

function formatRelativeDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'less than an hour ago';
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

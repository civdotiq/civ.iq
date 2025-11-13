/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import type { RepresentativeRole } from '@/types/representative';

interface NonVotingBadgeProps {
  votingMember: boolean;
  role: RepresentativeRole;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
}

/**
 * Badge displaying non-voting status for territorial delegates
 * with constitutional explanation
 */
export function NonVotingBadge({
  votingMember,
  role,
  size = 'md',
  showTooltip = true,
}: NonVotingBadgeProps) {
  // Only show badge for non-voting members
  if (votingMember) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const tooltipText =
    role === 'Resident Commissioner'
      ? 'Non-Voting Resident Commissioner from Puerto Rico. Under Article IV, Section 3 of the U.S. Constitution, territorial delegates may participate in House proceedings but cannot vote on final passage of legislation. Only state representatives have full voting power per Article I, Section 2.'
      : 'Non-Voting Delegate. Under Article IV, Section 3 of the U.S. Constitution, territorial delegates may participate in House proceedings but cannot vote on final passage of legislation. Only state representatives have full voting power per Article I, Section 2.';

  const badge = (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-md
        bg-amber-100 dark:bg-amber-900/30
        text-amber-800 dark:text-amber-200
        border border-amber-300 dark:border-amber-700
        font-medium
        ${sizeClasses[size]}
      `}
      title={showTooltip ? tooltipText : undefined}
      aria-label={`Non-voting ${role}`}
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>Non-Voting {role === 'Resident Commissioner' ? 'Commissioner' : 'Delegate'}</span>
    </span>
  );

  // Add detailed tooltip on hover for accessibility
  if (showTooltip) {
    return (
      <div className="group relative inline-block">
        {badge}
        <div
          className="
            invisible group-hover:visible
            absolute z-50 w-80 p-3 mt-2
            text-sm text-gray-700 dark:text-gray-200
            bg-white dark:bg-gray-800
            border border-gray-300 dark:border-gray-600
            rounded-lg shadow-lg
            left-0 top-full
          "
          role="tooltip"
        >
          <h4 className="font-semibold mb-2 text-amber-800 dark:text-amber-200">
            Constitutional Authority
          </h4>
          <p className="mb-2">
            <strong>Article IV, Section 3:</strong> U.S. territories receive limited statutory
            representation in the House of Representatives only.
          </p>
          <p className="mb-2">
            <strong>Article I, Sections 2 &amp; 3:</strong> Only states are granted full voting
            members in both chambers of Congress.
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Territorial delegates may introduce legislation, serve on committees, and participate in
            floor debates, but cannot vote on final passage of bills.
          </p>
        </div>
      </div>
    );
  }

  return badge;
}

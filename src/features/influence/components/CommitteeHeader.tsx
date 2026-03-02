/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { CommitteeTypeBadge } from './CommitteeTypeBadge';

interface CommitteeHeaderProps {
  name: string;
  committeeType: string;
  designation: string;
  state: string;
  treasurerName: string;
  fecUrl: string;
  party: string;
}

export function CommitteeHeader({
  name,
  committeeType,
  designation,
  state,
  treasurerName,
  fecUrl,
  party,
}: CommitteeHeaderProps) {
  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
              {name}
            </h1>
            <CommitteeTypeBadge committeeType={committeeType} designation={designation} />
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
            {state && <span>State: {state}</span>}
            {party && party !== '' && <span>Party: {party}</span>}
            {treasurerName && <span>Treasurer: {treasurerName}</span>}
          </div>
        </div>

        <a
          href={fecUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-[#3ea2d4] dark:text-[#5bb8e6] hover:underline flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          View on FEC.gov
        </a>
      </div>
    </div>
  );
}

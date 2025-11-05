/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Users, UserCheck, ExternalLink } from 'lucide-react';
import type { StateCommittee } from '@/types/state-legislature';
import { getChamberName } from '@/types/state-legislature';

interface StateCommitteeCardProps {
  committee: StateCommittee;
  state: string;
}

/**
 * Compact card component for displaying state committee summary information
 * Used in committee list views
 */
export const StateCommitteeCard: React.FC<StateCommitteeCardProps> = ({ committee, state }) => {
  // Find committee leadership
  const chair = committee.members?.find(m => m.role === 'Chair' && !m.role.includes('Vice'));
  const viceChair = committee.members?.find(m => m.role === 'Vice Chair');

  // Get chamber display name
  const chamberName = getChamberName(state, committee.chamber);

  // Get party badge color for chair
  const getPartyColor = (party?: string) => {
    if (party === 'Democratic') return 'text-blue-700 bg-blue-50 border-blue-200';
    if (party === 'Republican') return 'text-red-700 bg-red-50 border-red-200';
    return 'text-gray-700 bg-gray-50 border-gray-200';
  };

  return (
    <div className="bg-white border-2 border-black hover:border-civiq-blue transition-colors">
      <div className="p-4">
        {/* Committee Name and Chamber */}
        <div className="mb-3">
          <Link
            href={`/state-legislature/${state}/committee/${committee.id}`}
            className="text-lg font-bold hover:text-civiq-blue transition-colors"
          >
            {committee.name}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
              {chamberName}
            </span>
            {committee.classification && (
              <>
                <span className="text-gray-400">•</span>
                <span className="text-xs text-gray-600 capitalize">{committee.classification}</span>
              </>
            )}
          </div>
        </div>

        {/* Leadership and Stats */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Leadership */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {chair && (
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-civiq-blue flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Chair</div>
                  <div className="text-sm font-semibold truncate">{chair.legislator_name}</div>
                  {chair.party && (
                    <span
                      className={`inline-block text-xs px-1.5 py-0.5 border rounded ${getPartyColor(chair.party)}`}
                    >
                      {chair.party.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
            )}
            {viceChair && (
              <div className="flex items-center gap-2 min-w-0">
                <UserCheck className="w-4 h-4 text-civiq-green flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Vice Chair</div>
                  <div className="text-sm font-semibold truncate">{viceChair.legislator_name}</div>
                </div>
              </div>
            )}
          </div>

          {/* Member Count and Link */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span className="text-sm font-semibold">
                {committee.members?.length || 0} members
              </span>
            </div>
            <Link
              href={`/state-legislature/${state}/committee/${committee.id}`}
              className="flex items-center gap-1 text-civiq-blue hover:underline text-sm font-semibold"
            >
              View
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

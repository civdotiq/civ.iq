/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Users, Info } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { getCommitteeName, COMMITTEE_INFO } from '@/lib/data/committee-names';

interface CommitteeMembershipsCardProps {
  representative: EnhancedRepresentative;
  className?: string;
  /** Include back-navigation params in committee links */
  includeBackNavigation?: boolean;
}

export function CommitteeMembershipsCard({
  representative,
  className = '',
  includeBackNavigation = true,
}: CommitteeMembershipsCardProps) {
  // Memoize committees to prevent unnecessary re-renders
  const committees = React.useMemo(
    () => representative.committees || [],
    [representative.committees]
  );

  // Deduplicate committees by name and consolidate roles
  const deduplicatedCommittees = React.useMemo(() => {
    const committeeMap = new Map<
      string,
      {
        name: string;
        thomas_id: string;
        roles: string[];
        originalCommittee: (typeof committees)[0];
      }
    >();

    committees.forEach(committee => {
      // committee.name is the thomas_id (e.g., "SSBA12")
      const thomasId = (committee as { thomas_id?: string }).thomas_id || committee.name;
      const displayName = getCommitteeName(thomasId);

      if (committeeMap.has(displayName)) {
        // Add role to existing committee entry
        const existing = committeeMap.get(displayName)!;
        if (committee.role && !existing.roles.includes(committee.role)) {
          existing.roles.push(committee.role);
        }
      } else {
        // Create new committee entry
        committeeMap.set(displayName, {
          name: displayName, // Human-readable name for display
          thomas_id: thomasId, // Original thomas_id for routing
          roles: committee.role ? [committee.role] : [],
          originalCommittee: committee,
        });
      }
    });

    return Array.from(committeeMap.values());
  }, [committees]);

  return (
    <div className={`bg-white border-2 border-black accent-bar-blue ${className}`}>
      <div className="p-grid-4 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-civiq-blue" />
          <h3 className="aicher-heading text-lg text-civiq-blue">Committee Memberships</h3>
        </div>
      </div>
      <div className="p-grid-4">
        {deduplicatedCommittees.length > 0 ? (
          <div className="aicher-data-list">
            {deduplicatedCommittees.map((committee, index) => (
              <div key={`${committee.name}-${index}`} className="aicher-data-list-item">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h4 className="aicher-heading text-base flex-1">
                    <Link
                      href={
                        includeBackNavigation
                          ? `/committee/${committee.thomas_id}?from=${representative.bioguideId}&name=${encodeURIComponent(representative.name)}`
                          : `/committee/${committee.thomas_id}`
                      }
                      className="text-civiq-blue hover:text-black transition-colors"
                    >
                      {committee.name}
                    </Link>
                  </h4>
                  {COMMITTEE_INFO[committee.thomas_id]?.description && (
                    <div className="relative group/tooltip">
                      <Info className="w-4 h-4 text-gray-400 hover:text-civiq-blue cursor-help transition-colors" />
                      <div className="absolute right-0 top-6 w-64 bg-black text-white text-xs p-3 opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-10">
                        <p className="leading-relaxed">
                          {COMMITTEE_INFO[committee.thomas_id]?.description ?? ''}
                        </p>
                        <div className="absolute -top-1 right-4 w-2 h-2 bg-black transform rotate-45"></div>
                      </div>
                    </div>
                  )}
                </div>
                {committee.roles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {committee.roles.map((role, roleIndex) => (
                      <span
                        key={roleIndex}
                        className={`aicher-heading text-xs px-3 py-1.5 border-2 ${
                          role === 'Chair'
                            ? 'bg-civiq-blue text-white border-civiq-blue'
                            : role === 'Ranking Member'
                              ? 'bg-civiq-red text-white border-civiq-red'
                              : 'bg-white text-gray-700 border-black'
                        }`}
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 aicher-heading text-sm">
              No committee memberships available
            </p>
            <p className="text-xs text-gray-400 mt-2">Data sourced from Congress.gov</p>
          </div>
        )}
      </div>
    </div>
  );
}

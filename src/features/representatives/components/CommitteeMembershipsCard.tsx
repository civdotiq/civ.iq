/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Users } from 'lucide-react';
import { EnhancedRepresentative } from '@/types/representative';
import { COMMITTEE_ID_MAP } from '@/types/committee';
import { getCommitteeName } from '@/lib/data/committee-names';

interface CommitteeMembershipsCardProps {
  representative: EnhancedRepresentative;
  className?: string;
}

// Helper function to find thomas_id from committee name
function findCommitteeId(committeeName: string): string | null {
  // Try to find matching committee by name
  const matchingEntry = Object.entries(COMMITTEE_ID_MAP).find(
    ([_, info]) =>
      info.name.toLowerCase() === committeeName.toLowerCase() ||
      info.name.toLowerCase().includes(committeeName.toLowerCase()) ||
      committeeName.toLowerCase().includes(info.name.toLowerCase())
  );

  return matchingEntry ? matchingEntry[0] : null;
}

export function CommitteeMembershipsCard({
  representative,
  className = '',
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
      const displayName = getCommitteeName(committee.name);

      if (committeeMap.has(displayName)) {
        // Add role to existing committee entry
        const existing = committeeMap.get(displayName)!;
        if (committee.role && !existing.roles.includes(committee.role)) {
          existing.roles.push(committee.role);
        }
      } else {
        // Create new committee entry
        committeeMap.set(displayName, {
          name: displayName,
          thomas_id: (committee as { thomas_id?: string }).thomas_id || committee.name,
          roles: committee.role ? [committee.role] : [],
          originalCommittee: committee,
        });
      }
    });

    return Array.from(committeeMap.values());
  }, [committees]);

  return (
    <div className={`bg-white border-2 border-black accent-bar-blue ${className}`}>
      <div className="p-6 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-civiq-blue" />
          <h3 className="aicher-heading text-lg text-civiq-blue">Committee Memberships</h3>
        </div>
      </div>
      <div className="p-6">
        {deduplicatedCommittees.length > 0 ? (
          <div className="space-y-4">
            {deduplicatedCommittees.map((committee, index) => (
              <div
                key={`${committee.name}-${index}`}
                className="committee-card accent-bar-blue p-4"
              >
                <h4 className="aicher-heading text-base mb-3">
                  {(() => {
                    const committeeId = findCommitteeId(committee.name);
                    const href = committeeId
                      ? `/committee/${committeeId.toLowerCase()}`
                      : `/committee/${committee.name
                          .replace(/\s+/g, '-')
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, '')}`;

                    return (
                      <Link
                        href={href}
                        className="text-civiq-blue hover:text-black transition-colors"
                      >
                        {committee.name}
                      </Link>
                    );
                  })()}
                </h4>
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

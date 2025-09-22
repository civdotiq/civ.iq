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
    <div
      className={`bg-white rounded-xl border border-gray-200 border-2 border-black hover:border-2 border-black transition-border-2 border-black duration-200 ${className}`}
    >
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-blue-50">
            <Users className="w-5 h-5" style={{ color: '#3aa3d5' }} />
          </div>
          <h3 className="text-lg font-bold" style={{ color: '#3aa3d5' }}>
            Committee Memberships
          </h3>
        </div>
      </div>
      <div className="p-6">
        {deduplicatedCommittees.length > 0 ? (
          <div className="space-y-3">
            {deduplicatedCommittees.map((committee, index) => (
              <div
                key={`${committee.name}-${index}`}
                className="group border border-gray-200 p-4 hover:border-blue-300 hover:border-2 border-black transition-all duration-200 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-white"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base leading-5">
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
                            className="text-blue-600 hover:text-blue-800 hover:underline group-hover:text-blue-700 transition-colors"
                          >
                            {committee.name}
                          </Link>
                        );
                      })()}
                    </h4>
                    {committee.roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {committee.roles.map((role, roleIndex) => (
                          <span
                            key={roleIndex}
                            className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full border-2 border-black ${
                              role === 'Chair'
                                ? 'bg-gradient-to-r text-white'
                                : role === 'Ranking Member'
                                  ? 'bg-gradient-to-r text-white'
                                  : 'bg-white border-2 border-gray-300 text-gray-700 border border-gray-200'
                            }`}
                            style={{
                              background:
                                role === 'Chair'
                                  ? 'linear-gradient(to right, #3aa3d5, #1e40af)'
                                  : role === 'Ranking Member'
                                    ? 'linear-gradient(to right, #e21f0a, #dc2626)'
                                    : undefined,
                            }}
                          >
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-400 italic">No committee memberships available</p>
            <p className="text-xs text-gray-300 mt-2">Data sourced from Congress.gov</p>
          </div>
        )}
      </div>
    </div>
  );
}

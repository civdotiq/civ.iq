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
  const committees = representative.committees || [];

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Committee Memberships</h3>
        </div>
      </div>
      <div className="p-4">
        {committees.length > 0 ? (
          <div className="space-y-3">
            {committees.map((committee, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm leading-5">
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
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {committee.name}
                          </Link>
                        );
                      })()}
                    </h4>
                    {committee.role && (
                      <div className="mt-2">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                            committee.role === 'Chair'
                              ? 'bg-blue-100 text-blue-800'
                              : committee.role === 'Ranking Member'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {committee.role}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-gray-500">No committee memberships available</p>
            <p className="text-sm text-gray-400 mt-1">Data sourced from Congress.gov</p>
          </div>
        )}
      </div>
    </div>
  );
}

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

interface CommitteeEntry {
  name: string;
  thomas_id: string;
  roles: string[];
  isSubcommittee: boolean;
  parentId: string | null;
}

interface HierarchicalCommittee extends CommitteeEntry {
  subcommittees: CommitteeEntry[];
}

interface CommitteeMembershipsCardProps {
  representative: EnhancedRepresentative;
  className?: string;
  /** Include back-navigation params in committee links */
  includeBackNavigation?: boolean;
}

/**
 * Extract the parent committee ID from a thomas_id
 * e.g., "SSAS14" -> "SSAS", "SSCM34" -> "SSCM", "HSAP01" -> "HSAP"
 */
function getParentCommitteeId(thomasId: string): string | null {
  // Pattern: 4-letter code followed by optional numbers
  const match = thomasId.match(/^([A-Z]{4})(\d+)?$/);
  if (match && match[2] && match[1]) {
    // Has a number suffix - it's a subcommittee
    return match[1];
  }
  return null; // It's a parent committee
}

/**
 * Check if a thomas_id represents a subcommittee
 */
function isSubcommittee(thomasId: string): boolean {
  return /^[A-Z]{4}\d+$/.test(thomasId);
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

  // Build hierarchical committee structure
  const hierarchicalCommittees = React.useMemo(() => {
    const committeeMap = new Map<string, CommitteeEntry>();

    // First pass: create entries for all committees
    committees.forEach(committee => {
      const thomasId = (committee as { thomas_id?: string }).thomas_id || committee.name;
      const displayName = getCommitteeName(thomasId);
      const parentId = getParentCommitteeId(thomasId);

      if (committeeMap.has(thomasId)) {
        // Add role to existing committee entry
        const existing = committeeMap.get(thomasId)!;
        if (committee.role && !existing.roles.includes(committee.role)) {
          existing.roles.push(committee.role);
        }
      } else {
        // Create new committee entry
        committeeMap.set(thomasId, {
          name: displayName,
          thomas_id: thomasId,
          roles: committee.role ? [committee.role] : [],
          isSubcommittee: isSubcommittee(thomasId),
          parentId,
        });
      }
    });

    // Second pass: group subcommittees under parent committees
    const parentCommittees: HierarchicalCommittee[] = [];
    const orphanSubcommittees: CommitteeEntry[] = [];

    // Get all parent committees first
    committeeMap.forEach(entry => {
      if (!entry.isSubcommittee) {
        parentCommittees.push({
          ...entry,
          subcommittees: [],
        });
      }
    });

    // Assign subcommittees to parents
    committeeMap.forEach(entry => {
      if (entry.isSubcommittee && entry.parentId) {
        const parent = parentCommittees.find(p => p.thomas_id === entry.parentId);
        if (parent) {
          parent.subcommittees.push(entry);
        } else {
          // Parent not in list - check if we should create a placeholder
          const existingOrphanParent = parentCommittees.find(p => p.thomas_id === entry.parentId);
          if (!existingOrphanParent) {
            // Create placeholder parent
            const parentName = getCommitteeName(entry.parentId);
            const newParent: HierarchicalCommittee = {
              name: parentName,
              thomas_id: entry.parentId,
              roles: [],
              isSubcommittee: false,
              parentId: null,
              subcommittees: [entry],
            };
            parentCommittees.push(newParent);
          } else {
            existingOrphanParent.subcommittees.push(entry);
          }
        }
      } else if (entry.isSubcommittee && !entry.parentId) {
        orphanSubcommittees.push(entry);
      }
    });

    // Sort: parent committees first by name, then append orphan subcommittees
    parentCommittees.sort((a, b) => a.name.localeCompare(b.name));
    parentCommittees.forEach(p => p.subcommittees.sort((a, b) => a.name.localeCompare(b.name)));

    return { parentCommittees, orphanSubcommittees };
  }, [committees]);

  const { parentCommittees, orphanSubcommittees } = hierarchicalCommittees;
  const hasCommittees = parentCommittees.length > 0 || orphanSubcommittees.length > 0;

  // Helper to render role badges
  const renderRoles = (roles: string[]) => {
    if (roles.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {roles.map((role: string, roleIndex: number) => (
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
    );
  };

  // Helper to render a committee item
  const renderCommitteeItem = (committee: CommitteeEntry, isNested: boolean = false) => (
    <div
      key={committee.thomas_id}
      className={`${isNested ? 'pl-6 border-l-2 border-gray-200 ml-2' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className={`aicher-heading flex-1 ${isNested ? 'text-sm' : 'text-base'}`}>
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
          <div className="relative group/tooltip flex-shrink-0">
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
      {renderRoles(committee.roles)}
    </div>
  );

  return (
    <div className={`bg-white border-2 border-black accent-bar-blue ${className}`}>
      <div className="p-grid-4 border-b-2 border-black">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-civiq-blue" />
          <h3 className="aicher-heading text-lg text-civiq-blue">Committee Memberships</h3>
        </div>
      </div>
      <div className="p-grid-4">
        {hasCommittees ? (
          <div className="space-y-6">
            {/* Parent committees with nested subcommittees */}
            {parentCommittees.map((parent: HierarchicalCommittee) => (
              <div key={parent.thomas_id} className="aicher-data-list-item">
                {/* Parent committee */}
                {renderCommitteeItem(parent, false)}

                {/* Nested subcommittees - threaded style */}
                {parent.subcommittees.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {parent.subcommittees.map((sub: CommitteeEntry) =>
                      renderCommitteeItem(sub, true)
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Orphan subcommittees (no parent in list) */}
            {orphanSubcommittees.map((committee: CommitteeEntry) => (
              <div key={committee.thomas_id} className="aicher-data-list-item">
                {renderCommitteeItem(committee, false)}
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

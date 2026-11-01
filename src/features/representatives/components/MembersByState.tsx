/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import type { EnhancedRepresentative } from '@/types/representative';
import { getStateName, houseSeatLabel } from '@/lib/data/us-states';

/**
 * Every current member as a plain link, grouped by state. Rendered on the
 * server: the filterable grid above it draws only the cards on screen, so
 * this list is how a crawler (or a reader who prefers a list) reaches all
 * profiles from /representatives.
 */

type Member = Pick<EnhancedRepresentative, 'bioguideId' | 'name' | 'state' | 'chamber'> & {
  district?: string;
  role?: string;
};

function seatLabel(member: Member): string {
  if (member.chamber === 'Senate') return 'Senator';
  if (member.role === 'Delegate' || member.role === 'Resident Commissioner') return member.role;
  return member.district ? houseSeatLabel(member.district) : 'Representative';
}

/** Senators by name, then House seats by district number. */
function bySeat(a: Member, b: Member): number {
  if (a.chamber !== b.chamber) return a.chamber === 'Senate' ? -1 : 1;
  if (a.chamber === 'Senate') return a.name.localeCompare(b.name);
  return (parseInt(a.district ?? '0', 10) || 0) - (parseInt(b.district ?? '0', 10) || 0);
}

export function groupMembersByState(
  members: Member[]
): Array<{ state: string; stateName: string; members: Member[] }> {
  const byState = new Map<string, Member[]>();
  for (const member of members) {
    if (!member.bioguideId || !member.state) continue;
    const list = byState.get(member.state) ?? [];
    list.push(member);
    byState.set(member.state, list);
  }
  return [...byState.entries()]
    .map(([state, list]) => ({
      state,
      stateName: getStateName(state) ?? state,
      members: [...list].sort(bySeat),
    }))
    .sort((a, b) => a.stateName.localeCompare(b.stateName));
}

export function MembersByState({ representatives }: { representatives: Member[] }) {
  const states = groupMembersByState(representatives);
  if (states.length === 0) return null;
  const total = states.reduce((sum, s) => sum + s.members.length, 0);

  return (
    <section aria-labelledby="members-by-state" className="mt-16 border-t-2 border-t-black pt-6">
      <h2 id="members-by-state" className="text-2xl font-bold text-gray-900 mb-2">
        All members by state
      </h2>
      <p className="text-sm text-gray-600 mb-8">
        {total} current members of the House and Senate, including non-voting delegates.
      </p>
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8">
        {states.map(({ state, stateName, members }) => (
          <div key={state} className="break-inside-avoid mb-6">
            <h3 className="text-sm font-bold text-gray-900 border-b border-gray-200 pb-1 mb-2">
              <Link href={`/states/${state.toLowerCase()}`} className="hover:text-civiq-blue">
                {stateName}
              </Link>
            </h3>
            <ul className="space-y-1 text-sm">
              {members.map(member => (
                <li key={member.bioguideId} className="flex justify-between gap-3">
                  <Link
                    href={`/representative/${member.bioguideId}`}
                    className="text-civiq-blue hover:underline"
                  >
                    {member.name}
                  </Link>
                  <span className="text-gray-500 text-xs whitespace-nowrap pt-0.5">
                    {seatLabel(member)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

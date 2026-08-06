/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { encodeBase64Url } from '@/lib/url-encoding';
import type { StateBillVote } from '@/types/state-legislature';

type RollCallEntry = NonNullable<StateBillVote['votes']>[number];

/**
 * Vote options in the order a reader looks for them, rather than the order
 * OpenStates happens to return. Anything outside this list keeps its own label
 * and sorts to the end.
 */
const OPTION_ORDER: ReadonlyArray<RollCallEntry['option']> = [
  'yes',
  'no',
  'abstain',
  'not voting',
  'absent',
  'excused',
  'other',
];

const OPTION_LABELS: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  abstain: 'Abstained',
  'not voting': 'Not voting',
  absent: 'Absent',
  excused: 'Excused',
  other: 'Other',
};

function groupByOption(entries: RollCallEntry[]): Array<[string, RollCallEntry[]]> {
  const groups = new Map<string, RollCallEntry[]>();
  for (const entry of entries) {
    const existing = groups.get(entry.option);
    if (existing) existing.push(entry);
    else groups.set(entry.option, [entry]);
  }

  return [...groups.entries()]
    .map(([option, members]) => {
      // Surnames are what the chamber prints and what a reader scans for, but
      // sorting on the full name is close enough and avoids guessing where a
      // name breaks.
      members.sort((a, b) => a.legislator_name.localeCompare(b.legislator_name));
      return [option, members] as [string, RollCallEntry[]];
    })
    .sort(([a], [b]) => {
      const ai = OPTION_ORDER.indexOf(a as RollCallEntry['option']);
      const bi = OPTION_ORDER.indexOf(b as RollCallEntry['option']);
      return (ai === -1 ? OPTION_ORDER.length : ai) - (bi === -1 ? OPTION_ORDER.length : bi);
    });
}

interface RollCallProps {
  state: string;
  vote: StateBillVote;
}

/**
 * How each member voted.
 *
 * Renders nothing when the roll call is absent — that means the request did not
 * ask OpenStates for it, which is not the same as a vote nobody attended. The
 * counts above already stand on their own.
 *
 * Vote options are deliberately not colour-coded: red and blue identify parties
 * here, and a green "yes" would read as a party cue on a roll call where both
 * parties vote yes.
 */
export function RollCall({ state, vote }: RollCallProps) {
  if (!vote.votes || vote.votes.length === 0) return null;

  const groups = groupByOption(vote.votes);

  return (
    <details className="mt-3 pt-3 border-t border-gray-200">
      <summary className="cursor-pointer text-sm font-medium text-civiq-blue">
        How each member voted ({vote.votes.length})
      </summary>

      <div className="mt-4 space-y-4">
        {groups.map(([option, members]) => (
          <div key={option}>
            <div className="text-xs uppercase tracking-wide text-gray-600 mb-2">
              {OPTION_LABELS[option] ?? option} — {members.length}
            </div>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
              {members.map((member, idx) => (
                <li key={`${member.legislator_id ?? member.legislator_name}-${idx}`}>
                  {member.legislator_id ? (
                    <Link
                      href={`/state-legislature/${state.toLowerCase()}/legislator/${encodeBase64Url(
                        member.legislator_id
                      )}`}
                      className="text-civiq-blue hover:underline"
                    >
                      {member.legislator_name}
                    </Link>
                  ) : (
                    // OpenStates could not match this name to a legislator, so
                    // there is no profile to point at. The name still belongs
                    // in the roll call.
                    <span className="text-gray-900">{member.legislator_name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Digest data visuals — server components, no interactivity.
 *
 * The margin bar makes a vote's decisiveness visible without reading
 * numbers (Tufte data-ink). The delegation breakdown answers the reader's
 * real question — who voted Yea, who Nay, who didn't — by grouping under
 * plain position labels; party is a secondary cue in the name color, not
 * the organizing axis.
 */

import Link from 'next/link';
import { getPartyTextClass } from '@/lib/party-colors';
import type { DigestMemberPosition } from '@/lib/digest/types';

/**
 * Proportional yea/nay bar with a hairline at the 50% majority line.
 * Black = yea, gray = nay; neutral by design (an aggregate tally is not
 * partisan). Present/not-voting are excluded — the bar is the decision.
 */
export function VoteMarginBar({ yeas, nays }: { yeas: number; nays: number }) {
  const total = yeas + nays;
  if (total === 0) return null;
  const yeaPct = (yeas / total) * 100;
  return (
    <div
      className="relative mt-grid-1 h-2 w-full max-w-[280px] overflow-hidden bg-gray-200"
      role="img"
      aria-label={`${yeas} yea, ${nays} nay`}
    >
      <div className="h-full bg-black" style={{ width: `${yeaPct}%` }} />
      {/* Majority line: yea segment crossing this passed the recorded vote. */}
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white" />
    </div>
  );
}

function surnameOf(name: string): string {
  return name.split(' ').slice(-1)[0] ?? name;
}

function MemberName({ member }: { member: DigestMemberPosition }) {
  const label = `${member.name} (${member.party.charAt(0)}${member.district ? `-${member.district}` : ''})`;
  return (
    <Link
      href={`/representative/${member.bioguideId}`}
      title={label}
      className={`hover:underline ${getPartyTextClass(member.party)}`}
    >
      {surnameOf(member.name)}
    </Link>
  );
}

/**
 * The delegation grouped by how they voted — Yea, then Nay, then didn't
 * vote — each under a plain label. Position is the structure; party shows
 * only in the name color (red = R, blue = D), so a "crossed party lines"
 * vote reads at a glance: all-blue names sitting in the Nay row.
 * Empty groups are omitted (the card header already carries the counts).
 */
export function DelegationBreakdown({ members }: { members: DigestMemberPosition[] }) {
  if (members.length === 0) return null;
  const groups = [
    { label: 'Yea', list: members.filter(m => m.position === 'Yea') },
    { label: 'Nay', list: members.filter(m => m.position === 'Nay') },
    {
      label: 'Not voting',
      list: members.filter(m => m.position !== 'Yea' && m.position !== 'Nay'),
    },
  ].filter(g => g.list.length > 0);

  return (
    <dl className="mt-1 space-y-1">
      {groups.map(group => (
        <div key={group.label} className="flex gap-grid-2 text-sm">
          <dt className="w-[6.5rem] shrink-0 text-xs font-bold uppercase tracking-[0.05em] text-gray-500">
            {group.label} ({group.list.length})
          </dt>
          <dd className="flex flex-1 flex-wrap gap-x-grid-2 gap-y-0.5">
            {group.list.map(m => (
              <MemberName key={m.bioguideId} member={m} />
            ))}
          </dd>
        </div>
      ))}
    </dl>
  );
}

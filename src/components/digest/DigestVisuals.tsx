/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Digest data visuals — server components, no interactivity.
 *
 * Both are graphical integrity, not decoration (Tufte): the margin bar
 * makes a vote's decisiveness visible without reading numbers; the
 * delegation strip turns a wall of names into a scannable party pattern.
 * Party color identifies party (the one sanctioned use); fill vs. outline
 * encodes the neutral Yea/Nay dimension.
 */

import Link from 'next/link';
import { getPartyHexColor } from '@/lib/party-colors';
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

const CELL_BASE =
  'inline-flex items-center border-2 px-1.5 py-0.5 text-xs font-medium leading-none transition-colors';

function DelegationCell({ member }: { member: DigestMemberPosition }) {
  const hex = getPartyHexColor(member.party);
  const voted = member.position === 'Yea' || member.position === 'Nay';
  const label = `${member.name} (${member.party.charAt(0)}${member.district ? `-${member.district}` : ''}) — ${member.position}`;

  let style: React.CSSProperties;
  if (member.position === 'Yea') {
    // Filled: party color background, white text.
    style = { backgroundColor: hex, borderColor: hex, color: '#fff' };
  } else if (member.position === 'Nay') {
    // Outline: party color border and text on white.
    style = { borderColor: hex, color: hex };
  } else {
    // Not voting / present: neutral gray.
    style = { borderColor: '#d1d5db', color: '#9ca3af' };
  }

  const surname = member.name.split(' ').slice(-1)[0] ?? member.name;
  return (
    <Link
      href={`/representative/${member.bioguideId}`}
      title={label}
      aria-label={label}
      className={`${CELL_BASE} hover:opacity-80 ${voted ? '' : 'line-through'}`}
      style={style}
    >
      {surname}
    </Link>
  );
}

/**
 * One cell per delegation member: party color = party, filled = Yea,
 * outline = Nay, struck gray = didn't vote. Every cell links to the member.
 */
export function DelegationStrip({ members }: { members: DigestMemberPosition[] }) {
  if (members.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {members.map(m => (
        <DelegationCell key={m.bioguideId} member={m} />
      ))}
    </div>
  );
}

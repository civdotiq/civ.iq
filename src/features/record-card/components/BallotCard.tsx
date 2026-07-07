/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * "Your ballot" box (mockup 1i family) for the your-reps lookup flow.
 *
 * Shows which of the voter's federal seats are on the next general-election
 * ballot, each linking to the incumbent's Record Card. Statements are about
 * SEATS, not candidacies — whether an incumbent is seeking re-election is
 * not in our data, so we never claim it. A vacant seat (non-active status)
 * gets the open-seat framing.
 *
 * Renders nothing while loading or when no seat is on the ballot — this is
 * an additive layer, never a blocker for the lookup results.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface BallotMember {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  nextElectionYear: number | null;
  onNextBallot: boolean;
  electionDayLabel: string | null;
  status?: string;
}

export function BallotCard({ bioguideIds }: { bioguideIds: string[] }) {
  const [members, setMembers] = useState<BallotMember[] | null>(null);

  // Join to a stable primitive — the array prop is rebuilt on every parent
  // render and would refetch in a loop as a useEffect dependency.
  const idsKey = bioguideIds.join(',');

  useEffect(() => {
    if (!idsKey) return;
    let cancelled = false;

    fetch(`/api/record-card/ballot-status?ids=${idsKey}`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.members) setMembers(data.members as BallotMember[]);
      })
      .catch(() => {
        // Additive layer: fail silently, the rep results still render
      });

    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const onBallot = (members ?? []).filter(m => m.onNextBallot);
  if (onBallot.length === 0) return null;

  const electionDay = onBallot[0]?.electionDayLabel;

  return (
    <div className="mt-6 border-2 border-black bg-white">
      <div className="flex items-baseline justify-between px-4 pt-3 text-xs font-bold uppercase tracking-[0.08em]">
        <span>Your {electionDay ?? 'next'} ballot</span>
        <span className="text-gray-500">Federal seats</span>
      </div>
      <div className="mt-2 h-[3px] bg-black" />
      {onBallot.map(m => {
        const seatLabel =
          m.chamber === 'House'
            ? `${m.state}-${(m.district ?? '').padStart(2, '0')} · U.S. House`
            : `${m.state} · U.S. Senate`;
        const vacant = m.status && m.status !== 'active' && m.status !== 'pending_resignation';

        return (
          <div
            key={m.bioguideId}
            className="flex items-baseline justify-between gap-4 border-t border-gray-300 px-4 py-3 first:border-t-0"
          >
            <div>
              <div className="text-[15px] font-medium tracking-[0.025em]">
                {vacant ? (
                  <>
                    {seatLabel} — <span className="font-bold uppercase">Open seat</span>
                  </>
                ) : (
                  <>
                    {m.name} <span className="text-gray-500">({seatLabel})</span>
                  </>
                )}
              </div>
              <div className="text-xs tracking-[0.025em] text-gray-500">
                {vacant
                  ? 'This seat is vacant; there is no incumbent record for this race.'
                  : 'Seat is up for election — see the incumbent’s record from government sources.'}
              </div>
            </div>
            {!vacant && (
              <Link
                href={`/representative/${m.bioguideId}/record`}
                className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.08em] text-civiq-blue hover:underline"
              >
                Record card →
              </Link>
            )}
          </div>
        );
      })}
    </div>
  );
}

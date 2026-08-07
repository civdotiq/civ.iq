/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { BallotDistrict2026 } from '@/lib/data-sources/cd120-districts/ballot-district';

interface RedistrictingNoteProps {
  /** The `ballotDistrict2026` field from any address-lookup API response. */
  ballotDistrict2026?: Pick<BallotDistrict2026, 'differsFromCurrent' | 'note'> | null;
  className?: string;
}

/**
 * Inline caveat shown when an address's 2026-ballot (120th Congress) district
 * differs from its current representative's (119th) district. Ten states
 * redrew congressional maps for the 2026 election; without this, a redrawn
 * address silently sees only the outgoing district. Renders nothing when the
 * districts match or the lookup was unavailable.
 */
export function RedistrictingNote({ ballotDistrict2026, className = '' }: RedistrictingNoteProps) {
  if (!ballotDistrict2026?.differsFromCurrent || !ballotDistrict2026.note) {
    return null;
  }

  return (
    <div
      className={`border-l-4 border-amber-600 bg-amber-50 p-4 text-sm text-amber-800 ${className}`}
    >
      <p className="font-bold uppercase tracking-wide text-xs mb-1">Redistricting notice</p>
      <p>{ballotDistrict2026.note}</p>
    </div>
  );
}

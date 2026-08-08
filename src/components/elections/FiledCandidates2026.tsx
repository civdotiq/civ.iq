/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * "Who has filed to run" block for the 2026 cycle, mounted on rep
 * profiles and district pages. Data is the CDN-cached race header
 * (/api/elections/[raceId], FEC-backed).
 *
 * Editorial gate: an FEC filing is NOT ballot access. Every string here
 * says "filed" — never "on the ballot" / "running" — until a certified-
 * candidate corpus (Phase 4) confirms ballot placement per state.
 */

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { displayName, formatCompactDollars, partyGroup } from './ElectionPage/data';
import { isRedrawnFor2026 } from '@/lib/data/redistricting-2026';
import type { ElectionRacePayload } from '@/types/elections';

const MAX_SHOWN = 6;

export { raceId2026 } from '@/lib/elections/race-id';

const PARTY_CHIP_CLASS: Record<'d' | 'r' | 'i', string> = {
  d: 'text-party-dem border-party-dem',
  r: 'text-civiq-red border-civiq-red',
  i: 'text-gray-600 border-gray-400',
};

interface FetchState {
  data: ElectionRacePayload | null;
  unavailable: boolean;
}

async function fetcher(url: string): Promise<FetchState> {
  const res = await fetch(url);
  if (res.status === 404) return { data: null, unavailable: true };
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return { data: (await res.json()) as ElectionRacePayload, unavailable: false };
}

interface FiledCandidates2026Props {
  raceId: string;
  /** Two-letter state, for the redistricting caveat. */
  state: string;
  /** Renders the House redistricting caveat when true and the state was redrawn. */
  showRedistrictingNote?: boolean;
}

export function FiledCandidates2026({
  raceId,
  state,
  showRedistrictingNote = false,
}: FiledCandidates2026Props) {
  const { data: result, error } = useSWR<FetchState>(
    `filed-candidates:${raceId}`,
    () => fetcher(`/api/elections/${encodeURIComponent(raceId)}`),
    { revalidateOnFocus: false, dedupingInterval: 60_000 }
  );

  const candidates = result?.data?.candidates ?? [];
  const shown = candidates.slice(0, MAX_SHOWN);
  const more = candidates.length - shown.length;

  return (
    <div>
      <p className="text-xs text-gray-500 mb-2">
        FEC filings for the 2026 election. Filing is not ballot access — certified ballots are set
        by each state.
      </p>
      {error && <p className="text-sm text-gray-500">Candidate data unavailable right now.</p>}
      {result?.unavailable && (
        <p className="text-sm text-gray-500">No FEC candidate filings recorded yet.</p>
      )}
      {!error && !result && <p className="text-sm text-gray-400">Fetching FEC filings…</p>}
      {shown.length > 0 && (
        <ul>
          {shown.map(candidate => (
            <li
              key={candidate.candidateId}
              className="flex items-center justify-between gap-2 py-1.5 border-b border-gray-100 last:border-b-0 text-[13px]"
            >
              <span className="min-w-0">
                <span className="font-medium">{displayName(candidate.name)}</span>
                {candidate.incumbentChallenge === 'I' && (
                  <span className="ml-1.5 text-xs text-gray-500">Incumbent</span>
                )}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span
                  className={`border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${PARTY_CHIP_CLASS[partyGroup(candidate.party)]}`}
                >
                  {candidate.party}
                </span>
                <span className="font-mono text-xs text-gray-600 tabular-nums">
                  {formatCompactDollars(candidate.totalReceipts)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {more > 0 && (
        <p className="text-xs text-gray-500 mt-1.5">
          + {more} more {more === 1 ? 'filer' : 'filers'} on the race page.
        </p>
      )}
      <p className="mt-2">
        <Link
          href={`/elections/${raceId}`}
          className="text-civiq-blue hover:underline text-sm font-medium"
        >
          Full race page →
        </Link>
      </p>
      {showRedistrictingNote && isRedrawnFor2026(state) && (
        <div className="border-l-[3px] border-civiq-amber bg-gray-50 px-3 py-2 mt-3 text-xs text-gray-700">
          {state}&rsquo;s congressional map changed for 2026, so this district number may cover
          different territory on the November 2026 ballot.{' '}
          <Link href="/" className="text-civiq-blue hover:underline">
            Confirm your 2026 district by home address
          </Link>
          .
        </div>
      )}
    </div>
  );
}

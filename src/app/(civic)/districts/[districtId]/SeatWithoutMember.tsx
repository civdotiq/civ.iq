/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import Link from 'next/link';
import { FiledCandidates2026 } from '@/components/elections/FiledCandidates2026';
import { raceId2026 } from '@/lib/elections/race-id';
import { getVacancyInfo, formatVacancyMessage } from '@/lib/data/congressional-vacancies';
import { getStateName } from '@/lib/data/us-states';

interface SeatWithoutMemberProps {
  state: string;
  /** Canonical district part: "07", "AL" or "STATE". */
  district: string;
}

/**
 * A real seat with nobody in the Congress roster: a vacancy, or a new member
 * the roster hasn't picked up yet. Says so plainly rather than "not found".
 */
export function SeatWithoutMember({ state, district }: SeatWithoutMemberProps) {
  const stateName = getStateName(state) ?? state;
  const isStatewide = district === 'STATE';
  const seatNumber = district === 'AL' ? '00' : district;
  const title = isStatewide
    ? `${stateName} (Statewide)`
    : `${stateName} ${district === 'AL' ? 'At-Large' : `District ${district}`}`;

  const vacancy = isStatewide ? undefined : getVacancyInfo(state, seatNumber);
  const seatRaceId = isStatewide ? null : raceId2026('House', state, seatNumber);

  return (
    <div className="min-h-screen bg-white density-default">
      <main className="container mx-auto px-4 py-8">
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link href="/districts" className="hover:text-civiq-blue">
            Districts
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">{`${state}-${district}`}</span>
        </nav>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-6">Congressional district in {stateName}</p>

        <div
          role="status"
          className="border-2 border-civiq-amber bg-amber-50 p-grid-2 md:p-grid-3 mb-grid-3"
        >
          {vacancy ? (
            <>
              <div className="text-sm font-semibold uppercase tracking-wide text-civiq-amber">
                Seat vacant
                {vacancy.specialElection?.date
                  ? ` · Special election ${vacancy.specialElection.date}`
                  : ''}
              </div>
              <p className="mt-1 text-sm text-gray-700">{formatVacancyMessage(vacancy)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-700">
              No current member for this seat is listed in the congress-legislators roster. If a new
              member was sworn in recently, the roster may not have caught up yet.
            </p>
          )}
        </div>

        {seatRaceId && (
          <div className="bg-white border-2 border-black p-4 sm:p-8 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">2026 election</h2>
            <FiledCandidates2026 raceId={seatRaceId} state={state} showRedistrictingNote />
          </div>
        )}

        <ul className="space-y-2 text-sm">
          <li>
            <Link href={`/states/${state.toLowerCase()}`} className="text-civiq-blue">
              {stateName}: senators, House delegation and state overview
            </Link>
          </li>
          <li>
            <Link href="/districts" className="text-civiq-blue">
              All congressional districts
            </Link>
          </li>
        </ul>
      </main>
    </div>
  );
}

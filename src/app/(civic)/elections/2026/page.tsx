/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * 2026 federal race index. Every House seat and Senate seat up in 2026,
 * from the committed FEC race-skeleton corpus (zero live FEC calls —
 * see scripts/sync-races-2026.ts). Candidate details live on each race
 * page. Language rule: candidates "filed with the FEC" — never "on the
 * ballot" — until a certified-candidate corpus confirms ballot access.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import {
  ELECTION_DATES_2026,
  RACES_2026,
  RACES_2026_METADATA,
  type Race2026,
} from '@/data/elections-2026-races';
import { getGeneralElectionDayISO } from '@/lib/data/election-dates';
import { getStateName } from '@/lib/data/us-states';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org/elections/2026' },
  title: '2026 federal elections',
  description:
    'Every U.S. House and Senate race on the November 3, 2026 ballot: race pages with FEC-filed candidates, fundraising, and primary dates for all 50 states and territories.',
  keywords: [
    '2026 elections',
    '2026 midterms',
    'senate races 2026',
    'house races 2026',
    'primary dates 2026',
    'FEC candidates',
  ],
  openGraph: {
    title: '2026 federal elections | CIV.IQ',
    description:
      'Every U.S. House and Senate race in the November 3, 2026 election, with FEC-filed candidates and fundraising.',
    url: 'https://civdotiq.org/elections/2026',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function districtLabel(district: string | null): string {
  if (!district || district === 'AL') return 'At-large';
  return district.replace(/^0+/, '') || '0';
}

export default function Elections2026Page() {
  const states = [...new Set(RACES_2026.map(r => r.state))].sort();
  const byState = new Map<string, Race2026[]>();
  for (const race of RACES_2026) {
    const list = byState.get(race.state) ?? [];
    list.push(race);
    byState.set(race.state, list);
  }
  const generalDay = formatDate(getGeneralElectionDayISO(2026));
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Elections', url: '/elections' },
          { name: '2026 federal races', url: '/elections/2026' },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/elections" className="hover:text-civiq-blue">
            Elections
          </Link>
          <span className="mx-2">/</span>
          <span className="text-black dark:text-white">2026 federal races</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">2026 federal elections</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          The general election is {generalDay}. {RACES_2026_METADATA.senateRaces} Senate seats
          (including special elections) and every House seat are up. Each race page shows the
          candidates who have filed with the FEC and what they have raised.
        </p>
        <p className="mb-6">
          <Link
            href="/elections/2026/how-to-vote"
            className="text-civiq-blue hover:underline font-medium"
          >
            Registration deadlines and how to vote, state by state &rarr;
          </Link>
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-500 mb-8 border-l-4 border-amber-600 pl-3 py-1">
          Candidate lists come from FEC filings. Filing with the FEC is not the same as qualifying
          for the ballot — state-certified ballots are set after each state&rsquo;s primary and
          certification deadlines.
        </p>

        <div className="space-y-8">
          {states.map(state => {
            const races = byState.get(state) ?? [];
            const senate = races.filter(r => r.office === 'S');
            const house = races.filter(r => r.office === 'H');
            const dates = ELECTION_DATES_2026[state];
            const primaryIso = dates?.primaryDate ?? null;
            const primaryLabel = formatDate(primaryIso);
            const primaryHeld = primaryIso !== null && primaryIso < todayIso;
            return (
              <section
                key={state}
                id={state}
                className="border-2 border-black dark:border-gray-600 p-6"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
                  <h2 className="text-xl font-bold">{getStateName(state) ?? state}</h2>
                  {primaryLabel && (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {primaryHeld ? `Primary held ${primaryLabel}` : `Primary: ${primaryLabel}`}
                    </span>
                  )}
                </div>
                {senate.map(race => (
                  <p key={race.raceId} className="mb-3">
                    <Link
                      href={`/elections/${race.raceId}`}
                      className="text-civiq-blue hover:underline font-medium"
                    >
                      U.S. Senate race &rarr;
                    </Link>
                  </p>
                ))}
                {house.length > 0 && (
                  <>
                    <p className="aicher-heading-wide text-xs text-gray-500 dark:text-gray-400 tracking-wider mb-2">
                      HOUSE
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {house.map(race => (
                        <li key={race.raceId}>
                          <Link
                            href={`/elections/${race.raceId}`}
                            className="inline-block border border-gray-300 dark:border-gray-600 px-3 py-1 text-sm text-civiq-blue hover:border-civiq-blue"
                          >
                            {districtLabel(race.district)}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            );
          })}
        </div>

        <div className="mt-8 border-t-2 border-black dark:border-gray-600 pt-4">
          <p className="text-xs aicher-heading-wide text-gray-500 dark:text-gray-400 tracking-wider mb-2">
            DATA SOURCE
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Race list and election dates: Federal Election Commission (FEC.gov), retrieved{' '}
            {formatDate(RACES_2026_METADATA.generatedAt.slice(0, 10))}. Candidate and fundraising
            data on race pages is fetched live from FEC filings.
          </p>
        </div>
      </div>
    </>
  );
}

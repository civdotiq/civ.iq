/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * 2026 election calendar + how-to-vote. Per-state primary/general dates
 * from the committed FEC corpus and registration deadlines from the
 * hand-verified corpus (src/data/voter-registration-2026.ts) — zero live
 * calls. Every deadline row cites the official state page it came from;
 * unverified rows degrade to the official link, never a guessed date.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import { ELECTION_DATES_2026 } from '@/data/elections-2026-races';
import {
  VOTER_REGISTRATION_2026,
  VOTER_REGISTRATION_2026_META,
} from '@/data/voter-registration-2026';
import { getGeneralElectionDayISO } from '@/lib/data/election-dates';
import { summarizeRegistrationDeadline } from '@/lib/data/voter-registration';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org/elections/2026/how-to-vote' },
  title: '2026 election calendar: registration deadlines by state',
  description:
    'Voter registration deadlines, primary dates, and official registration links for the November 3, 2026 general election in all 50 states and DC, verified against state election offices.',
  keywords: [
    'voter registration deadline 2026',
    'register to vote 2026',
    '2026 election calendar',
    'primary dates 2026',
    'same-day registration',
  ],
  openGraph: {
    title: '2026 election calendar | CIV.IQ',
    description:
      'Registration deadlines and official links for the November 3, 2026 election, state by state.',
    url: 'https://civdotiq.org/elections/2026/how-to-vote',
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

export default function HowToVote2026Page() {
  const rows = Object.values(VOTER_REGISTRATION_2026).sort((a, b) =>
    a.stateName.localeCompare(b.stateName)
  );
  const generalDay = formatDate(getGeneralElectionDayISO(2026));
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: '/' },
          { name: 'Elections', url: '/elections' },
          { name: '2026 federal races', url: '/elections/2026' },
          { name: 'How to vote', url: '/elections/2026/how-to-vote' },
        ]}
      />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/elections" className="hover:text-civiq-blue">
            Elections
          </Link>
          <span className="mx-2">/</span>
          <Link href="/elections/2026" className="hover:text-civiq-blue">
            2026 federal races
          </Link>
          <span className="mx-2">/</span>
          <span className="text-black dark:text-white">How to vote</span>
        </nav>

        <h1 className="text-3xl font-bold mb-2">2026 election calendar: how to vote</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          The general election is {generalDay} in every state. Registration deadlines and methods
          differ by state — find yours below, with links to your state&rsquo;s official registration
          tools.
        </p>
        <p className="text-sm text-amber-700 dark:text-amber-500 mb-8 border-l-4 border-amber-600 pl-3 py-1">
          Deadlines are for the November 3, 2026 general election, verified against official state
          sources
          {VOTER_REGISTRATION_2026_META.verifiedAt
            ? ` on ${formatDate(VOTER_REGISTRATION_2026_META.verifiedAt)}`
            : ''}
          . Rules occasionally change — when in doubt, confirm with your state&rsquo;s election
          office (linked in each row).
        </p>

        <div className="overflow-x-auto">
          <table className="w-full border-2 border-black dark:border-gray-600 text-sm">
            <thead>
              <tr className="border-b-2 border-black dark:border-gray-600 text-left">
                <th className="p-3 aicher-heading-wide text-xs tracking-wider">STATE</th>
                <th className="p-3 aicher-heading-wide text-xs tracking-wider">PRIMARY</th>
                <th className="p-3 aicher-heading-wide text-xs tracking-wider">
                  REGISTRATION DEADLINE
                </th>
                <th className="p-3 aicher-heading-wide text-xs tracking-wider">OFFICIAL TOOLS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const primaryIso = ELECTION_DATES_2026[row.state]?.primaryDate ?? null;
                const primaryLabel = formatDate(primaryIso);
                const primaryHeld = primaryIso !== null && primaryIso < todayIso;
                const summary = summarizeRegistrationDeadline(row);
                const registerUrl = row.registrationUrl ?? row.infoUrl ?? row.electionOfficeUrl;
                return (
                  <tr
                    key={row.state}
                    className="border-b border-gray-300 dark:border-gray-600 align-top"
                  >
                    <td className="p-3 font-medium whitespace-nowrap">
                      <Link
                        href={`/states/${row.state}`}
                        className="text-civiq-blue hover:underline"
                      >
                        {row.stateName}
                      </Link>
                    </td>
                    <td className="p-3 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {primaryLabel ? (primaryHeld ? `Held ${primaryLabel}` : primaryLabel) : '—'}
                    </td>
                    <td className="p-3">
                      {summary ?? (
                        <span className="text-gray-500 dark:text-gray-400">
                          Not verified — check your state&rsquo;s election office
                        </span>
                      )}
                      {row.sameDayRegistration && row.sameDayNotes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {row.sameDayNotes}
                        </div>
                      )}
                      {row.deadlineSource && (
                        <div className="text-xs mt-1">
                          <a
                            href={row.deadlineSource}
                            rel="noopener noreferrer"
                            target="_blank"
                            className="text-gray-500 dark:text-gray-400 hover:text-civiq-blue underline"
                          >
                            Source
                          </a>
                        </div>
                      )}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      {registerUrl && row.registrationRequired && (
                        <a
                          href={registerUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="block text-civiq-blue hover:underline"
                        >
                          Register →
                        </a>
                      )}
                      {row.checkRegistrationUrl && (
                        <a
                          href={row.checkRegistrationUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="block text-civiq-blue hover:underline"
                        >
                          Check registration →
                        </a>
                      )}
                      {row.electionOfficeUrl && (
                        <a
                          href={row.electionOfficeUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                          className="block text-civiq-blue hover:underline"
                        >
                          Election office →
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-8 border-t-2 border-black dark:border-gray-600 pt-4">
          <p className="text-xs aicher-heading-wide text-gray-500 dark:text-gray-400 tracking-wider mb-2">
            DATA SOURCES
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Primary and general election dates: Federal Election Commission (FEC.gov). Registration
            links seeded from vote.gov&rsquo;s published state dataset; every deadline verified
            against the official state election-office page cited in its row
            {VOTER_REGISTRATION_2026_META.verifiedAt
              ? ` on ${formatDate(VOTER_REGISTRATION_2026_META.verifiedAt)}`
              : ''}
            . States where verification failed show no deadline rather than an estimate.
          </p>
        </div>
      </div>
    </>
  );
}

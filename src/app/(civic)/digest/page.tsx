/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Weekly digest home — the publishing venue for CIV.IQ's weekly
 * compilation of votes, bills, and money filings. Michigan is featured
 * (the email edition); every state's federal delegation is browsable.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { DigestSubscribeForm } from '@/components/digest/DigestSubscribeForm';
import { DEFAULT_DIGEST_STATE } from '@/lib/digest/assemble';
import { US_STATES, getStateName } from '@/lib/data/us-states';
import {
  latestCompleteWeekId,
  previousWeekIds,
  parseWeekId,
  formatWeekRange,
} from '@/lib/digest/week';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Weekly digest — votes, bills & money filings | CIV.IQ',
  description:
    'A weekly compilation of congressional roll-call votes, bills that moved, and new FEC filings, with each state delegation tracked position by position. Public records with citations, every Monday.',
  alternates: { canonical: 'https://civdotiq.org/digest' },
};

const FEATURED_WEEKS = 6;

export default function DigestIndexPage() {
  const featuredCode = DEFAULT_DIGEST_STATE.toLowerCase();
  const featuredName = getStateName(DEFAULT_DIGEST_STATE) ?? DEFAULT_DIGEST_STATE;
  const featuredWeeks = previousWeekIds(latestCompleteWeekId(), FEATURED_WEEKS)
    .map(parseWeekId)
    .filter((r): r is NonNullable<typeof r> => r !== null);

  // Every jurisdiction, alphabetized by name, for the state picker.
  const states = (Object.entries(US_STATES) as Array<[string, string]>).sort((a, b) =>
    a[1].localeCompare(b[1])
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[828px] px-grid-2 py-grid-3 md:px-grid-3">
        <nav className="mb-grid-3 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Weekly digest</span>
        </nav>

        <div className="border-[3px] border-black bg-white p-grid-3">
          <div className="text-xs font-bold uppercase tracking-[0.08em]">This week in Congress</div>
          <h1 className="mt-grid-1 text-[32px] font-bold leading-[1.1] tracking-[0.02em]">
            Weekly digest
          </h1>
          <p className="mt-grid-2 max-w-[60ch] text-[15px] leading-normal tracking-[0.025em] text-gray-700">
            Every Monday: the week&rsquo;s roll-call votes with each member&rsquo;s position, bills
            that moved, and new campaign-finance filings from the delegation. Compiled from
            Congress.gov, Senate and House Clerk records, and the FEC — every line links to its
            government source. Pick a state below; {featuredName} is the current email edition.
          </p>
        </div>

        <DigestSubscribeForm className="mt-grid-3" />

        {/* Featured state — recent issues */}
        <section className="mt-grid-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-bold tracking-[0.02em]">{featuredName} — recent issues</h2>
            <Link
              href={`/digest/${featuredCode}`}
              className="text-sm text-[#3ea2d4] underline hover:no-underline"
            >
              All {featuredName} issues
            </Link>
          </div>
          <div className="mt-grid-2 border-2 border-gray-200 bg-white">
            <ul>
              {featuredWeeks.map(range => (
                <li key={range.weekId} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={`/digest/${featuredCode}/${range.weekId}`}
                    className="flex items-baseline justify-between p-grid-2 hover:bg-gray-50"
                  >
                    <span className="font-medium">{formatWeekRange(range)}</span>
                    <span className="font-mono text-xs text-gray-500">{range.weekId}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Browse by state */}
        <section className="mt-grid-4">
          <h2 className="text-xl font-bold tracking-[0.02em]">Browse by state</h2>
          <p className="mt-1 text-sm text-gray-600">
            Same national votes and bills, tracked through each state&rsquo;s federal delegation.
          </p>
          <div className="mt-grid-2 grid grid-cols-2 gap-px border-2 border-gray-200 bg-gray-200 sm:grid-cols-3 md:grid-cols-4">
            {states.map(([code, name]) => (
              <Link
                key={code}
                href={`/digest/${code.toLowerCase()}`}
                className="flex items-baseline justify-between bg-white p-grid-2 text-sm hover:bg-gray-50"
              >
                <span className="font-medium">{name}</span>
                <span className="ml-2 font-mono text-xs text-gray-400">{code}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 *
 * Server-rendered so the answer copy ("who is my representative", "what
 * district am I in", why we need an address) is in the HTML for search
 * engines and AI agents. Only the lookup itself is a client component.
 */

import Link from 'next/link';
import { FAQSection } from '@/components/seo/WikipediaStyleSEO';
import { US_STATES, getStateName } from '@/lib/data/us-states';
import { REDRAWN_2026_STATES } from '@/lib/data/redistricting-2026';
import { YourRepsLookup } from './YourRepsLookup';

// The 52 "Who is my …?" hubs: 50 states, DC's council and Puerto Rico's
// Legislative Assembly. The other territories have no legislature roster.
const NO_HUB = new Set(['VI', 'GU', 'AS', 'MP']);
const STATE_HUBS = Object.entries(US_STATES)
  .filter(([code]) => !NO_HUB.has(code))
  .map(([code, name]) => ({ href: `/state-legislature/${code.toLowerCase()}`, name }))
  .sort((a, b) => a.name.localeCompare(b.name));

// Share of people whose ZIP code area spans 2+ districts. Census 2020
// ZCTA relationship files (119th Congress, 2024 state legislative
// districts), weighted by ACS 2019-2023 population; a district counts only
// if it holds at least 2% of the ZIP area's land. Measured 2026-09-29.
const ZIP_SPLIT_SHARES = [
  { office: 'U.S. House', share: 28 },
  { office: 'State senate', share: 47 },
  { office: 'State house or assembly', share: 67 },
];

function listNames(codes: Iterable<string>): string {
  const names = [...codes].map(code => getStateName(code) ?? code);
  return names.length > 1
    ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    : names.join('');
}

const FAQS = [
  {
    question: 'Who is my representative?',
    answer:
      'If you live in one of the 50 states, three people represent you in Congress: two U.S. senators, who represent the whole state, and one member of the U.S. House, who represents your district. You also have members of your state legislature, usually a state senator and a state representative. Enter your home address on this page to see all of them, with phone numbers and websites.',
  },
  {
    question: 'Who are my senators?',
    answer:
      'Your two U.S. senators represent your whole state, so everyone in the state has the same two. Your state senator is different: a member of your state legislature who represents one district. Your address finds both.',
  },
  {
    question: 'Who is my state representative?',
    answer:
      'Your state representative serves in the lower house of your state legislature. Some states call it the Assembly or the House of Delegates. Nebraska has a one-house legislature, so Nebraskans have a state senator and no state representative. Enter your address to find yours, or pick your state above to see every member.',
  },
  {
    question: 'What congressional district am I in?',
    answer: `Enter your home address on this page. The results show your U.S. House district and your state senate and state house districts. ${REDRAWN_2026_STATES.size} states drew new congressional maps for the November 3, 2026 election: ${listNames(REDRAWN_2026_STATES)}. If your address is in a different district on the 2026 ballot, the results tell you.`,
  },
  {
    question: 'I live in Washington, D.C. or Puerto Rico. Who represents me?',
    answer:
      'Residents of the District of Columbia and Puerto Rico have no U.S. senators. Each elects one member of the U.S. House, a delegate for D.C. and a resident commissioner for Puerto Rico, who cannot vote on the final passage of bills. D.C. has a city council in place of a state legislature; Puerto Rico has its own Legislative Assembly.',
  },
  {
    question: 'Why do you need my full address and not my ZIP code?',
    answer:
      'ZIP codes are mail routes, not political boundaries, and many cross district lines. About 28% of Americans live in a ZIP code that spans more than one U.S. House district. For state house districts it is 67%. A street address puts you in exactly one district for each office.',
  },
];

export default function YourRepsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Your Representatives</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Who is my representative?
          </h1>
          <p className="type-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Enter your home address to see who represents you in Congress and in your state
            legislature: your two U.S. senators, your member of the U.S. House, your state
            legislators, and the district numbers for each. Each member of Congress gets a
            plain-language summary of their voting record, funding sources, and key findings from
            public government data.
          </p>
        </div>

        <YourRepsLookup />

        {/* Money Report CTA */}
        <div className="mt-8 border-2 border-gray-900 dark:border-[#444] p-4 sm:p-6 max-w-2xl">
          <h2 className="aicher-heading type-base text-gray-900 dark:text-gray-100 mb-2">
            Money Report Card
          </h2>
          <p className="type-sm text-gray-600 dark:text-gray-400 mb-3">
            See how campaign contributions correlate with voting patterns for all your
            representatives in one view.
          </p>
          <Link
            href="/your-reps/money-report"
            className="inline-flex items-center border-2 border-[#3ea2d4] text-[#3ea2d4] px-4 py-2 type-sm font-bold hover:bg-[#3ea2d4] hover:text-white transition-colors min-h-[44px]"
          >
            Get your Money Report Card
          </Link>
        </div>

        {/* Address, not ZIP */}
        <section className="mt-12 max-w-2xl" aria-labelledby="address-not-zip">
          <h2
            id="address-not-zip"
            className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3"
          >
            Why we ask for your address, not your ZIP code
          </h2>
          <p className="type-sm text-gray-700 dark:text-gray-300 mb-4">
            ZIP codes are mail delivery routes. Districts are drawn from Census blocks, and the two
            often don&rsquo;t line up, so one ZIP code can sit in two or more districts. A ZIP code
            alone would give many people the wrong representatives. We match your street address
            with the U.S. Census Bureau geocoder, which places it in exactly one district for each
            office.
          </p>
          <table className="w-full type-sm border-t-2 border-gray-900 dark:border-[#444]">
            <caption className="sr-only">
              Share of people whose ZIP code spans more than one district
            </caption>
            <thead>
              <tr className="border-b border-gray-300 dark:border-[#444] text-left">
                <th
                  scope="col"
                  className="py-2 pr-4 font-semibold text-gray-900 dark:text-gray-100"
                >
                  District
                </th>
                <th
                  scope="col"
                  className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100"
                >
                  People whose ZIP code spans 2+ districts
                </th>
              </tr>
            </thead>
            <tbody>
              {ZIP_SPLIT_SHARES.map(row => (
                <tr key={row.office} className="border-b border-gray-200 dark:border-[#333]">
                  <th
                    scope="row"
                    className="py-2 pr-4 font-normal text-gray-700 dark:text-gray-300 text-left"
                  >
                    {row.office}
                  </th>
                  <td className="py-2 text-right tabular-nums text-gray-900 dark:text-gray-100">
                    {row.share}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Source: CIV.IQ analysis of Census Bureau 2020 ZIP Code Tabulation Area relationship
            files for 119th Congress and 2024 state legislative districts, weighted by American
            Community Survey 2019&ndash;2023 population. A district counts only if it covers at
            least 2% of the ZIP area&rsquo;s land.
          </p>
        </section>

        {/* State hubs */}
        <section className="mt-12" aria-labelledby="state-hubs">
          <h2 id="state-hubs" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Find your state legislators by state
          </h2>
          <p className="type-sm text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
            Each state&rsquo;s page lists every current member of its legislature.
          </p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 border-t border-gray-300 dark:border-[#444]">
            {STATE_HUBS.map(hub => (
              <li key={hub.href} className="border-b border-gray-200 dark:border-[#333]">
                <Link
                  href={hub.href}
                  className="block py-2 type-sm text-civiq-blue hover:underline"
                >
                  {hub.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="max-w-2xl">
          <FAQSection faqs={FAQS} title="Questions about finding your representatives" />
        </div>
      </main>
    </div>
  );
}

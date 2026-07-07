/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Weekly digest archive — the publishing venue for CIV.IQ's weekly
 * compilation of votes, bills, and money filings (Michigan-flavored).
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { DigestSubscribeForm } from '@/components/digest/DigestSubscribeForm';
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
    'A weekly compilation of congressional roll-call votes, bills that moved, and new FEC filings, with the Michigan delegation tracked position by position. Public records with citations, every Monday.',
  alternates: { canonical: 'https://civdotiq.org/digest' },
};

const ARCHIVE_WEEKS = 12;

export default function DigestIndexPage() {
  const latest = latestCompleteWeekId();
  const weeks = previousWeekIds(latest, ARCHIVE_WEEKS)
    .map(parseWeekId)
    .filter((r): r is NonNullable<typeof r> => r !== null);

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
            Every Monday: the week&rsquo;s roll-call votes with each Michigan member&rsquo;s
            position, bills that moved, and new campaign-finance filings from the delegation.
            Compiled from Congress.gov, Senate and House Clerk records, and the FEC — every line
            links to its government source.
          </p>
        </div>

        <DigestSubscribeForm className="mt-grid-3" />

        <section className="mt-grid-4">
          <h2 className="text-xl font-bold tracking-[0.02em]">Past issues</h2>
          <div className="mt-grid-2 border-2 border-gray-200 bg-white">
            <ul>
              {weeks.map(range => (
                <li key={range.weekId} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={`/digest/${range.weekId}`}
                    className="flex items-baseline justify-between p-grid-2 hover:bg-gray-50"
                  >
                    <span className="font-medium">{formatWeekRange(range)}</span>
                    <span className="font-mono text-xs text-gray-500">{range.weekId}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-grid-2 text-sm text-gray-600">
            Issues are compiled from the public record on demand — the archive lists the last{' '}
            {ARCHIVE_WEEKS} weeks.
          </p>
        </section>
      </div>
    </div>
  );
}

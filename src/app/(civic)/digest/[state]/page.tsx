/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Per-state weekly digest archive — lists a single state's recent issues.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getStateName, isValidStateCode } from '@/lib/data/us-states';
import {
  latestCompleteWeekId,
  previousWeekIds,
  parseWeekId,
  formatWeekRange,
} from '@/lib/digest/week';

export const revalidate = 3600;

const ARCHIVE_WEEKS = 12;

interface PageProps {
  params: Promise<{ state: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { state } = await params;
  const stateName = getStateName(state) ?? state.toUpperCase();
  return {
    title: `${stateName} weekly digest — votes, bills & money filings | CIV.IQ`,
    description: `Every week: congressional roll-call votes with each ${stateName} member's position, bills that moved, and new FEC filings from the delegation. Public records with citations.`,
    alternates: { canonical: `https://civdotiq.org/digest/${state.toLowerCase()}` },
  };
}

export default async function DigestStateArchivePage({ params }: PageProps) {
  const { state } = await params;
  if (!isValidStateCode(state)) notFound();
  if (state !== state.toLowerCase()) permanentRedirect(`/digest/${state.toLowerCase()}`);

  const stateName = getStateName(state);
  if (!stateName) notFound();
  const code = state.toLowerCase();

  const weeks = previousWeekIds(latestCompleteWeekId(), ARCHIVE_WEEKS)
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
          <Link href="/digest" className="hover:text-[#3ea2d4]">
            Weekly digest
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">{stateName}</span>
        </nav>

        <div className="border-[3px] border-black bg-white p-grid-3">
          <div className="text-xs font-bold uppercase tracking-[0.08em]">This week in Congress</div>
          <h1 className="mt-grid-1 text-[32px] font-bold leading-[1.1] tracking-[0.02em]">
            {stateName} weekly digest
          </h1>
          <p className="mt-grid-2 max-w-[60ch] text-[15px] leading-normal tracking-[0.025em] text-gray-700">
            Each week&rsquo;s roll-call votes with every {stateName} member&rsquo;s position, bills
            that moved, and new campaign-finance filings from the delegation. Compiled from
            Congress.gov, Senate and House Clerk records, and the FEC — every line links to its
            government source.
          </p>
        </div>

        <section className="mt-grid-4">
          <h2 className="text-xl font-bold tracking-[0.02em]">Past issues</h2>
          <div className="mt-grid-2 border-2 border-gray-200 bg-white">
            <ul>
              {weeks.map(range => (
                <li key={range.weekId} className="border-b border-gray-100 last:border-b-0">
                  <Link
                    href={`/digest/${code}/${range.weekId}`}
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

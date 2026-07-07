/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Corrections & Error Reports — the accuracy protocol.
 *
 * The existence of this page is the signal: every number CIV.IQ publishes
 * comes from a government record, every error report gets checked against
 * that record, and corrections are logged here permanently. "Report an
 * error" links across the site land here.
 *
 * The corrections log below is hand-maintained: append an entry when a
 * verified correction ships, newest first. Never remove entries.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Corrections & error reports — CIV.IQ',
  description:
    'How CIV.IQ handles data errors: report anything that looks wrong, we check it against the government record, and verified corrections are logged here permanently.',
  alternates: { canonical: 'https://civdotiq.org/corrections' },
};

/** Verified corrections, newest first. Append-only — never remove entries. */
const CORRECTIONS: Array<{
  date: string;
  summary: string;
  scope: string;
}> = [];

const REPORT_URL =
  'https://github.com/civdotiq/civ.iq/issues/new?title=Data%20error%20report&labels=data-error';

export default function CorrectionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[828px] px-grid-2 py-grid-3 md:px-grid-3">
        <nav className="mb-grid-3 text-sm text-gray-500">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Corrections</span>
        </nav>

        <div className="border-[3px] border-black bg-white">
          <div className="p-grid-3">
            <div className="text-xs font-bold uppercase tracking-[0.08em]">Accuracy protocol</div>
            <h1 className="mt-grid-1 text-[32px] font-bold uppercase leading-[1.1] tracking-[0.02em]">
              Corrections &amp; error reports
            </h1>
            <p className="mt-grid-2 max-w-[60ch] text-[15px] leading-normal tracking-[0.025em] text-gray-700">
              Every number CIV.IQ publishes comes from a government record — Congress.gov, the FEC,
              USASpending, the House Clerk, and the other sources listed on each page — with its own
              &ldquo;as of&rdquo; date. When something looks wrong, report it. We check the claim
              against the underlying record, fix what&apos;s broken, and log the correction here
              permanently.
            </p>
          </div>

          <div className="h-[8px] bg-black" />

          <div className="p-grid-3">
            <h2 className="text-lg font-bold tracking-[0.02em]">Report an error</h2>
            <p className="mt-grid-1 max-w-[60ch] text-sm leading-normal tracking-[0.025em] text-gray-700">
              Include the page URL, the number or statement that looks wrong, and — if you have it —
              the source you&apos;re comparing against. Reports are public, and so is what we do
              with them.
            </p>
            <a
              href={REPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-grid-2 inline-flex min-h-[44px] items-center border-2 border-civiq-blue px-grid-2 py-grid-1 text-sm font-bold text-civiq-blue transition-colors hover:bg-civiq-blue hover:text-white"
            >
              Report a data error on GitHub →
            </a>
            <p className="mt-grid-2 text-xs tracking-[0.025em] text-gray-500">
              No GitHub account? Every data page also links its{' '}
              <Link href="/methodology" className="text-civiq-blue hover:underline">
                methodology and sources
              </Link>{' '}
              so you can verify any number against the government record directly.
            </p>
          </div>

          <div className="h-[3px] bg-black" />

          <div className="p-grid-3">
            <h2 className="text-lg font-bold tracking-[0.02em]">How reports are handled</h2>
            <ol className="mt-grid-2 max-w-[62ch] list-decimal space-y-grid-1 pl-grid-3 text-sm leading-normal tracking-[0.025em] text-gray-700">
              <li>
                The claim is checked against the primary government source — not against another
                aggregator.
              </li>
              <li>
                If the data is wrong, the fix ships and the correction is logged below with what was
                wrong, where, and for how long.
              </li>
              <li>
                If the data is right but confusing, the presentation gets a methodology note instead
                — confusion is a bug too.
              </li>
              <li>
                If a government source itself is wrong or stale, the page notes the discrepancy
                rather than silently &ldquo;fixing&rdquo; official data.
              </li>
            </ol>
          </div>

          <div className="h-[3px] bg-black" />

          <div className="p-grid-3">
            <h2 className="text-lg font-bold tracking-[0.02em]">Corrections log</h2>
            {CORRECTIONS.length === 0 ? (
              <p className="mt-grid-1 text-sm tracking-[0.025em] text-gray-600">
                No verified corrections logged yet. This page went live in July 2026; anything we
                fix from here on is recorded permanently below.
              </p>
            ) : (
              <div className="mt-grid-2">
                {CORRECTIONS.map(c => (
                  <div key={`${c.date}-${c.scope}`} className="border-t border-gray-300 py-grid-2">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                      {c.date} · {c.scope}
                    </div>
                    <p className="mt-[4px] text-sm leading-normal tracking-[0.025em] text-gray-700">
                      {c.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-[8px] bg-black" />

          <div className="px-grid-3 py-grid-2 text-xs leading-[1.7] tracking-[0.025em] text-gray-600">
            <b className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-900">
              Sources
            </b>{' '}
            · Congress.gov · FEC · USASpending · House Clerk · Census ·{' '}
            <Link href="/methodology" className="text-civiq-blue hover:underline">
              Full methodology
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

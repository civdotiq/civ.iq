/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Weekly digest home — leads with this week's most notable roll calls and
 * bills (the "top story"), then lets the reader pick any state to see how
 * its federal delegation voted.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BillLink, VoteLink } from '@/components/shared/links/EntityLinks';
import { getCachedDigestIssue } from '@/lib/digest/assemble';
import { US_STATES } from '@/lib/data/us-states';
import { issueHighlights } from '@/lib/digest/curate';
import { latestCompleteWeekId, parseWeekId, formatWeekRange } from '@/lib/digest/week';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Weekly digest — votes, bills & money filings | CIV.IQ',
  description:
    "This week's congressional roll-call votes, bills that moved, and new FEC filings — tracked through any state's federal delegation. Public records with citations.",
  alternates: { canonical: 'https://civdotiq.org/digest' },
};

/** National highlights are the same for any state, so read one warmed issue. */
const HIGHLIGHT_SOURCE_STATE = 'MI';

export default async function DigestIndexPage() {
  const latestWeek = latestCompleteWeekId();
  // Cache-only: the warming cron keeps this populated. Never assembles on
  // the render path — a cold miss simply drops the hero.
  const featured = await getCachedDigestIssue(HIGHLIGHT_SOURCE_STATE, latestWeek);
  const highlights = featured ? issueHighlights(featured.votes, featured.bills) : null;
  const featuredRange = featured ? parseWeekId(featured.weekId) : null;
  const hasHighlights = Boolean(
    highlights?.closestVote || highlights?.mostBipartisanVote || highlights?.furthestBill
  );

  // Every jurisdiction, alphabetized by name, for the state chooser.
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
            The week&rsquo;s roll-call votes, bills that moved, and new campaign-finance filings —
            tracked through any state&rsquo;s federal delegation. Compiled from Congress.gov, Senate
            and House Clerk records, and the FEC; every line links to its government source.
          </p>
        </div>

        {/* Top story — this week's most notable roll calls and bills */}
        {featured && hasHighlights && (
          <section className="mt-grid-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                What happened {featuredRange ? `· ${formatWeekRange(featuredRange)}` : 'this week'}
              </h2>
              <span className="text-xs text-gray-400">
                {featured.votes.length} vote{featured.votes.length === 1 ? '' : 's'} ·{' '}
                {featured.bills.length} bill{featured.bills.length === 1 ? '' : 's'}
              </span>
            </div>

            {highlights?.closestVote && (
              <div className="mt-grid-1 border-[3px] border-black bg-white p-grid-3">
                <div className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                  Closest vote · {highlights.closestVote.yeas}–{highlights.closestVote.nays}
                </div>
                <p className="mt-grid-1 text-[19px] font-bold leading-[1.2] tracking-[0.01em]">
                  {highlights.closestVote.meaning?.decided ?? highlights.closestVote.question}
                </p>
                {highlights.closestVote.meaning && (
                  <p className="mt-grid-1 text-sm text-gray-600">
                    <span className="font-mono text-xs font-bold">Y</span> ={' '}
                    {highlights.closestVote.meaning.yeaMeant}{' '}
                    <span className="ml-2 font-mono text-xs font-bold">N</span> ={' '}
                    {highlights.closestVote.meaning.nayMeant}
                  </p>
                )}
                <p className="mt-grid-1 text-xs text-gray-400">
                  <VoteLink voteId={highlights.closestVote.voteId} label="See the roll call" />
                </p>
              </div>
            )}

            {(highlights?.mostBipartisanVote || highlights?.furthestBill) && (
              <div className="mt-grid-2 grid gap-grid-2 sm:grid-cols-2">
                {highlights.mostBipartisanVote && (
                  <div className="border-2 border-gray-200 bg-white p-grid-2">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                      Broadest support · {highlights.mostBipartisanVote.yeas}–
                      {highlights.mostBipartisanVote.nays}
                    </div>
                    <p className="mt-1 text-sm font-medium leading-snug">
                      {highlights.mostBipartisanVote.meaning?.decided ??
                        highlights.mostBipartisanVote.question}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      <VoteLink
                        voteId={highlights.mostBipartisanVote.voteId}
                        label="See the roll call"
                      />
                    </p>
                  </div>
                )}
                {highlights.furthestBill && (
                  <div className="border-2 border-gray-200 bg-white p-grid-2">
                    <div className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                      Furthest along
                    </div>
                    <p className="mt-1 text-sm font-medium leading-snug">
                      <BillLink
                        billId={highlights.furthestBill.billId}
                        title={`${highlights.furthestBill.type} ${highlights.furthestBill.number}: ${highlights.furthestBill.title}`}
                      />
                    </p>
                    {highlights.furthestBill.aiSummary && (
                      <p className="mt-1 text-xs text-gray-500">
                        {highlights.furthestBill.aiSummary.whatItDoes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* Choose a state */}
        <section className="mt-grid-4">
          <h2 className="text-xl font-bold tracking-[0.02em]">Choose a state</h2>
          <p className="mt-1 text-sm text-gray-600">
            Same national votes and bills, tracked through each state&rsquo;s federal delegation —
            with every member&rsquo;s position and their new money filings.
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

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Weekly digest issue — one complete ISO week of votes (with the Michigan
 * delegation's positions), bills that moved, and new FEC filings.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RepLink, BillLink, VoteLink } from '@/components/shared/links/EntityLinks';
import { getPartyTextClass } from '@/lib/party-colors';
import { getDigestIssue } from '@/lib/digest/assemble';
import { parseWeekId, formatWeekRange } from '@/lib/digest/week';
import {
  voteQuestionContext,
  fecFormContext,
  billActionContext,
  extractBillRefs,
} from '@/lib/digest/context';
import { issueHighlights, orderVotes, orderBills, miSplit } from '@/lib/digest/curate';
import { VoteMarginBar, DelegationBreakdown } from '@/components/digest/DigestVisuals';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import type { DigestVote } from '@/lib/digest/types';

export const revalidate = 3600;
export const maxDuration = 60;

interface PageProps {
  params: Promise<{ week: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { week } = await params;
  const range = parseWeekId(week);
  const label = range ? formatWeekRange(range) : week;
  return {
    title: `This week in Congress — ${label} | CIV.IQ weekly digest`,
    description: `Roll-call votes with every Michigan position, bills that moved, and new FEC filings for ${label}. Public records with citations.`,
    alternates: { canonical: `https://civdotiq.org/digest/${week}` },
  };
}

function currencyFmt(value: number | undefined): string | null {
  if (typeof value !== 'number') return null;
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

/** Result chip: solid for passage, outline for failure. */
function ResultChip({ result, yeas, nays }: { result: string; yeas: number; nays: number }) {
  const passed = /pass|agree|adopt/i.test(result) && !/fail|reject/i.test(result);
  return (
    <span
      className={`whitespace-nowrap px-1.5 py-0.5 text-xs font-bold uppercase tracking-[0.05em] ${
        passed ? 'bg-black text-white' : 'border-2 border-gray-400 text-gray-600'
      }`}
    >
      {result} {yeas}–{nays}
    </span>
  );
}

function VoteCard({ vote, congress }: { vote: DigestVote; congress: number }) {
  const questionCtx = voteQuestionContext(vote.question);
  const underlying = extractBillRefs(vote.bill?.title, congress, vote.bill?.billId);
  const split = miSplit(vote);
  return (
    <div className="border-2 border-gray-200 bg-white p-grid-2">
      <div className="flex flex-wrap items-center justify-between gap-x-grid-2 gap-y-1">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
          {vote.chamber} · {vote.date.slice(0, 10)}
        </span>
        <ResultChip result={vote.result} yeas={vote.yeas} nays={vote.nays} />
      </div>
      <VoteMarginBar yeas={vote.yeas} nays={vote.nays} />
      {vote.meaning ? (
        <>
          <p className="mt-grid-2 text-[15px] font-medium leading-snug">{vote.meaning.decided}</p>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-mono text-xs font-bold">Y</span> = {vote.meaning.yeaMeant}{' '}
            <span className="ml-2 font-mono text-xs font-bold">N</span> = {vote.meaning.nayMeant}
          </p>
          <p className="mt-1 text-xs text-gray-400">
            <VoteLink voteId={vote.voteId} label={vote.question} /> · AI summary · as of{' '}
            {vote.meaning.generatedAt.slice(0, 10)} ·{' '}
            <Link href="/corrections" className="underline hover:text-[#3ea2d4]">
              report an error
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-grid-2 text-[15px] font-medium leading-snug">
            <VoteLink voteId={vote.voteId} label={vote.question} />
          </p>
          {questionCtx && (
            <p className="mt-1 border-l-2 border-gray-200 pl-2 text-sm text-gray-600">
              {questionCtx.text}
            </p>
          )}
        </>
      )}
      {vote.bill && (
        <p className="mt-1 text-sm text-gray-600">
          <BillLink billId={vote.bill.billId} title={vote.bill.title ?? vote.bill.billId} />
        </p>
      )}
      {underlying.length > 0 && (
        <p className="mt-1 text-sm text-gray-600">
          Referenced measures:{' '}
          {underlying.map((ref, i) => (
            <span key={ref.billId}>
              {i > 0 && ', '}
              <BillLink billId={ref.billId} title={ref.label} />
            </span>
          ))}
        </p>
      )}
      {vote.miPositions.length > 0 && (
        <div className="mt-grid-2 border-t border-gray-100 pt-grid-1">
          <p className="text-sm font-semibold text-gray-700">
            Michigan{split.note ? ` · ${split.note}` : ''}
          </p>
          <DelegationBreakdown members={vote.miPositions} />
        </div>
      )}
      {vote.sourceUrl && (
        <p className="mt-grid-1 text-xs text-gray-400">
          <a
            href={vote.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#3ea2d4]"
          >
            Official record
          </a>
        </p>
      )}
    </div>
  );
}

/** Procedural votes are subordinate — one dense row, no full card weight. */
function ProceduralRow({ vote }: { vote: DigestVote }) {
  const split = miSplit(vote);
  return (
    <div className="flex flex-wrap items-baseline gap-x-grid-2 gap-y-1 border-b border-gray-100 py-grid-1 last:border-b-0">
      <ResultChip result={vote.result} yeas={vote.yeas} nays={vote.nays} />
      <span className="flex-1 text-sm text-gray-700">
        <VoteLink voteId={vote.voteId} label={vote.question} />
      </span>
      {split.note && <span className="text-xs text-gray-500">Michigan {split.note}</span>}
    </div>
  );
}

export default async function DigestIssuePage({ params }: PageProps) {
  const { week } = await params;
  const issue = await getDigestIssue(week);
  if (!issue) notFound();

  const range = parseWeekId(issue.weekId);
  const label = range ? formatWeekRange(range) : issue.weekId;
  const congress = getCurrentCongressNumber(new Date(issue.weekStart));
  const { substantive, procedural } = orderVotes(issue.votes);
  const highlights = issueHighlights(issue.votes, issue.bills);
  // Group stage-ordered bills under their stage label so the "how far did
  // it get" ladder reads as sections instead of one flat list.
  const billGroups = orderBills(issue.bills).reduce<
    Array<{ label: string; bills: ReturnType<typeof orderBills> }>
  >((groups, bill) => {
    const label = bill.stage.label ?? 'Other action';
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.bills.push(bill);
    else groups.push({ label, bills: [bill] });
    return groups;
  }, []);
  const hasHighlights = Boolean(
    highlights.closestVote || highlights.mostBipartisanVote || highlights.furthestBill
  );

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
          <span className="font-medium text-gray-900">{issue.weekId}</span>
        </nav>

        <header className="border-[3px] border-black bg-white p-grid-3">
          <div className="text-xs font-bold uppercase tracking-[0.08em]">This week in Congress</div>
          <h1 className="mt-grid-1 text-[28px] font-bold leading-[1.1] tracking-[0.02em]">
            {label}
          </h1>
          <p className="mt-grid-1 text-sm text-gray-600">
            {issue.votes.length} roll-call vote{issue.votes.length === 1 ? '' : 's'} ·{' '}
            {issue.bills.length} bill{issue.bills.length === 1 ? '' : 's'} moved ·{' '}
            {issue.filings.length} new {issue.stateName} filing
            {issue.filings.length === 1 ? '' : 's'}
          </p>
        </header>

        {/* At a glance */}
        {hasHighlights && (
          <div className="mt-grid-3 border-2 border-black bg-white">
            <div className="border-b-2 border-black px-grid-2 py-1 text-xs font-bold uppercase tracking-[0.08em]">
              At a glance
            </div>
            <ul className="divide-y divide-gray-100">
              {highlights.closestVote && (
                <li className="p-grid-2 text-sm leading-snug">
                  <span className="font-semibold">
                    Closest vote ({highlights.closestVote.yeas}-{highlights.closestVote.nays})
                  </span>{' '}
                  — {highlights.closestVote.meaning?.decided ?? highlights.closestVote.question}{' '}
                  <VoteLink
                    voteId={highlights.closestVote.voteId}
                    label="Roll call"
                    className="text-xs"
                  />
                </li>
              )}
              {highlights.mostBipartisanVote && (
                <li className="p-grid-2 text-sm leading-snug">
                  <span className="font-semibold">
                    Broadest support ({highlights.mostBipartisanVote.yeas}-
                    {highlights.mostBipartisanVote.nays})
                  </span>{' '}
                  —{' '}
                  {highlights.mostBipartisanVote.meaning?.decided ??
                    highlights.mostBipartisanVote.question}{' '}
                  <VoteLink
                    voteId={highlights.mostBipartisanVote.voteId}
                    label="Roll call"
                    className="text-xs"
                  />
                </li>
              )}
              {highlights.furthestBill && (
                <li className="p-grid-2 text-sm leading-snug">
                  <span className="font-semibold">Furthest along</span> —{' '}
                  <BillLink
                    billId={highlights.furthestBill.billId}
                    title={`${highlights.furthestBill.type} ${highlights.furthestBill.number}: ${highlights.furthestBill.title}`}
                  />
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Votes */}
        <section className="mt-grid-4">
          <h2 className="text-xl font-bold tracking-[0.02em]">
            Roll-call votes, with every {issue.stateName} position
          </h2>
          {issue.unavailable.includes('votes') ? (
            <p className="mt-grid-2 border-2 border-gray-200 bg-white p-grid-3 text-sm text-gray-600">
              Vote data is unavailable for this week — the upstream source could not be reached.
            </p>
          ) : issue.votes.length === 0 ? (
            <p className="mt-grid-2 border-2 border-gray-200 bg-white p-grid-3 text-sm text-gray-600">
              No roll-call votes were held this week. Congress was likely in recess or in committee
              work periods.
            </p>
          ) : (
            <div className="mt-grid-2 space-y-grid-2">
              {substantive.map(vote => (
                <VoteCard key={vote.voteId} vote={vote} congress={congress} />
              ))}
              {procedural.length > 0 && (
                <div className="mt-grid-3 border-2 border-gray-200 bg-white p-grid-2">
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                    Procedural votes ({procedural.length})
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Votes that move the process along — setting debate terms, ending debate,
                    approving the record. Positions here often follow party strategy rather than the
                    underlying issue.
                  </p>
                  <div className="mt-grid-1">
                    {procedural.map(vote => (
                      <ProceduralRow key={vote.voteId} vote={vote} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Bills */}
        <section className="mt-grid-4">
          <h2 className="text-xl font-bold tracking-[0.02em]">Bills that moved</h2>
          {issue.unavailable.includes('bills') ? (
            <p className="mt-grid-2 border-2 border-gray-200 bg-white p-grid-3 text-sm text-gray-600">
              Bill data is unavailable for this week — the upstream source could not be reached.
            </p>
          ) : issue.bills.length === 0 ? (
            <p className="mt-grid-2 border-2 border-gray-200 bg-white p-grid-3 text-sm text-gray-600">
              No bills had floor or committee action recorded this week.
            </p>
          ) : (
            <div className="mt-grid-2 space-y-grid-3">
              {billGroups.map(group => (
                <div key={group.label}>
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                    {group.label} <span className="text-gray-400">({group.bills.length})</span>
                  </h3>
                  <div className="mt-1 border-2 border-gray-200 bg-white">
                    <ul>
                      {group.bills.map(bill => {
                        const actionCtx = billActionContext(bill.latestActionText);
                        return (
                          <li
                            key={bill.billId}
                            className="border-b border-gray-100 p-grid-2 last:border-b-0"
                          >
                            <p className="text-[15px] font-medium leading-snug">
                              <BillLink
                                billId={bill.billId}
                                title={`${bill.type} ${bill.number}: ${bill.title}`}
                              />
                            </p>
                            {bill.aiSummary && (
                              <p className="mt-1 border-l-2 border-gray-200 pl-2 text-sm text-gray-700">
                                {bill.aiSummary.whatItDoes}
                                <span className="block text-xs text-gray-400">
                                  {bill.aiSummary.source === 'ai-generated'
                                    ? 'AI summary'
                                    : 'Congressional summary'}{' '}
                                  · as of {bill.aiSummary.lastUpdated.slice(0, 10)} ·{' '}
                                  <Link
                                    href="/corrections"
                                    className="hover:text-[#3ea2d4] underline"
                                  >
                                    report an error
                                  </Link>
                                </span>
                              </p>
                            )}
                            <p className="mt-1 text-sm text-gray-600">
                              {bill.latestActionDate}: {bill.latestActionText}
                            </p>
                            {actionCtx && (
                              <p className="mt-0.5 border-l-2 border-gray-200 pl-2 text-sm text-gray-500">
                                {actionCtx}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Filings */}
        <section className="mt-grid-4">
          <h2 className="text-xl font-bold tracking-[0.02em]">
            New money filings — {issue.stateName} delegation
          </h2>
          {issue.unavailable.includes('filings') ? (
            <p className="mt-grid-2 border-2 border-gray-200 bg-white p-grid-3 text-sm text-gray-600">
              FEC filing data is unavailable for this week — the upstream source could not be
              reached.
            </p>
          ) : issue.filings.length === 0 ? (
            <p className="mt-grid-2 border-2 border-gray-200 bg-white p-grid-3 text-sm text-gray-600">
              No new FEC filings were received from {issue.stateName} delegation committees this
              week.
            </p>
          ) : (
            <div className="mt-grid-2 border-2 border-gray-200 bg-white">
              <ul>
                {issue.filings.map(filing => {
                  const receipts = currencyFmt(filing.totalReceipts);
                  const formCtx = fecFormContext(filing.formType);
                  return (
                    <li
                      key={`${filing.fileNumber}-${filing.bioguideId}`}
                      className="border-b border-gray-100 p-grid-2 last:border-b-0"
                    >
                      <p className="text-[15px] font-medium">
                        <RepLink bioguideId={filing.bioguideId} name={filing.memberName} />
                        <span className={`ml-1 text-xs ${getPartyTextClass(filing.party)}`}>
                          ({filing.party.charAt(0)})
                        </span>
                        <span className="ml-2 text-sm font-normal text-gray-600">
                          {filing.reportType ?? filing.formType ?? 'Filing'}
                        </span>
                      </p>
                      {formCtx && (
                        <p className="mt-1 border-l-2 border-gray-200 pl-2 text-sm text-gray-600">
                          {formCtx}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-600">
                        Received {filing.receiptDate.slice(0, 10)}
                        {filing.committeeName ? ` · ${filing.committeeName}` : ''}
                        {receipts ? ` · ${receipts} receipts` : ''}
                        {' · '}
                        <Link
                          href={`/finance/filings/${filing.fileNumber}`}
                          className="text-[#3ea2d4] underline hover:no-underline"
                        >
                          filing detail
                        </Link>
                        {' · '}
                        <a
                          href={filing.fecUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#3ea2d4] underline hover:no-underline"
                        >
                          FEC record
                        </a>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* Sources */}
        <footer className="mt-grid-4 border-t-2 border-gray-200 pt-grid-2 text-xs text-gray-500">
          <p>
            Sources: Congress.gov, U.S. Senate roll-call records, House Clerk, Federal Election
            Commission. Compiled {issue.generatedAt.slice(0, 10)}. Something look wrong?{' '}
            <Link href="/corrections" className="text-[#3ea2d4] underline hover:no-underline">
              Report an error
            </Link>
            .
          </p>
        </footer>
      </div>
    </div>
  );
}

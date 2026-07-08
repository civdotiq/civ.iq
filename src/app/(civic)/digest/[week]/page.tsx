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

function positionAbbrev(position: string): string {
  if (position === 'Not Voting') return 'NV';
  if (position === 'Present') return 'P';
  return position === 'Yea' ? 'Y' : position === 'Nay' ? 'N' : position;
}

function VoteCard({ vote, congress }: { vote: DigestVote; congress: number }) {
  const questionCtx = voteQuestionContext(vote.question);
  const underlying = extractBillRefs(vote.bill?.title, congress, vote.bill?.billId);
  return (
    <div className="border-2 border-gray-200 bg-white p-grid-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-grid-2">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
          {vote.chamber} · {vote.date.slice(0, 10)}
          {questionCtx?.kind === 'procedural' && (
            <span className="ml-2 border border-gray-300 px-1 normal-case tracking-normal text-gray-500">
              Procedural
            </span>
          )}
        </span>
        <span className="text-sm font-semibold">
          {vote.result} ({vote.yeas}-{vote.nays})
        </span>
      </div>
      <p className="mt-grid-1 text-[15px] font-medium leading-snug">
        <VoteLink voteId={vote.voteId} label={vote.question} />
      </p>
      {vote.meaning ? (
        <div className="mt-1 border-l-2 border-[#3ea2d4] pl-2">
          <p className="text-sm text-gray-800">{vote.meaning.decided}</p>
          <p className="mt-0.5 text-sm text-gray-600">
            <span className="font-mono text-xs font-bold">Y</span> = {vote.meaning.yeaMeant}{' '}
            <span className="ml-2 font-mono text-xs font-bold">N</span> = {vote.meaning.nayMeant}
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            AI summary · as of {vote.meaning.generatedAt.slice(0, 10)} ·{' '}
            <Link href="/corrections" className="underline hover:text-[#3ea2d4]">
              report an error
            </Link>
          </p>
        </div>
      ) : (
        questionCtx && (
          <p className="mt-1 border-l-2 border-gray-200 pl-2 text-sm text-gray-600">
            {questionCtx.text}
          </p>
        )
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
        <div className="mt-grid-2 flex flex-wrap gap-x-grid-2 gap-y-1 border-t border-gray-100 pt-grid-1">
          {vote.miPositions.map(m => (
            <span key={m.bioguideId} className="text-sm whitespace-nowrap">
              <span
                className={`mr-1 inline-block w-5 text-center font-mono text-xs font-bold ${
                  m.position === 'Yea'
                    ? 'text-gray-900'
                    : m.position === 'Nay'
                      ? 'text-gray-900'
                      : 'text-gray-400'
                }`}
              >
                {positionAbbrev(m.position)}
              </span>
              <RepLink bioguideId={m.bioguideId} name={m.name} />
              <span className={`ml-1 text-xs ${getPartyTextClass(m.party)}`}>
                ({m.party.charAt(0)}
                {m.district ? `-${m.district}` : ''})
              </span>
            </span>
          ))}
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

export default async function DigestIssuePage({ params }: PageProps) {
  const { week } = await params;
  const issue = await getDigestIssue(week);
  if (!issue) notFound();

  const range = parseWeekId(issue.weekId);
  const label = range ? formatWeekRange(range) : issue.weekId;
  const congress = getCurrentCongressNumber(new Date(issue.weekStart));
  const houseVotes = issue.votes.filter(v => v.chamber === 'House');
  const senateVotes = issue.votes.filter(v => v.chamber === 'Senate');

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
              {senateVotes.length > 0 && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                    Senate ({senateVotes.length})
                  </h3>
                  {senateVotes.map(vote => (
                    <VoteCard key={vote.voteId} vote={vote} congress={congress} />
                  ))}
                </>
              )}
              {houseVotes.length > 0 && (
                <>
                  <h3 className="mt-grid-3 text-xs font-bold uppercase tracking-[0.08em] text-gray-500">
                    House ({houseVotes.length})
                  </h3>
                  {houseVotes.map(vote => (
                    <VoteCard key={vote.voteId} vote={vote} congress={congress} />
                  ))}
                </>
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
            <div className="mt-grid-2 border-2 border-gray-200 bg-white">
              <ul>
                {issue.bills.map(bill => {
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
                            <Link href="/corrections" className="hover:text-[#3ea2d4] underline">
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

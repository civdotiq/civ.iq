/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * VotingRecordAnswer — pod renderer for the voting-record question.
 *
 * Pods: Recent votes, Legislation, Voting stats.
 * Server component. All data passed as typed props from the page.
 */

import Link from 'next/link';

import { buildBillUrl } from '@/lib/helpers/url-builders';

interface Vote {
  voteId: string;
  bill?: { number?: string; title?: string; congress?: number; type?: string };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
}

interface VotesData {
  votes: Vote[];
  // Count of votes in the fetched sample (currently capped at 20). Session-wide
  // totals are NOT available here — label any derived stat as sample-scoped.
  totalResults: number;
}

// Bill type codes from Congress.gov -> citizen-friendly prefix.
const BILL_TYPE_LABEL: Record<string, string> = {
  hr: 'H.R.',
  hres: 'H.Res.',
  hjres: 'H.J.Res.',
  hconres: 'H.Con.Res.',
  s: 'S.',
  sres: 'S.Res.',
  sjres: 'S.J.Res.',
  sconres: 'S.Con.Res.',
};

function formatBillLabel(bill: Vote['bill']): string | null {
  if (!bill?.number) return null;
  const typeKey = (bill.type ?? 'hr').toLowerCase();
  const prefix = BILL_TYPE_LABEL[typeKey] ?? typeKey.toUpperCase();
  return `${prefix} ${bill.number}`;
}

interface Bill {
  id?: string;
  billId?: string;
  number?: string;
  type?: string;
  congress?: number;
  title?: string;
  introducedDate?: string;
  latestAction?: { text?: string; date?: string };
}

interface BillsData {
  bills?: Bill[];
  sponsored?: Bill[];
  cosponsored?: Bill[];
  totalSponsored?: number;
  totalCosponsored?: number;
  cosponsoredCapped?: boolean;
}

interface VotingRecordAnswerProps {
  votes: VotesData | null;
  bills: BillsData | null;
}

const POSITION_STYLES: Record<string, string> = {
  Yea: 'text-gray-900 font-medium',
  Nay: 'text-gray-900 font-medium',
  Present: 'text-gray-500',
  'Not Voting': 'text-gray-400',
};

function RecentVotesPod({ votes }: { votes: VotesData | null }) {
  if (!votes?.votes?.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Recent votes</h2>
        <p className="type-sm text-gray-500">
          Voting record data is not yet available for this representative.
        </p>
      </div>
    );
  }

  const recent = votes.votes.slice(0, 10);

  // When a bill title appears more than once in the rendered list, the two
  // votes are almost always distinct procedural steps (e.g., motion to recommit
  // vs. passage) that end up with opposite positions on the same day. Append
  // the vote's question to disambiguate; leave single-occurrence bills alone.
  const titleCounts = new Map<string, number>();
  for (const v of recent) {
    const key = v.bill?.title ?? v.question ?? 'Untitled vote';
    titleCounts.set(key, (titleCounts.get(key) ?? 0) + 1);
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Recent votes</h2>
      <ul className="divide-y divide-gray-200">
        {recent.map(vote => {
          const billId = vote.bill?.number
            ? `${vote.bill.congress ?? 119}-${(vote.bill.type ?? 'hr').toLowerCase()}-${vote.bill.number}`
            : null;
          const baseTitle = vote.bill?.title ?? vote.question ?? 'Untitled vote';
          const duplicated = (titleCounts.get(baseTitle) ?? 0) > 1;
          const billTitle =
            duplicated && vote.bill?.title && vote.question
              ? `${baseTitle} (${vote.question})`
              : baseTitle;

          return (
            <li key={vote.voteId} className="py-2 first:pt-0 last:pb-0">
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  {billId ? (
                    <Link
                      href={`/bill/${billId}`}
                      className="type-sm text-[#3ea2d4] hover:underline line-clamp-1"
                    >
                      {billTitle}
                    </Link>
                  ) : (
                    <span className="type-sm text-gray-900 line-clamp-1">{billTitle}</span>
                  )}
                  <p className="type-xs text-gray-500 mt-0.5">
                    {new Date(vote.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </p>
                </div>
                <span
                  className={`type-sm shrink-0 ${POSITION_STYLES[vote.position] ?? 'text-gray-500'}`}
                >
                  {vote.position}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      {votes.totalResults > 10 && (
        <p className="type-xs text-gray-500 mt-3">
          Showing 10 of the last {votes.totalResults.toLocaleString()} recorded votes.
        </p>
      )}
    </div>
  );
}

function LegislationPod({ bills }: { bills: BillsData | null }) {
  const sponsored = bills?.sponsored ?? bills?.bills ?? [];
  const totalSponsored = bills?.totalSponsored ?? sponsored.length;
  const totalCosponsored = bills?.totalCosponsored ?? bills?.cosponsored?.length ?? 0;
  const latestBill = sponsored[0];

  if (!bills || (totalSponsored === 0 && totalCosponsored === 0)) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Legislation</h2>
        <p className="type-sm text-gray-500">No sponsored legislation found.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Legislation</h2>
      <dl className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="type-xs text-gray-500">Bills sponsored</dt>
            <dd className="type-lg font-semibold text-black">{totalSponsored}</dd>
          </div>
          <div>
            <dt className="type-xs text-gray-500">Bills cosponsored</dt>
            <dd className="type-lg font-semibold text-black">
              {bills?.cosponsoredCapped ? `${totalCosponsored}+` : totalCosponsored}
            </dd>
          </div>
        </div>
        {latestBill && (
          <div>
            <dt className="type-xs text-gray-500 mb-1">Most recent bill</dt>
            <dd>
              {latestBill.number ? (
                <Link
                  href={buildBillUrl(
                    latestBill.congress ?? 119,
                    latestBill.type ?? 'hr',
                    latestBill.number
                  )}
                  className="type-sm text-[#3ea2d4] hover:underline line-clamp-2"
                >
                  {latestBill.title ?? 'Untitled bill'}
                </Link>
              ) : (
                <span className="type-sm text-gray-900 line-clamp-2">
                  {latestBill.title ?? 'Untitled bill'}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function VotingStatsPod({ votes }: { votes: VotesData | null }) {
  if (!votes?.votes?.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Voting stats</h2>
        <p className="type-sm text-gray-500">No voting statistics available.</p>
      </div>
    );
  }

  // These numbers describe the fetched sample, NOT the session. The upstream
  // fetcher caps at ~20 most-recent votes, so any "missed rate" or "total"
  // label without a sample-scope qualifier would misrepresent the record.
  const sampleSize = votes.votes.length;
  const yea = votes.votes.filter(v => v.position === 'Yea').length;
  const nay = votes.votes.filter(v => v.position === 'Nay').length;
  const missed = votes.votes.filter(
    v => v.position === 'Not Voting' || v.position === 'Present'
  ).length;
  const missedPct = sampleSize > 0 ? ((missed / sampleSize) * 100).toFixed(1) : '0';

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Voting stats</h2>
      <p className="type-xs text-gray-500 mb-3">
        In the last {sampleSize} recorded {sampleSize === 1 ? 'vote' : 'votes'}.
      </p>
      <dl className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <dt className="type-xs text-gray-500">Yea</dt>
            <dd className="type-base font-medium text-gray-900">{yea}</dd>
          </div>
          <div>
            <dt className="type-xs text-gray-500">Nay</dt>
            <dd className="type-base font-medium text-gray-900">{nay}</dd>
          </div>
          <div>
            <dt className="type-xs text-gray-500">Missed</dt>
            <dd className="type-base font-medium text-gray-900">{missed}</dd>
          </div>
        </div>
        <div>
          <dt className="type-xs text-gray-500">Missed in last {sampleSize}</dt>
          <dd className="type-base font-medium text-gray-900">{missedPct}%</dd>
        </div>
      </dl>
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Voting data from{' '}
        <a href="https://www.congress.gov" className="text-[#3ea2d4] hover:underline">
          Congress.gov
        </a>{' '}
        and chamber roll call records.{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function VotingRecordAnswer({ votes, bills }: VotingRecordAnswerProps) {
  return (
    <>
      <RecentVotesPod votes={votes} />
      <LegislationPod bills={bills} />
      <VotingStatsPod votes={votes} />
      <SourcesPod />
    </>
  );
}

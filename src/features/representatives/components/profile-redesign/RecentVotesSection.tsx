/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useId, useState } from 'react';
import Link from 'next/link';
import { VoteLink } from '@/components/shared/links/EntityLinks';
import { stripMeasureTags } from '@/lib/senate-vote-fields';
import { partyAlignment } from '@/lib/vote-tally';
import type { Vote } from '../VoteRow';
import { SectionBlock, SectionEmptyState, SectionSkeleton } from './SectionBlock';
import { groupVotesByMeasure, voteKind, type VoteGroup } from './vote-groups';
import { PartyBreakdown, TallyBar, useVoteTally } from './VoteTally';
import { formatDateOnly } from '@/lib/utils/date-only';

interface RecentVotesSectionProps {
  bioguideId: string;
  chamber: 'House' | 'Senate';
  /** Member's party, for the with/split-from-party note in the opened row. */
  memberParty: string | undefined;
  votes: Vote[] | undefined;
  totalResults: number | undefined;
  loading: boolean;
  error: boolean;
}

const VISIBLE_MEASURES = 5;

const PARTY_PLURAL: Record<string, string> = { D: 'Democrats', R: 'Republicans' };

function formatVoteDate(iso: string): string {
  return formatDateOnly(iso, { month: 'short', day: 'numeric' }) || iso;
}

/** Position by shape, never color: filled = yea, outlined = nay, dashed = didn't vote. */
function PositionBadge({ position }: { position: string }) {
  const p = position.toLowerCase();
  const shape =
    p === 'yea' || p === 'yes' || p === 'aye'
      ? 'border-2 border-gray-900 bg-gray-900 text-white'
      : p === 'nay' || p === 'no'
        ? 'border-2 border-gray-900 bg-white text-gray-900'
        : 'border border-dashed border-gray-400 bg-white text-gray-600';
  return (
    <span
      className={`inline-flex self-start min-w-[3.25rem] justify-center rounded-[2px] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${shape}`}
    >
      {position}
    </span>
  );
}

/** Outcomes stay neutral gray: passing is not the "good" result. */
function ResultChip({ result }: { result: string }) {
  if (!result) return null;
  return (
    <span className="inline-block rounded-[2px] bg-gray-100 px-2 py-0.5 text-[13px] font-medium text-gray-700 whitespace-nowrap">
      {result}
    </span>
  );
}

function KindTag({ vote }: { vote: Vote }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wider text-gray-600">
      {voteKind(vote)}
    </span>
  );
}

/** One roll call inside an opened measure. Fetches its tally only once opened. */
function RollCallRow({ vote, memberParty }: { vote: Vote; memberParty: string | undefined }) {
  const { data: tally } = useVoteTally(vote.voteId);
  const alignment = tally ? partyAlignment(tally, memberParty, vote.position) : null;
  const partyCode = memberParty?.trim().charAt(0).toUpperCase() ?? '';
  const label = vote.amendment
    ? vote.amendment.purpose
      ? `${vote.amendment.number} — ${vote.amendment.purpose}`
      : vote.amendment.number
    : stripMeasureTags(vote.question);

  return (
    <li className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 py-4 border-t border-gray-200 first:border-t-0 sm:grid-cols-[auto_1fr_10rem]">
      <PositionBadge position={vote.position} />
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <KindTag vote={vote} />
          <span className="text-xs text-gray-600">{formatVoteDate(vote.date)}</span>
          {vote.amendment?.sponsorLabel && (
            <span className="text-xs text-gray-600">{vote.amendment.sponsorLabel}</span>
          )}
        </div>
        <VoteLink voteId={vote.voteId} label={label} className="mt-1 block text-[15px]" />
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
          <ResultChip result={vote.result} />
          {alignment && (
            <span className="text-[13px] text-gray-700">
              {alignment === 'with' ? 'Voted with' : 'Split from'} most {PARTY_PLURAL[partyCode]}
            </span>
          )}
        </div>
        {tally && tally.parties.length > 0 && (
          <div className="mt-2">
            <PartyBreakdown tally={tally} />
          </div>
        )}
      </div>
      <div className="col-span-2 sm:col-span-1">{tally && <TallyBar tally={tally} />}</div>
    </li>
  );
}

function MeasureRow({ group, memberParty }: { group: VoteGroup; memberParty: string | undefined }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const { data: tally } = useVoteTally(group.deciding.voteId);
  const rollCalls = group.votes.length;

  return (
    <li className="border-t border-gray-300 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(o => !o)}
        className="grid w-full grid-cols-[auto_1fr_auto] gap-x-4 gap-y-2 py-4 text-left hover:bg-gray-50 sm:grid-cols-[auto_1fr_10rem_auto]"
      >
        <PositionBadge position={group.deciding.position} />
        <span className="min-w-0">
          <span className="block text-[15px] font-medium text-gray-900 line-clamp-2">
            {group.billLabel && <span className="font-bold">{group.billLabel} · </span>}
            {group.title}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <KindTag vote={group.deciding} />
            <span className="text-xs text-gray-600">{formatVoteDate(group.deciding.date)}</span>
            <ResultChip result={group.deciding.result} />
            {rollCalls > 1 && <span className="text-xs text-gray-600">{rollCalls} roll calls</span>}
          </span>
        </span>
        <span className="col-span-3 row-start-2 sm:col-span-1 sm:row-start-1 sm:col-start-3">
          {tally && <TallyBar tally={tally} />}
        </span>
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`mt-1 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ol id={panelId} className="mb-4 border-l-2 border-civiq-blue/30 pl-4 sm:ml-[4.25rem]">
          {group.votes.map(vote => (
            <RollCallRow key={vote.voteId} vote={vote} memberParty={memberParty} />
          ))}
        </ol>
      )}
    </li>
  );
}

export function RecentVotesSection({
  bioguideId,
  chamber,
  memberParty,
  votes,
  totalResults,
  loading,
  error,
}: RecentVotesSectionProps) {
  const groups = groupVotesByMeasure(votes ?? [], VISIBLE_MEASURES);
  const total = totalResults ?? votes?.length ?? 0;

  return (
    <SectionBlock
      id="votes"
      title="Recent votes"
      action={
        <Link
          href={`/representative/${bioguideId}/votes`}
          className="text-civiq-blue hover:underline"
        >
          {total > 0 ? `All ${total} recent votes →` : 'Full voting record →'}
        </Link>
      }
      source={
        chamber === 'Senate'
          ? 'Source: Senate.gov roll-call XML · updated hourly'
          : 'Source: Congress.gov House roll-call data · updated hourly'
      }
    >
      {loading ? (
        <SectionSkeleton rows={5} />
      ) : error || groups.length === 0 ? (
        <SectionEmptyState
          message={
            error
              ? 'Voting data is temporarily unavailable — the upstream government API did not respond.'
              : `No recent roll-call votes returned for this member from ${
                  chamber === 'Senate' ? 'Senate.gov' : 'Congress.gov'
                }.`
          }
        />
      ) : (
        <>
          <p className="mb-2 text-[13px] text-gray-600">
            Grouped by measure. The position shown is on the passage or confirmation vote, or the
            latest vote when there was none. Open a row for every roll call.
          </p>
          <ul>
            {groups.map(group => (
              <MeasureRow key={group.key} group={group} memberParty={memberParty} />
            ))}
          </ul>
        </>
      )}
    </SectionBlock>
  );
}

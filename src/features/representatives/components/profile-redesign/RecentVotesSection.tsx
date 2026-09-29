/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { VoteLink } from '@/components/shared/links/EntityLinks';
import { formatBillNumber } from '@/lib/bill-label';
import type { Vote } from '../VoteRow';
import { SectionBlock, SectionEmptyState, SectionSkeleton } from './SectionBlock';
import { formatDateOnly } from '@/lib/utils/date-only';

interface RecentVotesSectionProps {
  bioguideId: string;
  chamber: 'House' | 'Senate';
  votes: Vote[] | undefined;
  totalResults: number | undefined;
  loading: boolean;
  error: boolean;
}

const VISIBLE_VOTES = 5;

function positionChipClass(position: string): string {
  const p = position.toLowerCase();
  // Filled vs outlined, not dashed vs solid: distinguishable at a glance.
  // Neutral black — never party or success/error colors for a vote position.
  if (p === 'yea' || p === 'yes' || p === 'aye') {
    return 'border-2 border-black bg-black text-white';
  }
  if (p === 'nay' || p === 'no') {
    return 'border-2 border-black bg-white text-gray-900';
  }
  return 'border border-gray-300 text-gray-600';
}

/** Adopted outcomes get an interactive-blue tint; everything else stays gray. */
function resultChipClass(result: string): string {
  const r = result.toLowerCase();
  const adopted = /\b(passed|agreed|confirmed|adopted)\b/.test(r) && !/\bnot\b/.test(r);
  return adopted ? 'bg-civiq-blue/15 text-civiq-blue-dark' : 'bg-gray-100 text-gray-700';
}

function formatVoteDate(iso: string): string {
  return formatDateOnly(iso, { month: 'short', day: 'numeric' }) || iso;
}

/** Measure label: prefer the bill title, fall back to the roll-call question. */
function measureLabel(vote: Vote): string {
  const { number, title, type } = vote.bill;
  if (title && title !== 'Vote without associated bill') {
    return number && number !== 'N/A' ? `${formatBillNumber(type, number)} — ${title}` : title;
  }
  return vote.question || `Roll call ${vote.rollNumber || ''}`.trim();
}

export function RecentVotesSection({
  bioguideId,
  chamber,
  votes,
  totalResults,
  loading,
  error,
}: RecentVotesSectionProps) {
  const visible = (votes ?? []).slice(0, VISIBLE_VOTES);
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
      ) : error || visible.length === 0 ? (
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
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-b-black">
              <th className="text-left pb-2 pr-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Date
              </th>
              <th className="text-left pb-2 pr-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Measure
              </th>
              <th className="text-left pb-2 pr-4 text-[11px] uppercase tracking-wider font-medium text-gray-500">
                Position
              </th>
              <th className="text-left pb-2 text-[11px] uppercase tracking-wider font-medium text-gray-500 hidden sm:table-cell">
                Result
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map(vote => (
              <tr key={vote.voteId} className="border-b border-gray-300 last:border-b-0">
                <td className="py-3.5 pr-4 whitespace-nowrap text-gray-700 align-top">
                  {formatVoteDate(vote.date)}
                </td>
                <td className="py-3.5 pr-4 align-top">
                  <VoteLink voteId={vote.voteId} label={measureLabel(vote)} />
                </td>
                <td className="py-3.5 pr-4 align-top">
                  <span
                    className={`inline-block rounded-[2px] px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${positionChipClass(vote.position)}`}
                  >
                    {vote.position}
                  </span>
                </td>
                <td className="py-3.5 align-top hidden sm:table-cell">
                  {vote.result ? (
                    <span
                      className={`inline-block rounded-[2px] px-2 py-0.5 text-[13px] font-medium ${resultChipClass(vote.result)}`}
                    >
                      {vote.result}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionBlock>
  );
}

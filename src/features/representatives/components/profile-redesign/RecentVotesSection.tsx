/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { VoteLink } from '@/components/shared/links/EntityLinks';
import type { Vote } from '../VoteRow';
import { SectionBlock, SectionEmptyState, SectionSkeleton } from './SectionBlock';

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
  if (p === 'yea' || p === 'yes' || p === 'aye') {
    return 'border-2 border-black text-gray-900';
  }
  if (p === 'nay' || p === 'no') {
    return 'border-2 border-dashed border-gray-500 text-gray-700';
  }
  return 'border border-gray-300 text-gray-500';
}

function formatVoteDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Measure label: prefer the bill title, fall back to the roll-call question. */
function measureLabel(vote: Vote): string {
  const { number, title } = vote.bill;
  if (title && title !== 'Vote without associated bill') {
    return number && number !== 'N/A' ? `${number} — ${title}` : title;
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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-black">
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
                <td className="py-3 pr-4 whitespace-nowrap text-gray-700 align-top">
                  {formatVoteDate(vote.date)}
                </td>
                <td className="py-3 pr-4 align-top">
                  <VoteLink voteId={vote.voteId} label={measureLabel(vote)} />
                </td>
                <td className="py-3 pr-4 align-top">
                  <span
                    className={`inline-block rounded-[2px] px-2 py-0.5 text-[11px] font-bold tracking-wider uppercase ${positionChipClass(vote.position)}`}
                  >
                    {vote.position}
                  </span>
                </td>
                <td className="py-3 align-top text-gray-700 hidden sm:table-cell">
                  {vote.result || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionBlock>
  );
}

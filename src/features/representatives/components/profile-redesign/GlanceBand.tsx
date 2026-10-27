/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { fmtInt, fmtPct } from '@/features/record-card/format';
import { formatMoney, type ProfileSummary } from './types';
import { SenateVoteFreshnessClient } from '@/components/votes/SenateVoteFreshnessClient';

interface GlanceBandProps {
  summary: ProfileSummary | null;
  loading: boolean;
  /** The summary request failed (timeout, 5xx). Distinct from "no data". */
  error?: boolean;
  committeeCount: number;
  subcommitteeCount?: number;
  /** The member's Record Card. Omitted for former members, whose record isn't current. */
  recordCardHref?: string;
  /** Senators get the stored votes' "Latest record · Checked" line. */
  chamber?: string;
}

interface GlanceCellProps {
  label: string;
  value: string;
  caption: string;
  loading: boolean;
}

function GlanceCell({ label, value, caption, loading }: GlanceCellProps) {
  return (
    <div className="px-6 sm:px-7 py-5 border-b sm:border-b-0 border-gray-300 [&:not(:first-child)]:sm:border-l">
      <span className="block text-[11px] font-medium uppercase tracking-wider text-civiq-blue-dark">
        {label}
      </span>
      {loading ? (
        <div className="animate-pulse mt-1" aria-hidden="true">
          <div className="h-10 w-20 bg-gray-100 border border-gray-200" />
        </div>
      ) : (
        <>
          <span className="block text-3xl sm:text-4xl font-bold leading-tight text-gray-900 tabular-nums mt-1">
            {value}
          </span>
          <span className="block text-[13px] text-gray-600 mt-1">{caption}</span>
        </>
      )}
    </div>
  );
}

/**
 * "Missed 61 of 676 (9%) · chamber median 2.1%" — the member's denominator
 * and the chamber baseline from the same sweep, so the count never stands
 * alone. Null when the summary predates these fields.
 */
export function votesCaption(summary: ProfileSummary | null): string | null {
  const appearances = summary?.votesAppearances;
  const missed = summary?.votesMissed;
  if (!appearances || appearances <= 0 || typeof missed !== 'number') return null;
  const of =
    summary?.votesFullCoverage === false
      ? `of the ${fmtInt(appearances)} most recent`
      : `of ${fmtInt(appearances)}`;
  const median =
    typeof summary?.votesMedianMissedPct === 'number'
      ? ` · chamber median ${fmtPct(summary.votesMedianMissedPct)}`
      : '';
  return `Missed ${fmtInt(missed)} ${of} (${fmtPct((missed / appearances) * 100)})${median}`;
}

/**
 * At-a-glance stat band. Numbers come from real Congress.gov / FEC data;
 * cells show "Data unavailable" rather than ever inventing a figure.
 */
export function GlanceBand({
  summary,
  loading,
  error,
  committeeCount,
  subcommitteeCount = 0,
  recordCardHref,
  chamber,
}: GlanceBandProps) {
  // A failed request is not evidence of absence: never tell the citizen
  // "No FEC filings found" because our own endpoint timed out.
  const failed = Boolean(error) && !summary;
  const unavailable = failed ? 'Could not load — retry shortly' : 'Data unavailable';
  const votes = summary?.votesParticipated;
  const sponsored = summary?.billsSponsored;
  const cosponsored = summary?.billsCosponsored;
  const cosponsoredPlus = summary?.billsCosponsoredIsLowerBound ? '+' : '';
  const raised = formatMoney(summary?.totalRaised);
  const spent = formatMoney(summary?.totalSpent);
  const cycle = summary?.financeCycle;
  const hasMedian = typeof summary?.votesMedianMissedPct === 'number';

  return (
    <div className="mb-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-2 border-black border-t-4 border-t-civiq-blue bg-white">
        <GlanceCell
          label="Roll-call votes"
          value={votes && votes > 0 ? fmtInt(votes) : '—'}
          caption={
            votes && votes > 0
              ? (votesCaption(summary) ?? 'Votes cast, 119th Congress')
              : unavailable
          }
          loading={loading}
        />
        <GlanceCell
          label="Bills sponsored"
          value={typeof sponsored === 'number' ? String(sponsored) : '—'}
          caption={
            typeof sponsored === 'number'
              ? `${cosponsored && cosponsored > 0 ? `${cosponsored}${cosponsoredPlus} cosponsored · ` : ''}119th Congress`
              : summary?.legislationUnavailable
                ? 'Could not load — retry shortly'
                : unavailable
          }
          loading={loading}
        />
        <GlanceCell
          label="Raised"
          value={raised ?? '—'}
          caption={
            raised
              ? `${cycle ? `${cycle} cycle` : 'Latest cycle'}${spent ? ` · ${spent} spent` : ''}`
              : failed || summary?.financeUnavailable
                ? 'Could not load — retry shortly'
                : 'No FEC filings found'
          }
          loading={loading}
        />
        <GlanceCell
          label="Committees"
          value={committeeCount > 0 ? String(committeeCount) : '—'}
          caption={
            committeeCount > 0
              ? subcommitteeCount > 0
                ? `Plus ${subcommitteeCount} subcommittee${subcommitteeCount === 1 ? '' : 's'}`
                : 'Current assignments'
              : 'Data unavailable'
          }
          loading={false}
        />
      </div>
      <SenateVoteFreshnessClient chamber={chamber} className="mt-2" />
      {(hasMedian || recordCardHref) && (
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          {/* Standing note: the median is context for the number, not a score. */}
          <span className="text-xs text-gray-500">
            {hasMedian ? 'Chamber medians are a description, not a grade.' : ''}
          </span>
          {/* The Record Card is built from the same source as these numbers,
            with each one cited and a printable version. */}
          {recordCardHref && (
            <Link
              href={recordCardHref}
              className="font-medium text-civiq-blue-dark hover:underline"
            >
              Full record card, with sources →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

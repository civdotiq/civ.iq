/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { formatMoney, type ProfileSummary } from './types';

interface GlanceBandProps {
  summary: ProfileSummary | null;
  loading: boolean;
  committeeCount: number;
}

interface GlanceCellProps {
  label: string;
  value: string;
  caption: string;
  loading: boolean;
}

function GlanceCell({ label, value, caption, loading }: GlanceCellProps) {
  return (
    <div className="px-6 py-4 border-b sm:border-b-0 border-gray-300 [&:not(:first-child)]:sm:border-l">
      <span className="block text-[11px] uppercase tracking-wider text-gray-500">{label}</span>
      {loading ? (
        <div className="animate-pulse mt-1" aria-hidden="true">
          <div className="h-7 w-16 bg-gray-100 border border-gray-200" />
        </div>
      ) : (
        <>
          <span className="block text-2xl sm:text-3xl font-bold leading-tight text-gray-900 tabular-nums">
            {value}
          </span>
          <span className="block text-xs text-gray-700 mt-1">{caption}</span>
        </>
      )}
    </div>
  );
}

/**
 * At-a-glance stat band. Numbers come from real Congress.gov / FEC data;
 * cells show "Data unavailable" rather than ever inventing a figure.
 */
export function GlanceBand({ summary, loading, committeeCount }: GlanceBandProps) {
  const votes = summary?.votesParticipated;
  const sponsored = summary?.billsSponsored;
  const cosponsored = summary?.billsCosponsored;
  const raised = formatMoney(summary?.totalRaised);
  const spent = formatMoney(summary?.totalSpent);
  const cycle = summary?.financeCycle;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-2 border-black bg-white mb-8">
      <GlanceCell
        label="Roll-call votes"
        value={votes && votes > 0 ? String(votes) : '—'}
        caption={votes && votes > 0 ? 'Most recent floor votes' : 'Data unavailable'}
        loading={loading}
      />
      <GlanceCell
        label="Bills sponsored"
        value={sponsored && sponsored > 0 ? String(sponsored) : '—'}
        caption={
          sponsored && sponsored > 0
            ? `${cosponsored && cosponsored > 0 ? `${cosponsored} cosponsored · ` : ''}119th Congress`
            : 'Data unavailable'
        }
        loading={loading}
      />
      <GlanceCell
        label="Raised"
        value={raised ?? '—'}
        caption={
          raised
            ? `${cycle ? `${cycle} cycle` : 'Latest cycle'}${spent ? ` · ${spent} spent` : ''}`
            : 'No FEC filings found'
        }
        loading={loading}
      />
      <GlanceCell
        label="Committees"
        value={committeeCount > 0 ? String(committeeCount) : '—'}
        caption={committeeCount > 0 ? 'Current assignments' : 'Data unavailable'}
        loading={false}
      />
    </div>
  );
}

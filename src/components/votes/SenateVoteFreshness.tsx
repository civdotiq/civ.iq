/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import type { SenateVoteFreshness as Freshness } from '@/features/representatives/services/senate-vote-freshness';
import { formatDateOnly } from '@/lib/utils/date-only';

const LONG: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' };
const SHORT: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };

interface SenateVoteFreshnessProps {
  freshness: Freshness | null | undefined;
  /** A single past vote: "Vote held · Checked", never the amber notice. */
  voteDate?: string | null;
  className?: string;
}

/**
 * How current a Senate vote list is. Always shows the newest stored vote's
 * date and when we last confirmed it; adds the amber notice only when the
 * Congressional Record lists Senate roll calls we don't have. A check that is
 * merely old never shows amber (recesses and pro forma days have no votes).
 * Renders nothing when nothing is known.
 */
export function SenateVoteFreshness({
  freshness,
  voteDate,
  className = '',
}: SenateVoteFreshnessProps) {
  if (!freshness) return null;
  const single = voteDate !== undefined;
  const latest = formatDateOnly(single ? voteDate : freshness.latestVoteDate, SHORT);
  const checked = formatDateOnly(freshness.checkedAt, SHORT);
  if (!latest && !checked) return null;

  const missing = single ? null : freshness.missing;

  return (
    <div className={className}>
      <p className="text-xs text-gray-600 tracking-wide" data-testid="senate-vote-freshness">
        {single ? null : <span className="font-medium text-gray-900">Senate votes</span>}
        {latest ? (
          <>
            {single ? null : ' · '}
            {single ? 'Vote held' : 'Latest record'}: {latest}
          </>
        ) : null}
        {checked ? <> · Checked: {checked}</> : null}
      </p>
      {missing ? (
        <div
          role="status"
          className="mt-2 border-l-4 border-amber-600 bg-amber-50 p-3 text-sm text-gray-900"
        >
          <p>
            The Senate has held roll-call votes
            {missing.ourLatestDate
              ? ` since ${formatDateOnly(missing.ourLatestDate, LONG)}`
              : ''}{' '}
            that aren&apos;t shown here yet. The Congressional Record for{' '}
            {formatDateOnly(missing.recordIssueDate, LONG)} lists Senate votes through No.{' '}
            {missing.recordTotal}; this page has{' '}
            {missing.ourLatestRoll > 0 ? `through No. ${missing.ourLatestRoll}` : 'none yet'}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

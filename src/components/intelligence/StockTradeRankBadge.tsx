/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import type { StockTradeLeaderboardResponse } from '@/lib/intelligence/types';

interface StockTradeRankBadgeProps {
  bioguideId: string;
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  });

/**
 * Compact badge showing this member's rank among all congressional stock traders.
 * Fetches from the leaderboard API and finds the member's position.
 */
export function StockTradeRankBadge({ bioguideId }: StockTradeRankBadgeProps) {
  const { data } = useSWR<StockTradeLeaderboardResponse>(
    '/api/intelligence/stock-trades/leaderboard?limit=100',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 600000 }
  );

  if (!data?.entries) return null;

  const entry = data.entries.find(e => e.bioguideId === bioguideId);
  if (!entry) return null;

  return (
    <span
      className="inline-flex items-center gap-1 border-2 border-gray-200 px-2 py-1 text-xs font-medium text-gray-600"
      title={`Ranks #${entry.rank} of ${data.stats.totalMembers} members who disclosed trades (by trade count)`}
    >
      <span className="text-gray-900 font-semibold">#{entry.rank}</span>
      <span className="text-gray-400">of {data.stats.totalMembers}</span>
      traders
    </span>
  );
}

export default StockTradeRankBadge;

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import type { StockCommitteeInsight, SectorTradeCount } from '@/lib/intelligence/types';

interface TradeSectorBreakdownProps {
  bioguideId: string;
  className?: string;
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    return res.json();
  });

/** Color for committee-overlap bars vs normal bars */
const OVERLAP_COLOR = '#e11d07';
const NORMAL_COLOR = '#d1d5db';

/**
 * Horizontal bar chart showing stock trades by industry sector.
 * Highlights sectors that overlap with the member's committee jurisdictions.
 * Fetches data from the stock-committee insight API.
 */
export function TradeSectorBreakdown({ bioguideId, className = '' }: TradeSectorBreakdownProps) {
  const { data, isLoading } = useSWR<StockCommitteeInsight>(
    `/api/intelligence/representative/${bioguideId}/stock-trades`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className={`bg-gray-50 p-4 ${className}`}>
        <div className="h-4 bg-gray-200 animate-pulse w-1/3 mb-4" />
        <div className="space-y-2">
          <div className="h-6 bg-gray-100 animate-pulse" />
          <div className="h-6 bg-gray-100 animate-pulse w-4/5" />
          <div className="h-6 bg-gray-100 animate-pulse w-3/5" />
        </div>
      </div>
    );
  }

  const sectors = data?.tradesBySector;
  if (!sectors || sectors.length === 0) return null;

  const maxCount = sectors[0]!.tradeCount;
  const hasOverlap = sectors.some(s => s.overlapsCommittee);

  return (
    <div
      className={`border-2 border-black bg-white p-4 ${className}`}
      role="img"
      aria-label={`Stock trades by sector. ${sectors.length} sectors. ${hasOverlap ? 'Some sectors overlap with committee jurisdictions.' : 'No committee jurisdiction overlaps detected.'}`}
    >
      <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
        Trades by sector
      </h4>

      <div className="space-y-2">
        {sectors.map((sector: SectorTradeCount) => (
          <SectorBar key={sector.sector} sector={sector} maxCount={maxCount} />
        ))}
      </div>

      {/* Legend */}
      {hasOverlap && (
        <div className="mt-4 pt-3 border-t border-gray-200 flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 border border-gray-300"
              style={{ backgroundColor: OVERLAP_COLOR }}
            />
            <span className="text-xs text-gray-500">Committee jurisdiction overlap</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 border border-gray-300"
              style={{ backgroundColor: NORMAL_COLOR }}
            />
            <span className="text-xs text-gray-500">No committee overlap</span>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Sectors resolved from stock tickers via SEC EDGAR SIC codes. Correlation with committee
        jurisdiction does not indicate wrongdoing.
      </p>
    </div>
  );
}

function SectorBar({ sector, maxCount }: { sector: SectorTradeCount; maxCount: number }) {
  const widthPct = maxCount > 0 ? (sector.tradeCount / maxCount) * 100 : 0;
  const color = sector.overlapsCommittee ? OVERLAP_COLOR : NORMAL_COLOR;

  return (
    <div className="flex items-center gap-2">
      <div className="w-32 sm:w-44 shrink-0 text-xs text-gray-700 truncate" title={sector.sector}>
        {sector.sector}
      </div>
      <div className="flex-1 h-5 bg-gray-50 border border-gray-200 relative">
        <div
          className="h-full"
          style={{
            width: `${Math.max(widthPct, 2)}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="w-8 text-xs text-gray-500 text-right font-mono">{sector.tradeCount}</div>
    </div>
  );
}

export default TradeSectorBreakdown;

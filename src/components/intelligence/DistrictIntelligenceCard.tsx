/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import Link from 'next/link';
import type { DistrictIntelligenceSummary } from '@/lib/intelligence/types';

interface DistrictIntelligenceCardProps {
  districtId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function DistrictIntelligenceCard({ districtId }: DistrictIntelligenceCardProps) {
  const { data, isLoading } = useSWR<DistrictIntelligenceSummary>(
    `/api/intelligence/district/${districtId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6 animate-pulse">
        <div className="h-6 bg-gray-200 border-2 border-gray-300 w-1/2 mb-4" />
        <div className="h-24 bg-gray-200 border-2 border-gray-300" />
      </div>
    );
  }

  if (!data?.representatives?.length) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Intelligence</h2>
      <p className="type-sm text-gray-500 mb-4">
        Statistical analysis connecting campaign finance, voting records, and committee
        jurisdictions.
      </p>

      <div className="space-y-3">
        {data.representatives.map(rep => (
          <Link
            key={rep.bioguideId}
            href={`/representative/${rep.bioguideId}?tab=intelligence`}
            className="block bg-gray-50 p-4 hover:border-gray-400 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="aicher-heading type-base text-gray-900">{rep.name}</div>
                <div className="type-xs text-gray-500">
                  {rep.party === 'D' ? 'Democrat' : rep.party === 'R' ? 'Republican' : rep.party}
                  {' · '}
                  {rep.chamber}
                </div>
              </div>
              <div className="text-right">
                {rep.financeJurisdictionOverlap !== null && (
                  <div className="aicher-heading type-lg text-gray-900">
                    {(rep.financeJurisdictionOverlap * 100).toFixed(0)}%
                  </div>
                )}
                <div className="type-xs text-gray-500">
                  {rep.financeJurisdictionOverlap !== null
                    ? 'Finance-jurisdiction overlap'
                    : `${rep.insightsAvailable} insights available`}
                </div>
              </div>
            </div>
            {rep.hasStockTrades && (
              <div className="mt-2 type-xs text-gray-400">Stock trade analysis available</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DistrictIntelligenceCard;

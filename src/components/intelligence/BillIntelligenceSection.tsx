/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { InsightCard, billIntelligenceKeyStats } from './InsightCard';
import type { BillIntelligenceInsight } from '@/lib/intelligence/types';

interface BillIntelligenceSectionProps {
  billId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function BillIntelligenceSection({ billId }: BillIntelligenceSectionProps) {
  const { data, isLoading } = useSWR<BillIntelligenceInsight>(
    `/api/intelligence/bill/${billId}`,
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
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border-2 border-gray-200 p-3">
              <div className="h-8 bg-gray-200 border-2 border-gray-300 mb-1" />
              <div className="h-3 bg-gray-200 border-2 border-gray-300 w-2/3" />
            </div>
          ))}
        </div>
        <div className="h-4 bg-gray-200 border-2 border-gray-300 mb-2" />
        <div className="h-4 bg-gray-200 border-2 border-gray-300 w-5/6" />
      </div>
    );
  }

  if (!data?.billId) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Intelligence</h3>
      <p className="type-sm text-gray-500 mb-4">
        Statistical analysis connecting sponsor funding sources, cosponsor patterns, and lobbying
        activity related to this bill.
      </p>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="border-2 border-gray-200 p-3">
          <div className="aicher-heading type-2xl text-gray-900">{data.affectedSectors.length}</div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Affected sectors</div>
        </div>

        {data.sponsorAnalysis && (
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {data.sponsorAnalysis.sectorDonationPercentage.toFixed(1)}%
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Sponsor sector %</div>
          </div>
        )}

        {data.cosponsorSummary.analyzedCosponsors > 0 && (
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {data.cosponsorSummary.avgSectorDonationPercentage.toFixed(1)}%
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">
              Cosponsor avg ({data.cosponsorSummary.analyzedCosponsors})
            </div>
          </div>
        )}

        {data.relatedLobbyingSpending > 0 && (
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {data.relatedLobbyingSpending >= 1_000_000
                ? `$${(data.relatedLobbyingSpending / 1_000_000).toFixed(1)}M`
                : `$${(data.relatedLobbyingSpending / 1_000).toFixed(0)}K`}
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">
              Lobbying ({data.relatedLobbyingOrgs} orgs)
            </div>
          </div>
        )}
      </div>

      {/* Sector Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        {data.affectedSectors.slice(0, 8).map(sector => (
          <span key={sector} className="border-2 border-gray-300 px-2 py-1 type-xs text-gray-600">
            {sector}
          </span>
        ))}
      </div>

      <InsightCard
        title="Funding Analysis"
        insight={data}
        keyStats={billIntelligenceKeyStats(data)}
      />
    </div>
  );
}

export default BillIntelligenceSection;

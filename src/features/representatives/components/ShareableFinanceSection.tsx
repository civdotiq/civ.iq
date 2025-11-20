/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import {
  ShareableDataCard,
  ShareableHeroStat,
  ShareableBarChart,
  ShareableStatRow,
} from '@/components/shared/social/ShareableDataCard';
import { EnhancedRepresentative } from '@/types/representative';
import { FinanceResponse } from '@/types/campaign-finance';

interface ShareableFinanceSectionProps {
  representative: EnhancedRepresentative;
  financeData?: FinanceResponse | null;
}

/**
 * ShareableFinanceSection - Campaign finance data with integrated sharing
 *
 * Displays FEC data in a shareable format following Ulm School design principles
 */
export function ShareableFinanceSection({
  representative,
  financeData,
}: ShareableFinanceSectionProps) {
  if (!financeData || !financeData.totalRaised) {
    return (
      <ShareableDataCard
        representative={{
          name: representative.name,
          party: representative.party,
          state: representative.state,
          bioguideId: representative.bioguideId,
          chamber: representative.chamber,
          district: representative.district,
        }}
        section="finance"
        title="Campaign Finance"
      >
        <div className="text-center py-8 text-gray-500">
          <p>Campaign finance data is currently unavailable.</p>
          <p className="text-sm mt-2">This representative may not have FEC data yet.</p>
        </div>
      </ShareableDataCard>
    );
  }

  const totalRaised = financeData.totalRaised || 0;
  const individualPercent =
    financeData.individualContributions && totalRaised > 0
      ? (financeData.individualContributions / totalRaised) * 100
      : 0;
  const pacPercent =
    financeData.pacContributions && totalRaised > 0
      ? (financeData.pacContributions / totalRaised) * 100
      : 0;

  // Get top industry from industry breakdown
  const topIndustry = financeData.industryBreakdown?.[0];

  return (
    <ShareableDataCard
      representative={{
        name: representative.name,
        party: representative.party,
        state: representative.state,
        bioguideId: representative.bioguideId,
        chamber: representative.chamber,
        district: representative.district,
      }}
      section="finance"
      title="Campaign Finance"
      stats={{
        totalRaised,
        individualPercent: Math.round(individualPercent),
        pacPercent: Math.round(pacPercent),
        topIndustry: topIndustry?.sector,
        topIndustryAmount: topIndustry?.amount,
      }}
    >
      <div className="space-y-8">
        {/* Hero stat: Total raised */}
        <ShareableHeroStat
          value={`$${(totalRaised / 1_000_000).toFixed(1)}M`}
          label="Total Raised"
          sublabel={`Cycle ${financeData.cycle || 'current'}`}
        />

        {/* Funding sources breakdown */}
        {(financeData.individualContributions || financeData.pacContributions) && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Funding Sources
            </h4>
            <ShareableBarChart
              data={[
                {
                  label: 'Individual Contributors',
                  value: financeData.individualContributions || 0,
                  percentage: individualPercent,
                  color: 'blue',
                },
                {
                  label: 'PAC Contributions',
                  value: financeData.pacContributions || 0,
                  percentage: pacPercent,
                  color: 'gray',
                },
              ]}
            />
          </div>
        )}

        {/* Top industry */}
        {topIndustry && (
          <div>
            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
              Top Industry
            </h4>
            <ShareableStatRow
              label={topIndustry.sector}
              value={`$${(topIndustry.amount / 1_000).toFixed(0)}K`}
            />
          </div>
        )}

        {/* Key metrics */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
            Summary
          </h4>
          <div className="space-y-0">
            <ShareableStatRow
              label="Total Spent"
              value={`$${((financeData.totalSpent || 0) / 1_000_000).toFixed(1)}M`}
            />
            <ShareableStatRow
              label="Cash on Hand"
              value={`$${((financeData.cashOnHand || 0) / 1_000_000).toFixed(1)}M`}
            />
            {financeData.candidateContributions > 0 && (
              <ShareableStatRow
                label="Self-Funded"
                value={`$${((financeData.candidateContributions || 0) / 1_000_000).toFixed(1)}M`}
              />
            )}
          </div>
        </div>
      </div>
    </ShareableDataCard>
  );
}

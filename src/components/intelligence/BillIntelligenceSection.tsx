/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { ConfidenceBadge } from './ConfidenceBadge';
import { InsightDisclaimer } from './InsightDisclaimer';
import type { BillIntelligenceInsight } from '@/lib/intelligence/types';

interface BillIntelligenceSectionProps {
  billId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

/**
 * Determines the headline finding from the data.
 * This is the single most important thing the user should take away.
 */
function getHeadline(data: BillIntelligenceInsight): {
  text: string;
  notable: boolean;
} {
  const sponsorPct = data.sponsorAnalysis?.sectorDonationPercentage ?? 0;
  const cosponsorPct = data.cosponsorSummary.avgSectorDonationPercentage;
  const hasLobbying = data.relatedLobbyingSpending > 0;
  const sponsorName = data.sponsorAnalysis?.name ?? 'the sponsor';

  // Notable: sponsor receives significant funding from related sectors
  if (sponsorPct >= 5) {
    const amt = formatDollars(data.sponsorAnalysis?.sectorDonationAmount ?? 0);
    return {
      text: `${sponsorPct.toFixed(1)}% of ${sponsorName}'s campaign funding (${amt}) comes from industries related to this bill.`,
      notable: true,
    };
  }

  // Notable: cosponsors receive significant funding even if sponsor doesn't
  if (cosponsorPct >= 5 && data.cosponsorSummary.analyzedCosponsors >= 2) {
    return {
      text: `The sponsor has no notable funding connection, but cosponsors average ${cosponsorPct.toFixed(1)}% of their funding from related industries.`,
      notable: true,
    };
  }

  // Notable: significant lobbying on related committees
  if (hasLobbying) {
    const amt = formatDollars(data.relatedLobbyingSpending);
    return {
      text: `No notable funding connection between the sponsor and related industries. ${data.relatedLobbyingOrgs} organizations spent ${amt} lobbying the committees this bill was referred to.`,
      notable: true,
    };
  }

  // Not notable: no meaningful connections found
  return {
    text: `No notable funding connections found between this bill's sponsors and the ${data.affectedSectors.slice(0, 3).join(', ')} ${data.affectedSectors.length === 1 ? 'sector' : 'sectors'} it affects.`,
    notable: false,
  };
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

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
        <div className="h-6 bg-gray-200 border-2 border-gray-300 w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 border-2 border-gray-300 w-5/6 mb-2" />
        <div className="h-4 bg-gray-200 border-2 border-gray-300 w-4/6" />
      </div>
    );
  }

  if (!data?.billId) {
    return null;
  }

  const headline = getHeadline(data);
  const sponsorPct = data.sponsorAnalysis?.sectorDonationPercentage ?? 0;
  const cosponsorPct = data.cosponsorSummary.avgSectorDonationPercentage;
  const hasLobbying = data.relatedLobbyingSpending > 0;
  const showDetails = headline.notable;

  return (
    <div className="bg-white border-2 border-black p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="aicher-heading type-lg text-gray-900">Funding & Lobbying</h3>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      {/* Headline finding */}
      <p className="type-base text-gray-900 leading-relaxed mb-4">{headline.text}</p>

      {/* Detailed breakdown — only when there's something worth showing */}
      {showDetails && (
        <div className="border-2 border-gray-200 p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.sponsorAnalysis && sponsorPct > 0 && (
              <div>
                <div className="aicher-heading type-2xl text-gray-900">
                  {sponsorPct.toFixed(1)}%
                </div>
                <div className="type-xs text-gray-500">
                  of {data.sponsorAnalysis.name}&apos;s funding from related industries
                </div>
              </div>
            )}

            {data.cosponsorSummary.analyzedCosponsors > 0 && cosponsorPct > 0 && (
              <div>
                <div className="aicher-heading type-2xl text-gray-900">
                  {cosponsorPct.toFixed(1)}%
                </div>
                <div className="type-xs text-gray-500">
                  average across {data.cosponsorSummary.analyzedCosponsors} cosponsors
                </div>
              </div>
            )}

            {hasLobbying && (
              <div>
                <div className="aicher-heading type-2xl text-gray-900">
                  {formatDollars(data.relatedLobbyingSpending)}
                </div>
                <div className="type-xs text-gray-500">
                  lobbying by {data.relatedLobbyingOrgs} organizations on related committees
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sector context — inline, not prominent */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="type-xs text-gray-400">Related sectors:</span>
        {data.affectedSectors.slice(0, 6).map(sector => (
          <span key={sector} className="border-2 border-gray-200 px-2 py-0.5 type-xs text-gray-500">
            {sector}
          </span>
        ))}
      </div>

      {/* AI narrative — the full explanation */}
      <p className="type-sm text-gray-600 leading-relaxed">{data.narrative}</p>

      {/* Date */}
      <p className="type-xs text-gray-400 mt-3">
        Analysis based on data through{' '}
        {new Date(data.dataAsOf).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>

      {/* Disclaimer + methodology */}
      <InsightDisclaimer
        disclaimer={data.disclaimer}
        methodology={data.methodology}
        source={data.source}
      />
    </div>
  );
}

export default BillIntelligenceSection;

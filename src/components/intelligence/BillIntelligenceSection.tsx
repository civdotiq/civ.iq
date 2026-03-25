/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { ConfidenceBadge } from './ConfidenceBadge';
import { InsightDisclaimer } from './InsightDisclaimer';
import { displaySector } from '@/lib/mesh/sector-display';
import type { BillIntelligenceInsight } from '@/lib/intelligence/types';

interface BillIntelligenceSectionProps {
  billId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

/**
 * Determines the headline finding from the data.
 * Priority: vote+funding > committee+funding > lobbying > no connection.
 */
function getHeadline(data: BillIntelligenceInsight): {
  text: string;
  notable: boolean;
} {
  const sponsorPct = data.sponsorAnalysis?.sectorDonationPercentage ?? 0;
  const cosponsorPct = data.cosponsorSummary.avgSectorDonationPercentage;
  const hasLobbying = data.relatedLobbyingSpending > 0;
  const sponsorName = data.sponsorAnalysis?.name ?? 'the sponsor';
  const hasVote = !!data.voteOutcome;
  const onCommittee = data.sponsorCommitteeConnection?.connected;

  // Notable: vote result + funding connection
  if (hasVote && sponsorPct >= 5) {
    const v = data.voteOutcome!;
    const voteDesc = v.partyLine
      ? 'along party lines'
      : v.bipartisan
        ? 'with bipartisan support'
        : '';
    return {
      text: `This bill ${v.result.toLowerCase()} in the ${v.chamber} ${v.yea}-${v.nay}${voteDesc ? ' ' + voteDesc : ''}. ${sponsorPct.toFixed(1)}% of ${sponsorName}'s funding comes from related industries.`,
      notable: true,
    };
  }

  // Notable: sponsor on committee + funding context
  if (onCommittee && data.sponsorAnalysis) {
    const totalContext = data.sponsorFundingContext
      ? ` out of ${formatDollars(data.sponsorFundingContext.totalRaised)} total raised`
      : '';
    const amt = formatDollars(data.sponsorAnalysis.sectorDonationAmount);
    return {
      text: `${sponsorName} introduced this bill and sits on the ${data.sponsorCommitteeConnection?.committeeName ?? 'relevant committee'}, which oversees it. ${sponsorName} received ${amt} from related industries${totalContext}.`,
      notable: true,
    };
  }

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
    const orgDetail = data.topLobbyingOrgs?.length ? `, led by ${data.topLobbyingOrgs[0]}` : '';
    return {
      text: `No notable funding connection between the sponsor and related industries. ${data.relatedLobbyingOrgs} organizations spent ${amt} lobbying related committees${orgDetail}.`,
      notable: true,
    };
  }

  // Not notable: no meaningful connections found
  return {
    text: `No notable funding connections found between this bill's sponsors and the ${data.affectedSectors.slice(0, 3).map(displaySector).join(', ')} ${data.affectedSectors.length === 1 ? 'sector' : 'sectors'} it affects.`,
    notable: false,
  };
}

function getSectorConfidenceStyles(confidence: number): string {
  if (confidence >= 0.65) return 'border-gray-900 text-gray-900';
  if (confidence >= 0.45) return 'border-gray-400 text-gray-600';
  return 'border-gray-300 text-gray-400';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.65) return 'Strong match';
  if (confidence >= 0.45) return 'Likely match';
  return 'Possible match';
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

      {/* Vote result bar — when vote data is available */}
      {data.voteOutcome && <VoteResultBar vote={data.voteOutcome} />}

      {/* Sponsor-committee badge */}
      {data.sponsorCommitteeConnection?.connected && (
        <div className="flex items-center gap-2 mb-4">
          <span className="border-2 border-gray-900 px-2 py-0.5 type-xs aicher-heading">
            ON COMMITTEE
          </span>
          <span className="type-xs text-gray-600">
            Sponsor sits on {data.sponsorCommitteeConnection.committeeName}
            {data.sponsorCommitteeConnection.sponsorRole
              ? ` as ${data.sponsorCommitteeConnection.sponsorRole}`
              : ''}
          </span>
        </div>
      )}

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
                  {data.sponsorFundingContext && (
                    <> ({formatDollars(data.sponsorFundingContext.totalRaised)} total)</>
                  )}
                </div>
              </div>
            )}

            {data.cosponsorSummary.analyzedCosponsors > 0 && cosponsorPct > 0 && (
              <div>
                <div className="aicher-heading type-2xl text-gray-900">
                  {cosponsorPct.toFixed(1)}%
                </div>
                <div className="type-xs text-gray-500">
                  average across {data.cosponsorSummary.analyzedCosponsors}{' '}
                  {data.bipartisanCosponsorship ? 'bipartisan ' : ''}cosponsors
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
        {data.classifiedSectors && data.classifiedSectors.length > 0
          ? data.classifiedSectors.slice(0, 6).map(cs => {
              const styles = getSectorConfidenceStyles(cs.confidence);
              return (
                <span
                  key={cs.sector}
                  className={`border-2 px-2 py-0.5 type-xs ${styles}`}
                  aria-label={`${displaySector(cs.sector)}: ${getConfidenceLabel(cs.confidence)}`}
                >
                  {displaySector(cs.sector)}
                </span>
              );
            })
          : data.affectedSectors.slice(0, 6).map(sector => (
              <span
                key={sector}
                className="border-2 border-gray-200 px-2 py-0.5 type-xs text-gray-500"
              >
                {displaySector(sector)}
              </span>
            ))}
      </div>
      {data.classifiedSectors && data.classifiedSectors.length > 0 && (
        <p className="type-xs text-gray-400 mb-4">
          We identified these sectors by analyzing the bill&apos;s text. Darker labels indicate a
          stronger match.
        </p>
      )}

      {/* AI narrative — the full explanation */}
      <p className="type-sm text-gray-600 leading-relaxed">{data.narrative}</p>

      {/* Lobbying Language Similarity */}
      {data.lobbyingSimilarity?.hasStrongMatches && data.lobbyingSimilarity.matches.length > 0 && (
        <div className="mt-4">
          <h4 className="aicher-heading type-sm text-gray-900 mb-2">
            Lobbying Language Similarity
          </h4>
          <p className="type-xs text-gray-500 mb-2">
            This bill&apos;s provisions show semantic overlap with the following lobbying
            disclosures:
          </p>
          <div className="border-2 border-gray-200 divide-y divide-gray-200">
            {data.lobbyingSimilarity.matches
              .filter(m => m.similarity >= 0.55)
              .slice(0, 5)
              .map(match => (
                <div key={match.filingId} className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="type-sm font-medium text-gray-900">
                        {(match.similarity * 100).toFixed(0)}% match
                      </span>
                      <span className="type-sm text-gray-700"> &mdash; {match.client}</span>
                    </div>
                    <span className="type-xs text-gray-400 whitespace-nowrap ml-2">
                      ${match.income.toLocaleString()}
                    </span>
                  </div>
                  <div className="type-xs text-gray-500 mt-1">
                    Filed by: {match.registrant} &middot; {match.period}
                  </div>
                </div>
              ))}
          </div>
          <p className="type-xs text-gray-400 mt-2">
            Similarity measures how closely the bill&apos;s language aligns with lobbying issue
            descriptions. High similarity does not imply the bill was written by lobbyists.
          </p>
        </div>
      )}

      {/* CBO fiscal impact */}
      {data.fiscalImpact && (
        <p className="type-xs text-gray-500 mt-2 border-l-2 border-gray-300 pl-3">
          CBO estimate: {data.fiscalImpact}
        </p>
      )}

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

/**
 * Proportional vote result bar with party breakdown.
 */
function VoteResultBar({ vote }: { vote: NonNullable<BillIntelligenceInsight['voteOutcome']> }) {
  const total = vote.yea + vote.nay;
  if (total === 0) return null;
  const yeaPct = (vote.yea / total) * 100;

  const voteLabel = vote.partyLine ? 'Party-line vote' : vote.bipartisan ? 'Bipartisan vote' : '';

  return (
    <div className="mb-4">
      <div className="flex justify-between type-xs text-gray-500 mb-1">
        <span>Yea {vote.yea}</span>
        <span>
          {vote.result} in {vote.chamber}
          {voteLabel ? ` — ${voteLabel}` : ''}
        </span>
        <span>Nay {vote.nay}</span>
      </div>
      <div className="flex h-3 border-2 border-gray-900 overflow-hidden">
        <div className="bg-[#0a9338]" style={{ width: `${yeaPct}%` }} />
        <div className="bg-[#e11d07]" style={{ width: `${100 - yeaPct}%` }} />
      </div>
    </div>
  );
}

export default BillIntelligenceSection;

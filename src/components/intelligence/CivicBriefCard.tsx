/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { InsightDisclaimer } from './InsightDisclaimer';
import type { CivicBriefInsight, BriefPattern } from '@/lib/intelligence/types';

interface CivicBriefCardProps {
  insight: CivicBriefInsight;
  className?: string;
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

// ── Main Component ───────────────────────────────────────────────────

export function CivicBriefCard({ insight, className = '' }: CivicBriefCardProps) {
  const [expandedFinding, setExpandedFinding] = useState<number | null>(null);
  const [showFullAnalysis, setShowFullAnalysis] = useState(false);

  const { identity, funding, voting, oversight, patterns, summary } = insight;

  // Show top 2 findings above the fold
  const topFindings = patterns.slice(0, 2);
  const additionalFindings = patterns.slice(2);

  // Hide sector bars when top sector is "Other" and > 80% — showing 99% Other is worse than nothing
  const showSectors =
    funding.topSectors.length > 0 &&
    !(funding.topSectors[0]?.sector === 'Other' && (funding.topSectors[0]?.pct ?? 0) > 80);

  const hasFunding = funding.totalRaised !== null || showSectors;
  const hasFullAnalysis =
    voting.totalVotes > 0 ||
    oversight.jurisdictionOverlapScore !== null ||
    oversight.topLobbyingMatches.length > 0 ||
    identity.committees.length > 0 ||
    additionalFindings.length > 0;

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header: name and what they represent */}
      <div className="mb-4">
        <h3 className="aicher-heading type-lg text-gray-900">Civic Brief</h3>
        <p className="type-sm text-gray-500 mt-1 flex flex-wrap gap-x-1">
          <span>{identity.name}</span>
          <span aria-hidden="true">·</span>
          <span>
            {identity.party === 'D'
              ? 'Democrat'
              : identity.party === 'R'
                ? 'Republican'
                : identity.party === 'I' || identity.party === 'ID'
                  ? 'Independent'
                  : identity.party}
          </span>
          <span aria-hidden="true">·</span>
          <span>{identity.chamber}</span>
          <span aria-hidden="true">·</span>
          <span>
            {identity.state}
            {identity.district ? `-${identity.district}` : ''}
          </span>
        </p>
      </div>

      {/* Summary — the hero element. This is what citizens read. */}
      <p className="type-base text-gray-900 leading-relaxed mb-6">{summary}</p>

      {/* Key numbers — quick stats citizens scan */}
      {(funding.totalSpent !== null ||
        funding.cashOnHand !== null ||
        voting.missedVotePct !== null) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {funding.totalSpent !== null && (
            <div className="border-2 border-gray-200 p-3">
              <div className="aicher-heading type-2xl text-gray-900">
                {formatCompact(funding.totalSpent)}
              </div>
              <div className="type-xs text-gray-500 aicher-heading-wide">Spent</div>
            </div>
          )}
          {funding.cashOnHand !== null && (
            <div className="border-2 border-gray-200 p-3">
              <div className="aicher-heading type-2xl text-gray-900">
                {formatCompact(funding.cashOnHand)}
              </div>
              <div className="type-xs text-gray-500 aicher-heading-wide">Cash on hand</div>
            </div>
          )}
          {voting.missedVotePct !== null && (
            <div className="border-2 border-gray-200 p-3">
              <div className="aicher-heading type-2xl text-gray-900">
                {voting.missedVotePct.toFixed(1)}%
              </div>
              <div className="type-xs text-gray-500 aicher-heading-wide">Votes missed</div>
            </div>
          )}
        </div>
      )}

      {/* Key Findings — top 2 only */}
      {topFindings.length > 0 && (
        <div className="mb-6">
          <h4 className="aicher-heading type-sm text-gray-500 mb-3">Key findings</h4>
          {topFindings.map((pattern, i) => (
            <Finding
              key={pattern.type}
              pattern={pattern}
              expanded={expandedFinding === i}
              onToggle={() => setExpandedFinding(expandedFinding === i ? null : i)}
            />
          ))}
        </div>
      )}

      {/* Funding — plain language, no metric walls */}
      {hasFunding && (
        <div className="mb-6">
          <h4 className="aicher-heading type-sm text-gray-500 mb-3">
            Where does the money come from?
          </h4>

          {/* One-line totals */}
          <p className="type-sm text-gray-700 mb-3">
            {funding.totalRaised !== null && <>Raised {formatCompact(funding.totalRaised)}</>}
            {funding.totalRaised !== null && funding.inStatePct !== null && ' · '}
            {funding.inStatePct !== null && (
              <>{funding.inStatePct.toFixed(0)}% from in-state donors</>
            )}
            {(funding.totalRaised !== null || funding.inStatePct !== null) && (
              <span className="text-gray-400"> ({funding.cycle} cycle)</span>
            )}
          </p>

          {/* Sector bars — hidden when data is too vague (e.g. 99% "Other") */}
          {!showSectors && funding.topSectors.length > 0 && (
            <p className="type-xs text-gray-400">
              Detailed funding breakdown unavailable for this representative
            </p>
          )}
          {showSectors && (
            <div className="space-y-1">
              {funding.topSectors.map(s => (
                <div key={s.sector} className="flex items-center gap-2">
                  <span className="type-xs text-gray-600 w-36 sm:w-44 truncate" title={s.sector}>
                    {s.sector}
                  </span>
                  <div
                    className="flex-1 h-2 bg-gray-100 border-2 border-gray-200"
                    role="meter"
                    aria-valuenow={Math.round(s.pct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${s.sector}: ${s.pct.toFixed(0)}%`}
                  >
                    <div
                      className={`h-full ${s.overlapsCommittee ? 'bg-[#d97706]' : 'bg-[#3ea2d4]'}`}
                      style={{ width: `${Math.min(s.pct, 100)}%` }}
                    />
                  </div>
                  <span className="type-xs aicher-heading text-gray-500 w-8 text-right">
                    {s.pct.toFixed(0)}%
                  </span>
                </div>
              ))}
              {funding.topSectors.some(s => s.overlapsCommittee) && (
                <p className="type-xs text-gray-400 mt-1">
                  Highlighted industries fall under topics this representative&apos;s committees
                  oversee
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Full Analysis — collapsed by default */}
      {hasFullAnalysis && (
        <div className="border-t-2 border-gray-100 pt-4">
          <button
            onClick={() => setShowFullAnalysis(prev => !prev)}
            className="type-sm text-[#3ea2d4] aicher-heading py-2 min-h-[44px] inline-flex items-center aicher-focus"
            aria-expanded={showFullAnalysis}
          >
            {showFullAnalysis ? 'Hide full analysis' : 'Show full analysis'}
          </button>

          {showFullAnalysis && (
            <div className="mt-4 space-y-4">
              {/* Additional findings */}
              {additionalFindings.length > 0 && (
                <div>
                  <h4 className="aicher-heading type-xs text-gray-500 mb-2">Additional findings</h4>
                  {additionalFindings.map((pattern, i) => (
                    <Finding
                      key={pattern.type}
                      pattern={pattern}
                      expanded={expandedFinding === i + 2}
                      onToggle={() => setExpandedFinding(expandedFinding === i + 2 ? null : i + 2)}
                    />
                  ))}
                </div>
              )}

              {/* Voting record */}
              {voting.totalVotes > 0 && (
                <div>
                  <h4 className="aicher-heading type-xs text-gray-500 mb-2">Voting record</h4>
                  <p className="type-sm text-gray-700">
                    {voting.totalVotes} votes cast
                    {voting.partyAlignmentPct !== null &&
                      ` · ${voting.partyAlignmentPct.toFixed(0)}% with party`}
                    {voting.billsSponsored > 0 && ` · ${voting.billsSponsored} bills sponsored`}
                    {voting.billsCosponsored > 0 && ` · ${voting.billsCosponsored} cosponsored`}
                  </p>
                </div>
              )}

              {/* Lobbying connections */}
              {oversight.topLobbyingMatches.length > 0 && (
                <div>
                  <h4 className="aicher-heading type-xs text-gray-500 mb-2">
                    Lobbying connections
                  </h4>
                  {oversight.topLobbyingMatches.map((m, i) => (
                    <p key={i} className="type-sm text-gray-700 mb-1">
                      {m.filing} lobbied on issues related to the bill &ldquo;{m.bill}&rdquo;
                      {m.similarity > 0 && (
                        <span className="text-gray-400">
                          {' '}
                          ({(m.similarity * 100).toFixed(0)}% text overlap)
                        </span>
                      )}
                    </p>
                  ))}
                </div>
              )}

              {/* Committees */}
              {identity.committees.length > 0 && (
                <div>
                  <h4 className="aicher-heading type-xs text-gray-500 mb-2">Committees</h4>
                  <div className="flex flex-wrap gap-2">
                    {identity.committees.map(c => (
                      <span
                        key={c.name}
                        className="type-xs border-2 border-gray-200 px-2 py-1 text-gray-700"
                      >
                        {c.name}
                        {c.role !== 'Member' && (
                          <span className="text-gray-500 ml-1">({c.role})</span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sources + disclaimer — always visible but compact */}
      <div className="mt-4 pt-3 border-t-2 border-gray-100">
        {funding.contributionsSampled > 0 && (
          <p className="type-xs text-gray-400 mb-1">
            Based on {funding.contributionsSampled.toLocaleString()} itemized contributions
          </p>
        )}
        <p className="type-xs text-gray-400 mb-1">
          Sources: Congress.gov, FEC.gov, Senate lobbying disclosures
        </p>
        <InsightDisclaimer
          disclaimer={insight.disclaimer}
          methodology={insight.methodology}
          source={insight.source}
          className="border-t-0 mt-0 pt-0"
        />
      </div>
    </div>
  );
}

// ── Finding (single pattern, citizen-friendly) ───────────────────────

function Finding({
  pattern,
  expanded,
  onToggle,
}: {
  pattern: BriefPattern;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className="w-full text-left flex items-start gap-2 py-2 min-h-[44px] aicher-focus"
        aria-expanded={expanded}
      >
        <span className="text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true">
          {expanded ? '−' : '+'}
        </span>
        <span className="type-sm text-gray-900">{pattern.headline}</span>
      </button>
      {expanded && (
        <div className="ml-5 pb-2">
          <p className="type-sm text-gray-600 leading-relaxed">{pattern.detail}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CommitteeLobbyingAnswer — pod renderer for the committee-lobbying question.
 *
 * Pods: Top lobbying organizations, Activity by issue, Bill matches, Sources.
 * Server component. Data from lobbying-pipeline-analyzer.
 */

import Link from 'next/link';
import type { LobbyingPipelineInsight } from '@/lib/intelligence/types';
import type { CommitteeCorpusTotals } from '@/lib/data-sources/lda-corpus/load';

interface CommitteeLobbyingAnswerProps {
  lobbying: LobbyingPipelineInsight | null;
  /** Corpus-backed committee totals (complete Senate LDA corpus); null if absent. */
  corpus?: CommitteeCorpusTotals | null;
  committeeId: string;
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  jurisdiction?: string;
}

function shortQuarter(q: string): string {
  const [year, quarter] = q.split('-');
  return `${quarter} '${year?.slice(2) ?? ''}`;
}

function formatAmount(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

/**
 * Corpus-backed committee total (complete Senate LDA corpus). Restores the
 * dollar figure Phase 0b withheld — that total came from a ~0.1% sample; this
 * one is the full corpus, with a peer baseline and a quarterly trend.
 */
function CorpusTotalPod({ corpus }: { corpus: CommitteeCorpusTotals }) {
  const ratio = corpus.peer.ratioToMedian;
  const maxQuarter = Math.max(...corpus.quarterly.map(q => q.total), 1);
  const first = corpus.quarterly[0]?.quarter;
  const last = corpus.quarterly[corpus.quarterly.length - 1]?.quarter;
  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-1">
        Lobbying spending disclosing this committee
      </h2>
      <p className="type-xs text-gray-400 mb-3">
        Complete Senate LDA corpus{first && last ? ` · ${first}–${last}` : ''} · a filing naming
        several committees counts toward each
      </p>
      <p className="type-2xl font-semibold text-black">{formatAmount(corpus.windowTotal)}</p>
      <p className="type-xs text-gray-500 mt-1">
        {ratio >= 1
          ? `${ratio.toFixed(1)}× the median committee (${formatAmount(corpus.peer.medianTotal)})`
          : `${Math.round(ratio * 100)}% of the median committee (${formatAmount(corpus.peer.medianTotal)})`}
      </p>
      {corpus.quarterly.length > 0 && (
        <div className="flex items-end gap-1 mt-4" style={{ height: 72 }}>
          {corpus.quarterly.map(q => (
            <div key={q.quarter} className="flex-1 flex flex-col items-center min-w-0">
              <div className="w-full flex items-end justify-center" style={{ height: 48 }}>
                <div
                  className="w-full bg-[#3ea2d4]"
                  style={{
                    height: `${Math.max((q.total / maxQuarter) * 100, q.total > 0 ? 4 : 0)}%`,
                  }}
                />
              </div>
              <span className="type-xs text-gray-400 aicher-heading mt-1 truncate max-w-full">
                {shortQuarter(q.quarter)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Sample-based dollar totals are not rendered on the sample pods below: the
// committee analyzer aggregates a ~0.1% sample of LDA filings, so summed amounts
// are misleading. Counts stay; the corpus total above carries the real dollars.
function TopOrgsPod({
  organizations,
}: {
  organizations: LobbyingPipelineInsight['topOrganizations'];
}) {
  if (!organizations.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Top lobbying organizations</h2>
        <p className="type-sm text-gray-500">
          No lobbying activity found for this committee in current Senate LDA filings.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Top lobbying organizations</h2>
      <div className="mb-3">
        <p className="type-xl font-semibold text-black">{organizations.length}</p>
        <p className="type-xs text-gray-500">
          organizations in recent filings mentioning this committee (a sample, not a complete tally)
        </p>
      </div>
      <ul className="divide-y divide-gray-200">
        {organizations.slice(0, 10).map(org => (
          <li key={org.name} className="py-2 first:pt-0 last:pb-0">
            <div className="min-w-0">
              <p className="type-sm text-black truncate">{org.name}</p>
              <p className="type-xs text-gray-500 mt-0.5">
                {org.filingCount} {org.filingCount === 1 ? 'filing' : 'filings'}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ActivityByIssuePod({
  issueAlignments,
}: {
  issueAlignments: LobbyingPipelineInsight['issueAlignments'];
}) {
  if (!issueAlignments.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Activity by issue</h2>
        <p className="type-sm text-gray-500">Issue breakdown is not available.</p>
      </div>
    );
  }

  // Rank issues by organization count rather than sample-based dollar spend.
  const ranked = [...issueAlignments].sort((a, b) => b.organizationCount - a.organizationCount);
  const maxOrgs = ranked[0]?.organizationCount ?? 1;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Activity by issue</h2>
      <ul className="space-y-3">
        {ranked.slice(0, 7).map(alignment => (
          <li key={alignment.issueCode}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="type-sm text-gray-900 truncate mr-2">{alignment.issueLabel}</span>
              <span className="type-xs font-medium text-gray-600 shrink-0">
                {alignment.organizationCount} {alignment.organizationCount === 1 ? 'org' : 'orgs'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 border border-gray-200">
              <div
                className="h-full bg-gray-400"
                style={{
                  width: `${Math.round((alignment.organizationCount / maxOrgs) * 100)}%`,
                }}
              />
            </div>
            {alignment.matchedBills.length > 0 && (
              <p className="type-xs text-gray-400 mt-0.5">
                {alignment.matchedBills.length} related{' '}
                {alignment.matchedBills.length === 1 ? 'bill' : 'bills'}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function BillMatchesPod({
  issueAlignments,
}: {
  issueAlignments: LobbyingPipelineInsight['issueAlignments'];
}) {
  const allBills = issueAlignments.flatMap(a => a.matchedBills);
  const uniqueBills = Array.from(new Map(allBills.map(b => [b.id, b])).values()).slice(0, 8);

  if (!uniqueBills.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Related bills</h2>
        <p className="type-sm text-gray-500">
          No bills matched to lobbied issue areas in recent legislation.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Related bills</h2>
      <ul className="space-y-2">
        {uniqueBills.map(bill => (
          <li key={bill.id}>
            <Link
              href={`/bill/${bill.id}`}
              className="type-sm text-[#3ea2d4] hover:underline line-clamp-2"
            >
              {bill.type.toUpperCase()} {bill.number}: {bill.title}
            </Link>
            <p className="type-xs text-gray-500 mt-0.5">{bill.policyArea}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DisclaimerPod({ disclaimer }: { disclaimer: string }) {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">{disclaimer}</p>
      <p className="type-xs text-gray-500 mt-2">
        Data from{' '}
        <a
          href="https://lda.senate.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Senate LDA disclosures
        </a>{' '}
        and{' '}
        <a
          href="https://www.congress.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Congress.gov
        </a>
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

function LobbyingUnavailablePod({
  committeeName,
  chamber,
  jurisdiction,
}: {
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  jurisdiction?: string;
}) {
  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Lobbying analysis unavailable</h2>
      <p className="type-sm text-gray-700 mb-3">
        No statistically meaningful lobbying pattern was found for the {committeeName} ({chamber})
        in current Senate LDA disclosures.
      </p>
      <div className="border-l-2 border-gray-300 pl-3 mb-3">
        <p className="type-xs text-gray-600 mb-1 font-medium">Why?</p>
        <p className="type-xs text-gray-600 leading-relaxed">
          We only publish lobbying analysis when a committee is explicitly named in at least the
          minimum threshold of recent LDA filings. Many committees fall below this threshold because
          lobbying disclosures list jurisdictions broadly rather than by specific committee, or
          because this committee sees less direct lobbying activity than peer committees.
        </p>
      </div>
      {jurisdiction && (
        <div className="border-l-2 border-gray-300 pl-3">
          <p className="type-xs text-gray-600 mb-1 font-medium">Committee jurisdiction</p>
          <p className="type-xs text-gray-700 leading-relaxed">{jurisdiction}</p>
        </div>
      )}
    </div>
  );
}

function ExploreRelatedPod({ committeeId }: { committeeId: string }) {
  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Explore this committee</h2>
      <ul className="space-y-2">
        <li>
          <Link
            href={`/ask/committee-members/${committeeId}`}
            className="type-sm text-[#3ea2d4] hover:underline"
          >
            Who sits on this committee?
          </Link>
          <p className="type-xs text-gray-500">Leadership, members, and subcommittees</p>
        </li>
        <li>
          <Link
            href={`/ask/committee-activity/${committeeId}`}
            className="type-sm text-[#3ea2d4] hover:underline"
          >
            What is this committee working on?
          </Link>
          <p className="type-xs text-gray-500">Recent hearings and bills in committee</p>
        </li>
        <li>
          <Link
            href={`/committee/${committeeId}`}
            className="type-sm text-[#3ea2d4] hover:underline"
          >
            Full committee profile
          </Link>
          <p className="type-xs text-gray-500">All committee data and activity</p>
        </li>
      </ul>
    </div>
  );
}

function FallbackSourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        This analysis uses real lobbying disclosure data — no synthetic or placeholder values are
        shown. When fewer than the minimum threshold of filings reference a committee, we show this
        unavailable state rather than a misleading partial picture.
      </p>
      <p className="type-xs text-gray-500 mt-2">
        Data sources:{' '}
        <a
          href="https://lda.senate.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Senate LDA disclosures
        </a>{' '}
        and{' '}
        <a
          href="https://www.congress.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Congress.gov
        </a>
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function CommitteeLobbyingAnswer({
  lobbying,
  corpus,
  committeeId,
  committeeName,
  chamber,
  jurisdiction,
}: CommitteeLobbyingAnswerProps) {
  // The corpus total shows whenever the corpus has this committee — including
  // the common case where the sample-based insight is unavailable.
  const corpusPod = corpus ? <CorpusTotalPod corpus={corpus} /> : null;

  if (!lobbying) {
    return (
      <>
        {corpusPod}
        <LobbyingUnavailablePod
          committeeName={committeeName}
          chamber={chamber}
          jurisdiction={jurisdiction}
        />
        <ExploreRelatedPod committeeId={committeeId} />
        <FallbackSourcesPod />
      </>
    );
  }

  return (
    <>
      {corpusPod}
      <TopOrgsPod organizations={lobbying.topOrganizations} />
      <ActivityByIssuePod issueAlignments={lobbying.issueAlignments} />
      <BillMatchesPod issueAlignments={lobbying.issueAlignments} />
      <DisclaimerPod disclaimer={lobbying.disclaimer} />
    </>
  );
}

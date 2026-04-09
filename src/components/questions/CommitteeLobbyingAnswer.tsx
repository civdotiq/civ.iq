/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CommitteeLobbyingAnswer — pod renderer for the committee-lobbying question.
 *
 * Pods: Top lobbying organizations, Spending by issue, Bill matches, Sources.
 * Server component. Data from lobbying-pipeline-analyzer.
 */

import Link from 'next/link';
import type { LobbyingPipelineInsight } from '@/lib/intelligence/types';

interface CommitteeLobbyingAnswerProps {
  lobbying: LobbyingPipelineInsight | null;
}

function formatAmount(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function TopOrgsPod({
  organizations,
  totalSpending,
}: {
  organizations: LobbyingPipelineInsight['topOrganizations'];
  totalSpending: number;
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
        <p className="type-xs text-gray-500">Total lobbying spending mentioning this committee</p>
        <p className="type-xl font-semibold text-black">{formatAmount(totalSpending)}</p>
        <p className="type-xs text-gray-400">{organizations.length} organizations</p>
      </div>
      <ul className="divide-y divide-gray-200">
        {organizations.slice(0, 10).map(org => (
          <li key={org.name} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-baseline gap-3">
              <div className="min-w-0 flex-1">
                <p className="type-sm text-black truncate">{org.name}</p>
                <p className="type-xs text-gray-500 mt-0.5">
                  {org.filingCount} {org.filingCount === 1 ? 'filing' : 'filings'}
                </p>
              </div>
              <span className="type-sm font-medium text-black shrink-0">
                {formatAmount(org.totalSpending)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpendingByIssuePod({
  issueAlignments,
}: {
  issueAlignments: LobbyingPipelineInsight['issueAlignments'];
}) {
  if (!issueAlignments.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Spending by issue</h2>
        <p className="type-sm text-gray-500">Issue breakdown is not available.</p>
      </div>
    );
  }

  const maxSpending = issueAlignments[0]?.lobbyingSpending ?? 1;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Spending by issue</h2>
      <ul className="space-y-3">
        {issueAlignments.slice(0, 7).map(alignment => (
          <li key={alignment.issueCode}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="type-sm text-gray-900 truncate mr-2">{alignment.issueLabel}</span>
              <span className="type-xs font-medium text-gray-600 shrink-0">
                {formatAmount(alignment.lobbyingSpending)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 border border-gray-200">
              <div
                className="h-full bg-gray-400"
                style={{
                  width: `${Math.round((alignment.lobbyingSpending / maxSpending) * 100)}%`,
                }}
              />
            </div>
            <p className="type-xs text-gray-400 mt-0.5">
              {alignment.organizationCount} {alignment.organizationCount === 1 ? 'org' : 'orgs'}
              {alignment.matchedBills.length > 0 &&
                ` · ${alignment.matchedBills.length} related ${alignment.matchedBills.length === 1 ? 'bill' : 'bills'}`}
            </p>
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

export function CommitteeLobbyingAnswer({ lobbying }: CommitteeLobbyingAnswerProps) {
  if (!lobbying) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Lobbying activity</h2>
        <p className="type-sm text-gray-500">
          Lobbying analysis is not available for this committee. This may be because insufficient
          lobbying filings reference this committee in current Senate LDA disclosures.
        </p>
        <p className="type-xs text-gray-400 mt-2">
          Data from{' '}
          <a
            href="https://lda.senate.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3ea2d4] hover:underline"
          >
            Senate LDA disclosures
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <>
      <TopOrgsPod
        organizations={lobbying.topOrganizations}
        totalSpending={lobbying.totalSpending}
      />
      <SpendingByIssuePod issueAlignments={lobbying.issueAlignments} />
      <BillMatchesPod issueAlignments={lobbying.issueAlignments} />
      <DisclaimerPod disclaimer={lobbying.disclaimer} />
    </>
  );
}

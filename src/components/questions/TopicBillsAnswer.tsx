/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * TopicBillsAnswer — pod renderer for the topic-bills question.
 *
 * Pods: Recent Bills, Regulations, Related Committees, Spending Overview, Sources.
 * Server component. Data from cross-domain policy area search.
 */

import Link from 'next/link';
import type { PolicyAreaResults } from '@/types/joins';

interface TopicBillsAnswerProps {
  results: PolicyAreaResults;
}

function RecentBillsPod({ bills }: { bills: PolicyAreaResults['bills'] }) {
  if (!bills.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Recent bills</h2>
        <p className="type-sm text-gray-500">
          No bills found for this policy area in the current Congress.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Recent bills</h2>
      <ul className="divide-y divide-gray-200">
        {bills.slice(0, 10).map(bill => (
          <li key={bill.id} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/bill/${bill.id}`}
                  className="type-sm text-[#3ea2d4] hover:underline line-clamp-2"
                >
                  {bill.title}
                </Link>
                <p className="type-xs text-gray-500 mt-0.5">
                  {new Date(bill.introducedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <span className="type-xs text-gray-500 shrink-0">{bill.status}</span>
            </div>
          </li>
        ))}
      </ul>
      {bills.length > 10 && (
        <p className="type-xs text-gray-500 mt-3">Showing 10 of {bills.length} bills.</p>
      )}
    </div>
  );
}

function RegulationsPod({ regulations }: { regulations: PolicyAreaResults['regulations'] }) {
  if (!regulations.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Federal regulations</h2>
        <p className="type-sm text-gray-500">No recent regulations found for this policy area.</p>
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    final_rule: 'Final rule',
    proposed_rule: 'Proposed rule',
    notice: 'Notice',
  };

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Federal regulations</h2>
      <ul className="space-y-3">
        {regulations.slice(0, 5).map(reg => (
          <li key={reg.id}>
            <a
              href={reg.url}
              target="_blank"
              rel="noopener noreferrer"
              className="type-sm text-[#3ea2d4] hover:underline line-clamp-2"
            >
              {reg.title}
            </a>
            <p className="type-xs text-gray-500 mt-0.5">
              {typeLabels[reg.type] ?? reg.type} · {reg.agency}
              {reg.publishedDate && (
                <>
                  {' · '}
                  {new Date(reg.publishedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommitteesPod({ committees }: { committees: PolicyAreaResults['committees'] }) {
  if (!committees.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Oversight committees</h2>
        <p className="type-sm text-gray-500">
          No oversight committees identified for this policy area.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Oversight committees</h2>
      <ul className="space-y-2">
        {committees.map(c => (
          <li key={c.code} className="flex items-baseline gap-2">
            <span className="type-xs text-gray-400 shrink-0 w-12">{c.chamber}</span>
            <Link href={`/committee/${c.code}`} className="type-sm text-[#3ea2d4] hover:underline">
              {c.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpendingPod({ spending }: { spending: PolicyAreaResults['spending'] }) {
  if (!spending.totalAmount && !spending.topAgencies.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Federal spending</h2>
        <p className="type-sm text-gray-500">
          Spending data is not available for this policy area.
        </p>
      </div>
    );
  }

  const formatAmount = (n: number) => {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toLocaleString()}`;
  };

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Federal spending</h2>
      {spending.totalAmount > 0 && (
        <div className="mb-3">
          <p className="type-xs text-gray-500">Total awards (current fiscal year)</p>
          <p className="type-xl font-semibold text-black">{formatAmount(spending.totalAmount)}</p>
        </div>
      )}
      {spending.topAgencies.length > 0 && (
        <>
          <p className="type-xs text-gray-500 mb-2">Top agencies</p>
          <ul className="space-y-1">
            {spending.topAgencies.map(a => (
              <li key={a.name} className="flex justify-between items-baseline">
                <span className="type-sm text-gray-900 truncate mr-2">{a.name}</span>
                <span className="type-xs text-gray-500 shrink-0">{formatAmount(a.amount)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function SourcesPod({ dataSources }: { dataSources: string[] }) {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Data from{' '}
        {dataSources.map((source, i) => (
          <span key={source}>
            {i > 0 && (i === dataSources.length - 1 ? ', and ' : ', ')}
            <a
              href={`https://www.${source}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] hover:underline"
            >
              {source}
            </a>
          </span>
        ))}
        .{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function TopicBillsAnswer({ results }: TopicBillsAnswerProps) {
  return (
    <>
      <RecentBillsPod bills={results.bills} />
      <RegulationsPod regulations={results.regulations} />
      <CommitteesPod committees={results.committees} />
      <SpendingPod spending={results.spending} />
      <SourcesPod dataSources={results.metadata.dataSources} />
    </>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * BillsSponsoredAnswer — pod renderer for the bills-sponsored question.
 *
 * Pods: Sponsored bills list, Legislation stats, Policy areas, Sources.
 * Server component. All data passed as typed props from the page.
 */

import Link from 'next/link';

interface BillItem {
  id: string;
  number: string;
  title: string;
  introducedDate: string;
  status: string;
  policyArea?: string;
  relationship: 'sponsored' | 'cosponsored';
}

interface BillsSponsoredAnswerProps {
  bills: BillItem[];
  sponsoredCount: number;
  cosponsoredCount: number;
}

function SponsoredBillsPod({ bills }: { bills: BillItem[] }) {
  const sponsored = bills.filter(b => b.relationship === 'sponsored').slice(0, 10);

  if (!sponsored.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Sponsored bills</h2>
        <p className="type-sm text-gray-500">
          No sponsored legislation found for this representative in the current Congress.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Sponsored bills</h2>
      <ul className="divide-y divide-gray-200">
        {sponsored.map(bill => (
          <li key={bill.id} className="py-2 first:pt-0 last:pb-0">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/bill/${bill.id}`}
                  className="type-sm text-[#3ea2d4] hover:underline line-clamp-1"
                >
                  {bill.number}: {bill.title}
                </Link>
                <p className="type-xs text-gray-500 mt-0.5">
                  {new Date(bill.introducedDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                  {bill.policyArea && <span className="ml-2 text-gray-400">{bill.policyArea}</span>}
                </p>
              </div>
              <span className="type-xs text-gray-500 shrink-0">{bill.status}</span>
            </div>
          </li>
        ))}
      </ul>
      {bills.filter(b => b.relationship === 'sponsored').length > 10 && (
        <p className="type-xs text-gray-500 mt-3">
          Showing 10 of {bills.filter(b => b.relationship === 'sponsored').length} sponsored bills.
        </p>
      )}
    </div>
  );
}

function LegislationStatsPod({
  sponsoredCount,
  cosponsoredCount,
}: {
  sponsoredCount: number;
  cosponsoredCount: number;
}) {
  if (sponsoredCount === 0 && cosponsoredCount === 0) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Legislation stats</h2>
        <p className="type-sm text-gray-500">No legislation data available.</p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Legislation stats</h2>
      <dl className="space-y-3">
        <div>
          <dt className="type-xs text-gray-500">Bills sponsored</dt>
          <dd className="type-xl font-semibold text-black">{sponsoredCount}</dd>
        </div>
        <div>
          <dt className="type-xs text-gray-500">Bills cosponsored</dt>
          <dd className="type-lg font-semibold text-black">{cosponsoredCount}</dd>
        </div>
        <div>
          <dt className="type-xs text-gray-500">Total legislation</dt>
          <dd className="type-base font-medium text-gray-900">
            {sponsoredCount + cosponsoredCount}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function PolicyAreasPod({ bills }: { bills: BillItem[] }) {
  const areaCounts = new Map<string, number>();
  for (const bill of bills) {
    if (bill.policyArea) {
      areaCounts.set(bill.policyArea, (areaCounts.get(bill.policyArea) ?? 0) + 1);
    }
  }

  const sorted = [...areaCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (!sorted.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Policy areas</h2>
        <p className="type-sm text-gray-500">Policy area data is not available for these bills.</p>
      </div>
    );
  }

  const maxCount = sorted[0]?.[1] ?? 1;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Policy areas</h2>
      <ul className="space-y-3">
        {sorted.map(([area, count]) => (
          <li key={area}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="type-sm text-gray-900 truncate mr-2">{area}</span>
              <span className="type-xs font-medium text-gray-600 shrink-0">
                {count} {count === 1 ? 'bill' : 'bills'}
              </span>
            </div>
            <div className="h-2 bg-gray-100 border border-gray-200">
              <div
                className="h-full bg-gray-400"
                style={{ width: `${Math.round((count / maxCount) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Legislation data from{' '}
        <a href="https://www.congress.gov" className="text-[#3ea2d4] hover:underline">
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

export function BillsSponsoredAnswer({
  bills,
  sponsoredCount,
  cosponsoredCount,
}: BillsSponsoredAnswerProps) {
  return (
    <>
      <SponsoredBillsPod bills={bills} />
      <LegislationStatsPod sponsoredCount={sponsoredCount} cosponsoredCount={cosponsoredCount} />
      <PolicyAreasPod bills={bills} />
      <SourcesPod />
    </>
  );
}

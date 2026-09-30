'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * The hub's browser-loaded extras: recent bills, statewide executives and the
 * judiciary. Each reads a robots-blocked /api/ route, so these load for
 * visitors and never for a crawler rendering the page.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StateExecutivesTab } from '@/features/state-government/components/StateExecutivesTab';
import { StateJudiciaryTab } from '@/features/state-government/components/StateJudiciaryTab';
import { encodeBase64Url } from '@/lib/url-encoding';

interface RecentBill {
  id: string;
  billNumber: string;
  title: string;
  sponsor?: { name?: string };
  lastActionDate?: string;
}

type Tab = 'bills' | 'executives' | 'judiciary';

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'bills', label: 'Recent bills' },
  { key: 'executives', label: 'Executives' },
  { key: 'judiciary', label: 'Judiciary' },
];

export function StateGovernmentTabs({ stateCode }: { stateCode: string }) {
  const [tab, setTab] = useState<Tab>('bills');

  return (
    <section aria-label="More state government">
      <div role="tablist" className="flex flex-wrap border-b-2 border-gray-300 mb-6">
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            type="button"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 min-h-[44px] text-sm font-medium -mb-[2px] border-b-[3px] ${
              tab === t.key
                ? 'border-civiq-blue text-gray-900'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'bills' && <RecentBills stateCode={stateCode} />}
        {tab === 'executives' && <StateExecutivesTab state={stateCode.toLowerCase()} />}
        {tab === 'judiciary' && <StateJudiciaryTab state={stateCode.toLowerCase()} />}
      </div>
    </section>
  );
}

function RecentBills({ stateCode }: { stateCode: string }) {
  const [bills, setBills] = useState<RecentBill[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/state-bills/${stateCode}?limit=10`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((data: { bills?: RecentBill[] }) => {
        if (!cancelled) setBills(Array.isArray(data.bills) ? data.bills : []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [stateCode]);

  if (failed) {
    return <p className="text-sm text-gray-600">Recent bills are unavailable right now.</p>;
  }
  if (!bills) {
    return <p className="text-sm text-gray-600">Loading recent bills…</p>;
  }
  if (bills.length === 0) {
    return <p className="text-sm text-gray-600">No recent bills found for this session.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-gray-200">
        {bills.slice(0, 8).map(bill => (
          <li key={bill.id} className="py-3">
            <Link
              href={`/state-bills/${stateCode.toLowerCase()}/${encodeBase64Url(bill.id)}`}
              className="font-medium text-civiq-blue hover:underline"
            >
              {bill.billNumber}
            </Link>
            <p className="text-sm text-gray-700 mt-1">{bill.title}</p>
            <p className="text-xs text-gray-500 mt-1">
              {bill.sponsor?.name ? `Sponsor: ${bill.sponsor.name}` : null}
              {bill.sponsor?.name && bill.lastActionDate ? ' · ' : null}
              {bill.lastActionDate
                ? `Last action ${new Date(bill.lastActionDate).toLocaleDateString('en-US', { timeZone: 'UTC' })}`
                : null}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href={`/state-bills/${stateCode.toLowerCase()}`}
        className="inline-block mt-4 text-sm font-medium text-civiq-blue hover:underline"
      >
        All {stateCode} bills →
      </Link>
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CampaignContributionsAnswer — pod renderer for the campaign-contributions question.
 *
 * Pods: Top industries, Funding summary, Vote-finance correlation, Sources.
 * Server component. All data passed as typed props from the page.
 */

import { InsightCard } from '@/components/intelligence/InsightCard';
import Link from 'next/link';
import { displaySector } from '@/lib/mesh/sector-display';
import type { VoteFinanceInsight, InsightResponse } from '@/lib/intelligence/types';

interface IndustryItem {
  industry: string;
  amount: number;
  percentage: number;
  contributionCount: number;
}

interface FinanceData {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  industryBreakdown?: Array<{ sector: string; amount: number; percentage: number }>;
}

interface IndustryData {
  topIndustries: IndustryItem[];
  metadata?: { cycle?: number; lastUpdated?: string };
}

interface CampaignContributionsAnswerProps {
  finance: FinanceData | null;
  industries: IndustryData | null;
  voteFinanceInsight: InsightResponse<VoteFinanceInsight> | null;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/** Categories that aren't real industries — exclude from top-industries display */
const NON_INDUSTRY_CATEGORIES = new Set(['Other/Unknown', 'Unknown', 'Not Employed']);

function TopIndustriesPod({ industries }: { industries: IndustryData | null }) {
  if (!industries?.topIndustries?.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Top industries</h2>
        <p className="type-sm text-gray-500">
          Industry breakdown is not yet available for this representative.
        </p>
      </div>
    );
  }

  const classified = industries.topIndustries.filter(i => !NON_INDUSTRY_CATEGORIES.has(i.industry));
  const unclassified = industries.topIndustries.filter(i =>
    NON_INDUSTRY_CATEGORIES.has(i.industry)
  );
  const unclassifiedTotal = unclassified.reduce((sum, i) => sum + i.amount, 0);
  const totalAmount = industries.topIndustries.reduce((sum, i) => sum + i.amount, 0);
  const unclassifiedPct = totalAmount > 0 ? Math.round((unclassifiedTotal / totalAmount) * 100) : 0;

  const top5 = classified.slice(0, 5);
  const maxAmount = top5[0]?.amount ?? 1;

  if (!top5.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Top industries</h2>
        <p className="type-sm text-gray-500">
          Most contributions lack employer data in FEC filings, so industry breakdown is
          unavailable.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Top industries</h2>
      <ul className="space-y-3">
        {top5.map(item => (
          <li key={item.industry}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="type-sm text-gray-900 truncate mr-2">
                {displaySector(item.industry)}
              </span>
              <span className="type-sm font-medium text-gray-900 shrink-0">
                {formatCurrency(item.amount)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 border border-gray-200">
              <div
                className="h-full bg-gray-400"
                style={{ width: `${Math.round((item.amount / maxAmount) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {unclassifiedPct > 0 && (
        <p className="type-xs text-gray-500 mt-3">
          {formatCurrency(unclassifiedTotal)} ({unclassifiedPct}%) of contributions lack employer
          data in FEC filings and could not be classified by industry.
        </p>
      )}
    </div>
  );
}

function FundingSummaryPod({ finance }: { finance: FinanceData | null }) {
  if (!finance || finance.totalRaised === 0) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Funding summary</h2>
        <p className="type-sm text-gray-500">
          Campaign finance data is not yet available for this representative.
        </p>
      </div>
    );
  }

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Funding summary</h2>
      <dl className="space-y-3">
        <div>
          <dt className="type-xs text-gray-500">Total raised</dt>
          <dd className="type-xl font-semibold text-black">
            {formatCurrency(finance.totalRaised)}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="type-xs text-gray-500">Total spent</dt>
            <dd className="type-base font-medium text-gray-900">
              {formatCurrency(finance.totalSpent)}
            </dd>
          </div>
          <div>
            <dt className="type-xs text-gray-500">Cash on hand</dt>
            <dd className="type-base font-medium text-gray-900">
              {formatCurrency(finance.cashOnHand)}
            </dd>
          </div>
        </div>
      </dl>
    </div>
  );
}

function VoteFinanceCorrelationPod({
  insight,
}: {
  insight: InsightResponse<VoteFinanceInsight> | null;
}) {
  if (!insight?.data) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Vote-finance correlation</h2>
        <p className="type-sm text-gray-500">
          Vote-finance analysis is not yet available for this representative. This analysis requires
          sufficient voting and contribution data to detect patterns.
        </p>
      </div>
    );
  }

  const data = insight.data;
  const keyStats = [
    ...(data.overallCorrelation !== null
      ? [{ label: 'Overall correlation', value: `${(data.overallCorrelation * 100).toFixed(1)}%` }]
      : []),
    { label: 'Sectors analyzed', value: String(data.correlations.length) },
  ];

  return (
    <div className="lg:col-span-2">
      <InsightCard title="Vote-finance correlation" insight={data} keyStats={keyStats} />
    </div>
  );
}

function SourcesPod() {
  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Campaign finance data from{' '}
        <a href="https://www.fec.gov" className="text-[#3ea2d4] hover:underline">
          FEC.gov
        </a>
        . Intelligence analysis powered by statistical methods.{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function CampaignContributionsAnswer({
  finance,
  industries,
  voteFinanceInsight,
}: CampaignContributionsAnswerProps) {
  return (
    <>
      <TopIndustriesPod industries={industries} />
      <FundingSummaryPod finance={finance} />
      <VoteFinanceCorrelationPod insight={voteFinanceInsight} />
      <SourcesPod />
    </>
  );
}

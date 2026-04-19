/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CampaignContributionsAnswer — pod renderer for the campaign-contributions question.
 *
 * Pods: Funding summary (with source breakdown), Top industries, Vote-finance
 * correlation (only when data exists), Sources.
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
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateSelfFunding: number;
}

interface IndustryData {
  topIndustries: IndustryItem[];
  analyzedTotal: number;
  unattributedTotal: number;
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

  const { totalRaised, totalSpent, cashOnHand } = finance;
  const sourceSum =
    finance.individualContributions +
    finance.pacContributions +
    finance.partyContributions +
    finance.candidateSelfFunding;
  const otherReceipts = Math.max(0, totalRaised - sourceSum);

  const sources: Array<{ label: string; amount: number; note?: string }> = [
    { label: 'Individual donors', amount: finance.individualContributions },
    { label: 'PACs', amount: finance.pacContributions },
    { label: 'Political parties', amount: finance.partyContributions },
    { label: 'Self-funding', amount: finance.candidateSelfFunding },
  ];
  if (otherReceipts > totalRaised * 0.01) {
    sources.push({
      label: 'Other receipts',
      amount: otherReceipts,
      note: 'Transfers from other committees, refunds, interest, and other non-contribution receipts.',
    });
  }

  const pct = (amount: number): number =>
    totalRaised > 0 ? Math.round((amount / totalRaised) * 100) : 0;

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Funding summary</h2>
      <dl className="space-y-3">
        <div>
          <dt className="type-xs text-gray-500">Total raised</dt>
          <dd className="type-xl font-semibold text-black">{formatCurrency(totalRaised)}</dd>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <dt className="type-xs text-gray-500">Total spent</dt>
            <dd className="type-base font-medium text-gray-900">{formatCurrency(totalSpent)}</dd>
          </div>
          <div>
            <dt className="type-xs text-gray-500">Cash on hand</dt>
            <dd className="type-base font-medium text-gray-900">{formatCurrency(cashOnHand)}</dd>
          </div>
        </div>
      </dl>
      <div className="mt-5 pt-4 border-t border-gray-200">
        <p className="type-xs text-gray-500 mb-3">Where the money came from</p>
        <ul className="space-y-2">
          {sources.map(s => (
            <li key={s.label} className="flex justify-between items-baseline">
              <span className="type-sm text-gray-700">{s.label}</span>
              <span className="type-sm text-gray-900">
                <span className="font-medium">{formatCurrency(s.amount)}</span>
                <span className="text-gray-500 ml-2">({pct(s.amount)}%)</span>
              </span>
            </li>
          ))}
        </ul>
        {sources.some(s => s.label === 'Other receipts' && pct(s.amount) >= 20) && (
          <p className="type-xs text-gray-500 mt-3">
            &ldquo;Other receipts&rdquo; in FEC candidate totals covers transfers from other
            committees the candidate controls, offsets to operating expenditures, refunded
            contributions, and interest — not itemized donor activity. FEC&apos;s itemized filings
            hold the detail.
          </p>
        )}
      </div>
    </div>
  );
}

function TopIndustriesPod({ industries }: { industries: IndustryData | null }) {
  if (!industries?.topIndustries?.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6">
        <h2 className="type-sm font-semibold text-black mb-3">Top industries</h2>
        <p className="type-sm text-gray-500">
          Most itemized donors to this committee did not list an employer, so FEC data doesn&apos;t
          support an industry breakdown for this cycle.
        </p>
      </div>
    );
  }

  const top5 = industries.topIndustries.slice(0, 5);
  const maxAmount = top5[0]?.amount ?? 1;
  const classifiedTotal = industries.topIndustries.reduce((sum, i) => sum + i.amount, 0);

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-1">Top industries</h2>
      <p className="type-xs text-gray-500 mb-4">
        Of {formatCurrency(classifiedTotal)} in itemized individual donations where the donor listed
        an employer. This is only a slice of total fundraising — PACs, parties, small-dollar donors,
        and self-funding are not included here.
      </p>
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
      {industries.unattributedTotal > 0 && (
        <p className="type-xs text-gray-500 mt-3">
          An additional {formatCurrency(industries.unattributedTotal)} in itemized donations
          couldn&apos;t be classified — either the donor left the employer field blank or listed
          &ldquo;retired&rdquo;/&ldquo;self-employed,&rdquo; or the employer didn&apos;t match a
          known industry.
        </p>
      )}
    </div>
  );
}

function VoteFinanceCorrelationPod({
  insight,
}: {
  insight: InsightResponse<VoteFinanceInsight> | null;
}) {
  if (!insight?.data) return null;

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
        . Totals reflect the current two-year cycle. Industry breakdown covers only itemized
        individual donations where the donor listed an employer.{' '}
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
      <FundingSummaryPod finance={finance} />
      <TopIndustriesPod industries={industries} />
      <VoteFinanceCorrelationPod insight={voteFinanceInsight} />
      <SourcesPod />
    </>
  );
}

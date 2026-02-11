'use client';

import type { DistrictSpendingSummary } from '@/types/spending';
import { formatCompactCurrency, getFiscalYearLabel } from '../utils/format';

interface SpendingSummaryCardsProps {
  summary: DistrictSpendingSummary;
}

interface MetricCardProps {
  label: string;
  value: string;
  subtitle?: string;
}

function MetricCard({ label, value, subtitle }: MetricCardProps) {
  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <p className="aicher-label text-gray-500 dark:text-gray-400 mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

export default function SpendingSummaryCards({ summary }: SpendingSummaryCardsProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Spending Overview &mdash; {getFiscalYearLabel(summary.fiscalYear)}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Total Spending"
          value={formatCompactCurrency(summary.totalSpending)}
          subtitle={`${summary.displayName} district total`}
        />
        <MetricCard
          label="Per Capita"
          value={summary.perCapita !== null ? formatCompactCurrency(summary.perCapita) : 'N/A'}
          subtitle={
            summary.population !== null ? `Pop. ${summary.population.toLocaleString()}` : undefined
          }
        />
        <MetricCard label="Contracts" value={formatCompactCurrency(summary.contractSpending)} />
        <MetricCard label="Grants" value={formatCompactCurrency(summary.grantSpending)} />
      </div>
    </div>
  );
}

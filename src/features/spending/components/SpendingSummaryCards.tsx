'use client';

import type { DataQuality } from '@/types/backbone-response';
import type { DistrictSpendingSummary } from '@/types/spending';
import { formatCompactCurrency, getFiscalYearLabel } from '../utils/format';

interface SpendingSummaryCardsProps {
  summary: DistrictSpendingSummary;
  dataQuality?: DataQuality;
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

export default function SpendingSummaryCards({ summary, dataQuality }: SpendingSummaryCardsProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Spending Overview &mdash; {getFiscalYearLabel(summary.fiscalYear)}
      </h3>
      {dataQuality === 'unavailable' && (
        <p className="text-xs text-gray-700 dark:text-gray-300 border-2 border-black dark:border-[#333333] px-3 py-2 mb-4">
          Spending data is temporarily unavailable from USAspending.gov. Please try again later.
        </p>
      )}
      {dataQuality === 'partial' && (
        <p className="text-xs text-amber-700 dark:text-amber-400 border border-amber-300 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 mb-4">
          Aggregate spending data temporarily unavailable. Totals shown are based on top awards only
          and may undercount actual district spending.
        </p>
      )}
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

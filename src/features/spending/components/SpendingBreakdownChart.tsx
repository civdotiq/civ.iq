'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useResponsiveChartHeight } from '@/hooks/useResponsiveChartHeight';
import { formatCompactCurrency } from '../utils/format';

interface SpendingBreakdownChartProps {
  contractSpending: number;
  grantSpending: number;
}

const COLORS = {
  contracts: '#3ea2d4',
  grants: '#0a9338',
};

export default function SpendingBreakdownChart({
  contractSpending,
  grantSpending,
}: SpendingBreakdownChartProps) {
  const chartHeight = useResponsiveChartHeight(200, 160);

  if (contractSpending === 0 && grantSpending === 0) {
    return (
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Spending Breakdown
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          No spending data available for this district and fiscal year.
        </p>
      </div>
    );
  }

  const data = [
    { name: 'Contracts', amount: contractSpending, fill: COLORS.contracts },
    { name: 'Grants', amount: grantSpending, fill: COLORS.grants },
  ];

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Spending Breakdown
      </h3>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={data} layout="vertical" margin={{ left: 80, right: 16 }}>
          <XAxis
            type="number"
            tickFormatter={(value: number) => formatCompactCurrency(value)}
            stroke="#9ca3af"
          />
          <YAxis type="category" dataKey="name" stroke="#9ca3af" width={70} />
          <Tooltip
            formatter={(value: number) => [formatCompactCurrency(value), 'Amount']}
            contentStyle={{
              border: '2px solid #000',
              borderRadius: '0',
              backgroundColor: '#fff',
            }}
          />
          <Bar dataKey="amount" barSize={32}>
            {data.map(entry => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3" style={{ backgroundColor: COLORS.contracts }} />
          <span className="text-gray-600 dark:text-gray-400">Contracts</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3" style={{ backgroundColor: COLORS.grants }} />
          <span className="text-gray-600 dark:text-gray-400">Grants</span>
        </div>
      </div>
    </div>
  );
}

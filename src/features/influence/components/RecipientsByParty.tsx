/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SEMANTIC_COLORS } from '@/lib/constants/chart-colors';
import type { ResolvedRecipient } from '@/types/influence';

interface RecipientsByPartyProps {
  recipients: ResolvedRecipient[];
}

const PARTY_COLORS: Record<string, string> = {
  Democrat: SEMANTIC_COLORS.democrat,
  Republican: '#e11d07',
  Independent: '#64748b',
  Unknown: '#94a3b8',
};

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

export function RecipientsByParty({ recipients }: RecipientsByPartyProps) {
  const partyData = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const r of recipients) {
      if (!r.party) continue;
      const label =
        r.party === 'Democratic' || r.party === 'Democrat'
          ? 'Democrat'
          : r.party === 'Republican'
            ? 'Republican'
            : r.party === 'Independent'
              ? 'Independent'
              : 'Unknown';
      totals[label] = (totals[label] ?? 0) + r.totalAmount;
    }

    return Object.entries(totals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [recipients]);

  if (partyData.length === 0) {
    return null;
  }

  const total = partyData.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
      <h2 className="aicher-heading-wide text-sm text-gray-700 dark:text-gray-300 mb-4">
        Disbursements by Party
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={partyData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                dataKey="value"
                stroke="none"
              >
                {partyData.map(entry => (
                  <Cell
                    key={entry.name}
                    fill={PARTY_COLORS[entry.name] ?? PARTY_COLORS['Unknown']}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  border: '2px solid #000',
                  borderRadius: '0',
                  fontSize: '12px',
                }}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-700 dark:text-gray-300">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Summary */}
        <div className="space-y-3">
          {partyData.map(entry => {
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
            return (
              <div key={entry.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3"
                    style={{
                      backgroundColor: PARTY_COLORS[entry.name] ?? PARTY_COLORS['Unknown'],
                    }}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {entry.name}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(entry.value)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

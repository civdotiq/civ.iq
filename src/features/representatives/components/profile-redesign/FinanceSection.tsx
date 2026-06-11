/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { SectionBlock, SectionEmptyState, SectionSkeleton } from './SectionBlock';
import { formatMoney, type ProfileFinance } from './types';

interface FinanceSectionProps {
  finance: ProfileFinance | undefined;
  loading: boolean;
  onExplore: () => void;
}

interface SourceBar {
  label: string;
  amount: number;
}

/**
 * Campaign finance summary with funding-source breakdown.
 * Bars are rendered in the neutral gray ramp — money data is
 * non-partisan and never uses party colors.
 */
export function FinanceSection({ finance, loading, onExplore }: FinanceSectionProps) {
  const totalRaised = finance?.totalRaised ?? 0;
  const cycle = finance?.metadata?.matchedCycle;

  const bars: SourceBar[] = [
    { label: 'Individual donors', amount: finance?.individualContributions ?? 0 },
    { label: 'PACs', amount: finance?.pacContributions ?? 0 },
    { label: 'Party committees', amount: finance?.partyContributions ?? 0 },
    { label: 'Self-funded', amount: finance?.candidateContributions ?? 0 },
  ]
    .filter(bar => bar.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const itemizedTotal = bars.reduce((sum, bar) => sum + bar.amount, 0);
  const otherReceipts = totalRaised - itemizedTotal;

  return (
    <SectionBlock
      id="money"
      title={`Campaign finance${cycle ? `, ${cycle} cycle` : ''}`}
      action={
        <button type="button" onClick={onExplore} className="text-civiq-blue hover:underline">
          Full finance report →
        </button>
      }
      source="Source: FEC.gov candidate filings"
    >
      {loading ? (
        <SectionSkeleton rows={4} />
      ) : totalRaised <= 0 ? (
        <SectionEmptyState message="No campaign finance filings found for this representative in recent election cycles." />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-gray-500">
                Raised
              </span>
              <span className="block text-3xl font-bold text-gray-900 tabular-nums">
                {formatMoney(totalRaised)}
              </span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-gray-500">
                Spent
              </span>
              <span className="block text-3xl font-bold text-gray-900 tabular-nums">
                {formatMoney(finance?.totalSpent) ?? '—'}
              </span>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-gray-500">
                Cash on hand
              </span>
              <span className="block text-3xl font-bold text-gray-900 tabular-nums">
                {formatMoney(finance?.cashOnHand) ?? '—'}
              </span>
            </div>
          </div>

          {bars.length > 0 && (
            <div className="space-y-2">
              {bars.map(bar => {
                const pct = Math.min(100, Math.round((bar.amount / totalRaised) * 100));
                return (
                  <div
                    key={bar.label}
                    className="grid grid-cols-[10rem_1fr_5rem] gap-3 items-center text-sm"
                  >
                    <span className="text-gray-900">{bar.label}</span>
                    <div className="h-4 bg-gray-100 border border-gray-300">
                      <div className="h-full bg-gray-700" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-right tabular-nums text-gray-700">
                      {formatMoney(bar.amount)}
                    </span>
                  </div>
                );
              })}
              {otherReceipts > 0 && (
                <p className="text-xs text-gray-500 pt-2">
                  {formatMoney(otherReceipts)} in other receipts (transfers, loans, refunds) not
                  shown in the breakdown.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </SectionBlock>
  );
}

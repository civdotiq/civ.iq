/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useMemo } from 'react';
import { calculateComparison, generateInsights } from '@/lib/services/finance-comparisons';

interface HeroSummaryProps {
  representativeName: string;
  party: 'Democrat' | 'Republican' | 'Independent';
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  candidateContributions: number;
  cycle: number;
  loading?: boolean;
}

/**
 * Hero summary section with key metrics and insights
 * Prominent display of campaign finance overview with context
 */
export function HeroSummary({
  representativeName,
  party,
  totalRaised,
  totalSpent,
  cashOnHand,
  individualContributions,
  pacContributions,
  candidateContributions,
  cycle,
  loading = false,
}: HeroSummaryProps) {
  // Hooks must be called unconditionally before any early returns
  const totalRaisedComparison = useMemo(
    () => calculateComparison(totalRaised, party, 'totalRaised'),
    [totalRaised, party]
  );

  const insights = useMemo(
    () =>
      generateInsights(
        {
          totalRaised,
          individualContributions,
          pacContributions,
          candidateContributions,
          selfFinancing: candidateContributions,
        },
        party
      ),
    [totalRaised, individualContributions, pacContributions, candidateContributions, party]
  );

  // Loading state (after hooks)
  if (loading) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-8">
        <div className="animate-pulse">
          <div className="mb-6">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-10 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getOutlierBadge = () => {
    const status = totalRaisedComparison.outlierStatus;
    if (status === 'extreme') {
      return (
        <span className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
          Significantly {totalRaisedComparison.percentDifference > 0 ? 'Above' : 'Below'} Average
        </span>
      );
    }
    if (status === 'high' || status === 'low') {
      return (
        <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
          {totalRaisedComparison.percentDifference > 0 ? 'Above' : 'Below'} Average
        </span>
      );
    }
    return null;
  };

  return (
    <div className="rounded-lg border border-neutral-200 bg-gradient-to-br from-white to-neutral-50 p-8">
      <div className="mb-6">
        <h2 className="mb-2 text-2xl font-bold text-neutral-900">Campaign Finance {cycle}</h2>
        <p className="text-neutral-600">{representativeName}</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Total Raised */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm font-medium text-neutral-600">Total Raised</div>
          <div className="mb-2 text-3xl font-bold text-neutral-900">
            ${(totalRaised / 1000000).toFixed(2)}M
          </div>
          {getOutlierBadge()}
          <div className="mt-3 text-xs text-neutral-500">
            {totalRaisedComparison.percentDifference > 0 ? '+' : ''}
            {totalRaisedComparison.percentDifference}% vs House {party} avg
          </div>
        </div>

        {/* Total Spent */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm font-medium text-neutral-600">Total Spent</div>
          <div className="mb-2 text-3xl font-bold text-neutral-900">
            ${(totalSpent / 1000000).toFixed(2)}M
          </div>
          <div className="mt-3 text-xs text-neutral-500">
            {totalRaised > 0
              ? `${((totalSpent / totalRaised) * 100).toFixed(0)}% of funds raised`
              : 'No funds raised'}
          </div>
        </div>

        {/* Cash on Hand */}
        <div className="rounded-lg bg-white p-6 shadow-sm">
          <div className="mb-2 text-sm font-medium text-neutral-600">Cash on Hand</div>
          <div className="mb-2 text-3xl font-bold text-neutral-900">
            ${(cashOnHand / 1000000).toFixed(2)}M
          </div>
          <div className="mt-3 text-xs text-neutral-500">Available for future expenses</div>
        </div>
      </div>

      {/* Insights */}
      {insights.length > 0 && (
        <div className="rounded-lg bg-amber-50 p-6">
          <h3 className="mb-3 text-sm font-semibold uppercase text-amber-900">Key Insights</h3>
          <ul className="space-y-2">
            {insights.map((insight, idx) => (
              <li key={idx} className="flex items-start text-sm text-amber-800">
                <span className="mr-2">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

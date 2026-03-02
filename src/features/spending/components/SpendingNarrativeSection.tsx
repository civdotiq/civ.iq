'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Spending Narrative Section
 *
 * Fetches and displays an AI-generated narrative of federal spending
 * in a congressional district, translating USASpending.gov data into
 * community context.
 */

import useSWR from 'swr';
import { Brain, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';
import type { SpendingNarrative } from '@/types/ai';

interface SpendingNarrativeSectionProps {
  districtId: string;
}

interface NarrativeApiResponse {
  narrative: SpendingNarrative;
  metadata: {
    responseTime: number;
    districtId: string;
    dataSources: { spending: string };
    plainLanguage: { name: string; url: string; description: string };
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export function SpendingNarrativeSection({ districtId }: SpendingNarrativeSectionProps) {
  const { data, error, isLoading, mutate } = useSWR<NarrativeApiResponse>(
    `/api/ai/spending-narrative/${districtId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-4 sm:p-8 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-300"></div>
          <div className="h-5 w-56 bg-gray-300"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full bg-gray-200"></div>
          <div className="h-4 w-5/6 bg-gray-200"></div>
          <div className="h-4 w-4/6 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  // Silently skip if no data available (non-critical feature)
  if (error || !data?.narrative) {
    if (error) {
      return (
        <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-4 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Spending in Your Community</h2>
          </div>
          <div className="text-center py-4">
            <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">Unable to load spending narrative</p>
            <button
              onClick={() => mutate()}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-200 hover:bg-blue-50"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return null;
  }

  const { narrative } = data;

  return (
    <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-4 sm:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-5 w-5 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Spending in Your Community</h2>
        <span className="text-xs text-gray-500">AI-generated</span>
      </div>

      <p className="text-gray-700 leading-relaxed mb-4">{narrative.summary}</p>

      {narrative.topCategories && (
        <div className="bg-blue-50 p-4 mb-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            Top Spending Categories
          </h3>
          <p className="text-blue-800 text-sm leading-relaxed">{narrative.topCategories}</p>
        </div>
      )}

      {narrative.localImpact && (
        <div className="bg-green-50 p-4 mb-4">
          <h3 className="text-sm font-medium text-green-900 mb-2">Local Impact</h3>
          <p className="text-green-800 text-sm leading-relaxed">{narrative.localImpact}</p>
        </div>
      )}

      {narrative.notableContracts && narrative.notableContracts.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Notable Contracts</h3>
          <ul className="space-y-1">
            {narrative.notableContracts.map((contract, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <span className="text-blue-600 mt-0.5">{'>'}</span>
                {contract}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-100">
        <AlertCircle className="h-3 w-3" />
        <span>AI-generated narrative from USASpending.gov data • Source: {narrative.source}</span>
      </div>
    </div>
  );
}

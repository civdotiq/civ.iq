'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Pattern Section
 *
 * Displays AI-generated vote pattern analysis for a legislator.
 * Shows categorized voting record by issue area with factual counts only.
 */

import { useState } from 'react';
import useSWR from 'swr';
import { Brain, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { VotePatternSummary } from '@/types/ai';

interface VotePatternSectionProps {
  bioguideId: string;
}

interface PatternApiResponse {
  analysis: VotePatternSummary;
  metadata: {
    responseTime: number;
    legislatorId: string;
    dataSources: { votes: string };
    plainLanguage: { name: string; url: string; description: string };
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

export function VotePatternSection({ bioguideId }: VotePatternSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { data, isLoading } = useSWR<PatternApiResponse>(
    `/api/ai/vote-patterns/${bioguideId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 600000,
    }
  );

  // Don't show anything while loading or on error (non-critical enhancement)
  if (isLoading) {
    return (
      <div className="mb-6 p-4 bg-white border-2 border-black animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-5 bg-gray-300"></div>
          <div className="h-4 w-48 bg-gray-300"></div>
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200"></div>
          <div className="h-4 w-4/5 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (!data?.analysis) return null;

  const { analysis } = data;
  const categories = Object.entries(analysis.categoryCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8);
  const maxCount = categories[0]?.[1].count ?? 1;

  return (
    <div className="mb-6 bg-white border-2 border-black">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-civiq-blue" />
          <h3 className="font-semibold text-gray-900">Voting Pattern Analysis</h3>
          <span className="text-xs text-gray-500">AI-generated</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Always show summary */}
      <div className="px-4 pb-4 -mt-2">
        <p className="text-gray-700 text-sm leading-relaxed">{analysis.summary}</p>
        {analysis.topIssueAreas.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {analysis.topIssueAreas.map(area => (
              <span
                key={area}
                className="px-2 py-1 bg-civiq-blue/10 text-civiq-blue text-xs font-medium border border-civiq-blue"
              >
                {area}
              </span>
            ))}
          </div>
        )}
      </div>

      {isExpanded && categories.length > 0 && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 pt-4">
          <h4 className="text-sm font-medium text-gray-900">Votes by Issue Area</h4>
          <div className="space-y-2">
            {categories.map(([category, { count, percentage }]) => (
              <div key={category} className="flex items-center gap-3">
                <span className="w-32 text-sm text-gray-700 truncate">{category}</span>
                <div className="flex-1 bg-gray-200 h-5">
                  <div
                    className="bg-civiq-blue h-5"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="text-sm text-gray-600 w-20 text-right">
                  {count} ({percentage}%)
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
            <AlertCircle className="h-3 w-3" />
            <span>
              AI-categorized from {analysis.totalVotes} chamber votes • Source: {analysis.source}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Story View
 *
 * Displays influence connections as readable narrative story cards
 * with real dollar amounts, dates, and plain English explanations.
 * Replaces the former score-based visualization.
 */

'use client';

import type { InfluenceScore, ScoredPath, PathStep } from '@/lib/mesh/propagation/path-scorer';

interface InfluencePathViewProps {
  result: InfluenceScore;
}

export default function InfluencePathView({ result }: InfluencePathViewProps) {
  if (result.pathCount === 0) {
    return (
      <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-4 sm:p-8">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-2">
          No Connections Found
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          We could not find a documented connection between these entities in current FEC filings
          and Senate lobbying disclosures. This does not mean no connection exists — only that our
          data sources do not show one.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-4 sm:p-6">
        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide mb-1">
          Connections Found
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {result.pathCount} documented connection{result.pathCount !== 1 ? 's' : ''} between{' '}
          <strong className="text-gray-900 dark:text-gray-100">{result.fromLabel}</strong> and{' '}
          <strong className="text-gray-900 dark:text-gray-100">{result.toLabel}</strong>
        </p>
      </div>

      {/* Story Cards */}
      {result.paths.slice(0, 5).map((path, i) => (
        <ConnectionCard key={i} path={path} index={i + 1} total={Math.min(result.pathCount, 5)} />
      ))}

      {/* Attribution */}
      <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-4 sm:p-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          <strong className="text-gray-700 dark:text-gray-300">How we trace connections:</strong>{' '}
          {result.methodology}
        </p>
      </div>
    </div>
  );
}

function ConnectionCard({
  path,
  index,
  total,
}: {
  path: ScoredPath;
  index: number;
  total: number;
}) {
  const { summary } = path;

  return (
    <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-4 sm:p-6">
      {/* Card header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide">
          Connection {index} of {total}
        </span>
        {summary.timeRange && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{summary.timeRange}</span>
        )}
      </div>

      {/* Narrative */}
      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed mb-4">
        {path.narrative}
      </p>

      {/* Key facts row */}
      {(summary.totalDollars > 0 || summary.issueAreas.length > 0) && (
        <div className="flex flex-wrap gap-3 mb-4">
          {summary.totalDollars > 0 && (
            <Fact label="Total amount" value={`$${formatDollars(summary.totalDollars)}`} />
          )}
          {summary.issueAreas.length > 0 && (
            <Fact label="Issue areas" value={summary.issueAreas.slice(0, 3).join(', ')} />
          )}
        </div>
      )}

      {/* Step-by-step breakdown */}
      {summary.steps.length > 0 && (
        <div className="border-t-2 border-gray-100 dark:border-gray-700 pt-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wide mb-2">
            Connection chain
          </p>
          <div className="space-y-2">
            {summary.steps.map((step, i) => (
              <StepRow key={i} step={step} isLast={i === summary.steps.length - 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-gray-200 dark:border-gray-600 px-3 py-1.5">
      <span className="text-xs text-gray-400 dark:text-gray-500 block">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}

function StepRow({ step, isLast }: { step: PathStep; isLast: boolean }) {
  return (
    <div className="flex items-start gap-2">
      {/* Connector line */}
      <div className="flex flex-col items-center pt-1.5">
        <div className="w-1.5 h-1.5 bg-[#3ea2d4] flex-shrink-0" />
        {!isLast && <div className="w-px h-4 bg-gray-200 dark:bg-gray-600 mt-0.5" />}
      </div>

      {/* Step content */}
      <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
        <span className="text-gray-900 dark:text-gray-100 font-medium">{step.from}</span>{' '}
        {step.relationship}{' '}
        <span className="text-gray-900 dark:text-gray-100 font-medium">{step.to}</span>
        {step.period && <span className="text-gray-400 dark:text-gray-500"> ({step.period})</span>}
        {step.source && <span className="text-gray-400 dark:text-gray-500"> — {step.source}</span>}
      </div>
    </div>
  );
}

function formatDollars(amount: number): string {
  if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toLocaleString('en-US');
}

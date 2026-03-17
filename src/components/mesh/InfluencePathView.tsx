/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Path Visualization
 *
 * Shows scored influence paths between two entities.
 * Aicher/Ulm design: no gradients, no shadows, structural borders.
 */

'use client';

import type { InfluenceScore, ScoredPath } from '@/lib/mesh/propagation/path-scorer';

interface InfluencePathViewProps {
  result: InfluenceScore;
}

export default function InfluencePathView({ result }: InfluencePathViewProps) {
  if (result.pathCount === 0) {
    return (
      <div className="bg-white border-2 border-black p-4 sm:p-8">
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
          Influence Paths
        </h3>
        <p className="text-sm text-gray-500">No paths found between these entities.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
            Influence Paths
          </h3>
          <p className="text-sm text-gray-500">
            {result.pathCount} path{result.pathCount !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold" style={{ color: '#3ea2d4' }}>
            {(result.aggregateScore * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Aggregate score</div>
        </div>
      </div>

      <div className="space-y-4">
        {result.paths.slice(0, 5).map((path, i) => (
          <PathCard key={i} path={path} rank={i + 1} />
        ))}
      </div>

      <footer className="border-t-2 border-gray-200 pt-3">
        <p className="text-xs text-gray-400">{result.methodology}</p>
      </footer>
    </div>
  );
}

function PathCard({ path, rank }: { path: ScoredPath; rank: number }) {
  return (
    <div className="border-2 border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-medium">Path {rank}</span>
        <span className="text-sm font-bold" style={{ color: '#3ea2d4' }}>
          {(path.score * 100).toFixed(1)}%
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed">{path.narrative}</p>
      {path.edgeScores.length > 0 && (
        <div className="mt-2 flex gap-2 flex-wrap">
          {path.edgeScores.map((es, i) => (
            <span
              key={i}
              className="text-xs text-gray-500 bg-gray-50 border-2 border-gray-200 px-2 py-1"
            >
              ${`${(es.dollarWeight * 100).toFixed(0)}%`} dollar
              {' / '}
              {(es.temporalWeight * 100).toFixed(0)}% recent
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cascade Simulation Summary
 *
 * Shows ranked list of affected reps with shift magnitudes.
 * Aicher/Ulm design: no gradients, no shadows.
 */

'use client';

import type { CascadeResult, CascadeRepEffect } from '@/lib/mesh/propagation/cascade';

interface CascadeSummaryProps {
  result: CascadeResult;
}

export default function CascadeSummary({ result }: CascadeSummaryProps) {
  const direction = result.changePercent > 0 ? 'increase' : 'decrease';

  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
          Cascade Simulation
        </h3>
        <p className="text-sm text-gray-500">
          If <span className="font-medium text-gray-700">{result.sector}</span> funding {direction}s
          by {Math.abs(result.changePercent)}%
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">{result.affectedReps.length}</div>
          <div className="text-xs text-gray-500">Reps affected</div>
        </div>
        <div>
          <div
            className="text-2xl font-bold"
            style={{ color: result.totalFlips > 0 ? '#e11d07' : '#0a9338' }}
          >
            {result.totalFlips}
          </div>
          <div className="text-xs text-gray-500">Predicted flips</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {(result.confidence * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-gray-500">Confidence</div>
        </div>
      </div>

      {/* Top affected reps */}
      {result.affectedReps.length > 0 && (
        <section>
          <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
            Most sensitive representatives
          </h4>
          <div className="space-y-1">
            {result.affectedReps.slice(0, 10).map(rep => (
              <RepEffectRow key={rep.bioguideId} rep={rep} />
            ))}
          </div>
        </section>
      )}

      <footer className="border-t-2 border-gray-200 pt-3">
        <p className="text-xs text-gray-400">{result.disclaimer}</p>
      </footer>
    </div>
  );
}

function RepEffectRow({ rep }: { rep: CascadeRepEffect }) {
  const shiftPct = (rep.averageShift * 100).toFixed(1);
  const shiftColor = rep.flippedVotes > 0 ? '#e11d07' : '#999';
  const partyColor = rep.party === 'D' ? '#0a9338' : rep.party === 'R' ? '#e11d07' : '#999';

  return (
    <div className="flex items-center justify-between py-2 border-b-2 border-gray-200">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: partyColor }} />
        <span className="text-sm text-gray-700">
          {rep.name} ({rep.party}-{rep.state})
        </span>
      </div>
      <span className="text-xs font-medium flex-shrink-0" style={{ color: shiftColor }}>
        {rep.averageShift > 0 ? '+' : ''}
        {shiftPct}%
      </span>
    </div>
  );
}

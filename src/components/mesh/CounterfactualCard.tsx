/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Counterfactual Analysis Card
 *
 * Shows "with vs without" comparison for masked sectors.
 * Aicher/Ulm design: no gradients, no shadows, 8px grid.
 */

'use client';

import type {
  CounterfactualResult,
  CounterfactualPrediction,
} from '@/lib/mesh/propagation/counterfactual';

interface CounterfactualCardProps {
  result: CounterfactualResult;
}

export default function CounterfactualCard({ result }: CounterfactualCardProps) {
  return (
    <div className="bg-white border-2 border-black p-4 sm:p-8 space-y-6">
      <div>
        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-1">
          Counterfactual Analysis
        </h3>
        <p className="text-sm text-gray-500">
          What if donations from{' '}
          <span className="font-medium text-gray-700">{result.maskedSectors.join(', ')}</span> were
          removed?
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-2xl font-bold text-gray-900">
            {(result.averageShift * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">Avg prediction shift</div>
        </div>
        <div>
          <div
            className="text-2xl font-bold"
            style={{ color: result.flippedCount > 0 ? '#e11d07' : '#0a9338' }}
          >
            {result.flippedCount}
          </div>
          <div className="text-xs text-gray-500">Votes flipped</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-gray-900">{result.predictions.length}</div>
          <div className="text-xs text-gray-500">Bills analyzed</div>
        </div>
      </div>

      {/* Predictions table */}
      {result.predictions.length > 0 && (
        <div className="space-y-1">
          {result.predictions.slice(0, 5).map(pred => (
            <PredictionRow key={pred.billId} prediction={pred} />
          ))}
        </div>
      )}

      <footer className="border-t-2 border-gray-200 pt-3">
        <p className="text-xs text-gray-400">{result.disclaimer}</p>
      </footer>
    </div>
  );
}

function PredictionRow({ prediction }: { prediction: CounterfactualPrediction }) {
  const shiftPct = (prediction.shift * 100).toFixed(1);
  const shiftColor = prediction.flipped ? '#e11d07' : '#999';

  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-100">
      <span className="text-sm text-gray-700 truncate flex-1">{prediction.billTitle}</span>
      <div className="flex items-center gap-3 flex-shrink-0 ml-2">
        <span className="text-xs text-gray-500">
          {(prediction.originalProbability * 100).toFixed(0)}%
        </span>
        <span className="text-xs text-gray-400">&rarr;</span>
        <span className="text-xs text-gray-500">
          {(prediction.maskedProbability * 100).toFixed(0)}%
        </span>
        <span className="text-xs font-medium" style={{ color: shiftColor }}>
          {prediction.shift > 0 ? '+' : ''}
          {shiftPct}%
        </span>
      </div>
    </div>
  );
}

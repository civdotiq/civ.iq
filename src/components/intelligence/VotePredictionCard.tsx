/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { ConfidenceBadge } from './ConfidenceBadge';
import { SignalBadge } from './SignalBadge';
import { SourceCitation } from './SourceCitation';
import { InsightDisclaimer } from './InsightDisclaimer';
import { ShapFactorsBar } from './ShapFactorsBar';
import type { VotePredictionInsight } from '@/lib/intelligence/types';

interface VotePredictionCardProps {
  insight: VotePredictionInsight;
  className?: string;
}

export function VotePredictionCard({ insight, className = '' }: VotePredictionCardProps) {
  const { independenceScore, notableDeviations } = insight;
  const pctIndependent = (independenceScore.score * 100).toFixed(0);

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <SignalBadge signal={insight.signal ?? 'pattern'} />
          <h3 className="aicher-heading type-lg text-gray-900 truncate">Voting pattern analysis</h3>
        </div>
        <ConfidenceBadge confidence={insight.confidence} className="shrink-0" />
      </div>

      {/* Key stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="border-2 border-gray-200 p-3">
          <div className="aicher-heading type-2xl text-gray-900">{pctIndependent}%</div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Prediction divergence</div>
        </div>
        <div className="border-2 border-gray-200 p-3">
          <div className="aicher-heading type-2xl text-gray-900">
            {independenceScore.deviations}/{independenceScore.confidentPredictions}
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Votes against prediction</div>
        </div>
        {independenceScore.peerPercentile > 0 && (
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {independenceScore.peerPercentile.toFixed(0)}th
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Peer percentile</div>
          </div>
        )}
      </div>

      {/* Narrative */}
      <p className="type-sm text-gray-700 leading-relaxed mb-4">{insight.narrative}</p>

      {/* SHAP factors visualization */}
      {insight.shapFactors && insight.shapFactors.length > 0 && (
        <ShapFactorsBar factors={insight.shapFactors} />
      )}

      {/* Top predictive factors — citizen-readable version */}
      {insight.topPredictiveFactors && insight.topPredictiveFactors.length > 0 && (
        <div className="mb-4">
          <h4 className="aicher-heading type-sm text-gray-900 mb-2">
            What drives voting predictions
          </h4>
          <div className="space-y-2">
            {insight.topPredictiveFactors.map((factor, i) => (
              <div key={factor.feature} className="flex items-center gap-3">
                <span className="type-xs text-gray-400 aicher-heading w-4 text-right">{i + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="type-sm text-gray-700">{factor.humanLabel}</span>
                    <span className="type-xs aicher-heading text-gray-500">
                      {(factor.importance * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 border border-gray-200 mt-1">
                    <div
                      className="h-full bg-[#3ea2d4]"
                      style={{ width: `${Math.min(factor.importance * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notable deviations table */}
      {notableDeviations.length > 0 && (
        <div className="mb-4">
          <h4 className="aicher-heading type-sm text-gray-900 mb-2">
            Notable deviations from donor prediction
          </h4>
          <div className="border-2 border-gray-200 divide-y divide-gray-200">
            {notableDeviations.map(deviation => (
              <div key={deviation.billId} className="p-3">
                <div className="type-sm font-medium text-gray-900 line-clamp-2">
                  {deviation.billTitle}
                </div>
                <div className="type-xs text-gray-500 mt-1">
                  Model predicted:{' '}
                  <span className="font-medium">{deviation.predictedVote.toUpperCase()}</span> (
                  {(deviation.yeaProbability * 100).toFixed(0)}% confidence)
                </div>
                <div className="type-xs text-gray-500">
                  Actual vote:{' '}
                  <span className="font-medium">{deviation.actualVote.toUpperCase()}</span>
                </div>
                {deviation.billSectors.length > 0 && (
                  <div className="type-xs text-gray-400 mt-1">
                    Sectors: {deviation.billSectors.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <SourceCitation
        sources={insight.sources ?? []}
        dataAsOf={insight.dataAsOf}
        className="mt-3"
      />

      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />
    </div>
  );
}

/**
 * Builds key stats array for use with the generic InsightCard if needed.
 */
export function votePredictionKeyStats(
  insight: VotePredictionInsight
): Array<{ label: string; value: string }> {
  return [
    {
      label: 'Prediction divergence',
      value: `${(insight.independenceScore.score * 100).toFixed(0)}%`,
    },
    {
      label: 'Votes analyzed',
      value: String(insight.independenceScore.confidentPredictions),
    },
    {
      label: 'Model accuracy',
      value: `${(insight.modelAccuracy * 100).toFixed(0)}%`,
    },
  ];
}

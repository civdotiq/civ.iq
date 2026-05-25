/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import type { VotePredictionInsight } from '@/lib/intelligence/types';

type ShapFactor = NonNullable<VotePredictionInsight['shapFactors']>[number];

interface ShapFactorsBarProps {
  factors: ShapFactor[];
  className?: string;
}

/**
 * Diverging horizontal bar chart showing SHAP feature importance.
 * Red bars extend left (toward Nay), green bars extend right (toward Yea).
 * Follows Aicher/Ulm design: no shadows, no rounded corners, 2px borders, 8px grid.
 */
export function ShapFactorsBar({ factors, className = '' }: ShapFactorsBarProps) {
  if (factors.length === 0) return null;

  const maxImportance = Math.max(...factors.map(f => f.importance));

  return (
    <div
      className={`mb-4 ${className}`}
      role="img"
      aria-label={`Vote prediction factors. ${factors.length} factors analyzed.`}
    >
      <h4 className="aicher-heading type-sm text-gray-900 mb-2">Key factors driving prediction</h4>
      <div className="bg-gray-50 p-3">
        <div className="space-y-2">
          {factors.map(factor => {
            const barWidth = maxImportance > 0 ? (factor.importance / maxImportance) * 100 : 0;
            const isYea = factor.direction === 'toward_yea';

            return (
              <div key={factor.feature} className="flex items-center gap-2">
                {/* Label */}
                <div className="w-40 shrink-0 type-xs text-gray-700 text-right truncate">
                  {factor.humanLabel}
                </div>
                {/* Bar container — left half is nay, right half is yea */}
                <div className="flex-1 flex items-center h-5">
                  {/* Nay side (left) */}
                  <div className="flex-1 flex justify-end">
                    {!isYea && (
                      <div
                        className="h-5 bg-[#d97706]"
                        style={{ width: `${barWidth}%` }}
                        role="img"
                        aria-label={`${factor.humanLabel}: ${(factor.importance * 100).toFixed(0)}% importance, pushes toward Nay`}
                      />
                    )}
                  </div>
                  {/* Center divider */}
                  <div className="w-px h-5 bg-gray-400 shrink-0" />
                  {/* Yea side (right) */}
                  <div className="flex-1">
                    {isYea && (
                      <div
                        className="h-5 bg-[#3ea2d4]"
                        style={{ width: `${barWidth}%` }}
                        role="img"
                        aria-label={`${factor.humanLabel}: ${(factor.importance * 100).toFixed(0)}% importance, pushes toward Yea`}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {/* Axis labels */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-40 shrink-0" />
          <div className="flex-1 flex justify-between type-xs text-gray-400">
            <span>Nay</span>
            <span>Yea</span>
          </div>
        </div>
      </div>
      <p className="type-xs text-gray-400 mt-1">
        Bar length shows how much each factor contributes to the model prediction. Direction shows
        whether the factor pushes toward a Yea or Nay vote. Based on SHAP (SHapley Additive
        exPlanations) values.
      </p>
    </div>
  );
}

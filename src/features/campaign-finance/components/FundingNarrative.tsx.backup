/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { FundingNarrative as FundingNarrativeType } from '@/lib/campaign-finance/narrative';

interface FundingNarrativeProps {
  narrative: FundingNarrativeType;
  representativeName?: string;
}

const profileIcons = {
  grassroots: '🌱',
  traditional: '🏛️',
  'self-funded': '💰',
  mixed: '⚖️',
  'pac-heavy': '🏢',
};

const profileColors = {
  grassroots: 'bg-green-50 border-green-200 text-green-800',
  traditional: 'bg-blue-50 border-blue-200 text-blue-800',
  'self-funded': 'bg-purple-50 border-purple-200 text-purple-800',
  mixed: 'bg-gray-50 border-gray-200 text-gray-800',
  'pac-heavy': 'bg-orange-50 border-orange-200 text-orange-800',
};

const trustLevelColors = {
  high: 'text-green-600',
  medium: 'text-yellow-600',
  low: 'text-red-600',
};

export const FundingNarrative: React.FC<FundingNarrativeProps> = ({
  narrative,
  representativeName,
}) => {
  const profileColor = profileColors[narrative.fundingProfile];
  const profileIcon = profileIcons[narrative.fundingProfile];
  const trustColor = trustLevelColors[narrative.trustLevel];

  return (
    <div className={`rounded-lg border-2 p-6 ${profileColor}`}>
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{profileIcon}</span>
          <div>
            <h3 className="text-lg font-semibold">
              {representativeName ? `${representativeName}'s` : 'Campaign'} Funding Profile
            </h3>
            <div className="flex items-center gap-2 text-sm">
              <span className="capitalize font-medium">
                {narrative.fundingProfile.replace('-', ' ')}
              </span>
              <span className="text-gray-500">•</span>
              <span className={`font-medium ${trustColor}`}>{narrative.trustLevel} confidence</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Statement */}
      <div className="mb-4">
        <p className="text-lg leading-relaxed">{narrative.mainStatement}</p>
      </div>

      {/* Key Insights */}
      {narrative.keyInsights.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-medium text-gray-700">Key Insights:</h4>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {narrative.keyInsights.map((insight, index) => (
              <div
                key={index}
                className="flex items-start gap-2 rounded bg-white/50 px-3 py-2 text-sm"
              >
                <span className="text-xs opacity-70">•</span>
                <span>{insight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trust Level Disclaimer */}
      {narrative.trustLevel === 'low' && (
        <div className="mt-4 rounded bg-yellow-100 px-3 py-2 text-xs text-yellow-800">
          <strong>Note:</strong> Analysis based on limited data. Narrative may not fully represent
          funding activity.
        </div>
      )}
    </div>
  );
};

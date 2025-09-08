/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * DataQualityIndicator Component
 *
 * Displays transparent information about the completeness and quality of campaign finance data.
 * Helps users understand the limitations and reliability of the displayed information.
 */

import React from 'react';

export interface DataQualityMetric {
  totalContributionsAnalyzed: number;
  contributionsWithEmployer?: number;
  contributionsWithState?: number;
  completenessPercentage: number;
}

interface DataQualityIndicatorProps {
  metric: DataQualityMetric;
  dataType: 'industry' | 'geography';
  className?: string;
}

export const DataQualityIndicator: React.FC<DataQualityIndicatorProps> = ({
  metric,
  dataType,
  className = '',
}) => {
  const { totalContributionsAnalyzed, completenessPercentage } = metric;

  // Determine quality level and styling
  const getQualityLevel = (percentage: number) => {
    if (percentage >= 70) return 'high';
    if (percentage >= 30) return 'medium';
    return 'low';
  };

  const qualityLevel = getQualityLevel(completenessPercentage);

  // Quality level styling
  const qualityStyles = {
    high: {
      icon: '✅',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
    },
    medium: {
      icon: '⚠️',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
    },
    low: {
      icon: '⚠️',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
    },
  };

  const style = qualityStyles[qualityLevel];

  // Generate human-readable description
  const getDescription = () => {
    const dataTypeLabel = dataType === 'industry' ? 'Industry' : 'Geographic';
    const contextInfo =
      dataType === 'industry'
        ? 'where employer information was provided'
        : 'where contributor location was provided';

    return `${dataTypeLabel} analysis is based on ${completenessPercentage.toFixed(0)}% of itemized individual contributions ${contextInfo}.`;
  };

  // Get detailed breakdown info
  const getDetailedInfo = () => {
    if (dataType === 'industry' && metric.contributionsWithEmployer !== undefined) {
      return `${metric.contributionsWithEmployer.toLocaleString()} of ${totalContributionsAnalyzed.toLocaleString()} contributions included employer data`;
    }
    if (dataType === 'geography' && metric.contributionsWithState !== undefined) {
      return `${metric.contributionsWithState.toLocaleString()} of ${totalContributionsAnalyzed.toLocaleString()} contributions included location data`;
    }
    return `${totalContributionsAnalyzed.toLocaleString()} contributions analyzed`;
  };

  return (
    <div className={`p-4 rounded-lg border ${style.bgColor} ${style.borderColor} ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0" role="img" aria-label="Quality indicator">
          {style.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${style.textColor} leading-relaxed`}>
            {getDescription()}
          </div>
          <div className="mt-2 text-xs text-gray-600">{getDetailedInfo()}</div>
          {qualityLevel === 'low' && (
            <div className="mt-2 text-xs text-gray-600">
              <strong>Note:</strong> Data completeness is too low for reliable analysis.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataQualityIndicator;

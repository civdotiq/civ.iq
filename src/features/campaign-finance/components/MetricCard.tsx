/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { FECSourceLink } from './FECSourceLink';

interface SubMetric {
  label: string;
  value: string;
  description?: string;
}

interface MetricCardProps {
  title: string;
  mainValue: string;
  mainColor: 'green' | 'red' | 'blue';
  description?: string;
  subMetrics?: SubMetric[];
  fecCandidateId?: string;
  showFECLink?: boolean;
  'data-testid'?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  mainValue,
  mainColor,
  description,
  subMetrics = [],
  fecCandidateId,
  showFECLink = false,
  'data-testid': dataTestId,
}) => {
  const colorClasses = {
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  };

  return (
    <div className="aicher-card aicher-hover p-6" data-testid={dataTestId}>
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="aicher-heading-wide text-sm text-gray-700">{title}</h3>
            {description && (
              <button
                title={description}
                className="aicher-button text-gray-400 aicher-hover cursor-help text-xs"
              >
                ℹ️
              </button>
            )}
          </div>
          {showFECLink && fecCandidateId && (
            <FECSourceLink candidateId={fecCandidateId} metric={title} className="ml-2" />
          )}
        </div>
      </div>

      {/* Main Metric */}
      <div className={`aicher-heading text-3xl ${colorClasses[mainColor]} mb-4`}>{mainValue}</div>

      {/* Sub-metrics */}
      {subMetrics.length > 0 && (
        <div className="space-y-2">
          {subMetrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center gap-1">
                <span className="aicher-heading-wide text-sm text-gray-600">{metric.label}</span>
                {metric.description && (
                  <button
                    title={metric.description}
                    className="aicher-button text-gray-400 aicher-hover cursor-help text-xs"
                  >
                    ℹ️
                  </button>
                )}
              </div>
              <span className="aicher-heading text-sm text-gray-900">{metric.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

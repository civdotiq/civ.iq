'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Impact Component
 *
 * Displays AI-generated analysis of how a bill impacts a specific congressional district.
 * Mirrors the BillSummary component pattern with expandable sections.
 */

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  AlertCircle,
  Target,
  Users,
  TrendingUp,
  Wifi,
  BarChart3,
} from 'lucide-react';
import type { DistrictImpact as DistrictImpactType } from '@/types/district-impact';

interface DistrictImpactProps {
  impact: DistrictImpactType;
  className?: string;
}

const IMPACT_COLORS: Record<string, string> = {
  High: 'text-red-700 bg-red-50 border-red-200',
  Medium: 'text-yellow-700 bg-yellow-50 border-yellow-200',
  Low: 'text-green-700 bg-green-50 border-green-200',
  Uncertain: 'text-gray-700 bg-gray-50 border-gray-200',
};

export function DistrictImpactDisplay({ impact, className = '' }: DistrictImpactProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatDistrictLabel = (districtId: string) => {
    const parts = districtId.split('-');
    if (parts.length === 2) {
      return `${parts[0]}-${parts[1]}`;
    }
    return districtId;
  };

  return (
    <div className={`bg-white border-2 border-black ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="h-5 w-5 text-civiq-blue" />
              <span className="text-sm font-medium text-civiq-blue">
                Impact on {formatDistrictLabel(impact.districtId)}
              </span>
              <span
                className={`px-2 py-1 text-xs font-medium border ${IMPACT_COLORS[impact.overallImpact] || IMPACT_COLORS.Uncertain}`}
              >
                {impact.overallImpact} Impact
              </span>
              <span className={`text-xs ${getConfidenceColor(impact.confidence)}`}>
                <Target className="h-3 w-3 inline mr-1" />
                {Math.round(impact.confidence * 100)}%
              </span>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-white border-2 border-gray-300 transition-colors"
            aria-label={isExpanded ? 'Collapse impact analysis' : 'Expand impact analysis'}
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-600" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Summary - Always Visible */}
      <div className="p-4">
        <p className="text-gray-700 leading-relaxed">{impact.summary}</p>
      </div>

      {/* Expandable Detail Sections */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Economic Impact */}
          {impact.economicImpact && (
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-civiq-blue" />
                Economic Impact
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">{impact.economicImpact}</p>
            </div>
          )}

          {/* Infrastructure Impact */}
          {impact.infrastructureImpact && (
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Wifi className="h-4 w-4 text-civiq-blue" />
                Infrastructure Impact
              </h4>
              <p className="text-gray-700 text-sm leading-relaxed">{impact.infrastructureImpact}</p>
            </div>
          )}

          {/* Affected Groups */}
          {impact.affectedGroups.length > 0 && (
            <div className="p-4 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-civiq-blue" />
                Who&apos;s Affected
              </h4>
              <div className="space-y-3">
                {impact.affectedGroups.map((group, index) => (
                  <div key={index} className="p-3 bg-gray-50 border border-gray-200">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{group.group}</span>
                      {group.scale && <span className="text-xs text-gray-500">{group.scale}</span>}
                    </div>
                    <p className="text-sm text-gray-600">{group.impact}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* District Data */}
          {impact.relevantDistrictData.length > 0 && (
            <div className="p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-civiq-blue" />
                District Data
              </h4>
              <div className="space-y-2">
                {impact.relevantDistrictData.map((data, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200"
                  >
                    <div>
                      <span className="text-sm font-medium text-gray-900">{data.metric}</span>
                      <p className="text-xs text-gray-500">{data.context}</p>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{data.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-3 w-3" />
            <span>
              {impact.source === 'ai-generated'
                ? 'AI-generated analysis'
                : 'Data-only analysis (AI unavailable)'}{' '}
              • District data from BLS, FCC, USASpending.gov
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DistrictImpactSkeletonProps {
  className?: string;
}

export function DistrictImpactSkeleton({ className = '' }: DistrictImpactSkeletonProps) {
  return (
    <div className={`bg-white border-2 border-black animate-pulse ${className}`}>
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 bg-gray-300"></div>
          <div className="h-4 w-32 bg-gray-300"></div>
          <div className="h-6 w-24 bg-gray-300"></div>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-300"></div>
          <div className="h-4 w-4/5 bg-gray-300"></div>
          <div className="h-4 w-3/5 bg-gray-300"></div>
        </div>
      </div>
      <div className="px-4 py-3 bg-white border-t border-gray-100">
        <div className="h-3 w-1/2 bg-gray-300"></div>
      </div>
    </div>
  );
}

interface DistrictImpactErrorProps {
  error: string;
  onRetry?: () => void;
  className?: string;
}

export function DistrictImpactError({ error, onRetry, className = '' }: DistrictImpactErrorProps) {
  return (
    <div className={`bg-white border-2 border-black ${className}`}>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-sm font-medium text-red-600">District Impact Unavailable</span>
        </div>
        <p className="text-gray-700 mb-4">
          {error || 'Unable to generate district impact analysis at this time.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

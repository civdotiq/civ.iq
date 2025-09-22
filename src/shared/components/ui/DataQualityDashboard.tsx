'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState } from 'react';
import { DataSourceBadge } from '@/components/shared/ui/DataQualityIndicator';

interface DataQualityMetrics {
  overall: {
    score: number;
    status: 'excellent' | 'good' | 'fair' | 'poor';
    trend: 'improving' | 'stable' | 'declining';
  };
  sources: {
    [key: string]: {
      name: string;
      status: 'healthy' | 'degraded' | 'failed';
      completeness: number;
      reliability: number;
      latency: number;
      uptime: number;
      lastUpdate: string;
      issues: string[];
    };
  };
  recommendations: string[];
  timestamp: string;
}

interface DataQualityDashboardProps {
  metrics: DataQualityMetrics;
  className?: string;
}

export function DataQualityDashboard({ metrics, className = '' }: DataQualityDashboardProps) {
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-white border-2 border-gray-300 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return { icon: '📈', color: 'text-green-600' };
      case 'stable':
        return { icon: '➡️', color: 'text-blue-600' };
      case 'declining':
        return { icon: '📉', color: 'text-red-600' };
      default:
        return { icon: '❓', color: 'text-gray-600' };
    }
  };

  const trendInfo = getTrendIcon(metrics.overall.trend);

  return (
    <div className={`bg-white border-2 border-black border p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Data Quality Dashboard</h3>
        <span className="text-sm text-gray-500">
          Updated {new Date(metrics.timestamp).toLocaleString()}
        </span>
      </div>

      {/* Overall Score */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getScoreColor(metrics.overall.score)}`}>
              {metrics.overall.score}
            </div>
            <div className="text-sm text-gray-600">Overall Score</div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(metrics.overall.status)}`}
            >
              {metrics.overall.status}
            </span>
            <span className={`flex items-center gap-1 text-sm ${trendInfo.color}`}>
              {trendInfo.icon} {metrics.overall.trend}
            </span>
          </div>
        </div>

        {/* Score Breakdown Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              metrics.overall.score >= 90
                ? 'bg-green-500'
                : metrics.overall.score >= 75
                  ? 'bg-yellow-500'
                  : metrics.overall.score >= 50
                    ? 'bg-orange-500'
                    : 'bg-red-500'
            }`}
            style={{ width: `${metrics.overall.score}%` }}
          />
        </div>
      </div>

      {/* Data Sources */}
      <div className="mb-6">
        <h4 className="text-md font-semibold text-gray-900 mb-3">Data Sources</h4>
        <div className="space-y-3">
          {Object.entries(metrics.sources).map(([key, source]) => (
            <div key={key} className="border">
              <div
                className="p-4 cursor-pointer hover:bg-white transition-colors"
                onClick={() => setExpandedSource(expandedSource === key ? null : key)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DataSourceBadge source={key} />
                    <span className="font-medium">{source.name}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${getStatusColor(source.status)}`}
                    >
                      {source.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className={getScoreColor(source.completeness)}>
                      {source.completeness}% complete
                    </span>
                    <span className={getScoreColor(source.reliability)}>
                      {source.reliability}% reliable
                    </span>
                    <span>{expandedSource === key ? '▼' : '▶'}</span>
                  </div>
                </div>
              </div>

              {expandedSource === key && (
                <div className="px-4 pb-4 border-t bg-white">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3 mb-4">
                    <div className="text-center">
                      <div
                        className={`text-lg font-semibold ${getScoreColor(source.completeness)}`}
                      >
                        {source.completeness}%
                      </div>
                      <div className="text-xs text-gray-600">Completeness</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getScoreColor(source.reliability)}`}>
                        {source.reliability}%
                      </div>
                      <div className="text-xs text-gray-600">Reliability</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-blue-600">{source.latency}ms</div>
                      <div className="text-xs text-gray-600">Avg Latency</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${getScoreColor(source.uptime)}`}>
                        {source.uptime}%
                      </div>
                      <div className="text-xs text-gray-600">Uptime</div>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-2">
                    Last updated: {new Date(source.lastUpdate).toLocaleString()}
                  </div>

                  {source.issues.length > 0 && (
                    <div className="mt-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Recent Issues:</div>
                      <ul className="text-sm text-gray-600 space-y-1">
                        {source.issues.map((issue, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">⚠</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      {metrics.recommendations.length > 0 && (
        <div>
          <h4 className="text-md font-semibold text-gray-900 mb-3">Recommendations</h4>
          <div className="space-y-2">
            {metrics.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-2 p-3 bg-blue-50">
                <span className="text-blue-500 mt-0.5">💡</span>
                <span className="text-sm text-blue-800">{recommendation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Utility component for inline quality scores
interface InlineQualityScoreProps {
  score: number;
  label?: string;
  showTrend?: boolean;
  trend?: 'up' | 'down' | 'stable';
}

export function InlineQualityScore({
  score,
  label = 'Quality',
  showTrend = false,
  trend = 'stable',
}: InlineQualityScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 75) return 'text-yellow-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return '↗️';
      case 'down':
        return '↘️';
      case 'stable':
        return '→';
      default:
        return '';
    }
  };

  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-gray-600">{label}:</span>
      <span className={`font-semibold ${getScoreColor(score)}`}>{score}%</span>
      {showTrend && <span className="text-xs">{getTrendIcon(trend)}</span>}
    </span>
  );
}

// Component for showing data trust level
interface DataTrustIndicatorProps {
  sources: string[];
  className?: string;
}

export function DataTrustIndicator({ sources, className = '' }: DataTrustIndicatorProps) {
  // Defensive programming: handle missing sources prop at component level
  const safeSources = sources || [];

  const calculateTrustScore = (sources: string[]) => {
    // Defensive programming: handle undefined, null, or empty sources
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return 0; // Return 0 trust score for missing data
    }

    const trustScores = sources.map(source => {
      // Defensive check for undefined/null source strings
      if (!source || typeof source !== 'string') return 0;

      if (source.includes('congress.gov') || source.includes('census')) return 95;
      if (source.includes('congress-legislators')) return 90;
      if (source.includes('fec')) return 85;
      if (source.includes('openstates')) return 80;
      if (source.includes('mock') || source.includes('fallback')) return 20;
      return 50;
    });

    // Additional check to prevent division by zero
    if (trustScores.length === 0) return 0;

    return Math.round(
      (trustScores as number[]).reduce((sum, score) => sum + score, 0) / trustScores.length
    ) as number;
  };

  const trustScore = calculateTrustScore(safeSources);
  const getColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 75) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 50) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1 border text-sm ${getColor(trustScore)} ${className}`}
    >
      <span className="font-medium">🛡️ Trust Score: {trustScore}%</span>
      <div className="flex gap-1">
        {safeSources.map((source, index) => (
          <DataSourceBadge key={index} source={source} className="text-xs" />
        ))}
      </div>
    </div>
  );
}

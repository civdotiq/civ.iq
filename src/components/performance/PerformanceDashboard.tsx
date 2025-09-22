/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import { usePerformanceMetrics, useBundleMetrics } from '@/hooks/usePerformanceMetrics';

interface PerformanceDashboardProps {
  showDevOnly?: boolean;
}

export function PerformanceDashboard({ showDevOnly = true }: PerformanceDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const performanceData = usePerformanceMetrics('PerformanceDashboard');
  const bundleData = useBundleMetrics();

  // Only show in development unless explicitly overridden
  if (showDevOnly && process.env.NODE_ENV !== 'development') {
    return null;
  }

  const summary = performanceData.getMetricsSummary();
  const gradeColors = {
    excellent: 'text-green-600 bg-green-50',
    good: 'text-blue-600 bg-blue-50',
    'needs-improvement': 'text-yellow-600 bg-yellow-50',
    poor: 'text-red-600 bg-red-50',
  };

  const formatTime = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    return `${Math.round(ms)}ms`;
  };

  const formatSeconds = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Collapsed view */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={`px-3 py-2 border-2 border-black text-sm font-medium transition-colors ${
            gradeColors[summary.performanceGrade]
          }`}
          title="Click to expand performance metrics"
        >
          ⚡ {summary.performanceGrade.toUpperCase()}
        </button>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="bg-white border-2 border-black border p-4 max-w-sm max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-semibold text-gray-900">Performance Metrics</h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Collapse"
            >
              ✕
            </button>
          </div>

          {/* Performance Grade */}
          <div className="mb-4">
            <div
              className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                gradeColors[summary.performanceGrade]
              }`}
            >
              Grade: {summary.performanceGrade.toUpperCase()}
            </div>
          </div>

          {/* Web Vitals */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Web Vitals</h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>First Contentful Paint:</span>
                <span className="font-mono">{formatTime(performanceData.pageMetrics.fcp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Largest Contentful Paint:</span>
                <span className="font-mono">{formatTime(performanceData.pageMetrics.lcp)}</span>
              </div>
              <div className="flex justify-between">
                <span>Time to First Byte:</span>
                <span className="font-mono">{formatTime(performanceData.pageMetrics.ttfb)}</span>
              </div>
              <div className="flex justify-between">
                <span>DOM Content Loaded:</span>
                <span className="font-mono">
                  {formatSeconds(performanceData.pageMetrics.domContentLoaded)}
                </span>
              </div>
            </div>
          </div>

          {/* Bundle Information */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Bundle Stats</h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Total Size:</span>
                <span className="font-mono">{bundleData.bundleMetrics.totalSizeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>JS Size:</span>
                <span className="font-mono">{bundleData.bundleMetrics.jsSizeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>CSS Size:</span>
                <span className="font-mono">{bundleData.bundleMetrics.cssSizeFormatted}</span>
              </div>
              <div className="flex justify-between">
                <span>Chunks:</span>
                <span className="font-mono">{bundleData.bundleMetrics.chunkCount}</span>
              </div>
            </div>
          </div>

          {/* Component Metrics */}
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-gray-700">Component Stats</h4>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span>Render Time:</span>
                <span className="font-mono">
                  {formatTime(performanceData.componentMetrics.renderTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Updates:</span>
                <span className="font-mono">{performanceData.componentMetrics.updateCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Errors:</span>
                <span className="font-mono">{performanceData.componentMetrics.errorCount}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg Render:</span>
                <span className="font-mono">{formatTime(summary.averageRenderTime)}</span>
              </div>
            </div>
          </div>

          {/* Recent Metrics */}
          {summary.recentMetrics.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700">Recent Activity</h4>
              <div className="text-xs space-y-1 max-h-24 overflow-y-auto">
                {summary.recentMetrics.slice(-5).map((metric, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="truncate">{metric.name}:</span>
                    <span className="font-mono">
                      {Math.round(metric.value)}
                      {metric.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-3 pt-2 border-t text-xs text-gray-500">
            Total: {summary.totalMetrics} metrics collected
          </div>
        </div>
      )}
    </div>
  );
}

// HOC for automatically tracking component performance
export function withPerformanceTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) {
  const PerformanceTrackedComponent = (props: P) => {
    const { startTimer } = usePerformanceMetrics(
      componentName || WrappedComponent.displayName || WrappedComponent.name
    );

    React.useEffect(() => {
      const stopTimer = startTimer('component-mount');
      return () => {
        stopTimer();
      };
    }, [startTimer]);

    return <WrappedComponent {...props} />;
  };

  PerformanceTrackedComponent.displayName = `withPerformanceTracking(${
    componentName || WrappedComponent.displayName || WrappedComponent.name
  })`;

  return PerformanceTrackedComponent;
}

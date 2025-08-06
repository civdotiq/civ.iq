/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ErrorAnalytics } from '@/lib/errors/ErrorHandlers';
// CiviqError type available for future use if needed
import { structuredLogger } from '@/lib/logging/universal-logger';

interface ErrorStats {
  errorCode: string;
  count: number;
  lastSeen: string;
}

interface ErrorFeedback {
  errorCode: string;
  helpful: boolean;
  comment?: string;
  timestamp: string;
  url: string;
}

interface ErrorReport {
  error?: {
    code?: string;
    severity?: string;
    message?: string;
    userMessage?: string;
    context?: unknown;
  };
  timestamp: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
}

export function ErrorMonitoringDashboard() {
  const [errorStats, setErrorStats] = useState<ErrorStats[]>([]);
  const [errorReports, setErrorReports] = useState<ErrorReport[]>([]);
  const [errorFeedback, setErrorFeedback] = useState<ErrorFeedback[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d' | 'all'>('24h');

  const loadErrorData = useCallback(() => {
    try {
      // Load error statistics
      const stats = ErrorAnalytics.getErrorStats();
      setErrorStats(stats);

      // Load detailed error reports
      const reports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      const analytics = JSON.parse(localStorage.getItem('errorAnalytics') || '[]');
      const allReports = [...reports, ...analytics];

      // Filter by timeframe
      const now = new Date();
      const filteredReports = allReports.filter(report => {
        const reportTime = new Date(report.timestamp);
        const diffHours = (now.getTime() - reportTime.getTime()) / (1000 * 60 * 60);

        switch (selectedTimeframe) {
          case '1h':
            return diffHours <= 1;
          case '24h':
            return diffHours <= 24;
          case '7d':
            return diffHours <= 168; // 7 * 24
          case 'all':
            return true;
          default:
            return diffHours <= 24;
        }
      });

      setErrorReports(filteredReports);

      // Load error feedback
      const feedback = JSON.parse(localStorage.getItem('errorFeedback') || '[]');
      setErrorFeedback(feedback);
    } catch (e) {
      structuredLogger.error('Failed to load error data', {
        component: 'ErrorMonitoringDashboard',
        error: e as Error,
      });
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    loadErrorData();
  }, [loadErrorData]);

  const clearErrorData = () => {
    if (confirm('Are you sure you want to clear all error data?')) {
      localStorage.removeItem('errorReports');
      localStorage.removeItem('errorAnalytics');
      localStorage.removeItem('errorFeedback');
      localStorage.removeItem('manualErrorReports');
      loadErrorData();
    }
  };

  const exportErrorData = () => {
    const data = {
      stats: errorStats,
      reports: errorReports,
      feedback: errorFeedback,
      exportTime: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `civiq-error-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'text-yellow-600 bg-yellow-100';
      case 'medium':
        return 'text-orange-600 bg-orange-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'critical':
        return 'text-red-800 bg-red-200';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (count: number) => {
    if (count > 10) {
      return <span className="text-red-500">📈</span>;
    } else if (count > 5) {
      return <span className="text-yellow-500">📊</span>;
    } else {
      return <span className="text-green-500">📉</span>;
    }
  };

  const getErrorResolutionRate = () => {
    const totalFeedback = errorFeedback.length;
    if (totalFeedback === 0) return 0;

    const helpfulFeedback = errorFeedback.filter(f => f.helpful).length;
    return Math.round((helpfulFeedback / totalFeedback) * 100);
  };

  const getMostProblematicErrors = () => {
    return errorStats
      .filter(stat => stat.count > 1)
      .slice(0, 5)
      .map(stat => {
        const relatedFeedback = errorFeedback.filter(f => f.errorCode === stat.errorCode);
        const helpfulCount = relatedFeedback.filter(f => f.helpful).length;
        const helpfulRate =
          relatedFeedback.length > 0 ? (helpfulCount / relatedFeedback.length) * 100 : 0;

        return {
          ...stat,
          feedbackCount: relatedFeedback.length,
          helpfulRate: Math.round(helpfulRate),
        };
      });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Error Monitoring Dashboard</h1>
        <div className="flex gap-3">
          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value as '1h' | '24h' | '7d' | 'all')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-civiq-blue"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={exportErrorData}
            className="px-4 py-2 bg-civiq-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Export Data
          </button>
          <button
            onClick={clearErrorData}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Errors</h3>
          <p className="text-3xl font-bold text-gray-900">{errorReports.length}</p>
          <p className="text-sm text-gray-600 mt-1">
            {selectedTimeframe === 'all' ? 'All time' : `Last ${selectedTimeframe}`}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Unique Error Types</h3>
          <p className="text-3xl font-bold text-gray-900">{errorStats.length}</p>
          <p className="text-sm text-gray-600 mt-1">Different error codes</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">User Feedback</h3>
          <p className="text-3xl font-bold text-gray-900">{errorFeedback.length}</p>
          <p className="text-sm text-gray-600 mt-1">{getErrorResolutionRate()}% found helpful</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Top Issue</h3>
          <p className="text-xl font-bold text-gray-900">{errorStats[0]?.errorCode || 'None'}</p>
          <p className="text-sm text-gray-600 mt-1">{errorStats[0]?.count || 0} occurrences</p>
        </div>
      </div>

      {/* Most Problematic Errors */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Most Problematic Errors</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Error Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Count
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Trend
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User Feedback
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Last Seen
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {getMostProblematicErrors().map((error, _index) => (
                <tr key={error.errorCode} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">{error.errorCode}</code>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">{error.count}</td>
                  <td className="px-4 py-4 text-sm">{getTrendIcon(error.count)}</td>
                  <td className="px-4 py-4 text-sm">
                    {error.feedbackCount > 0 ? (
                      <div>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            error.helpfulRate > 70
                              ? 'bg-green-100 text-green-800'
                              : error.helpfulRate > 40
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {error.helpfulRate}% helpful
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {error.feedbackCount} response{error.feedbackCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">No feedback</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500">
                    {new Date(error.lastSeen).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Error Reports */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Error Reports</h2>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {errorReports.slice(0, 10).map((report, index) => (
            <div key={index} className="border border-gray-100 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {report.error?.code || 'UNKNOWN'}
                  </code>
                  <span
                    className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(
                      report.error?.severity || 'medium'
                    )}`}
                  >
                    {report.error?.severity || 'medium'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(report.timestamp).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-900 mb-2">
                {report.error?.userMessage || report.error?.message || 'No message'}
              </p>
              <div className="text-xs text-gray-500">
                <span className="font-medium">URL:</span> {report.url}
              </div>
              {report.error?.context !== undefined && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-600 cursor-pointer">Show details</summary>
                  <pre className="text-xs bg-gray-50 p-2 rounded mt-1 overflow-auto">
                    {String(JSON.stringify(report.error.context, null, 2))}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* User Feedback */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold mb-4">User Feedback on Error Messages</h2>
        <div className="space-y-3">
          {errorFeedback.slice(0, 10).map((feedback, index) => (
            <div key={index} className="border-l-4 border-gray-200 pl-4">
              <div className="flex justify-between items-start">
                <div>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                    {feedback.errorCode}
                  </code>
                  <span
                    className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      feedback.helpful ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {feedback.helpful ? 'Helpful' : 'Not Helpful'}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(feedback.timestamp).toLocaleDateString()}
                </span>
              </div>
              {feedback.comment && (
                <p className="text-sm text-gray-700 mt-2 italic">
                  &ldquo;{feedback.comment}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

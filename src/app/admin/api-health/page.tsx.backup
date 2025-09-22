/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface APIHealthDetails {
  hasData?: boolean;
  sampleSize?: number;
  [key: string]: unknown;
}

interface APIHealthCheck {
  name: string;
  status: 'operational' | 'degraded' | 'error';
  responseTime: number;
  lastChecked: string;
  details?: APIHealthDetails;
  error?: string;
}

interface HealthReport {
  timestamp: string;
  overall: 'operational' | 'degraded' | 'error';
  apis: APIHealthCheck[];
  environment: {
    NODE_ENV: string;
    apiKeysConfigured: {
      congress: boolean;
      fec: boolean;
      census: boolean;
      openStates: boolean;
      openAI: boolean;
    };
  };
}

export default function APIHealthPage() {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/api-health');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setHealth(data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational':
        return 'text-green-600 bg-green-50';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational':
        return '✅';
      case 'degraded':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '❔';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/" className="text-civiq-blue hover:underline mb-4 inline-block">
            ← Back to Home
          </Link>

          <h1 className="text-3xl font-bold text-gray-900">API Health Dashboard</h1>
          <p className="mt-2 text-gray-600">Monitor the status of all external APIs and services</p>
        </div>

        {loading && !health && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-civiq-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading health status...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchHealth}
              className="mt-2 text-red-600 underline hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        )}

        {health && (
          <>
            {/* Overall Status */}
            <div className={`rounded-lg p-6 mb-6 ${getStatusColor(health.overall)}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-semibold flex items-center gap-2">
                    {getStatusIcon(health.overall)}
                    System Status:{' '}
                    {health.overall.charAt(0).toUpperCase() + health.overall.slice(1)}
                  </h2>
                  <p className="mt-1 text-sm opacity-75">
                    Last checked: {new Date(health.timestamp).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={fetchHealth}
                  disabled={loading}
                  className="px-4 py-2 bg-white rounded-md shadow hover:shadow-md transition-shadow disabled:opacity-50"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* API Keys Configuration */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <h3 className="text-lg font-semibold mb-4">API Key Configuration</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {Object.entries(health.environment.apiKeysConfigured).map(([key, configured]) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className={configured ? 'text-green-600' : 'text-red-600'}>
                      {configured ? '✅' : '❌'}
                    </span>
                    <span className="text-sm capitalize">{key}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Individual API Status */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold">API Status Details</h3>
              </div>
              <div className="divide-y">
                {health.apis.map((api, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{getStatusIcon(api.status)}</span>
                          <h4 className="font-medium">{api.name}</h4>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${getStatusColor(api.status)}`}
                          >
                            {api.status}
                          </span>
                        </div>

                        {api.error && (
                          <p className="mt-1 text-sm text-red-600">Error: {api.error}</p>
                        )}

                        {api.details && (
                          <p className="mt-1 text-sm text-gray-600">
                            {api.details.hasData
                              ? `✓ Returning data (${api.details.sampleSize || 0} items sampled)`
                              : 'No data returned'}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-medium">{api.responseTime}ms</p>
                        <p className="text-xs text-gray-500">
                          {new Date(api.lastChecked).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-green-600">
                  {health.apis.filter(a => a.status === 'operational').length}
                </p>
                <p className="text-sm text-green-800">Operational</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {health.apis.filter(a => a.status === 'degraded').length}
                </p>
                <p className="text-sm text-yellow-800">Degraded</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {health.apis.filter(a => a.status === 'error').length}
                </p>
                <p className="text-sm text-red-800">Error</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

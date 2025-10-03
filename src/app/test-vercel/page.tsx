/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

interface TestResult {
  endpoint: string;
  status: 'pending' | 'success' | 'error' | 'running';
  statusCode?: number;
  responseTime?: number;
  error?: string;
  dataReceived?: boolean;
  dataDetails?: string;
}

export default function TestVercelPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const testEndpoints = [
    {
      name: 'Health Check',
      endpoint: '/api/health',
      expectedData: (data: unknown) => !!(data as { status?: string })?.status,
    },
    {
      name: 'Debug Diagnostics',
      endpoint: '/api/debug',
      expectedData: (data: unknown) => !!(data as { success?: boolean })?.success,
    },
    {
      name: 'Representative (Bernie Sanders)',
      endpoint: '/api/representative/S000033',
      expectedData: (data: unknown) =>
        !!(data as { representative?: unknown })?.representative ||
        !!(data as { profile?: unknown })?.profile,
    },
    {
      name: 'Voting Records (Bernie Sanders)',
      endpoint: '/api/representative/S000033/votes?limit=5',
      expectedData: (data: unknown) =>
        Array.isArray((data as { votes?: unknown[] })?.votes) &&
        (data as { votes: unknown[] }).votes.length > 0,
    },
    {
      name: 'Bills (Bernie Sanders)',
      endpoint: '/api/representative/S000033/bills?limit=5',
      expectedData: (data: unknown) =>
        (Array.isArray((data as { bills?: unknown[] })?.bills) &&
          (data as { bills: unknown[] }).bills.length > 0) ||
        (Array.isArray((data as { sponsoredLegislation?: unknown[] })?.sponsoredLegislation) &&
          (data as { sponsoredLegislation: unknown[] }).sponsoredLegislation.length > 0),
    },
    {
      name: 'Finance (Bernie Sanders)',
      endpoint: '/api/representative/S000033/finance',
      expectedData: (data: unknown) => {
        const financeData = data as { success?: boolean };
        return financeData.success !== false; // Accept even if no data, as long as no error
      },
    },
  ];

  const runTests = async () => {
    setTesting(true);
    const initialResults: TestResult[] = testEndpoints.map(test => ({
      endpoint: test.endpoint,
      status: 'pending',
    }));
    setResults(initialResults);

    for (let i = 0; i < testEndpoints.length; i++) {
      const test = testEndpoints[i];
      if (!test) continue; // Safety check

      // Update status to running
      setResults(prev =>
        prev.map((r, idx) => (idx === i ? { ...r, status: 'running' as const } : r))
      );

      const startTime = Date.now();

      try {
        // Get base URL for API calls
        const baseUrl =
          typeof window !== 'undefined'
            ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
            : '';
        const url = `${baseUrl}${test.endpoint}`;

        const response = await fetch(url, {
          signal: AbortSignal.timeout(30000), // 30 second timeout
        });

        const responseTime = Date.now() - startTime;
        const data = await response.json();

        const dataReceived = test.expectedData(data);

        setResults(prev =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: response.ok && dataReceived ? 'success' : 'error',
                  statusCode: response.status,
                  responseTime,
                  dataReceived,
                  dataDetails: dataReceived ? 'Data structure valid' : 'No expected data found',
                  error: !response.ok ? `HTTP ${response.status}` : undefined,
                }
              : r
          )
        );
      } catch (error) {
        const responseTime = Date.now() - startTime;
        setResults(prev =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: 'error',
                  responseTime,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  dataReceived: false,
                }
              : r
          )
        );
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setTesting(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <Clock className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 border-2 border-black mb-6">
          <h1 className="text-2xl font-bold mb-2">Vercel Deployment Test Suite</h1>
          <p className="text-gray-600">
            Tests all critical API endpoints for Vercel deployment validation
          </p>

          <div className="mt-4 flex gap-4">
            <button
              onClick={runTests}
              disabled={testing}
              className={`px-6 py-3 font-semibold border-2 border-black ${
                testing
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-civiq-blue text-white hover:bg-blue-600'
              }`}
            >
              {testing ? 'Testing...' : 'Run All Tests'}
            </button>

            {results.length > 0 && (
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-semibold">{successCount} Passed</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-semibold">{errorCount} Failed</span>
                </div>
              </div>
            )}
          </div>

          {/* Environment Info */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-300">
            <h3 className="font-semibold mb-2">Environment Info</h3>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt className="text-gray-600">Base URL:</dt>
              <dd className="font-mono">
                {typeof window !== 'undefined'
                  ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
                  : 'N/A'}
              </dd>
              <dt className="text-gray-600">NEXT_PUBLIC_APP_URL:</dt>
              <dd className="font-mono">
                {process.env.NEXT_PUBLIC_APP_URL || '(not set - using window.location.origin)'}
              </dd>
            </dl>
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-3">
          {results.map((result, idx) => (
            <div
              key={idx}
              className={`bg-white p-4 border-2 ${
                result.status === 'success'
                  ? 'border-green-500'
                  : result.status === 'error'
                    ? 'border-red-500'
                    : result.status === 'running'
                      ? 'border-blue-500'
                      : 'border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(result.status)}
                    <h3 className="font-semibold">{testEndpoints[idx]?.name || 'Unknown Test'}</h3>
                  </div>

                  <div className="text-sm font-mono text-gray-600 mb-2">{result.endpoint}</div>

                  {result.statusCode && (
                    <div className="flex gap-4 text-sm">
                      <span className={result.statusCode === 200 ? 'text-green-600' : 'text-red-600'}>
                        Status: {result.statusCode}
                      </span>
                      {result.responseTime && (
                        <span
                          className={
                            result.responseTime < 1000
                              ? 'text-green-600'
                              : result.responseTime < 3000
                                ? 'text-yellow-600'
                                : 'text-red-600'
                          }
                        >
                          Time: {result.responseTime}ms
                        </span>
                      )}
                    </div>
                  )}

                  {result.dataReceived !== undefined && (
                    <div className="mt-2">
                      <span
                        className={`text-sm ${result.dataReceived ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {result.dataReceived ? '✓ Data received' : '✗ No expected data'}
                      </span>
                      {result.dataDetails && (
                        <span className="text-sm text-gray-500 ml-2">({result.dataDetails})</span>
                      )}
                    </div>
                  )}

                  {result.error && (
                    <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 border border-red-200">
                      Error: {result.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {results.length === 0 && (
          <div className="bg-white p-8 border-2 border-gray-300 text-center text-gray-500">
            Click &quot;Run All Tests&quot; to begin testing
          </div>
        )}

        {/* Recommendations */}
        {results.length > 0 && errorCount > 0 && (
          <div className="mt-6 bg-yellow-50 border-2 border-yellow-500 p-6">
            <h3 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Troubleshooting Recommendations
            </h3>
            <ul className="list-disc list-inside space-y-2 text-sm text-yellow-900">
              {errorCount > 0 && (
                <li>
                  Check the <code className="bg-yellow-100 px-1">/api/debug</code> endpoint for
                  detailed diagnostics
                </li>
              )}
              {results.some(r => r.error?.includes('timeout')) && (
                <li>Some endpoints are timing out - increase maxDuration in vercel.json</li>
              )}
              {results.some(r => r.statusCode === 404) && (
                <li>404 errors indicate routing issues - check dynamic route configurations</li>
              )}
              {results.some(r => r.dataReceived === false && r.statusCode === 200) && (
                <li>
                  APIs returning 200 but no data - check API key configuration in Vercel
                  environment variables
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

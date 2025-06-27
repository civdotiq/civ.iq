'use client';

import { useState } from 'react';

export default function APITestPage() {
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<string | null>(null);

  const testAPI = async (name: string, url: string) => {
    setLoading(name);
    try {
      const response = await fetch(url);
      const data = await response.json();
      setResults(prev => ({
        ...prev,
        [name]: {
          status: response.ok ? 'success' : 'error',
          statusCode: response.status,
          data: data
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [name]: {
          status: 'error',
          error: error.message
        }
      }));
    } finally {
      setLoading(null);
    }
  };

  const tests = [
    {
      name: 'Environment Check',
      url: '/api/env-check',
      description: 'Verify API keys are loaded from .env.local'
    },
    {
      name: 'Debug All APIs',
      url: '/api/debug',
      description: 'Comprehensive test of all API connections and configurations'
    },
    {
      name: 'Congress API Deep Dive',
      url: '/api/debug/congress',
      description: 'Detailed Congress API testing for 119th Congress'
    },
    {
      name: 'Representative Info',
      url: '/api/representative/P000595',
      description: 'Tests Congress.gov API integration (Gary Peters)'
    },
    {
      name: 'Campaign Finance',
      url: '/api/representative/P000595/finance',
      description: 'Tests FEC API integration'
    },
    {
      name: 'Recent News',
      url: '/api/representative/P000595/news',
      description: 'Tests GDELT API integration'
    },
    {
      name: 'GDELT Direct Test',
      url: '/api/test-gdelt?q=Gary Peters Michigan',
      description: 'Direct test of GDELT API'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">API Diagnostic Test</h1>
        
        <div className="space-y-6">
          {tests.map((test) => (
            <div key={test.name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">{test.name}</h3>
                  <p className="text-sm text-gray-600">{test.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Endpoint: {test.url}</p>
                </div>
                <button
                  onClick={() => testAPI(test.name, test.url)}
                  disabled={loading === test.name}
                  className="px-4 py-2 bg-civiq-blue text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading === test.name ? 'Testing...' : 'Test'}
                </button>
              </div>
              
              {results[test.name] && (
                <div className="mt-4 p-4 bg-gray-50 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`inline-block w-3 h-3 rounded-full ${
                      results[test.name].status === 'success' ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="font-medium">
                      {results[test.name].status === 'success' ? 'Success' : 'Failed'}
                    </span>
                    {results[test.name].statusCode && (
                      <span className="text-sm text-gray-600">
                        (Status: {results[test.name].statusCode})
                      </span>
                    )}
                  </div>
                  
                  <pre className="text-xs overflow-x-auto p-2 bg-white rounded border">
                    {JSON.stringify(results[test.name].data || results[test.name].error, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Troubleshooting Tips:</h3>
          <ul className="list-disc list-inside text-sm space-y-1">
            <li className="font-semibold text-yellow-800">If Environment Check shows "NOT FOUND": Restart your dev server after updating .env.local</li>
            <li>If APIs return 401/403: Check your API keys in .env.local</li>
            <li>If GDELT returns empty: The search terms might not match any recent news</li>
            <li>If FEC returns null: The representative might not have recent campaign data</li>
            <li>Check the browser console (F12) for additional error details</li>
            <li>Check your server terminal for console.log outputs</li>
          </ul>
        </div>
        
        <div className="mt-4 text-center">
          <a href="/" className="text-civiq-blue hover:underline">← Back to Home</a>
        </div>
      </div>
    </div>
  );
}
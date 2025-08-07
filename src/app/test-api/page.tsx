'use client';

import { useState } from 'react';

export default function TestAPI() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testAPI = async (bioguideId: string) => {
    setLoading(true);
    try {
      // eslint-disable-next-line no-console
      console.log('[CLIENT] Testing API call for:', bioguideId);
      const response = await fetch(`/api/representative/${bioguideId}`);
      const data = await response.json();

      // eslint-disable-next-line no-console
      console.log('[CLIENT] Response status:', response.status);
      // eslint-disable-next-line no-console
      console.log('[CLIENT] Response data:', data);

      setResult(
        JSON.stringify(
          {
            status: response.status,
            ok: response.ok,
            data,
          },
          null,
          2
        )
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[CLIENT] API test error:', error);
      setResult(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Congress.gov API Test</h1>

      <div className="space-y-4 mb-6">
        <button
          onClick={() => testAPI('T000488')}
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
        >
          Test T000488 (Tlaib)
        </button>

        <button
          onClick={() => testAPI('A000374')}
          disabled={loading}
          className="bg-green-500 text-white px-4 py-2 rounded disabled:opacity-50 mr-4"
        >
          Test A000374 (Adams)
        </button>

        <button
          onClick={() => testAPI('B000574')}
          disabled={loading}
          className="bg-purple-500 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          Test B000574 (Blumenauer)
        </button>
      </div>

      {loading && (
        <div className="text-blue-600 mb-4">
          Loading... Check browser console and Vercel logs for details.
        </div>
      )}

      {result && (
        <div>
          <h2 className="text-lg font-semibold mb-2">API Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">{result}</pre>
        </div>
      )}

      <div className="mt-8 text-sm text-gray-600">
        <p>
          <strong>Instructions:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Click a test button</li>
          <li>Open browser DevTools Console (F12)</li>
          <li>
            Check Vercel logs: <code>vercel logs --follow</code>
          </li>
          <li>Look for [API] and [CLIENT] log messages</li>
        </ol>
      </div>
    </div>
  );
}

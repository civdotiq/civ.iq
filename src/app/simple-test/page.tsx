'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { logger } from '@/lib/logging/logger-client';

export default function SimpleTestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Simple Test Page</h1>
      <p>If you can see this, the app is working.</p>

      <div className="mt-8 space-y-4">
        <button
          onClick={() =>
            fetch('/api/test')
              .then(r => r.json())
              .then(data => logger.info('Test API result:', { data }))
              .catch(error => logger.error('Test API error:', error as Error))
          }
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Test Basic API
        </button>

        <button
          onClick={() =>
            fetch('/api/env-check')
              .then(r => r.json())
              .then(data => logger.info('Env check result:', { data }))
              .catch(error => logger.error('Env check error:', error as Error))
          }
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Test Env Check
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-600">Check browser console for results</p>
    </div>
  );
}

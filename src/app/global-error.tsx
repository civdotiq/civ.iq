'use client';


/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log global error details for debugging
    console.error('Global Error:', {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      component: 'app/global-error.tsx'
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Application Error</h2>
            <p className="text-gray-600 mb-4">
              Something went wrong with the application. Please try refreshing the page.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details className="text-left mb-4">
                <summary className="cursor-pointer text-sm text-gray-500">Error details</summary>
                <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto">
                  {error.message}
                  {error.stack}
                </pre>
              </details>
            )}
            <button
              onClick={reset}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2"
            >
              Try again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go to Home
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
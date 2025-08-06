/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState } from 'react';
import {
  InvalidZipCodeError,
  InvalidAddressError,
  RepresentativeNotFoundError,
  TimeoutError,
  RateLimitError,
  CongressApiError,
  NetworkError,
  ServerError,
} from '@/lib/errors/ErrorTypes';
import { ErrorDisplay, InlineError, ErrorToast } from '@/shared/components/ui/ErrorComponents';
import { EnhancedErrorBoundary } from '@/components/common/EnhancedErrorBoundary';
import { SearchValidation } from '@/features/search/components/search/SearchValidation';

export function ErrorSystemDemo() {
  const [activeDemo, setActiveDemo] = useState<string>('validation');
  const [selectedError, setSelectedError] = useState<string>('');
  const [showToast, setShowToast] = useState(false);

  // Sample errors for demonstration
  const sampleErrors = {
    invalidZip: new InvalidZipCodeError('1234'),
    invalidAddress: new InvalidAddressError('abc'),
    repNotFound: new RepresentativeNotFoundError('99999'),
    timeout: new TimeoutError('API request', 10000),
    rateLimit: new RateLimitError(30),
    congressApi: new CongressApiError('voting records fetch', 'Service temporarily unavailable'),
    network: new NetworkError({
      message: 'Connection failed',
      context: { url: '/api/representatives' },
    }),
    server: new ServerError(500, 'Internal Server Error'),
  };

  const BuggyComponent = () => {
    if (selectedError) {
      throw sampleErrors[selectedError as keyof typeof sampleErrors];
    }
    return (
      <div className="p-4 bg-green-50 text-green-800 rounded">Component working correctly!</div>
    );
  };

  const demos = {
    validation: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Search Validation</h3>
        <p className="text-gray-600">
          Try entering invalid ZIP codes or addresses to see specific error messages:
        </p>

        <div className="max-w-md">
          <SearchValidation
            onValidSearch={(query, type) => {
              alert(`Valid ${type}: ${query}`);
            }}
            placeholder="Try: 1234, abc, or 48201"
          />
        </div>

        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Try these invalid inputs:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              <code>1234</code> - Too short ZIP code
            </li>
            <li>
              <code>abc</code> - Non-numeric ZIP code
            </li>
            <li>
              <code>main st</code> - Address without street number
            </li>
            <li>
              <code>48201</code> - Valid ZIP code (should work)
            </li>
          </ul>
        </div>
      </div>
    ),

    inline: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Inline Error Messages</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-red-300 rounded bg-red-50"
              value="1234"
              readOnly
            />
            <InlineError error="ZIP codes must be 5 digits" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-red-300 rounded bg-red-50"
              value="main street"
              readOnly
            />
            <InlineError error="Include street number (e.g., '123 Main St, Detroit MI')" />
          </div>
        </div>
      </div>
    ),

    errors: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Error Display Components</h3>
        <div className="space-y-4">
          <select
            value={selectedError}
            onChange={e => setSelectedError(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">Select an error type</option>
            <option value="invalidZip">Invalid ZIP Code</option>
            <option value="invalidAddress">Invalid Address</option>
            <option value="repNotFound">Representative Not Found</option>
            <option value="timeout">Request Timeout</option>
            <option value="rateLimit">Rate Limited</option>
            <option value="congressApi">Congress API Error</option>
            <option value="network">Network Error</option>
            <option value="server">Server Error</option>
          </select>

          {selectedError && (
            <ErrorDisplay
              error={sampleErrors[selectedError as keyof typeof sampleErrors]}
              onRetry={() => setSelectedError('')}
              onFeedback={(helpful, comment) => {
                console.log('Feedback:', { helpful, comment });
                alert(
                  `Feedback recorded: ${helpful ? 'Helpful' : 'Not helpful'}${comment ? ` - "${comment}"` : ''}`
                );
              }}
            />
          )}
        </div>
      </div>
    ),

    compact: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Compact Error Messages</h3>
        <div className="space-y-3">
          {Object.entries(sampleErrors).map(([key, error]) => (
            <ErrorDisplay
              key={key}
              error={error}
              compact={true}
              onRetry={() => console.log(`Retry ${key}`)}
              onDismiss={() => console.log(`Dismiss ${key}`)}
            />
          ))}
        </div>
      </div>
    ),

    boundary: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Error Boundary</h3>
        <p className="text-gray-600">
          Select an error type and the component below will throw that error, demonstrating our
          error boundary:
        </p>

        <select
          value={selectedError}
          onChange={e => setSelectedError(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">No error (component works)</option>
          <option value="invalidZip">Invalid ZIP Code Error</option>
          <option value="timeout">Timeout Error</option>
          <option value="network">Network Error</option>
          <option value="server">Server Error</option>
        </select>

        <div className="border border-gray-300 rounded-lg p-4">
          <EnhancedErrorBoundary
            onError={(error, errorInfo) => {
              console.log('Error boundary caught:', error.toJSON());
            }}
            context={{ demo: 'error-boundary' }}
          >
            <BuggyComponent />
          </EnhancedErrorBoundary>
        </div>
      </div>
    ),

    toast: (
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Error Toast Notifications</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(sampleErrors).map(([key, error]) => (
            <button
              key={key}
              onClick={() => {
                setShowToast(false);
                setTimeout(() => setShowToast(true), 100);
              }}
              className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded border text-left"
            >
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </button>
          ))}
        </div>

        {showToast && (
          <ErrorToast
            error={sampleErrors.timeout}
            onDismiss={() => setShowToast(false)}
            duration={10000}
          />
        )}
      </div>
    ),
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Error Message System Demo</h1>
        <p className="text-gray-600">
          Comprehensive error handling with specific messages, recovery actions, and user feedback.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 mb-8 border-b border-gray-200">
        {Object.keys(demos).map(demo => (
          <button
            key={demo}
            onClick={() => setActiveDemo(demo)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeDemo === demo
                ? 'border-civiq-blue text-civiq-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {demo.charAt(0).toUpperCase() + demo.slice(1)}
          </button>
        ))}
      </div>

      {/* Demo Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        {demos[activeDemo as keyof typeof demos]}
      </div>

      {/* Feature Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Error System Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium mb-2 text-green-700">✅ Specific Messages</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• No more "Something went wrong"</li>
              <li>• Context-aware error descriptions</li>
              <li>• User-friendly language</li>
              <li>• Clear problem identification</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-blue-700">🔄 Recovery Actions</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Smart retry with exponential backoff</li>
              <li>• Context-appropriate action buttons</li>
              <li>• Automatic fallbacks where possible</li>
              <li>• Clear next steps for users</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-purple-700">📊 User Feedback</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• "Was this helpful?" collection</li>
              <li>• Optional improvement comments</li>
              <li>• Error message effectiveness tracking</li>
              <li>• Continuous improvement data</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-red-700">⚡ Smart Timeouts</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic timeout detection</li>
              <li>• Progressive timeout messages</li>
              <li>• Rate limiting with countdown</li>
              <li>• No infinite loading states</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-orange-700">🎯 Contextual Help</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Format examples (ZIP: 48201)</li>
              <li>• Similar alternatives suggestions</li>
              <li>• Help text for complex inputs</li>
              <li>• Progressive disclosure</li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-2 text-teal-700">🔍 Error Monitoring</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Comprehensive error tracking</li>
              <li>• Pattern analysis and trends</li>
              <li>• User impact assessment</li>
              <li>• Actionable improvement insights</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

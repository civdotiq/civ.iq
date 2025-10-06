/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { Component, ReactNode } from 'react';
import logger from '@/lib/logging/simple-logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Finance Error Boundary
 *
 * Catches errors in campaign finance components and shows graceful fallback UI
 * Prevents entire page crashes when finance data encounters issues
 */
export class FinanceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[Finance Error Boundary] Component error caught', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return <FinanceErrorFallback error={this.state.error} />;
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback UI
 */
function FinanceErrorFallback({ error }: { error?: Error }) {
  return (
    <div className="aicher-card p-6" role="alert">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Unable to Load Campaign Finance Data
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            We encountered an issue while loading campaign finance information. This may be due to:
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mb-4">
            <li>Temporary FEC.gov API unavailability</li>
            <li>No FEC data available for this representative</li>
            <li>Network connectivity issues</li>
          </ul>

          {error && process.env.NODE_ENV === 'development' && (
            <details className="mt-4 p-3 bg-gray-100 rounded text-xs font-mono">
              <summary className="cursor-pointer font-semibold text-gray-700">
                Error Details (Development Only)
              </summary>
              <pre className="mt-2 text-red-600 whitespace-pre-wrap">{error.message}</pre>
              {error.stack && (
                <pre className="mt-2 text-gray-600 whitespace-pre-wrap">{error.stack}</pre>
              )}
            </details>
          )}

          <div className="mt-4 flex gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Reload Page
            </button>
            <a
              href="https://www.fec.gov"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Visit FEC.gov Directly
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Simple inline error display for smaller components
 */
export function InlineError({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-red-800">{message}</p>
          {retry && (
            <button
              onClick={retry}
              className="mt-2 text-sm font-medium text-red-600 hover:text-red-500 focus:outline-none focus:underline"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

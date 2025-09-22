'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { logger } from '@/lib/logging/logger-client';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Prevent infinite loops by checking if we're already in error state
    if (this.state.hasError) {
      return;
    }

    logger.error('Error Boundary caught an error:', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: this.constructor.name,
    });

    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler with error catching to prevent cascading errors
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        logger.error('Error in onError handler:', handlerError as Error);
      }
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.retry} />;
      }

      // Default error UI
      return (
        <div className="min-h-96 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">
          <div className="text-center p-8">
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</h3>
            <p className="text-gray-600 mb-4">
              We encountered an error while loading this content. This might be a temporary issue.
            </p>
            <button
              onClick={this.retry}
              className="bg-civiq-blue text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 p-4 bg-gray-100 rounded text-xs text-red-600 overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easier use
export function ErrorBoundary({ children, ...props }: ErrorBoundaryProps) {
  return <ErrorBoundaryClass {...props}>{children}</ErrorBoundaryClass>;
}

// Specialized error boundary for API components
export function APIErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error: _error, retry }) => (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-red-800">Unable to load data</h3>
              <p className="text-sm text-red-700 mt-1">
                There was a problem connecting to our data sources. This could be due to high
                traffic or a temporary server issue.
              </p>
              <div className="mt-3">
                <button
                  onClick={retry}
                  className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      onError={(error, errorInfo) => {
        // Log API errors for monitoring
        logger.error('API Error:', error, { componentStack: errorInfo.componentStack });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Loading error boundary for async components
export function LoadingErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      fallback={({ error: _error, retry }) => (
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="text-gray-400 mb-3">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-600 mb-3">Loading failed</p>
            <button
              onClick={retry}
              className="text-sm text-civiq-blue hover:text-blue-600 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;

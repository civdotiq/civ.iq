'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';
import { logger } from '@/lib/logging/logger-client';

interface ChunkLoadErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

interface ChunkLoadErrorBoundaryProps {
  children: React.ReactNode;
  maxRetries?: number;
  fallback?: React.ComponentType<{ error: Error; retry: () => void; retryCount: number }>;
}

/**
 * Error boundary specifically designed to handle webpack chunk loading errors
 * Automatically retries and provides user-friendly error messages
 */
class ChunkLoadErrorBoundaryClass extends React.Component<
  ChunkLoadErrorBoundaryProps,
  ChunkLoadErrorBoundaryState
> {
  private maxRetries: number;

  constructor(props: ChunkLoadErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
    this.maxRetries = props.maxRetries || 3;
  }

  static getDerivedStateFromError(error: Error): ChunkLoadErrorBoundaryState {
    return {
      hasError: true,
      error,
      retryCount: 0,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const isChunkLoadError = this.isChunkLoadError(error);

    logger.error('ChunkLoadErrorBoundary caught an error:', error, {
      componentStack: errorInfo.componentStack,
      isChunkLoadError,
      retryCount: this.state.retryCount,
      errorBoundary: 'ChunkLoadErrorBoundary',
    });

    // If it's a chunk load error and we haven't exceeded retries, try to recover
    if (isChunkLoadError && this.state.retryCount < this.maxRetries) {
      this.handleChunkLoadError();
    }
  }

  private isChunkLoadError(error: Error): boolean {
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';
    const errorName = error.name || '';

    return (
      errorMessage.includes('ChunkLoadError') ||
      errorMessage.includes('Loading chunk') ||
      errorMessage.includes('failed to import') ||
      errorMessage.includes('__webpack_require__') ||
      errorStack.includes('ChunkLoadError') ||
      errorStack.includes('__webpack_require__') ||
      errorName === 'ChunkLoadError' ||
      // Additional patterns for module loading errors
      errorMessage.includes("Cannot read properties of undefined (reading 'call')") ||
      errorMessage.includes('Module not found')
    );
  }

  private handleChunkLoadError = async () => {
    try {
      // Clear module cache if available
      if (typeof window !== 'undefined' && 'webpackChunkName' in window) {
        // Clear webpack cache
        const windowWithWebpack = window as unknown as {
          __webpack_require__?: { cache?: Record<string, unknown> };
        };
        if (windowWithWebpack.__webpack_require__?.cache) {
          delete windowWithWebpack.__webpack_require__.cache;
        }
      }

      // Wait a moment before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Increment retry count and try again
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    } catch (retryError) {
      logger.error('Error during chunk load error recovery:', retryError as Error);
    }
  };

  private retry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    } else {
      // Max retries exceeded, reload page
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const isChunkLoadError = this.isChunkLoadError(this.state.error);

      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            retry={this.retry}
            retryCount={this.state.retryCount}
          />
        );
      }

      // Show chunk-specific error UI for chunk load errors
      if (isChunkLoadError) {
        return (
          <div className="min-h-96 flex items-center justify-center bg-white border border-gray-200">
            <div className="text-center p-8 max-w-md">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 text-blue-500 mx-auto animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Application</h3>
              <p className="text-gray-600 mb-4">
                We&apos;re loading the latest version of the application. This will only take a
                moment.
              </p>
              {this.state.retryCount < this.maxRetries ? (
                <div className="space-y-2">
                  <div className="text-sm text-gray-500">
                    Attempt {this.state.retryCount + 1} of {this.maxRetries + 1}
                  </div>
                  <button
                    onClick={this.retry}
                    className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
                  >
                    Retry Loading
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 mb-3">
                    Having trouble loading? Let&apos;s refresh the page.
                  </p>
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
                  >
                    Refresh Page
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }

      // Default error UI for non-chunk errors
      return (
        <div className="min-h-96 flex items-center justify-center bg-white border border-gray-200">
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
              className="bg-red-600 text-white px-4 py-2 hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC wrapper for easier use
export function ChunkLoadErrorBoundary({ children, ...props }: ChunkLoadErrorBoundaryProps) {
  return <ChunkLoadErrorBoundaryClass {...props}>{children}</ChunkLoadErrorBoundaryClass>;
}

export default ChunkLoadErrorBoundary;

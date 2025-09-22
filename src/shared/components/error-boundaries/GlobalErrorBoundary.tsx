/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logging/logger-client';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Winston
    logger.error('Global error boundary caught error', error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: 'GlobalErrorBoundary',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
    });

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Report to external service if configured
    if (
      typeof window !== 'undefined' &&
      typeof process !== 'undefined' &&
      process.env?.NODE_ENV === 'production'
    ) {
      // This would integrate with Sentry or similar service
      // Sentry.captureException(error, { extra: errorInfo });
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
              <p className="text-gray-600 mb-6">
                We apologize for the inconvenience. An unexpected error has occurred.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={this.handleReload}
                className="w-full bg-civiq-blue hover:bg-civiq-blue/90"
              >
                Try Again
              </Button>
              <Button onClick={this.handleGoHome} variant="secondary" className="w-full">
                Go to Homepage
              </Button>
            </div>

            {typeof process !== 'undefined' &&
              process.env?.NODE_ENV === 'development' &&
              this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-xs">
                    <p className="font-medium text-red-800">Error:</p>
                    <p className="text-red-700 mb-2">{this.state.error.message}</p>
                    <p className="font-medium text-red-800">Stack:</p>
                    <pre className="text-red-700 whitespace-pre-wrap">{this.state.error.stack}</pre>
                    {this.state.errorInfo && (
                      <>
                        <p className="font-medium text-red-800 mt-2">Component Stack:</p>
                        <pre className="text-red-700 whitespace-pre-wrap">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </>
                    )}
                  </div>
                </details>
              )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

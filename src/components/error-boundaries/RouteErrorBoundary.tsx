/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { structuredLogger } from '@/lib/logging/logger';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface Props {
  children: ReactNode;
  route?: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error with route context
    structuredLogger.error('Route error boundary caught error', error, {
      route: this.props.route,
      componentStack: errorInfo.componentStack,
      errorBoundary: 'RouteErrorBoundary',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      timestamp: new Date().toISOString(),
    });
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  private handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Route-specific error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center px-4">
          <Card className="max-w-md w-full p-6 text-center">
            <div className="text-orange-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Page Error
              </h2>
              <p className="text-gray-600 mb-6">
                This page encountered an error. Please try again or go back to the previous page.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={this.handleRetry}
                className="w-full bg-civiq-blue hover:bg-civiq-blue/90"
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleGoBack}
                variant="secondary"
                className="w-full"
              >
                Go Back
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                  Error Details (Development Only)
                </summary>
                <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded text-xs">
                  <p className="font-medium text-orange-800">Route:</p>
                  <p className="text-orange-700 mb-2">{this.props.route || 'Unknown'}</p>
                  <p className="font-medium text-orange-800">Error:</p>
                  <p className="text-orange-700 mb-2">{this.state.error.message}</p>
                  <p className="font-medium text-orange-800">Stack:</p>
                  <pre className="text-orange-700 whitespace-pre-wrap text-xs">
                    {this.state.error.stack}
                  </pre>
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
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { CiviqError, createErrorFromException } from '@/lib/errors/ErrorTypes';
import { ErrorDisplay } from '@/shared/components/ui/ErrorComponents';
import logger from '@/lib/logging/simple-logger';

interface ErrorBoundaryState {
  hasError: boolean;
  error: CiviqError | null;
  errorInfo: ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: CiviqError, retry: () => void) => ReactNode;
  onError?: (error: CiviqError, errorInfo: ErrorInfo) => void;
  isolate?: boolean; // If true, prevents error from bubbling up
  context?: Record<string, unknown>; // Additional context for error reporting
}

export class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Convert the error to our CiviqError type
    const civiqError = createErrorFromException(error, {
      boundary: 'ErrorBoundary',
      timestamp: new Date().toISOString(),
    });

    return {
      hasError: true,
      error: civiqError,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Add error info to state
    this.setState({ errorInfo });

    // Create enhanced error with component stack
    const civiqError = createErrorFromException(error, {
      boundary: 'ErrorBoundary',
      componentStack: errorInfo.componentStack,
      ...this.props.context,
    });

    // Call error handler if provided
    if (this.props.onError) {
      this.props.onError(civiqError, errorInfo);
    }

    // Log error with structured logging
    logger.error('Error Boundary caught error', {
      component: 'EnhancedErrorBoundary',
      error: error,
      metadata: {
        componentStack: errorInfo.componentStack,
        civiqError: civiqError.toJSON(),
        environment: process.env.NODE_ENV,
      },
    });

    // Report error to monitoring service (in production)
    if (process.env.NODE_ENV === 'production') {
      this.reportError(civiqError, errorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      window.clearTimeout(this.retryTimeoutId);
    }
  }

  private reportError = async (error: CiviqError, errorInfo: ErrorInfo) => {
    try {
      // This would integrate with your error monitoring service
      // For now, we'll just store it in localStorage for analysis
      const errorReport = {
        error: error.toJSON(),
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        userId: 'anonymous', // Would come from auth context
        sessionId: sessionStorage.getItem('sessionId') || 'unknown',
      };

      // Store for later analysis
      const existingReports = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingReports.push(errorReport);

      // Keep only last 10 reports
      const recentReports = existingReports.slice(-10);
      localStorage.setItem('errorReports', JSON.stringify(recentReports));

      // In production, send to monitoring service
      // await fetch('/api/errors', {
      //  method: 'POST',
      //  headers: { 'Content-Type': 'application/json' },
      //  body: JSON.stringify(errorReport)
      // });
    } catch (reportError) {
      logger.error('Failed to report error', {
        component: 'EnhancedErrorBoundary',
        error: reportError as Error,
      });
    }
  };

  private handleRetry = () => {
    // Clear error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Add a small delay to prevent immediate re-error
    this.retryTimeoutId = window.setTimeout(() => {
      // Force re-render by updating key
      this.forceUpdate();
    }, 100);
  };

  private handleFeedback = (helpful: boolean, comment?: string) => {
    if (!this.state.error) return;

    const feedback = {
      errorCode: this.state.error.code,
      helpful,
      comment,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Store feedback for analysis
    const existingFeedback = JSON.parse(localStorage.getItem('errorFeedback') || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem('errorFeedback', JSON.stringify(existingFeedback.slice(-50)));

    logger.info('Error feedback collected', {
      component: 'EnhancedErrorBoundary',
      metadata: {
        feedback,
        errorCode: this.state.error?.code,
      },
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry);
      }

      // Default error display
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-2xl w-full">
            <ErrorDisplay
              error={this.state.error}
              onRetry={this.handleRetry}
              onFeedback={this.handleFeedback}
            />

            {/* Development info */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-6 p-4 bg-white border-2 border-gray-300 text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Debug Information
                </summary>
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 p-2 bg-white rounded overflow-auto">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                  <div>
                    <strong>Error Details:</strong>
                    <pre className="mt-1 p-2 bg-white rounded overflow-auto">
                      {JSON.stringify(this.state.error.toJSON(), null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easy error boundary wrapping
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

// Hook for programmatic error reporting
export function useErrorReporting() {
  const reportError = (error: Error | CiviqError, context?: Record<string, unknown>) => {
    const civiqError =
      error instanceof CiviqError ? error : createErrorFromException(error, context);

    // In a real app, this would send to your monitoring service
    logger.error('Error reported to monitoring service', {
      component: 'EnhancedErrorBoundary',
      metadata: {
        civiqError: civiqError.toJSON(),
        context: context,
      },
    });

    // Store for analysis
    try {
      const errorReport = {
        error: civiqError.toJSON(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        context,
      };

      const existingReports = JSON.parse(localStorage.getItem('manualErrorReports') || '[]');
      existingReports.push(errorReport);
      localStorage.setItem('manualErrorReports', JSON.stringify(existingReports.slice(-20)));
    } catch (e) {
      logger.error('Failed to store error report', {
        component: 'EnhancedErrorBoundary',
        error: e as Error,
      });
    }
  };

  return { reportError };
}

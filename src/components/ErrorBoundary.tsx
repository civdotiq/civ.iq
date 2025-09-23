/**
 * Production-Ready Error Boundary with Graceful Degradation
 */

'use client';

import React, { Component, ReactNode } from 'react';
import logger from '@/lib/logging/simple-logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  enableFallback?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error with context
    logger.error('ErrorBoundary caught error', error, {
      context: this.props.context || 'unknown',
      errorBoundary: true,
      componentStack: errorInfo.componentStack,
      errorBoundaryStack: errorInfo.componentStack,
    });

    // Report to monitoring service if available
    if (typeof window !== 'undefined' && 'gtag' in window) {
      const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
      if (typeof gtag === 'function') {
        gtag('event', 'exception', {
          description: error.toString(),
          fatal: false,
          context: this.props.context,
        });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // If fallback is disabled, render nothing (graceful degradation)
      if (this.props.enableFallback === false) {
        return null;
      }

      // Default error UI
      return (
        <div className="error-boundary-fallback">
          <div className="error-content">
            <h3>Something went wrong</h3>
            <p>We&apos;re experiencing a temporary issue. Please try refreshing the page.</p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="error-details">
                <summary>Error Details (Development)</summary>
                <pre>{this.state.error.toString()}</pre>
                {this.state.errorInfo && <pre>{this.state.errorInfo.componentStack}</pre>}
              </details>
            )}
            <button onClick={() => window.location.reload()} className="error-retry-button">
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * High-level error boundary for API-dependent components
 */
export function ApiErrorBoundary({ children, context }: Props) {
  return (
    <ErrorBoundary
      context={`api-${context}`}
      fallback={
        <div className="api-error-fallback">
          <div className="api-error-content">
            <h4>Data temporarily unavailable</h4>
            <p>
              We&apos;re having trouble loading this information. Please check back in a few
              moments.
            </p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Silent error boundary that just logs errors without showing fallback UI
 */
export function SilentErrorBoundary({ children, context }: Props) {
  return (
    <ErrorBoundary context={`silent-${context}`} enableFallback={false}>
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for Redis/cache-dependent components
 */
export function CacheErrorBoundary({ children, context }: Props) {
  return (
    <ErrorBoundary
      context={`cache-${context}`}
      fallback={
        <div className="cache-error-fallback">
          <div className="cache-error-content">
            <p>Loading fresh data...</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;

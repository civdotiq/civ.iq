/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '@/lib/logging/logger-client';
import { Button } from '@/shared/components/ui/Button';

interface Props {
  children: ReactNode;
  componentName?: string;
  fallback?: ReactNode;
  showError?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ComponentErrorBoundary extends Component<Props, State> {
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
    // Log error with component context
    logger.error('Component error boundary caught error', error, {
      componentName: this.props.componentName || 'Unknown',
      componentStack: errorInfo.componentStack,
      errorBoundary: 'ComponentErrorBoundary',
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

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Don't show error UI if showError is false
      if (this.props.showError === false) {
        return null;
      }

      // Component-level error UI
      return (
        <div className="p-4 bg-civiq-red/10 border border-civiq-red">
          <div className="flex items-center space-x-2 text-civiq-red">
            <svg
              className="w-5 h-5"
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
            <span className="font-medium">{this.props.componentName || 'Component'} Error</span>
          </div>
          <p className="text-civiq-red text-sm mt-2">
            This component encountered an error and couldn&apos;t render properly.
          </p>
          <Button
            onClick={this.handleRetry}
            variant="secondary"
            className="mt-3 text-civiq-red border-civiq-red hover:bg-civiq-red/10"
            size="sm"
          >
            Try Again
          </Button>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-civiq-red hover:text-civiq-red">
                Error Details (Development Only)
              </summary>
              <div className="mt-2 p-2 bg-civiq-red/10 border border-civiq-red text-xs">
                <p className="font-medium text-civiq-red">Component:</p>
                <p className="text-civiq-red mb-2">{this.props.componentName || 'Unknown'}</p>
                <p className="font-medium text-civiq-red">Error:</p>
                <p className="text-civiq-red mb-2">{this.state.error.message}</p>
                <p className="font-medium text-civiq-red">Stack:</p>
                <pre className="text-civiq-red whitespace-pre-wrap text-xs">
                  {this.state.error.stack}
                </pre>
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

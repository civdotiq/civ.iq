/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { ComponentErrorBoundary } from '@/shared/components/error-boundaries';

// Core loading spinner component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  color?: 'blue' | 'green' | 'gray';
}

export function Spinner({ size = 'md', className = '', color = 'blue' }: SpinnerProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colors = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    gray: 'text-gray-600',
  };

  return (
    <div className={`animate-spin ${sizes[size]} ${colors[color]} ${className}`}>
      <svg fill="none" viewBox="0 0 24 24" className="w-full h-full">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

// Progress bar component
interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showPercentage?: boolean;
  label?: string;
}

export function ProgressBar({
  progress,
  className = '',
  showPercentage = false,
  label,
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-gray-700">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-gray-600">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-civiq-blue h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

// Loading message component with dynamic text
interface LoadingMessageProps {
  message: string;
  submessage?: string;
  showSpinner?: boolean;
  className?: string;
}

export function LoadingMessage({
  message,
  submessage,
  showSpinner = true,
  className = '',
}: LoadingMessageProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-6 ${className}`}>
      {showSpinner && <Spinner size="lg" className="mb-4" />}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{message}</h3>
      {submessage && <p className="text-sm text-gray-600 text-center max-w-md">{submessage}</p>}
    </div>
  );
}

// Advanced loading state wrapper with timeout and retry
interface LoadingStateWrapperProps {
  loading: boolean;
  error?: Error | null;
  retry?: () => void;
  timeout?: number; // milliseconds
  loadingComponent?: ReactNode;
  children: ReactNode;
  loadingMessage?: string;
  timeoutMessage?: string;
}

export function LoadingStateWrapper({
  loading,
  error,
  retry,
  timeout = 10000,
  loadingComponent,
  children,
  loadingMessage = 'Loading...',
  timeoutMessage = 'This is taking longer than usual',
}: LoadingStateWrapperProps) {
  const [showTimeout, setShowTimeout] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!loading) {
      setShowTimeout(false);
      setTimeElapsed(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setTimeElapsed(elapsed);

      if (elapsed >= timeout) {
        setShowTimeout(true);
      }
    }, 100);

    // Always clear the interval in cleanup
    return () => {
      clearInterval(interval);
    };
  }, [loading, timeout]);

  if (error) {
    return (
      <ComponentErrorBoundary componentName="LoadingStateWrapper">
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-red-500 mb-4">
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
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-600 mb-4">{error.message}</p>
          {retry && (
            <button
              onClick={retry}
              className="px-4 py-2 bg-civiq-blue text-white hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </ComponentErrorBoundary>
    );
  }

  if (loading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Spinner size="lg" className="mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{loadingMessage}</h3>

        {showTimeout && (
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-4">{timeoutMessage}</p>
            {retry && (
              <button
                onClick={retry}
                className="px-4 py-2 bg-gray-600 text-white hover:bg-gray-700 transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}

        {!showTimeout && timeElapsed > 3000 && (
          <div className="mt-4 text-center">
            <div className="text-xs text-gray-500">
              {Math.round(timeElapsed / 1000)}s elapsed...
            </div>
          </div>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// Enhanced loading state with context-aware messaging
interface SmartLoadingStateProps {
  type?: 'representatives' | 'bills' | 'votes' | 'finance' | 'news' | 'generic';
  count?: number;
  location?: string;
  className?: string;
}

export function SmartLoadingState({
  type = 'generic',
  count,
  location,
  className = '',
}: SmartLoadingStateProps) {
  const getLoadingConfig = () => {
    switch (type) {
      case 'representatives':
        return {
          message: location
            ? `Finding representatives for ${location}...`
            : 'Loading congressional representatives...',
          submessage: count
            ? `Loading ${count} representatives`
            : 'Gathering the latest data from Congress.gov',
          icon: (
            <svg className="w-8 h-8 text-civiq-blue" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'bills':
        return {
          message: 'Loading legislative data...',
          submessage: 'Fetching bill information from Congress.gov',
          icon: (
            <svg className="w-8 h-8 text-civiq-blue" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'votes':
        return {
          message: 'Loading voting records...',
          submessage: 'Analyzing legislative voting patterns',
          icon: (
            <svg className="w-8 h-8 text-civiq-blue" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 2L3 7v11c0 5.55 3.84 7.74 9 9 5.16-1.26 9-3.45 9-9V7l-7-5z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'finance':
        return {
          message: 'Loading campaign finance data...',
          submessage: 'Retrieving FEC contribution records',
          icon: (
            <svg className="w-8 h-8 text-civiq-blue" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'news':
        return {
          message: 'Loading latest news...',
          submessage: 'Gathering media coverage from trusted sources',
          icon: (
            <svg className="w-8 h-8 text-civiq-blue" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      default:
        return {
          message: 'Loading...',
          submessage: 'Please wait while we fetch the latest data',
          icon: <Spinner size="lg" />,
        };
    }
  };

  const config = getLoadingConfig();

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div className="mb-4">{config.icon}</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{config.message}</h3>
      <p className="text-sm text-gray-600 text-center max-w-md">{config.submessage}</p>
    </div>
  );
}

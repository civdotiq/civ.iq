/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { ComponentErrorBoundary } from '@/components/error-boundaries';

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

// Skeleton components for different content types
export function SkeletonText({
  lines = 1,
  className = '',
  animate = true,
}: {
  lines?: number;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded ${animate ? 'animate-pulse' : ''} ${
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonImage({
  width = 'w-full',
  height = 'h-48',
  className = '',
  animate = true,
}: {
  width?: string;
  height?: string;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div
      className={`${width} ${height} bg-gray-200 rounded-lg ${animate ? 'animate-pulse' : ''} ${className} flex items-center justify-center`}
    >
      <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
}

export function SkeletonCard({
  showImage = true,
  textLines = 3,
  className = '',
  animate = true,
}: {
  showImage?: boolean;
  textLines?: number;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        {showImage && (
          <SkeletonImage
            width="w-16"
            height="h-16"
            className="rounded-full flex-shrink-0"
            animate={animate}
          />
        )}
        <div className="flex-1 space-y-3">
          <div className={`h-6 bg-gray-200 rounded w-1/2 ${animate ? 'animate-pulse' : ''}`} />
          <SkeletonText lines={textLines} animate={animate} />
          <div className="flex gap-2">
            <div className={`h-6 bg-gray-200 rounded w-16 ${animate ? 'animate-pulse' : ''}`} />
            <div className={`h-6 bg-gray-200 rounded w-20 ${animate ? 'animate-pulse' : ''}`} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className = '',
  animate = true,
}: {
  rows?: number;
  columns?: number;
  className?: string;
  animate?: boolean;
}) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className={`h-4 bg-gray-200 rounded ${animate ? 'animate-pulse' : ''}`} />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }, (_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }, (_, colIndex) => (
                <div
                  key={colIndex}
                  className={`h-4 bg-gray-200 rounded ${animate ? 'animate-pulse' : ''}`}
                  style={{
                    animationDelay: animate
                      ? `${(rowIndex * columns + colIndex) * 50}ms`
                      : undefined,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
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
              className="px-4 py-2 bg-civiq-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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

// Shimmer effect for skeleton animations
export function ShimmerEffect({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

// Progressive loading container
interface ProgressiveLoadingProps {
  stages: Array<{
    name: string;
    component: ReactNode;
    loaded: boolean;
  }>;
  className?: string;
}

export function ProgressiveLoading({ stages, className = '' }: ProgressiveLoadingProps) {
  const loadedCount = stages.filter(stage => stage.loaded).length;
  const progress = (loadedCount / stages.length) * 100;

  return (
    <div className={className}>
      <ProgressBar
        progress={progress}
        label="Loading content..."
        showPercentage={true}
        className="mb-6"
      />

      <div className="space-y-4">
        {stages.map((stage, _index) => (
          <div key={stage.name}>
            {stage.loaded ? (
              stage.component
            ) : (
              <div className="opacity-50">
                <SkeletonCard />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

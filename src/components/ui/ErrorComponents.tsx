/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CiviqError } from '@/lib/errors/ErrorTypes';
import { ComponentErrorBoundary } from '@/components/error-boundaries';

interface ErrorDisplayProps {
  error: CiviqError | Error;
  onRetry?: () => void;
  onDismiss?: () => void;
  onFeedback?: (helpful: boolean, comment?: string) => void;
  className?: string;
  compact?: boolean;
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  onFeedback,
  className = '',
  compact = false 
}: ErrorDisplayProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [comment, setComment] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Handle CiviqError vs generic Error
  const civiqError = error instanceof CiviqError ? error : null;
  const errorCode = civiqError?.code || 'UNKNOWN_ERROR';
  const userMessage = civiqError?.userMessage || 'Something went wrong';
  const helpText = civiqError?.helpText;
  const suggestedActions = civiqError?.suggestedActions || ['Try Again'];
  const showTimer = civiqError?.showTimer && civiqError?.context?.retryAfter;
  const retryable = civiqError?.retryable ?? true;
  const severity = civiqError?.severity || 'medium';

  // Countdown timer for rate limits
  useEffect(() => {
    if (showTimer && civiqError?.context?.retryAfter) {
      const retryAfter = civiqError.context.retryAfter;
      setCountdown(typeof retryAfter === 'number' ? retryAfter : 0);
      
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [showTimer, civiqError?.context?.retryAfter]);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'medium':
        return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'high':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'critical':
        return 'bg-red-100 border-red-300 text-red-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low':
        return (
          <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'medium':
        return (
          <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'high':
      case 'critical':
        return (
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const handleRetry = () => {
    if (onRetry && countdown === 0) {
      setRetryCount(prev => prev + 1);
      onRetry();
    }
  };

  const handleFeedback = (helpful: boolean) => {
    if (onFeedback) {
      onFeedback(helpful, comment.trim() || undefined);
      setShowFeedback(false);
      setComment('');
    }
  };

  if (compact) {
    return (
      <ComponentErrorBoundary componentName="CompactErrorDisplay">
        <div className={`flex items-center gap-3 p-3 ${getSeverityStyles(severity)} rounded-lg border ${className}`}>
          {getSeverityIcon(severity)}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{userMessage}</p>
            {helpText && (
              <p className="text-xs opacity-80 mt-1">{helpText}</p>
            )}
          </div>
          <div className="flex gap-2">
            {retryable && countdown === 0 && (
              <button
                onClick={handleRetry}
                className="px-3 py-1 text-xs font-medium bg-white rounded border hover:bg-gray-50 transition-colors"
              >
                Retry
              </button>
            )}
            {countdown > 0 && (
              <span className="px-3 py-1 text-xs font-medium bg-white rounded border">
                {countdown}s
              </span>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </ComponentErrorBoundary>
    );
  }

  return (
    <ComponentErrorBoundary componentName="ErrorDisplay">
      <div className={`${getSeverityStyles(severity)} rounded-lg border p-6 ${className}`}>
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            {getSeverityIcon(severity)}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-2">{userMessage}</h3>
            
            {helpText && (
              <p className="text-sm opacity-90 mb-4">{helpText}</p>
            )}

            {/* Error code for debugging */}
            <div className="text-xs opacity-60 mb-4 font-mono">
              Error: {errorCode}
              {retryCount > 0 && ` (Attempt ${retryCount + 1})`}
            </div>

            {/* Timer for rate limits */}
            {countdown > 0 && (
              <div className="mb-4 p-3 bg-white bg-opacity-50 rounded border">
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Please wait {countdown} second{countdown !== 1 ? 's' : ''}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 mb-4">
              {suggestedActions.map((action, index) => {
                if (action === 'Try Again' && onRetry) {
                  return (
                    <button
                      key={index}
                      onClick={handleRetry}
                      disabled={countdown > 0}
                      className="px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {countdown > 0 ? `Retry in ${countdown}s` : 'Try Again'}
                    </button>
                  );
                }
                
                if (action === 'Go Back') {
                  return (
                    <button
                      key={index}
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                    >
                      Go Back
                    </button>
                  );
                }

                if (action === 'Search Different ZIP') {
                  return (
                    <button
                      key={index}
                      onClick={() => window.location.href = '/'}
                      className="px-4 py-2 bg-civiq-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Search Different ZIP
                    </button>
                  );
                }

                if (action === 'Report Problem') {
                  return (
                    <button
                      key={index}
                      onClick={() => setShowFeedback(true)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Report Problem
                    </button>
                  );
                }

                return (
                  <button
                    key={index}
                    className="px-4 py-2 bg-white text-gray-900 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    {action}
                  </button>
                );
              })}
            </div>

            {/* Dismiss button */}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="text-sm opacity-60 hover:opacity-80 transition-opacity"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>

        {/* Feedback form */}
        {showFeedback && onFeedback && (
          <div className="mt-6 pt-6 border-t border-white border-opacity-30">
            <h4 className="text-sm font-medium mb-3">Was this error message helpful?</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <button
                  onClick={() => handleFeedback(true)}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Yes, helpful
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  No, confusing
                </button>
              </div>
              <div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional: Tell us how we can improve this error message"
                  className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
                  rows={2}
                />
              </div>
              <button
                onClick={() => setShowFeedback(false)}
                className="text-xs opacity-60 hover:opacity-80 transition-opacity"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </ComponentErrorBoundary>
  );
}

// Inline error for form fields
interface InlineErrorProps {
  error: string;
  className?: string;
}

export function InlineError({ error, className = '' }: InlineErrorProps) {
  return (
    <div className={`flex items-center gap-2 text-red-600 text-sm mt-1 ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  );
}

// Error toast for temporary errors
interface ErrorToastProps {
  error: CiviqError;
  onDismiss: () => void;
  duration?: number;
}

export function ErrorToast({ error, onDismiss, duration = 5000 }: ErrorToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div className="fixed bottom-4 right-4 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
      <ErrorDisplay 
        error={error} 
        onDismiss={onDismiss} 
        compact={true}
      />
    </div>
  );
}

// Network status indicator
export function NetworkStatusIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 text-sm z-50">
      <div className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
        </svg>
        You're offline. Some features may not work.
      </div>
    </div>
  );
}
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { FC } from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Accessible label for the loading spinner */
  label?: string;
}

export const LoadingSpinner: FC<LoadingSpinnerProps> = ({
  size = 'md',
  className,
  label = 'Loading',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div
      className={cn('flex justify-center items-center', className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <svg
        className={cn('animate-spin text-civiq-blue', sizeClasses[size])}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
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
      <span className="sr-only">{label}</span>
    </div>
  );
};

interface LoadingDotsProps {
  className?: string;
  /** Accessible label for the loading indicator */
  label?: string;
}

export const LoadingDots: FC<LoadingDotsProps> = ({ className, label = 'Loading' }) => (
  <div
    className={cn('loading-dots flex gap-1', className)}
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <span className="w-2 h-2 bg-current rounded-full" aria-hidden="true"></span>
    <span className="w-2 h-2 bg-current rounded-full" aria-hidden="true"></span>
    <span className="w-2 h-2 bg-current rounded-full" aria-hidden="true"></span>
    <span className="sr-only">{label}</span>
  </div>
);

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: FC<SkeletonProps> = ({ className, variant = 'text' }) => {
  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded',
  };

  return (
    <div
      className={cn('animate-pulse bg-gray-200', variantClasses[variant], className)}
      aria-hidden="true"
    />
  );
};

interface LoadingCardProps {
  lines?: number;
  /** Accessible label for the loading card */
  label?: string;
}

export const LoadingCard: FC<LoadingCardProps> = ({ lines = 3, label = 'Loading content' }) => (
  <div
    className="bg-white border border-gray-100 p-6"
    role="status"
    aria-live="polite"
    aria-label={label}
  >
    <div className="flex items-center gap-4 mb-4">
      <Skeleton variant="circular" className="w-12 h-12" />
      <div className="flex-1">
        <Skeleton className="w-32 h-5 mb-2" />
        <Skeleton className="w-24 h-4" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="w-full h-4" />
      ))}
    </div>
    <span className="sr-only">{label}</span>
  </div>
);

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { FC } from 'react';
import { cn } from '@/lib/utils';

interface SkeletonLoaderProps {
  variant?: 'card' | 'list' | 'stat' | 'text';
  count?: number;
  className?: string;
}

const SkeletonBlock: FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bg-gray-200 animate-pulse', className)} aria-hidden="true" />
);

function SkeletonCard() {
  return (
    <div className="border-2 border-gray-200 p-6">
      <SkeletonBlock className="h-4 w-3/4 mb-4" />
      <SkeletonBlock className="h-3 w-full mb-2" />
      <SkeletonBlock className="h-3 w-5/6 mb-4" />
      <SkeletonBlock className="h-8 w-1/3" />
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="border-t-2 border-gray-200">
      {[0, 1, 2].map(i => (
        <div key={i} className="border-b border-gray-200 py-4 flex items-center gap-4">
          <SkeletonBlock className="h-10 w-10 flex-shrink-0" />
          <div className="flex-1">
            <SkeletonBlock className="h-4 w-2/3 mb-2" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonStat() {
  return (
    <div className="border-2 border-gray-200 p-6">
      <SkeletonBlock className="h-3 w-1/2 mb-3" />
      <SkeletonBlock className="h-8 w-1/3 mb-2" />
      <SkeletonBlock className="h-3 w-2/3" />
    </div>
  );
}

function SkeletonText() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-4 w-full" />
      <SkeletonBlock className="h-4 w-5/6" />
      <SkeletonBlock className="h-4 w-4/6" />
    </div>
  );
}

export const SkeletonLoader: FC<SkeletonLoaderProps> = ({
  variant = 'card',
  count = 1,
  className,
}) => {
  const Component = {
    card: SkeletonCard,
    list: SkeletonList,
    stat: SkeletonStat,
    text: SkeletonText,
  }[variant];

  return (
    <div
      className={cn(!className && 'space-y-4', className)}
      role="status"
      aria-label="Loading content"
    >
      {Array.from({ length: count }, (_, i) => (
        <Component key={i} />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
};

SkeletonLoader.displayName = 'SkeletonLoader';

/**
 * Loading Skeleton Component
 * Phase 3: Loading states for news clusters
 *
 * Provides skeleton loaders that match the news cluster card layout.
 */

'use client';

import React from 'react';

export interface LoadingSkeletonProps {
  count?: number;
  viewMode?: 'headlines' | 'topics' | 'timeline' | 'coverage';
}

export function LoadingSkeleton({ count = 3, viewMode = 'headlines' }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  const renderHeadlinesSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            <div className="h-4 w-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-20 bg-gray-200 rounded"></div>
        </div>
        <div className="h-6 w-3/4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
      </div>

      {/* Main Article */}
      <div className="p-4">
        <div className="flex items-start space-x-4">
          {/* Image placeholder */}
          <div className="flex-shrink-0 w-24 h-24 bg-gray-200 rounded"></div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="h-5 w-full bg-gray-200 rounded"></div>
            <div className="h-5 w-4/5 bg-gray-200 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
            <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 p-4">
        <div className="h-4 w-32 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  const renderTopicsSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 animate-pulse">
      <div className="flex items-start space-x-3">
        <div className="w-3 h-3 rounded-full bg-gray-200 mt-2"></div>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div className="h-5 w-16 bg-gray-200 rounded"></div>
            <div className="h-4 w-12 bg-gray-200 rounded"></div>
          </div>
          <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
          <div className="h-4 w-full bg-gray-200 rounded"></div>
          <div className="flex items-center justify-between">
            <div className="h-3 w-16 bg-gray-200 rounded"></div>
            <div className="h-3 w-12 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTimelineSkeleton = () => (
    <div className="flex items-start space-x-4 animate-pulse">
      <div className="flex-shrink-0 w-16 text-center space-y-1">
        <div className="h-3 w-12 bg-gray-200 rounded mx-auto"></div>
        <div className="h-4 w-8 bg-gray-200 rounded mx-auto"></div>
      </div>
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="h-5 w-16 bg-gray-200 rounded"></div>
          <div className="h-4 w-4 bg-gray-200 rounded"></div>
        </div>
        <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 w-full bg-gray-200 rounded mb-2"></div>
        <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
      </div>
    </div>
  );

  const renderCoverageSkeleton = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-pulse">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            <div className="h-5 w-16 bg-gray-200 rounded"></div>
          </div>
          <div className="h-4 w-16 bg-gray-200 rounded"></div>
        </div>
        <div className="h-7 w-4/5 bg-gray-200 rounded mb-3"></div>

        {/* Metrics */}
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="space-y-1">
              <div className="h-3 w-12 bg-gray-200 rounded"></div>
              <div className="h-4 w-8 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-3">
        <div className="h-6 w-full bg-gray-200 rounded"></div>
        <div className="h-6 w-5/6 bg-gray-200 rounded"></div>
        <div className="h-4 w-full bg-gray-200 rounded"></div>
        <div className="h-4 w-4/5 bg-gray-200 rounded"></div>
        <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
      </div>

      {/* Related Articles */}
      <div className="border-t border-gray-100 bg-gray-50 p-4">
        <div className="h-5 w-32 bg-gray-200 rounded mb-3"></div>
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="bg-white rounded border p-3 space-y-2">
              <div className="h-4 w-full bg-gray-200 rounded"></div>
              <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
              <div className="h-3 w-1/2 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSkeleton = () => {
    switch (viewMode) {
      case 'headlines':
        return renderHeadlinesSkeleton();
      case 'topics':
        return renderTopicsSkeleton();
      case 'timeline':
        return renderTimelineSkeleton();
      case 'coverage':
        return renderCoverageSkeleton();
      default:
        return renderHeadlinesSkeleton();
    }
  };

  const getLayoutClasses = () => {
    switch (viewMode) {
      case 'headlines':
        return 'space-y-6';
      case 'topics':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      case 'timeline':
        return 'space-y-4';
      case 'coverage':
        return 'space-y-8';
      default:
        return 'space-y-6';
    }
  };

  return (
    <div className={getLayoutClasses()}>
      {skeletons.map(index => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </div>
  );
}

export default LoadingSkeleton;

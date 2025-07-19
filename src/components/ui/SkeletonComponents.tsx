/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { SkeletonCard, SkeletonText, SkeletonImage, SkeletonTable } from './LoadingStates';

// Representative card skeleton
export function RepresentativeSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex items-start gap-4">
        {/* Avatar skeleton */}
        <div className="w-20 h-20 bg-gray-200 rounded-full animate-pulse flex-shrink-0" />
        
        <div className="flex-1 space-y-3">
          {/* Name skeleton */}
          <div className="h-6 bg-gray-200 rounded w-1/2 animate-pulse" />
          
          {/* Party and location skeleton */}
          <div className="flex items-center gap-3">
            <div className="h-6 bg-gray-200 rounded-full w-20 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
          </div>
          
          {/* Contact info skeleton */}
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          </div>
          
          {/* Action buttons skeleton */}
          <div className="flex gap-2 pt-2">
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// District map skeleton
export function DistrictMapSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="space-y-4">
        {/* Map title skeleton */}
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        
        {/* Map container skeleton */}
        <div className="relative h-64 bg-gray-100 rounded-lg animate-pulse overflow-hidden">
          {/* Map outline simulation */}
          <div className="absolute inset-4 border-2 border-gray-300 rounded-lg" />
          <div className="absolute top-8 left-8 w-16 h-12 bg-gray-300 rounded" />
          <div className="absolute bottom-8 right-8 w-20 h-16 bg-gray-300 rounded" />
          
          {/* Loading indicator */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-gray-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Map controls skeleton */}
        <div className="flex justify-between items-center">
          <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Voting records table skeleton
export function VotingRecordsSkeleton({ 
  rows = 5, 
  className = '' 
}: { 
  rows?: number; 
  className?: string; 
}) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Header skeleton */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-24 animate-pulse" />
            <div className="h-8 bg-gray-200 rounded w-16 animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* Desktop table skeleton */}
      <div className="hidden md:block">
        <SkeletonTable rows={rows} columns={5} animate={true} />
      </div>
      
      {/* Mobile cards skeleton */}
      <div className="md:hidden space-y-4 p-4">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
                <div className="h-5 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded-full w-12 animate-pulse" />
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse mb-2" />
            <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Search results skeleton
export function SearchResultsSkeleton({ 
  count = 3, 
  className = '' 
}: { 
  count?: number; 
  className?: string; 
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }, (_, i) => (
        <RepresentativeSkeleton key={i} />
      ))}
    </div>
  );
}

// Bill summary skeleton
export function BillSummarySkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="space-y-4">
        {/* Bill number and status */}
        <div className="flex justify-between items-start">
          <div className="h-6 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse" />
        </div>
        
        {/* Bill title */}
        <div className="space-y-2">
          <div className="h-6 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
        </div>
        
        {/* Bill summary */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
        </div>
        
        {/* Metadata */}
        <div className="flex gap-4 pt-2">
          <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-28 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Campaign finance skeleton
export function CampaignFinanceSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="space-y-6">
        {/* Header */}
        <div className="h-6 bg-gray-200 rounded w-1/3 animate-pulse" />
        
        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="h-8 bg-gray-200 rounded w-20 mx-auto mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded w-16 mx-auto animate-pulse" />
            </div>
          ))}
        </div>
        
        {/* Chart placeholder */}
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
          <div className="text-gray-400">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// News article skeleton
export function NewsArticleSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex gap-4">
        {/* Article image */}
        <SkeletonImage width="w-24" height="h-18" className="flex-shrink-0" />
        
        <div className="flex-1 space-y-2">
          {/* Headline */}
          <div className="h-5 bg-gray-200 rounded w-full animate-pulse" />
          <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse" />
          
          {/* Source and date */}
          <div className="flex gap-4 text-sm">
            <div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
          </div>
          
          {/* Summary */}
          <div className="space-y-1">
            <div className="h-4 bg-gray-200 rounded w-full animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Generic page skeleton
export function PageSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`max-w-7xl mx-auto px-4 py-6 ${className}`}>
      {/* Page header */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
      </div>
      
      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <RepresentativeSkeleton />
          <VotingRecordsSkeleton rows={3} />
        </div>
        
        {/* Sidebar */}
        <div className="space-y-6">
          <CampaignFinanceSkeleton />
          <div className="space-y-4">
            <NewsArticleSkeleton />
            <NewsArticleSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}
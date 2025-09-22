/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Skeleton } from '@/shared/components/ui';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex gap-4 mb-6">
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
            <Skeleton className="h-10 w-32 rounded" />
          </div>
        </div>

        <div className="space-y-4">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

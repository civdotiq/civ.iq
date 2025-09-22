/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Skeleton } from '@/shared/components/ui';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-8">
        <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-8">
          <Skeleton className="h-10 w-64 mb-4" />
          <Skeleton className="h-6 w-48 mb-6" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
            <div className="text-center space-y-2">
              <Skeleton className="h-8 w-16 mx-auto" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border-2 border-black border border-gray-100 p-6">
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="p-4 border border-gray-100">
                <Skeleton className="h-5 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

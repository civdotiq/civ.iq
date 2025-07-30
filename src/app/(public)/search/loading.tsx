/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Skeleton } from '@/shared/components/ui';

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <Skeleton className="h-10 w-64 mx-auto" />
          <Skeleton className="h-6 w-96 mx-auto" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <Skeleton className="h-12 w-full rounded-lg" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-10 w-24 rounded" />
            <Skeleton className="h-10 w-24 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

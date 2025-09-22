/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { RepresentativeCardSkeleton } from '@/shared/components/ui';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <div className="h-10 w-64 mx-auto bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded shimmer" />
          <div className="h-6 w-96 mx-auto bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded shimmer" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 9 }).map((_, index) => (
            <RepresentativeCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

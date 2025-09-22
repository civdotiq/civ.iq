/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { SearchResultsSkeleton } from '@/shared/components/ui/SkeletonComponents';
import { LoadingMessage } from '@/shared/components/ui/LoadingStates';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <LoadingMessage
        message="Finding Your Representatives"
        submessage="Looking up your district and gathering representative information..."
        className="mb-8"
      />
      <SearchResultsSkeleton count={6} />
    </div>
  );
}

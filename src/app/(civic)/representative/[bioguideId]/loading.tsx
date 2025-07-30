/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { ProfileHeaderSkeleton, TabContentSkeleton } from '@/shared/components/ui';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <ProfileHeaderSkeleton />
      <TabContentSkeleton />
    </div>
  );
}

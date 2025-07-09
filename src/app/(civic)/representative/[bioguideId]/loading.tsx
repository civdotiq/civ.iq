/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { ProfileHeaderSkeleton, TabContentSkeleton } from '@/components/SkeletonLoader';

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto p-6">
      <ProfileHeaderSkeleton />
      <TabContentSkeleton />
    </div>
  );
}

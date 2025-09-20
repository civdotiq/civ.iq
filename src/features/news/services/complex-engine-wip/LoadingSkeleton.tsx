'use client';

import React from 'react';

export const LoadingSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse p-4 space-y-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </div>
  );
};

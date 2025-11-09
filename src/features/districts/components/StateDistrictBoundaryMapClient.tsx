'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Client-side wrapper for StateDistrictBoundaryMap
 *
 * This wrapper is necessary because Next.js 15 Server Components cannot use
 * dynamic() with ssr: false. By marking this as a Client Component, we can
 * use dynamic imports with ssr: false to prevent server-side rendering of
 * MapLibre GL components.
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

interface StateDistrictBoundaryMapProps {
  stateCode: string;
  chamber: 'upper' | 'lower';
  district: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

// Dynamic import of StateDistrictBoundaryMap to avoid SSR issues with MapLibre GL
const StateDistrictBoundaryMap = dynamic(
  () =>
    import('./StateDistrictBoundaryMap').then(mod => ({
      default: mod.default,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center bg-white border-2 border-gray-300"
        style={{ height: 500 }}
      >
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-sm text-gray-600">Loading district map...</p>
        </div>
      </div>
    ),
  }
);

export default function StateDistrictBoundaryMapClient(props: StateDistrictBoundaryMapProps) {
  return <StateDistrictBoundaryMap {...props} />;
}

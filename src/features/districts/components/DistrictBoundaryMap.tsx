'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface DistrictBoundaryMapProps {
  districtId: string;
  state: string;
  district: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function DistrictBoundaryMap({
  districtId: _districtId,
  state,
  district,
  width = 800,
  height = 500,
  className = '',
}: DistrictBoundaryMapProps) {
  return (
    <div
      className={`flex items-center justify-center bg-white border-2 border-black ${className}`}
      style={{ width, height }}
    >
      <div className="text-center p-8">
        <p className="text-gray-600 font-medium">
          {state}-{district} District Boundary Map
        </p>
        <p className="text-sm text-gray-500 mt-2">Data unavailable</p>
        <p className="text-xs text-gray-400 mt-1">
          Requires Census Bureau TIGER/Line shapefile integration
        </p>
      </div>
    </div>
  );
}

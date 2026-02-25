/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { FC } from 'react';

export interface DataSource {
  name: string;
  fetchedAt?: string;
  status: 'available' | 'unavailable' | 'stale';
}

interface DataProvenanceProps {
  sources: DataSource[];
  generatedAt?: string;
  quality?: 'complete' | 'partial' | 'degraded';
  className?: string;
}

/**
 * Reusable data provenance footer showing which APIs contributed data.
 * Replaces ad-hoc attribution in CivicAlignmentTab and other components.
 *
 * Design: 8px padding, gray border-top, no rounded corners.
 */
export const DataProvenance: FC<DataProvenanceProps> = ({
  sources,
  generatedAt,
  quality,
  className = '',
}) => {
  const available = sources.filter(s => s.status === 'available');
  const unavailable = sources.filter(s => s.status === 'unavailable');
  const stale = sources.filter(s => s.status === 'stale');

  return (
    <div className={`pt-3 border-t border-gray-200 ${className}`}>
      {/* Quality warning */}
      {quality === 'partial' && (
        <p className="text-xs text-yellow-800 mb-2">
          Some data sources were unavailable. Results based on partial data.
        </p>
      )}
      {quality === 'degraded' && (
        <p className="text-xs text-yellow-800 mb-2">
          Most data sources were unavailable. Results may be incomplete.
        </p>
      )}

      {/* Source attribution */}
      <p className="text-xs text-gray-500">
        {available.length > 0 && (
          <>
            Sources: {available.map(s => s.name).join(', ')}
            {'. '}
          </>
        )}
        {stale.length > 0 && (
          <>
            Stale: {stale.map(s => s.name).join(', ')}
            {'. '}
          </>
        )}
        {unavailable.length > 0 && (
          <>
            Unavailable: {unavailable.map(s => s.name).join(', ')}
            {'. '}
          </>
        )}
        {generatedAt && <>Generated {formatProvenanceDate(generatedAt)}.</>}
      </p>
    </div>
  );
};

function formatProvenanceDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

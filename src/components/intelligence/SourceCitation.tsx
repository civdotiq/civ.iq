/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import type { InsightSource } from '@/lib/intelligence/types';

/**
 * SourceCitation — compact one-line source provenance display.
 *
 * Renders: "Sources: 3 -- FEC filings (Q3-Q4 2025), Senate LDA (119th Congress), ..."
 * Replaces the scattered dataAsOf / methodology / source fields with a single scannable line.
 */

interface SourceCitationProps {
  sources: InsightSource[];
  dataAsOf: string;
  className?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatSource(source: InsightSource): string {
  const parts = [source.name];
  if (source.period) parts[0] += ` (${source.period})`;
  if (source.recordCount !== undefined && source.recordCount > 0) {
    parts[0] += ` [${source.recordCount.toLocaleString()}]`;
  }
  return parts[0]!;
}

export function SourceCitation({ sources, dataAsOf, className = '' }: SourceCitationProps) {
  if (sources.length === 0) {
    return (
      <p className={`type-xs text-gray-400 ${className}`}>Data through {formatDate(dataAsOf)}</p>
    );
  }

  return (
    <p className={`type-xs text-gray-400 ${className}`}>
      <span className="text-gray-500">Data through {formatDate(dataAsOf)}</span>
      {' · '}
      <span className="text-gray-500 aicher-heading-wide">Sources: {sources.length}</span>
      {' \u2014 '}
      {sources.map(s => formatSource(s)).join(', ')}
    </p>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

'use client';

import { FC, ReactNode } from 'react';
import { formatDateOnly } from '@/lib/utils/date-only';

export interface DataSource {
  name: string;
  /** When CIV.IQ fetched it (ISO timestamp). */
  fetchedAt?: string;
  status: 'available' | 'unavailable' | 'stale';
  // The fields below are read by the block variant only.
  publisher?: string;
  href?: string;
  /** What this source supplies on the page. */
  covers?: string;
  /** The upstream's own as-of line, e.g. "Record updated Sep 19, 2026". */
  asOf?: string;
  license?: string;
  licenseHref?: string;
  methodHref?: string;
}

interface DataProvenanceProps {
  sources: DataSource[];
  generatedAt?: string;
  quality?: 'complete' | 'partial' | 'degraded';
  className?: string;
  /**
   * `line` (default): a one-line footer for a section.
   * `block`: the page-level "Sources and method" list.
   */
  variant?: 'line' | 'block';
  /** Block variant: a note under the list, e.g. how AI text is labeled. */
  note?: ReactNode;
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
  variant = 'line',
  note,
}) => {
  if (variant === 'block') {
    return <SourcesAndMethod sources={sources} note={note} className={className} />;
  }

  const available = sources.filter(s => s.status === 'available');
  const unavailable = sources.filter(s => s.status === 'unavailable');
  const stale = sources.filter(s => s.status === 'stale');

  return (
    <div className={`pt-3 border-t border-gray-200 ${className}`}>
      {/* Quality warning */}
      {quality === 'partial' && (
        <p className="text-xs text-gray-600 mb-2">
          Some data sources were unavailable. Results based on partial data.
        </p>
      )}
      {quality === 'degraded' && (
        <p className="text-xs text-gray-600 mb-2">
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

/**
 * Page-level source list: publisher, as-of date, load time, license and a
 * method link per source. A date shows only where the record carries one.
 */
function SourcesAndMethod({
  sources,
  note,
  className,
}: {
  sources: DataSource[];
  note?: ReactNode;
  className: string;
}) {
  return (
    <section
      aria-labelledby="sources-and-method"
      className={`bg-white border-2 border-black p-6 ${className}`}
    >
      <h2 id="sources-and-method" className="text-lg font-semibold text-gray-900">
        Sources and method
      </h2>
      <ul className="mt-grid-2 divide-y divide-gray-200 border-t border-gray-200">
        {sources.map(source => {
          const loaded = source.fetchedAt ? formatLoadedAt(source.fetchedAt) : '';
          const dates = [source.asOf, loaded && `Loaded ${loaded}`].filter(Boolean);
          return (
            <li key={`${source.name}-${source.covers ?? ''}`} className="py-grid-2">
              <p className="text-sm text-gray-900">
                {source.href ? (
                  <a
                    href={source.href}
                    className="font-semibold text-civiq-blue hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {source.name}
                  </a>
                ) : (
                  <span className="font-semibold">{source.name}</span>
                )}
                {source.publisher && <span className="text-gray-600"> · {source.publisher}</span>}
              </p>
              {source.covers && <p className="mt-1 text-sm text-gray-700">{source.covers}</p>}
              {dates.length > 0 && (
                <p className="mt-1 text-xs text-gray-600">{dates.join(' · ')}</p>
              )}
              {(source.license || source.methodHref) && (
                <p className="mt-1 text-xs text-gray-600">
                  {source.license &&
                    (source.licenseHref ? (
                      <a
                        href={source.licenseHref}
                        className="hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.license}
                      </a>
                    ) : (
                      source.license
                    ))}
                  {source.license && source.methodHref && ' · '}
                  {source.methodHref && (
                    <a href={source.methodHref} className="text-civiq-blue hover:underline">
                      Method →
                    </a>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {note && <p className="mt-grid-2 text-sm text-gray-700">{note}</p>}
      <p className="mt-grid-2 text-xs text-gray-500">
        Dates shown where the source reports one. “Loaded” is when CIV.IQ last fetched the record.
      </p>
    </section>
  );
}

/** "Oct 20, 2026, 9:12 AM ET": on one fixed clock so SSR and hydration agree. */
function formatLoadedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${formatDateOnly(iso, { month: 'short', day: 'numeric', year: 'numeric' })}, ${time} ET`;
}

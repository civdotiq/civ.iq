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
  /** Short label for the collapsed summary, e.g. "CRS". */
  shortName?: string;
  publisher?: string;
  href?: string;
  /** What this source supplies on the page. */
  covers?: string;
  /** The upstream's own as-of line, e.g. "Record updated Sep 19, 2026". */
  asOf?: string;
  license?: string;
  licenseHref?: string;
  methodHref?: string;
  /** Name of the methodology section `methodHref` points to. */
  methodLabel?: string;
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
  /** Block variant: the dates on the collapsed line, in place of the first
   *  source's date (profiles: "Latest record: … · Checked: …"). */
  headline?: string;
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
  headline,
}) => {
  if (variant === 'block') {
    return (
      <SourcesAndMethod sources={sources} note={note} className={className} headline={headline} />
    );
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
 * Page-level source list, collapsed to one line by default. Opened, it shows
 * one row per source (name, publisher, what it covers, dates), then the
 * licenses and method links once. A date shows only where the record carries
 * one. Native <details> keeps every row in the HTML for crawlers and screen
 * readers, with no client JS.
 */
/** Beyond this, the collapsed summary names the first few and counts the rest. */
const MAX_SUMMARY_NAMES = 8;

function SourcesAndMethod({
  sources,
  note,
  className,
  headline: givenHeadline,
}: {
  sources: DataSource[];
  note?: ReactNode;
  className: string;
  headline?: string;
}) {
  const allNames = [...new Set(sources.map(s => s.shortName ?? s.name))];
  const names =
    allNames.length > MAX_SUMMARY_NAMES
      ? [
          ...allNames.slice(0, MAX_SUMMARY_NAMES - 2),
          `and ${allNames.length - MAX_SUMMARY_NAMES + 2} more`,
        ]
      : allNames;
  const headline = givenHeadline || sources.find(s => s.asOf)?.asOf;

  const licenses = new Map<string, { href?: string; names: string[] }>();
  for (const source of sources) {
    if (!source.license) continue;
    const group = licenses.get(source.license) ?? { href: source.licenseHref, names: [] };
    group.names.push(source.shortName ?? source.name);
    licenses.set(source.license, group);
  }
  // Largest license group last, as "all other sources", so a page with one
  // CC0 source among a dozen federal ones doesn't list every federal name.
  const licenseGroups = [...licenses].sort((a, b) => a[1].names.length - b[1].names.length);
  const methods = new Map<string, string>();
  for (const source of sources) {
    if (source.methodHref && !methods.has(source.methodHref)) {
      methods.set(source.methodHref, source.methodLabel ?? 'Method');
    }
  }

  return (
    <details className={`group bg-white border-2 border-black ${className}`}>
      <summary className="flex cursor-pointer list-none flex-wrap items-baseline gap-x-grid-1 px-grid-3 py-grid-2 text-sm text-gray-600 [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="inline-block text-gray-500 transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        <h2 id="sources-and-method" className="font-semibold text-gray-900">
          Sources and method
        </h2>
        <span className="min-w-0">
          {/* Names repeat inside; on a phone the summary keeps just the date. */}
          <span className="hidden sm:inline"> · {names.join(', ')}</span>
          {headline && <span> · {headline}</span>}
        </span>
      </summary>

      <div className="border-t border-gray-200 px-grid-3 pb-grid-2">
        <ul className="divide-y divide-gray-200">
          {sources.map(source => {
            const loaded = source.fetchedAt ? formatLoadedAt(source.fetchedAt) : '';
            const dates = [source.asOf, loaded && `Loaded ${loaded}`].filter(Boolean);
            return (
              <li
                key={`${source.name}-${source.covers ?? ''}`}
                className="grid gap-x-grid-3 gap-y-1 py-grid-1 text-sm sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_minmax(0,16rem)]"
              >
                <div>
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
                    <span className="font-semibold text-gray-900">{source.name}</span>
                  )}
                  {source.publisher && (
                    <span className="block text-xs text-gray-500">{source.publisher}</span>
                  )}
                </div>
                <div className="text-gray-700">{source.covers}</div>
                <div className="text-xs text-gray-600">{dates.join(' · ')}</div>
              </li>
            );
          })}
        </ul>

        <div className="space-y-1 border-t border-gray-200 pt-grid-1 text-xs text-gray-600">
          <p>
            {licenseGroups.map(([license, group], i) => (
              <span key={license}>
                {i > 0 && ' · '}
                {licenseGroups.length === 1
                  ? 'All sources: '
                  : i === licenseGroups.length - 1
                    ? 'All other sources: '
                    : `${group.names.join(', ')}: `}
                {group.href ? (
                  <a
                    href={group.href}
                    className="hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {license}
                  </a>
                ) : (
                  license
                )}
              </span>
            ))}
            {methods.size > 0 && ' · Method: '}
            {[...methods].map(([href, label], i) => (
              <span key={href}>
                {i > 0 && ' · '}
                <a href={href} className="text-civiq-blue hover:underline">
                  {label} →
                </a>
              </span>
            ))}
          </p>
          {note && <p className="text-gray-700">{note}</p>}
          <p className="text-gray-500">
            Dates shown where the source reports one. “Loaded” is when CIV.IQ last fetched the
            record.
          </p>
        </div>
      </div>
    </details>
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

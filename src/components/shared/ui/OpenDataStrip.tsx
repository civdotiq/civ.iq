/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Rss } from 'lucide-react';
import Link from 'next/link';

interface OpenDataStripProps {
  feedUrl?: string;
  feedLabel?: string;
  apiUrl?: string;
  exportUrl?: string;
  congressUrl?: string;
  className?: string;
}

/**
 * Open Data Strip — surfaces open protocol links on key pages.
 *
 * Matches the ContextualFooter/DistrictFooter data source strip pattern:
 * text-[11px] text-gray-400, border-t, uppercase tracking-wider label,
 * hover:text-gray-600 links, bullet separators.
 */
export function OpenDataStrip({
  feedUrl,
  feedLabel = 'RSS Feed',
  apiUrl,
  exportUrl,
  congressUrl,
  className = '',
}: OpenDataStripProps) {
  const items: React.ReactNode[] = [];

  if (feedUrl) {
    items.push(
      <a
        key="feed"
        href={feedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-600 inline-flex items-center gap-1"
      >
        <Rss className="w-3.5 h-3.5" />
        {feedLabel}
      </a>
    );
  }

  if (apiUrl) {
    items.push(
      <a key="api" href={apiUrl} className="hover:text-gray-600">
        JSON API
      </a>
    );
  }

  if (exportUrl) {
    items.push(
      <a
        key="export"
        href={exportUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-600"
      >
        Export
      </a>
    );
  }

  items.push(
    <a
      key="nostr"
      href="https://njump.me/civiq@civ.iq"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-gray-600"
    >
      Nostr
    </a>
  );

  items.push(
    <a
      key="fediverse"
      href="https://civ.iq/api/activitypub/actor"
      target="_blank"
      rel="noopener noreferrer"
      className="hover:text-gray-600"
    >
      Fediverse @civiq@civ.iq
    </a>
  );

  if (congressUrl) {
    items.push(
      <a
        key="congress"
        href={congressUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-gray-600"
      >
        Congress.gov
      </a>
    );
  }

  return (
    <div
      className={`mt-10 pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4 text-[11px] text-gray-400 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="uppercase tracking-wider">Open Data</span>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-3">
            {i > 0 && <span>•</span>}
            {item}
          </span>
        ))}
      </div>
      <Link href="/open" className="hover:text-gray-600 uppercase tracking-wider">
        All Protocols →
      </Link>
    </div>
  );
}

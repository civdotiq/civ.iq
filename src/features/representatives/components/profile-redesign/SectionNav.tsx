/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export interface SectionNavItem {
  /** Anchor id of the target section element. */
  id: string;
  label: string;
}

interface SectionNavProps {
  items: SectionNavItem[];
}

/**
 * Sticky in-page wayfinding for the profile overview.
 * Active state uses interactive blue with a 3px emphasis border —
 * never party colors (design-system rule).
 */
/** How long to trust a click over the observer, in ms. Covers a smooth scroll. */
const CLICK_SETTLE_MS = 1200;

export function SectionNav({ items }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');

  /**
   * Full visibility state, not just the entries that changed. An
   * IntersectionObserver callback only reports sections whose state flipped, so
   * deciding from `entries` alone throws away everything still on screen.
   */
  const visibility = useRef<Map<string, boolean>>(new Map());

  /**
   * A click scrolls through every intervening section, and each one trips the
   * observer — so the last section crossed used to win instead of the one the
   * user asked for. Ignore observer updates until the scroll settles.
   */
  const suppressUntil = useRef(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          visibility.current.set(entry.target.id, entry.isIntersecting);
        }
        if (Date.now() < suppressUntil.current) return;
        // Document order is nav order, so the first visible item is the
        // topmost one — no need to compare bounding rects.
        const topmost = items.find(item => visibility.current.get(item.id));
        if (topmost) setActiveId(topmost.id);
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

  const handleClick = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    suppressUntil.current = Date.now() + CLICK_SETTLE_MS;
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-0 z-10 bg-white border-b border-gray-300 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="flex overflow-x-auto">
        {items.map(item => {
          const active = item.id === activeId;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              aria-current={active ? 'true' : undefined}
              onClick={e => handleClick(e, item.id)}
              className={`px-5 py-3.5 text-sm whitespace-nowrap border-b-[3px] hover:bg-gray-50 ${
                active
                  ? 'border-civiq-blue font-bold text-gray-900'
                  : 'border-transparent font-medium text-gray-900'
              }`}
            >
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useEffect, useState } from 'react';

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
export function SectionNav({ items }: SectionNavProps) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? '');

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        // Pick the topmost visible section.
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -70% 0px' }
    );

    for (const item of items) {
      const el = document.getElementById(item.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [items]);

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
              onClick={e => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                setActiveId(item.id);
              }}
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

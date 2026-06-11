/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';

interface SectionBlockProps {
  /** Anchor id targeted by the sticky section nav. */
  id: string;
  title: string;
  /** Right-aligned action, usually an "All … →" link. */
  action?: React.ReactNode;
  /** Provenance line rendered in the block footer. */
  source?: string;
  children: React.ReactNode;
}

/**
 * Bordered content section for the profile overview.
 * 2px structural border, 1px internal dividers (Aicher border hierarchy).
 */
export function SectionBlock({ id, title, action, source, children }: SectionBlockProps) {
  return (
    <section id={id} className="border-2 border-black bg-white mb-8 scroll-mt-16">
      <div className="flex items-baseline justify-between gap-4 px-6 py-4 border-b border-gray-300">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {action && <div className="text-sm font-medium shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
      {source && (
        <div className="px-6 py-2 border-t border-gray-300 text-xs text-gray-500">{source}</div>
      )}
    </section>
  );
}

/** Designed empty state — always explains why data is missing. */
export function SectionEmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

/** Shimmer placeholder rows while a section's data loads. */
export function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-6 bg-gray-100 border border-gray-200" />
      ))}
    </div>
  );
}

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
 * Content section for the profile overview. Border hierarchy: the hero and
 * glance band carry the 2px black structure; sections step down to a 1px
 * gray frame marked by a 3px interactive-blue top rule.
 */
export function SectionBlock({ id, title, action, source, children }: SectionBlockProps) {
  return (
    <section
      id={id}
      className="border border-gray-300 border-t-[3px] border-t-civiq-blue bg-white mb-10 scroll-mt-32"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-6 sm:px-8 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {action && <div className="text-sm font-medium">{action}</div>}
      </div>
      <div className="px-6 sm:px-8 pb-6">{children}</div>
      {source && (
        <div className="mx-6 sm:mx-8 py-3 border-t border-gray-200 text-xs text-gray-600">
          {source}
        </div>
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

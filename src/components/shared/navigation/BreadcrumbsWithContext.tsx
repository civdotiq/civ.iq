/**
 * Breadcrumb Navigation Component with Search Context Preservation
 * Displays hierarchical navigation and preserves the user's search query
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import logger from '@/lib/logging/simple-logger';

export interface BreadcrumbItem {
  label: string;
  href: string;
  preserveSearch?: boolean; // If true, append last search query to href
}

interface BreadcrumbsWithContextProps {
  items: BreadcrumbItem[];
  className?: string;
}

const SEARCH_CONTEXT_KEY = 'civiq_last_search';

export function BreadcrumbsWithContext({ items, className = '' }: BreadcrumbsWithContextProps) {
  // Initialize state with current search context (runs during render, not after)
  const [searchContext] = useState<string | null>(() => {
    // This initialization function runs once during initial render
    if (typeof window !== 'undefined') {
      try {
        const value = sessionStorage.getItem(SEARCH_CONTEXT_KEY);
        logger.debug('[BreadcrumbContext] Initialized with search context:', value);
        return value;
      } catch (error) {
        logger.error('[BreadcrumbContext] Failed to initialize search context:', error);
        return null;
      }
    }
    return null;
  });

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        // If preserveSearch is true and we have search context, append it to href
        let href = item.href;
        if (item.preserveSearch && searchContext) {
          href = `${item.href}${searchContext}`;
        }

        return (
          <div key={`${item.href}-${index}`} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
            {isLast ? (
              <span className="text-gray-600 font-medium">{item.label}</span>
            ) : (
              <Link
                href={href}
                className="text-civiq-blue hover:underline font-medium transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/**
 * Helper function to save search context to sessionStorage
 * Call this from the results page when a search is performed
 */
export function saveSearchContext(searchParams: { zip?: string; address?: string; q?: string }) {
  if (typeof window === 'undefined') return;

  try {
    // Build query string from search params
    const params = new URLSearchParams();
    if (searchParams.zip) params.set('zip', searchParams.zip);
    if (searchParams.address) params.set('address', searchParams.address);
    if (searchParams.q) params.set('q', searchParams.q);

    const queryString = params.toString();
    if (queryString) {
      const savedValue = `?${queryString}`;
      sessionStorage.setItem(SEARCH_CONTEXT_KEY, savedValue);
      logger.info('[BreadcrumbContext] Saved search context:', savedValue);
    } else {
      logger.warn('[BreadcrumbContext] No search params provided to save');
    }
  } catch (error) {
    logger.error('[BreadcrumbContext] Failed to save search context:', error);
  }
}

/**
 * Breadcrumb Navigation Component with Search Context Preservation
 * Displays hierarchical navigation and preserves the user's search query
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

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

/**
 * Retrieves the last search context from sessionStorage
 */
function getLastSearch(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(SEARCH_CONTEXT_KEY);
  } catch {
    return null;
  }
}

export function BreadcrumbsWithContext({ items, className = '' }: BreadcrumbsWithContextProps) {
  const [searchContext, setSearchContext] = useState<string | null>(null);

  useEffect(() => {
    // Load search context from sessionStorage on mount
    setSearchContext(getLastSearch());
  }, []);

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
      sessionStorage.setItem(SEARCH_CONTEXT_KEY, `?${queryString}`);
    }
  } catch {
    // Silently fail if sessionStorage is not available
  }
}

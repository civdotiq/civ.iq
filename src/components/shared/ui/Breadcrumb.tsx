/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbProps {
  /** Current page title */
  currentPage: string;
  /** Representative bioguide ID from query params */
  fromBioguideId?: string;
  /** Representative name from query params */
  fromRepName?: string;
  /** Additional custom breadcrumb items */
  customItems?: BreadcrumbItem[];
  /** Optional CSS class */
  className?: string;
}

/**
 * Universal breadcrumb navigation component with Aicher design
 *
 * Displays navigation context using URL query parameters
 * Example: Home > Representatives > Amy Klobuchar > Committee Name
 */
export function Breadcrumb({
  currentPage,
  fromBioguideId,
  fromRepName,
  customItems = [],
  className = '',
}: BreadcrumbProps) {
  // Build breadcrumb chain
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];

  // Add representative link if we have context
  if (fromBioguideId && fromRepName) {
    breadcrumbs.push({
      label: decodeURIComponent(fromRepName),
      href: `/representative/${fromBioguideId}`,
    });
  }

  // Add any custom items
  breadcrumbs.push(...customItems);

  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm mb-6 ${className}`}>
      {breadcrumbs.map((item, index) => (
        <React.Fragment key={`${item.href}-${index}`}>
          {index > 0 && (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
          )}
          <Link
            href={item.href}
            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors"
          >
            {index === 0 && <Home className="w-4 h-4" aria-hidden="true" />}
            <span>{item.label}</span>
          </Link>
        </React.Fragment>
      ))}

      {breadcrumbs.length > 0 && (
        <>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
          <span className="text-gray-700 font-medium" aria-current="page">
            {currentPage}
          </span>
        </>
      )}
    </nav>
  );
}

/**
 * Fallback breadcrumb for pages without context
 * Shows simple "Back to Representatives" link
 */
export function SimpleBreadcrumb({ className = '' }: { className?: string }) {
  return (
    <nav className={`mb-6 ${className}`}>
      <Link
        href="/representatives"
        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
      >
        <Home className="w-4 h-4" />
        <span>Back to Representatives</span>
      </Link>
    </nav>
  );
}

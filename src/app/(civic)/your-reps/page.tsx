/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { RepresentativeLookupForm } from '@/components/intelligence/RepresentativeLookupForm';

export default function YourRepsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Your Representatives</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Your Representatives
          </h1>
          <p className="type-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Enter your address to see who represents you in Congress. Each representative gets a
            plain-language summary of their voting record, funding sources, and key findings from
            public government data.
          </p>
        </div>

        {/* Form */}
        <RepresentativeLookupForm />
      </main>
    </div>
  );
}

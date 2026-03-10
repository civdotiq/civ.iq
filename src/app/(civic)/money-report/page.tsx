/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { AddressLookupForm } from '@/components/intelligence/AddressLookupForm';

export default function MoneyReportPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900">Money Report Card</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Money Report Card
          </h1>
          <p className="type-sm text-gray-600 dark:text-gray-400 max-w-2xl">
            Enter your address to see how campaign money connects to your representatives&apos;
            voting records. We analyze lobbying filings, campaign contributions, and voting patterns
            using public government data.
          </p>
        </div>

        {/* Form */}
        <AddressLookupForm />
      </main>
    </div>
  );
}

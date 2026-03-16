/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

const InvestigateClient = dynamic(() => import('./InvestigateClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        <div className="h-[600px] flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700">
          <p className="type-sm text-gray-500">Loading investigation canvas...</p>
        </div>
      </main>
    </div>
  ),
});

export default function InvestigatePage() {
  return (
    <Suspense>
      <InvestigateClient />
    </Suspense>
  );
}

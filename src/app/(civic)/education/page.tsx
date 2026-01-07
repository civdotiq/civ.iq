/**
 * Education Page - K-12 Civics Curriculum for Educators
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { EducationClient } from './EducationClient';

export default function EducationPage() {
  return (
    <>
      <main className="min-h-screen px-4 pb-16 bg-white">
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-gray-900">Education</span>
          </nav>

          <h1 className="text-4xl font-bold text-center mb-4">Civics Education</h1>

          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-4">
            K-12 curriculum resources for teaching civics using real government data from CIV.IQ
          </p>

          <p className="text-sm text-gray-500 text-center max-w-2xl mx-auto mb-8">
            All lessons align with NCSS C3 Framework standards and use live data from Congress.gov,
            the FEC, Census Bureau, and other official government sources.
          </p>

          <EducationClient />

          <div className="mt-12 p-4 bg-blue-50 border-2 border-civiq-blue/20">
            <p className="text-sm text-gray-600">
              <strong className="text-civiq-blue">For Educators:</strong> These lessons are designed
              to be flexible and adaptable to your classroom needs. Each lesson includes learning
              objectives aligned to national standards, hands-on activities using CIV.IQ, discussion
              questions, and assessment guidelines. All CIV.IQ data is sourced from official
              government APIs and updated in real-time.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

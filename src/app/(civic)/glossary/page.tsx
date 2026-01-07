/**
 * Civic Glossary Page - Definitions for civic and legislative terms
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { GlossaryClient } from './GlossaryClient';

export default function GlossaryPage() {
  return (
    <>
      {/* Main Content */}
      <main className="min-h-screen px-4 pb-16 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-blue-600">
              Home
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium text-gray-900">Glossary</span>
          </nav>

          <h1 className="text-4xl font-bold text-center mb-4">Civic Glossary</h1>

          <p className="text-xl text-gray-600 text-center max-w-3xl mx-auto mb-8">
            Definitions for civic and legislative terms used throughout CIV.IQ
          </p>

          <GlossaryClient />

          {/* Footer Note */}
          <div className="mt-8 p-4 bg-blue-50 border-2 border-civiq-blue/20">
            <p className="text-sm text-gray-600">
              <strong className="text-civiq-blue">Note:</strong> This glossary provides general
              definitions for educational purposes. For official interpretations, consult primary
              legal sources or congressional documentation.
            </p>
          </div>
        </div>
      </main>
    </>
  );
}

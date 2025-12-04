/**
 * Civic Glossary Page - Definitions for civic and legislative terms
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { Header } from '@/shared/components/navigation/Header';
import { GlossaryClient } from './GlossaryClient';
import { BookOpen } from 'lucide-react';

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-civiq-blue to-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="text-white/70 hover:text-white">
                  Home
                </Link>
              </li>
              <li className="text-white/50" aria-hidden="true">
                /
              </li>
              <li className="font-medium text-white">Glossary</li>
            </ol>
          </nav>

          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-lg">
              <BookOpen className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold">Civic Glossary</h1>
              <p className="text-lg text-white/80 mt-1">
                Definitions for civic and legislative terms
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
}

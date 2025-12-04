/**
 * Civic Glossary Page - Definitions for civic and legislative terms
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import Link from 'next/link';
import { GlossaryClient } from './GlossaryClient';

export const metadata: Metadata = {
  title: 'Civic Glossary | CIV.IQ',
  description:
    'Comprehensive glossary of civic and legislative terms. Learn about Congress, bills, voting, elections, and how government works.',
  keywords: [
    'civic glossary',
    'legislative terms',
    'congress definitions',
    'government terminology',
    'political vocabulary',
  ],
};

export default function GlossaryPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b-2 border-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-4 text-sm" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
              <li>
                <Link href="/" className="text-gray-500 hover:text-civiq-blue">
                  Home
                </Link>
              </li>
              <li className="text-gray-400" aria-hidden="true">
                /
              </li>
              <li className="font-medium text-gray-900">Glossary</li>
            </ol>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Civic Glossary</h1>
          <p className="text-lg text-gray-600 mt-2">
            Definitions for civic and legislative terms to help you understand how government works.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <GlossaryClient />

        {/* Footer Note */}
        <div className="mt-8 p-4 bg-white border-2 border-black">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> This glossary provides general definitions for educational
            purposes. For official interpretations, consult primary legal sources or congressional
            documentation.
          </p>
        </div>
      </div>
    </div>
  );
}

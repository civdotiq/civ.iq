/**
 * Civic Glossary Page - Definitions for civic and legislative terms
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { GlossaryClient } from './GlossaryClient';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org/glossary' },
  title: 'Civic Glossary',
  description:
    'Definitions for civic and legislative terms. Understand congressional procedures, campaign finance, and government structure.',
  openGraph: {
    title: 'Civic Glossary | CIV.IQ',
    description:
      'Definitions for civic and legislative terms. Understand congressional procedures, campaign finance, and government structure.',
    url: 'https://civdotiq.org/glossary',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

export default function GlossaryPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Glossary', url: 'https://civdotiq.org/glossary' },
        ]}
      />
      {/* Main Content */}
      <main className="min-h-screen px-4 pt-8 pb-16 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb Navigation */}
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-civiq-blue">
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
          <div className="mt-8 p-4 bg-civiq-blue/10 border-2 border-civiq-blue/20">
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

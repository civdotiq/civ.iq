/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import { BreadcrumbSchema, ItemListSchema, CollectionPageSchema } from '@/components/seo/JsonLd';
import { SectorListingPage } from '@/components/search/SearchVariants';

export const metadata: Metadata = {
  alternates: { canonical: 'https://civdotiq.org/industry' },
  title: 'Industries',
  description:
    'Track how industry sectors connect to federal legislation, congressional committees, and government agencies.',
  openGraph: {
    title: 'Industries | CIV.IQ',
    description:
      'Track how industry sectors connect to federal legislation, congressional committees, and government agencies.',
    url: 'https://civdotiq.org/industry',
    siteName: 'CIV.IQ',
    type: 'website',
  },
};

const SECTORS = [
  { name: 'Agribusiness', slug: 'agribusiness' },
  { name: 'Communications/Electronics', slug: 'communications-electronics' },
  { name: 'Construction', slug: 'construction' },
  { name: 'Defense', slug: 'defense' },
  { name: 'Energy/Natural Resources', slug: 'energy-natural-resources' },
  { name: 'Finance/Insurance/Real Estate', slug: 'finance-insurance-real-estate' },
  { name: 'Health', slug: 'health' },
  { name: 'Transportation', slug: 'transportation' },
  { name: 'Misc Business', slug: 'misc-business' },
  { name: 'Labor', slug: 'labor' },
];

interface IndustryPageProps {
  searchParams: Promise<{ v?: string; cycle?: string }>;
}

export default async function IndustryIndexPage({ searchParams }: IndustryPageProps) {
  const { v, cycle } = await searchParams;

  const isPreviewEnv =
    process.env.NEXT_PUBLIC_CIVIQ_V === 'new' && process.env.NODE_ENV !== 'production';
  const useRedesign = v === 'new' || isPreviewEnv;

  if (useRedesign) {
    return <SectorListingPage cycle={cycle} />;
  }

  return <LegacyIndustryIndexPage />;
}

function LegacyIndustryIndexPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Industries', url: 'https://civdotiq.org/industry' },
        ]}
      />
      <CollectionPageSchema
        name="Industry Sectors"
        description="Track how industry sectors connect to federal legislation, congressional committees, and government agencies."
        url="https://civdotiq.org/industry"
        hasPart={SECTORS.map(s => ({
          name: s.name,
          url: `https://civdotiq.org/industry/${s.slug}`,
        }))}
      />
      <ItemListSchema
        name="Industry Sectors"
        url="https://civdotiq.org/industry"
        items={SECTORS.map(s => ({
          name: s.name,
          url: `https://civdotiq.org/industry/${s.slug}`,
        }))}
      />
      <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
        <main className="container mx-auto px-4 py-8">
          <nav className="text-sm text-gray-500 mb-6">
            <Link href="/" className="hover:text-[#3ea2d4]">
              Home
            </Link>
            <span className="mx-2">&rsaquo;</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">Industries</span>
          </nav>

          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Industries</h1>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
              Explore how industry sectors connect to federal legislation, congressional committees,
              and government agencies. Data sourced from Congress.gov and the FEC.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SECTORS.map(sector => (
              <Link
                key={sector.slug}
                href={`/industry/${sector.slug}`}
                className="block p-4 border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] hover:border-[#3ea2d4] transition-colors"
              >
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {sector.name}
                </span>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Related bills, committees &amp; agencies
                </p>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}

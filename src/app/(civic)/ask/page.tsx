/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * /ask — Question directory page.
 *
 * Displays all question templates grouped by category (WHO/HOW/WHAT/WHERE/WHY).
 * Static page — no dynamic data fetching, just reads from the in-memory registry.
 */

import type { Metadata } from 'next';
import Link from 'next/link';
import {
  getAllTemplates,
  getCategoryLabel,
  type QuestionTemplate,
} from '@/lib/questions/question-registry';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

export const metadata: Metadata = {
  title: 'Ask a Question | CIV.IQ',
  description:
    'Browse civic questions about your representatives — answered with real government data from Congress.gov and FEC filings.',
  alternates: { canonical: 'https://civdotiq.org/ask' },
  openGraph: {
    title: 'Ask a Question | CIV.IQ',
    description:
      'Browse civic questions about your representatives — answered with real government data.',
    url: 'https://civdotiq.org/ask',
    siteName: 'CIV.IQ',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Ask a Question | CIV.IQ',
    description:
      'Browse civic questions about your representatives — answered with real government data.',
    site: '@civdotiq',
  },
};

const CATEGORY_ORDER: QuestionTemplate['category'][] = ['who', 'how', 'what', 'where', 'why'];

const ENTITY_TYPE_LABELS: Record<QuestionTemplate['entityType'], string> = {
  representative: 'Representative',
  committee: 'Committee',
  topic: 'Topic',
};

function displayQuestion(template: QuestionTemplate): string {
  const placeholder =
    template.entityType === 'committee'
      ? 'this committee'
      : template.entityType === 'topic'
        ? 'this topic'
        : 'your representative';
  return template.questionPattern.replace(/\{name\}/g, placeholder);
}

export default function AskIndexPage() {
  const templates = getAllTemplates();

  const grouped = new Map<QuestionTemplate['category'], QuestionTemplate[]>();
  for (const t of templates) {
    const list = grouped.get(t.category) ?? [];
    list.push(t);
    grouped.set(t.category, list);
  }

  const showEntityType = !templates.every(t => t.entityType === templates[0]?.entityType);

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Questions', url: 'https://civdotiq.org/ask' },
        ]}
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-grid-3">
          <h1 className="type-2xl font-semibold text-black mb-2">Ask a Question</h1>
          <p className="type-base text-gray-600 mb-grid-4">
            Questions about representatives, committees, and policy — answered with real government
            data.
          </p>

          <div className="border-2 border-black bg-white p-grid-2 mb-grid-4">
            <p className="type-sm text-gray-600 mb-2">
              Questions are answered for specific representatives using official government data.
            </p>
            <Link href="/your-reps" className="type-sm font-medium text-[#3ea2d4] hover:underline">
              Find your representative →
            </Link>
          </div>

          {CATEGORY_ORDER.map(category => {
            const items = grouped.get(category);
            if (!items?.length) return null;

            return (
              <section key={category} id={category} className="mb-grid-4">
                <h2 className="type-xs aicher-heading-wide text-gray-500 mb-grid-2">
                  {getCategoryLabel(category).toUpperCase()}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map(template => (
                    <div key={template.slug} className="border-2 border-black bg-white p-grid-2">
                      <p className="type-base font-medium text-black">
                        {displayQuestion(template)}
                      </p>
                      {showEntityType && (
                        <p className="type-xs text-gray-500 mt-1 uppercase tracking-wider">
                          {ENTITY_TYPE_LABELS[template.entityType]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </>
  );
}

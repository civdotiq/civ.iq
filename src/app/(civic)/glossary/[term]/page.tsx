/**
 * Individual Glossary Term Page - SEO-optimized pages for high-value civic terms
 *
 * SEO Strategy: Creates dedicated pages for searchable civic terms like "filibuster",
 * "cloture", "veto", etc. Each page targets long-tail queries like "what is a filibuster".
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FAQSection } from '@/components/seo/WikipediaStyleSEO';
import { ExploreFooter } from '@/components/seo/ExploreFooter';
import { BreadcrumbSchema, FAQSchema } from '@/components/seo/JsonLd';
import { CIVIC_GLOSSARY, GLOSSARY_CATEGORIES, type GlossaryTerm } from '@/lib/data/civic-glossary';

// Generate static params for all glossary terms
export async function generateStaticParams() {
  return CIVIC_GLOSSARY.map(term => ({
    term: term.term.toLowerCase().replace(/\s+/g, '-'),
  }));
}

// Helper to convert slug to term lookup
function slugToTerm(slug: string): GlossaryTerm | undefined {
  const normalizedSlug = slug.toLowerCase();
  return CIVIC_GLOSSARY.find(t => t.term.toLowerCase().replace(/\s+/g, '-') === normalizedSlug);
}

// Helper to convert term to slug
function termToSlug(term: string): string {
  return term.toLowerCase().replace(/\s+/g, '-');
}

interface PageProps {
  params: Promise<{ term: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { term: termSlug } = await params;
  const glossaryTerm = slugToTerm(termSlug);

  if (!glossaryTerm) {
    return { title: 'Term Not Found | CIV.IQ Glossary' };
  }

  const title = `What is a ${glossaryTerm.term}? Definition & Explanation | CIV.IQ`;
  const description = `${glossaryTerm.definition.slice(0, 155)}...`;

  return {
    title,
    description,
    keywords: [
      glossaryTerm.term,
      `what is ${glossaryTerm.term.toLowerCase()}`,
      `${glossaryTerm.term.toLowerCase()} definition`,
      `${glossaryTerm.term.toLowerCase()} meaning`,
      GLOSSARY_CATEGORIES[glossaryTerm.category],
      ...(glossaryTerm.relatedTerms || []),
    ],
    openGraph: {
      title: `${glossaryTerm.term} - Civic Glossary`,
      description,
      type: 'article',
    },
  };
}

export default async function GlossaryTermPage({ params }: PageProps) {
  const { term: termSlug } = await params;
  const glossaryTerm = slugToTerm(termSlug);

  if (!glossaryTerm) {
    notFound();
  }

  // Find related terms that exist in glossary
  const relatedTermsInGlossary = (glossaryTerm.relatedTerms || [])
    .map(rt => CIVIC_GLOSSARY.find(t => t.term.toLowerCase() === rt.toLowerCase()))
    .filter((t): t is GlossaryTerm => t !== undefined);

  // Find terms in the same category
  const sameCategoryTerms = CIVIC_GLOSSARY.filter(
    t => t.category === glossaryTerm.category && t.term !== glossaryTerm.term
  ).slice(0, 6);

  // Build FAQ for schema
  const faqItems = [
    {
      question: `What is a ${glossaryTerm.term.toLowerCase()}?`,
      answer: glossaryTerm.definition,
    },
  ];

  if (glossaryTerm.example) {
    faqItems.push({
      question: `Can you give an example of a ${glossaryTerm.term.toLowerCase()}?`,
      answer: glossaryTerm.example,
    });
  }

  if (glossaryTerm.relatedTerms && glossaryTerm.relatedTerms.length > 0) {
    faqItems.push({
      question: `What terms are related to ${glossaryTerm.term.toLowerCase()}?`,
      answer: `Related terms include: ${glossaryTerm.relatedTerms.join(', ')}. Understanding these related concepts helps provide context for ${glossaryTerm.term.toLowerCase()}.`,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data */}
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Glossary', url: 'https://civdotiq.org/glossary' },
          {
            name: glossaryTerm.term,
            url: `https://civdotiq.org/glossary/${termToSlug(glossaryTerm.term)}`,
          },
        ]}
      />
      <FAQSchema questions={faqItems} />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <Link href="/glossary" className="hover:text-blue-600">
            Glossary
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">{glossaryTerm.term}</span>
        </nav>

        {/* Page Header */}
        <article>
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                {GLOSSARY_CATEGORIES[glossaryTerm.category]}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{glossaryTerm.term}</h1>
          </header>

          {/* Definition */}
          <section className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
              Definition
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">{glossaryTerm.definition}</p>
          </section>

          {/* Example (if available) */}
          {glossaryTerm.example && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                Example
              </h2>
              <blockquote className="bg-blue-50 border-l-4 border-blue-500 p-4 text-gray-700 italic">
                {glossaryTerm.example}
              </blockquote>
            </section>
          )}

          {/* Related Terms */}
          {relatedTermsInGlossary.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                Related Terms
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relatedTermsInGlossary.map(related => (
                  <Link
                    key={related.term}
                    href={`/glossary/${termToSlug(related.term)}`}
                    className="block p-3 bg-white border-2 border-gray-200 hover:border-blue-500 transition-colors"
                  >
                    <span className="font-medium text-blue-600">{related.term}</span>
                    <p className="text-sm text-gray-600 line-clamp-2">{related.definition}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* More in this Category */}
          {sameCategoryTerms.length > 0 && (
            <section className="mb-8">
              <h2 className="text-xl font-bold text-gray-800 mb-3 border-b-2 border-gray-200 pb-2">
                More {GLOSSARY_CATEGORIES[glossaryTerm.category]} Terms
              </h2>
              <div className="flex flex-wrap gap-2">
                {sameCategoryTerms.map(term => (
                  <Link
                    key={term.term}
                    href={`/glossary/${termToSlug(term.term)}`}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700 border border-gray-200 transition-colors"
                  >
                    {term.term}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAQ Section */}
          <FAQSection faqs={faqItems} title="Common Questions" />
        </article>

        {/* Contextual Footer - Ulm Style */}
        <ExploreFooter
          currentSection="Glossary"
          relatedLinks={[
            { href: '/glossary', label: 'Full Glossary' },
            { href: '/congress', label: 'U.S. Congress' },
            { href: '/topics', label: 'Policy Topics' },
            { href: '/education', label: 'Civic Education' },
          ]}
          lastUpdated={new Date()}
          dataSource="CIV.IQ Civic Glossary"
        />
      </main>
    </div>
  );
}

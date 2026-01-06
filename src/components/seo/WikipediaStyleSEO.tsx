/**
 * Wikipedia-Style SEO Components
 *
 * These components implement Wikipedia's most effective SEO patterns:
 * 1. Table of Contents with anchor links
 * 2. FAQ sections with schema
 */

import Script from 'next/script';

// ============================================
// TABLE OF CONTENTS - Wikipedia's signature feature
// Creates jump links that appear in Google search results
// ============================================

export interface TOCItem {
  id: string;
  title: string;
  level: 1 | 2 | 3;
}

interface TableOfContentsProps {
  items: TOCItem[];
  title?: string;
}

export function TableOfContents({ items, title = 'Contents' }: TableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Table of contents" className="bg-gray-50 border-2 border-gray-200 p-4 mb-6">
      <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">{title}</h2>
      <ol className="space-y-1 text-sm">
        {items.map((item, index) => (
          <li key={item.id} className={item.level === 2 ? 'ml-4' : item.level === 3 ? 'ml-8' : ''}>
            <a href={`#${item.id}`} className="text-blue-600 hover:text-blue-800 hover:underline">
              {item.level === 1 && `${index + 1}. `}
              {item.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

// ============================================
// FAQ SECTION - Answers common questions
// Uses FAQ schema for rich snippets in Google
// ============================================

export interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSectionProps {
  faqs: FAQItem[];
  title?: string;
}

export function FAQSection({ faqs, title = 'Frequently Asked Questions' }: FAQSectionProps) {
  if (faqs.length === 0) return null;

  // Generate FAQ schema
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <section className="mt-8 pt-6 border-t-2 border-gray-200">
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>
      <dl className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="border-l-4 border-blue-500 pl-4">
            <dt className="font-semibold text-gray-800">{faq.question}</dt>
            <dd className="mt-1 text-gray-600">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

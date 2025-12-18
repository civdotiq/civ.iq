/**
 * Wikipedia-Style SEO Components
 *
 * These components implement Wikipedia's most effective SEO patterns:
 * 1. Table of Contents with anchor links
 * 2. Related Links ("See Also") sections
 * 3. FAQ sections with schema
 * 4. Freshness timestamps
 * 5. Infobox quick facts
 */

import Link from 'next/link';
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
// RELATED LINKS - Wikipedia's "See Also" section
// Creates internal link network for PageRank flow
// ============================================

export interface RelatedLink {
  href: string;
  title: string;
  description?: string;
  type?: 'representative' | 'committee' | 'bill' | 'district' | 'state' | 'vote';
}

interface RelatedLinksProps {
  links: RelatedLink[];
  title?: string;
}

export function RelatedLinks({ links, title = 'See Also' }: RelatedLinksProps) {
  if (links.length === 0) return null;

  const getIcon = (type?: string) => {
    switch (type) {
      case 'representative':
        return '👤';
      case 'committee':
        return '🏛️';
      case 'bill':
        return '📜';
      case 'district':
        return '🗺️';
      case 'state':
        return '⭐';
      case 'vote':
        return '🗳️';
      default:
        return '→';
    }
  };

  return (
    <section className="mt-8 pt-6 border-t-2 border-gray-200">
      <h2 className="text-lg font-bold text-gray-800 mb-4">{title}</h2>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {links.map(link => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded text-blue-600 hover:text-blue-800"
            >
              <span className="text-sm">{getIcon(link.type)}</span>
              <span>
                <span className="hover:underline">{link.title}</span>
                {link.description && (
                  <span className="block text-xs text-gray-500">{link.description}</span>
                )}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
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

// ============================================
// FRESHNESS TIMESTAMP - Shows content is current
// Google favors recently updated content
// ============================================

interface FreshnessTimestampProps {
  lastUpdated: Date | string;
  dataSource?: string;
}

export function FreshnessTimestamp({ lastUpdated, dataSource }: FreshnessTimestampProps) {
  const date = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
  const formatted = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="text-xs text-gray-500 flex items-center gap-2">
      <span>Last updated: {formatted}</span>
      {dataSource && (
        <>
          <span>•</span>
          <span>Source: {dataSource}</span>
        </>
      )}
    </div>
  );
}

// ============================================
// INFOBOX - Wikipedia's sidebar quick facts
// Perfect for featured snippets
// ============================================

export interface InfoboxField {
  label: string;
  value: string | React.ReactNode;
  link?: string;
}

interface InfoboxProps {
  title: string;
  subtitle?: string;
  image?: string;
  imageAlt?: string;
  fields: InfoboxField[];
}

export function Infobox({ title, subtitle, image, imageAlt, fields }: InfoboxProps) {
  return (
    <aside className="bg-gray-50 border-2 border-gray-300 p-4 w-full md:w-80 md:float-right md:ml-6 mb-6">
      {/* Title */}
      <h2 className="text-lg font-bold text-center border-b-2 border-gray-300 pb-2 mb-3">
        {title}
      </h2>

      {/* Subtitle */}
      {subtitle && <p className="text-sm text-gray-600 text-center mb-3">{subtitle}</p>}

      {/* Image */}
      {image && (
        <div className="mb-4">
          <picture>
            <img src={image} alt={imageAlt || title} className="w-full border border-gray-200" />
          </picture>
        </div>
      )}

      {/* Fields */}
      <dl className="space-y-2 text-sm">
        {fields.map((field, index) => (
          <div key={index} className="grid grid-cols-[120px_1fr] gap-2">
            <dt className="font-semibold text-gray-600">{field.label}</dt>
            <dd className="text-gray-800">
              {field.link ? (
                <Link href={field.link} className="text-blue-600 hover:underline">
                  {field.value}
                </Link>
              ) : (
                field.value
              )}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}

// ============================================
// INTERNAL LINK - Styled internal link with context
// Builds the internal link network
// ============================================

interface InternalLinkProps {
  href: string;
  children: React.ReactNode;
  title?: string;
}

export function InternalLink({ href, children, title }: InternalLinkProps) {
  return (
    <Link href={href} className="text-blue-600 hover:text-blue-800 hover:underline" title={title}>
      {children}
    </Link>
  );
}

// ============================================
// CATEGORY TAGS - Wikipedia-style categories
// Groups related content
// ============================================

interface CategoryTagsProps {
  categories: Array<{
    name: string;
    href: string;
  }>;
}

export function CategoryTags({ categories }: CategoryTagsProps) {
  if (categories.length === 0) return null;

  return (
    <div className="mt-8 pt-4 border-t border-gray-200">
      <span className="text-xs text-gray-500 mr-2">Categories:</span>
      {categories.map((cat, index) => (
        <span key={cat.href}>
          <Link href={cat.href} className="text-xs text-blue-600 hover:underline">
            {cat.name}
          </Link>
          {index < categories.length - 1 && <span className="text-gray-400 mx-1">|</span>}
        </span>
      ))}
    </div>
  );
}

/**
 * JSON-LD Structured Data Components for SEO
 * Implements Schema.org vocabulary for rich search results
 */

import Script from 'next/script';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  sameAs?: string[];
}

/**
 * Organization schema for the website
 * Used on homepage and global layout
 */
export function OrganizationSchema({
  name = 'CIV.IQ',
  url = 'https://civdotiq.org',
  logo = 'https://civdotiq.org/images/civiq-logo.png',
  description = 'Civic intelligence platform providing real-time access to federal, state, and local government data including representatives, voting records, bills, and campaign finance.',
  sameAs = ['https://twitter.com/civdotiq'],
}: OrganizationSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    url,
    logo,
    description,
    sameAs,
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      url: `${url}/contact`,
    },
  };

  return (
    <Script
      id="organization-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface WebSiteSchemaProps {
  name?: string;
  url?: string;
  searchUrl?: string;
}

/**
 * WebSite schema with search action
 * Enables sitelinks search box in Google
 */
export function WebSiteSchema({
  name = 'CIV.IQ',
  url = 'https://civdotiq.org',
  searchUrl = 'https://civdotiq.org/results?zip={search_term_string}',
}: WebSiteSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name,
    url,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchUrl,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <Script
      id="website-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface PersonSchemaProps {
  name: string;
  jobTitle: string;
  description?: string;
  image?: string;
  url?: string;
  worksFor?: {
    name: string;
    url?: string;
  };
  memberOf?: Array<{
    name: string;
    url?: string;
  }>;
  sameAs?: string[];
  affiliation?: string;
  birthDate?: string;
}

/**
 * Person schema for representatives
 * Rich snippets for politician profiles
 */
export function PersonSchema({
  name,
  jobTitle,
  description,
  image,
  url,
  worksFor,
  memberOf,
  sameAs,
  affiliation,
  birthDate,
}: PersonSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle,
  };

  if (description) schema.description = description;
  if (image) schema.image = image;
  if (url) schema.url = url;
  if (birthDate) schema.birthDate = birthDate;
  if (affiliation) schema.affiliation = affiliation;

  if (worksFor) {
    schema.worksFor = {
      '@type': 'GovernmentOrganization',
      name: worksFor.name,
      ...(worksFor.url && { url: worksFor.url }),
    };
  }

  if (memberOf && memberOf.length > 0) {
    schema.memberOf = memberOf.map(org => ({
      '@type': 'Organization',
      name: org.name,
      ...(org.url && { url: org.url }),
    }));
  }

  if (sameAs && sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return (
    <Script
      id="person-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface GovernmentOrganizationSchemaProps {
  name: string;
  description?: string;
  url?: string;
  parentOrganization?: string;
  areaServed?: string;
}

/**
 * GovernmentOrganization schema for committees
 */
export function GovernmentOrganizationSchema({
  name,
  description,
  url,
  parentOrganization = 'United States Congress',
  areaServed = 'United States',
}: GovernmentOrganizationSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    name,
    areaServed: {
      '@type': 'Country',
      name: areaServed,
    },
    parentOrganization: {
      '@type': 'GovernmentOrganization',
      name: parentOrganization,
    },
  };

  if (description) schema.description = description;
  if (url) schema.url = url;

  return (
    <Script
      id="gov-org-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{
    name: string;
    url: string;
  }>;
}

/**
 * BreadcrumbList schema for navigation
 * Improves search result display
 */
export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <Script
      id="breadcrumb-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface FAQSchemaProps {
  questions: Array<{
    question: string;
    answer: string;
  }>;
}

/**
 * FAQ schema for help/about pages
 */
export function FAQSchema({ questions }: FAQSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  };

  return (
    <Script
      id="faq-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface LegislativeEventSchemaProps {
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  organizer?: string;
  url?: string;
}

/**
 * Event schema for legislative events (votes, hearings)
 */
export function LegislativeEventSchema({
  name,
  description,
  startDate,
  endDate,
  location = 'United States Capitol',
  organizer = 'United States Congress',
  url,
}: LegislativeEventSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    location: {
      '@type': 'Place',
      name: location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Washington',
        addressRegion: 'DC',
        addressCountry: 'US',
      },
    },
    organizer: {
      '@type': 'GovernmentOrganization',
      name: organizer,
    },
  };

  if (description) schema.description = description;
  if (startDate) schema.startDate = startDate;
  if (endDate) schema.endDate = endDate;
  if (url) schema.url = url;

  return (
    <Script
      id="event-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

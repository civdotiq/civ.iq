/**
 * JSON-LD Structured Data Components for SEO
 * Implements Schema.org vocabulary for rich search results
 *
 * Uses plain <script> tags (NOT next/script) so JSON-LD is present
 * in the initial SSR HTML for crawlers. next/script defers injection
 * until after hydration, which crawlers may not execute.
 */

/**
 * Safely serialize JSON-LD, escaping </script> injection vectors.
 * Replaces < with unicode escape to prevent XSS via data fields.
 */
function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
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
  knowsAbout?: string[];
  nationality?: string;
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
  knowsAbout,
  nationality = 'United States of America',
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

  if (nationality) {
    schema.nationality = {
      '@type': 'Country',
      name: nationality,
    };
  }

  if (affiliation) {
    schema.affiliation = {
      '@type': 'Organization',
      name: affiliation,
    };
  }

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

  if (knowsAbout && knowsAbout.length > 0) {
    schema.knowsAbout = knowsAbout;
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface GovernmentOrganizationSchemaProps {
  name: string;
  description?: string;
  url?: string;
  parentOrganization?: string;
  areaServed?: string;
  member?: Array<{
    name: string;
    url?: string;
    role?: string;
  }>;
  subOrganization?: Array<{
    name: string;
    url?: string;
  }>;
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
  member,
  subOrganization,
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

  if (member && member.length > 0) {
    schema.member = member.map(m => ({
      '@type': 'OrganizationRole',
      member: {
        '@type': 'Person',
        name: m.name,
        ...(m.url && { url: m.url }),
      },
      ...(m.role && { roleName: m.role }),
    }));
  }

  if (subOrganization && subOrganization.length > 0) {
    schema.subOrganization = subOrganization.map(sub => ({
      '@type': 'GovernmentOrganization',
      name: sub.name,
      ...(sub.url && { url: sub.url }),
    }));
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
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
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface LegislationSchemaProps {
  name: string;
  legislationIdentifier: string;
  description?: string;
  datePublished?: string;
  legislationDate?: string;
  legislationPassedBy?: string;
  sponsor?: {
    name: string;
    url?: string;
  };
  legislationType?: string;
  url?: string;
}

/**
 * Legislation schema for bill pages
 * Uses schema.org Legislation type with legislationJurisdiction
 */
export function LegislationSchema({
  name,
  legislationIdentifier,
  description,
  datePublished,
  legislationDate,
  legislationPassedBy,
  sponsor,
  legislationType,
  url,
}: LegislationSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Legislation',
    name,
    legislationIdentifier,
    legislationJurisdiction: {
      '@type': 'Country',
      name: 'United States of America',
    },
  };

  if (description) schema.description = description;
  if (datePublished) schema.datePublished = datePublished;
  if (legislationDate) schema.legislationDate = legislationDate;
  if (url) schema.url = url;
  if (legislationType) schema.legislationType = legislationType;

  if (legislationPassedBy) {
    schema.legislationPassedBy = {
      '@type': 'GovernmentOrganization',
      name: legislationPassedBy,
    };
  }

  if (sponsor) {
    schema.sponsor = {
      '@type': 'Person',
      name: sponsor.name,
      ...(sponsor.url && { url: sponsor.url }),
    };
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface AdministrativeAreaSchemaProps {
  name: string;
  description?: string;
  url?: string;
  containedInPlace?: string;
  geo?: {
    latitude: number;
    longitude: number;
  };
  population?: number;
}

/**
 * AdministrativeArea schema for congressional district pages
 */
export function AdministrativeAreaSchema({
  name,
  description,
  url,
  containedInPlace,
  geo,
  population,
}: AdministrativeAreaSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AdministrativeArea',
    name,
  };

  if (description) schema.description = description;
  if (url) schema.url = url;

  if (containedInPlace) {
    schema.containedInPlace = {
      '@type': 'State',
      name: containedInPlace,
    };
  }

  if (geo) {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: geo.latitude,
      longitude: geo.longitude,
    };
  }

  if (population) {
    schema.additionalProperty = {
      '@type': 'PropertyValue',
      name: 'population',
      value: population,
    };
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface DatasetSchemaProps {
  name: string;
  description: string;
  url: string;
  downloadUrl: string;
  encodingFormat: string;
  source: string;
  sourceUrl: string;
  license?: string;
}

/**
 * Dataset schema for bulk downloadable datasets
 * Enables rich results for dataset search (Google Dataset Search)
 */
export function DatasetSchema({
  name,
  description,
  url,
  downloadUrl,
  encodingFormat,
  source,
  sourceUrl,
  license = 'https://creativecommons.org/publicdomain/mark/1.0/',
}: DatasetSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url,
    license,
    isAccessibleForFree: true,
    creator: {
      '@type': 'Organization',
      name: 'CIV.IQ',
      url: 'https://civdotiq.org',
    },
    provider: {
      '@type': 'Organization',
      name: source,
      url: sourceUrl,
    },
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat,
        contentUrl: downloadUrl,
      },
    ],
    spatialCoverage: {
      '@type': 'Place',
      name: 'United States of America',
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface DefinedTermSchemaProps {
  name: string;
  description: string;
  url?: string;
  termSet?: {
    name: string;
    url?: string;
  };
}

/**
 * DefinedTerm schema for glossary term pages
 * Enables rich results for definition queries
 */
export function DefinedTermSchema({ name, description, url, termSet }: DefinedTermSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name,
    description,
  };

  if (url) schema.url = url;

  if (termSet) {
    schema.inDefinedTermSet = {
      '@type': 'DefinedTermSet',
      name: termSet.name,
      ...(termSet.url && { url: termSet.url }),
    };
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

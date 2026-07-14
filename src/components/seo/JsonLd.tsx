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
  /** Logo URL. Pass null to omit (e.g. for third-party orgs like PACs). */
  logo?: string | null;
  description?: string;
  sameAs?: string[];
  /** Override the node @id. Defaults to `${url}/#organization` (the CIV.IQ org). */
  id?: string;
  /** External identifier (e.g. an FEC committee id) for KG disambiguation. */
  identifier?: string;
  /** Topical keywords (e.g. a PAC's industry sector). */
  keywords?: string | string[];
  /** Canonical page describing this organization. */
  mainEntityOfPage?: string;
  /** ISO founding date (e.g. from Wikidata). */
  foundingDate?: string;
  /** Postal address; emitted only when at least one part is present. */
  address?: { locality?: string; region?: string; country?: string };
  /** Parent/registry org this entity belongs to (e.g. a disclosure registry). */
  memberOf?: { name: string; url?: string; type?: string };
}

/**
 * Organization schema.
 *
 * Defaults describe CIV.IQ itself (used in the global layout and /about).
 * Pass `id`, `identifier`, `logo={null}`, `description`, and `sameAs` to
 * describe a third-party organization (e.g. a PAC linking to its FEC page).
 */
export function OrganizationSchema({
  name = 'CIV.IQ',
  url = 'https://civdotiq.org',
  logo = 'https://civdotiq.org/images/civiq-logo.png',
  description = 'Civic intelligence platform providing real-time access to federal and state government data — plus 10 pilot cities — including representatives, voting records, bills, and campaign finance.',
  sameAs = ['https://twitter.com/civdotiq', 'https://github.com/civdotiq'],
  id,
  identifier,
  keywords,
  mainEntityOfPage,
  foundingDate,
  address,
  memberOf,
}: OrganizationSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': id ?? `${url}/#organization`,
    name,
    url,
    description,
  };

  // Omit empty sameAs: keeps third-party orgs (PACs, lobby groups) from
  // emitting an empty array or inheriting the CIV.IQ default.
  if (sameAs && sameAs.length > 0) schema.sameAs = sameAs;
  if (logo) schema.logo = logo;
  if (identifier) schema.identifier = identifier;
  if (keywords && (!Array.isArray(keywords) || keywords.length > 0)) {
    schema.keywords = keywords;
  }
  if (mainEntityOfPage) {
    schema.mainEntityOfPage = { '@type': 'WebPage', '@id': mainEntityOfPage };
  }
  if (foundingDate) schema.foundingDate = foundingDate;
  if (address && (address.locality || address.region || address.country)) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(address.locality && { addressLocality: address.locality }),
      ...(address.region && { addressRegion: address.region }),
      ...(address.country && { addressCountry: address.country }),
    };
  }
  if (memberOf) {
    schema.memberOf = {
      '@type': memberOf.type ?? 'Organization',
      name: memberOf.name,
      ...(memberOf.url && { url: memberOf.url }),
    };
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface WebSiteSchemaProps {
  name?: string;
  url?: string;
  alternateName?: string[];
  searchAction?: {
    target: string;
    queryInput: string;
  };
}

/**
 * WebSite schema for site identity
 * Linked via @id to OrganizationSchema
 */
export function WebSiteSchema({
  name = 'CIV.IQ',
  url = 'https://civdotiq.org',
  alternateName,
  searchAction,
}: WebSiteSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${url}/#website`,
    name,
    url,
  };

  if (alternateName && alternateName.length > 0) {
    schema.alternateName = alternateName;
  }

  if (searchAction) {
    schema.potentialAction = {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: searchAction.target,
      },
      'query-input': searchAction.queryInput,
    };
  }

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
  mainEntityOfPage?: string;
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
  mainEntityOfPage,
}: PersonSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    jobTitle,
  };

  if (mainEntityOfPage) {
    schema.mainEntityOfPage = { '@type': 'WebPage', '@id': mainEntityOfPage };
  }
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
  mainEntityOfPage?: string;
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
  mainEntityOfPage,
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

  if (mainEntityOfPage) {
    schema.mainEntityOfPage = { '@type': 'WebPage', '@id': mainEntityOfPage };
  }
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

interface FAQPageSchemaProps {
  question: string;
  answer: string;
}

/**
 * FAQPage schema for question-template pages.
 * Renders a single Q&A pair as structured data for rich results.
 */
export function FAQPageSchema({ question, answer }: FAQPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: answer,
        },
      },
    ],
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
  mainEntityOfPage?: string;
  /** Governing body's area. Defaults to the United States; state bills pass their state. */
  jurisdiction?: { name: string; type?: 'State' | 'Country' };
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
  mainEntityOfPage,
  jurisdiction,
}: LegislationSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Legislation',
    name,
    legislationIdentifier,
    legislationJurisdiction: {
      '@type': jurisdiction?.type ?? 'Country',
      name: jurisdiction?.name ?? 'United States of America',
    },
  };

  if (mainEntityOfPage) {
    schema.mainEntityOfPage = { '@type': 'WebPage', '@id': mainEntityOfPage };
  }
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
  /** Schema.org type of the containing place. Districts sit in a State; a State sits in a Country. */
  containedInType?: 'State' | 'Country';
  geo?: {
    latitude: number;
    longitude: number;
  };
  population?: number;
  mainEntityOfPage?: string;
}

/**
 * AdministrativeArea schema for congressional district pages
 */
export function AdministrativeAreaSchema({
  name,
  description,
  url,
  containedInPlace,
  containedInType = 'State',
  geo,
  population,
  mainEntityOfPage,
}: AdministrativeAreaSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'AdministrativeArea',
    name,
  };

  if (mainEntityOfPage) {
    schema.mainEntityOfPage = { '@type': 'WebPage', '@id': mainEntityOfPage };
  }
  if (description) schema.description = description;
  if (url) schema.url = url;

  if (containedInPlace) {
    schema.containedInPlace = {
      '@type': containedInType,
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

interface DatasetDistribution {
  encodingFormat: string;
  contentUrl: string;
}

interface DatasetSchemaProps {
  name: string;
  description: string;
  url: string;
  /** @deprecated Use distributions array instead */
  downloadUrl?: string;
  /** @deprecated Use distributions array instead */
  encodingFormat?: string;
  distributions?: DatasetDistribution[];
  source: string;
  sourceUrl: string;
  license?: string;
  temporalCoverage?: string;
  dateModified?: string;
  keywords?: string[];
  variableMeasured?: string[];
  includedInDataCatalog?: { name: string; url: string };
  sameAs?: string;
  version?: string;
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
  distributions,
  source,
  sourceUrl,
  license = 'https://creativecommons.org/publicdomain/mark/1.0/',
  temporalCoverage,
  dateModified,
  keywords,
  variableMeasured,
  includedInDataCatalog,
  sameAs,
  version,
}: DatasetSchemaProps) {
  // Backward compat: wrap single downloadUrl/encodingFormat into distributions array
  const resolvedDistributions: DatasetDistribution[] =
    distributions ??
    (downloadUrl && encodingFormat ? [{ encodingFormat, contentUrl: downloadUrl }] : []);

  const schema: Record<string, unknown> = {
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
    distribution: resolvedDistributions.map(d => ({
      '@type': 'DataDownload',
      encodingFormat: d.encodingFormat,
      contentUrl: d.contentUrl,
    })),
    spatialCoverage: {
      '@type': 'Place',
      name: 'United States of America',
    },
  };

  if (temporalCoverage) schema.temporalCoverage = temporalCoverage;
  if (dateModified) schema.dateModified = dateModified;

  if (keywords && keywords.length > 0) {
    schema.keywords = keywords;
  }

  if (variableMeasured && variableMeasured.length > 0) {
    schema.variableMeasured = variableMeasured;
  }

  if (sameAs) schema.sameAs = sameAs;
  if (version) schema.version = version;

  if (includedInDataCatalog) {
    schema.includedInDataCatalog = {
      '@type': 'DataCatalog',
      name: includedInDataCatalog.name,
      url: includedInDataCatalog.url,
    };
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface GovernmentServiceSchemaProps {
  name: string;
  description: string;
  url: string;
  provider?: string;
  serviceType?: string;
  areaServed?: string;
}

/**
 * GovernmentService schema for civic tool/service pages
 * Enables rich results for government service searches
 */
export function GovernmentServiceSchema({
  name,
  description,
  url,
  provider = 'CIV.IQ',
  serviceType,
  areaServed = 'United States',
}: GovernmentServiceSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'GovernmentService',
    name,
    description,
    url,
    provider: {
      '@type': 'Organization',
      name: provider,
      url: 'https://civdotiq.org',
    },
    areaServed: {
      '@type': 'Country',
      name: areaServed,
    },
    isAccessibleForFree: true,
  };

  if (serviceType) schema.serviceType = serviceType;

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface WebAPISchemaProps {
  name: string;
  description: string;
  url: string;
  documentation?: string;
  provider?: string;
}

/**
 * WebAPI schema for REST API documentation
 * Helps search engines understand API endpoints
 */
export function WebAPISchema({
  name,
  description,
  url,
  documentation,
  provider = 'CIV.IQ',
}: WebAPISchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    name,
    description,
    url,
    provider: {
      '@type': 'Organization',
      name: provider,
      url: 'https://civdotiq.org',
    },
  };

  if (documentation) schema.documentation = documentation;

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface CommentPeriodEventSchemaProps {
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  url?: string;
  organizer?: string;
}

/**
 * Event schema specifically for comment periods
 * Uses endDate for Google's event carousel
 */
export function CommentPeriodEventSchema({
  name,
  description,
  startDate,
  endDate,
  url,
  organizer,
}: CommentPeriodEventSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name,
    startDate,
    endDate,
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: {
      '@type': 'VirtualLocation',
      url: url || 'https://www.regulations.gov',
    },
  };

  if (description) schema.description = description;
  if (url) schema.url = url;
  if (organizer) {
    schema.organizer = {
      '@type': 'GovernmentOrganization',
      name: organizer,
    };
  }

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

interface ProfilePageSchemaProps {
  person: {
    name: string;
    jobTitle: string;
    description?: string;
    image?: string;
    sameAs?: string[];
    affiliation?: string;
    birthDate?: string;
    knowsAbout?: string[];
    worksFor?: { name: string; url?: string };
    memberOf?: Array<{ name: string; url?: string }>;
  };
  url: string;
}

/**
 * ProfilePage schema wrapping a Person as mainEntity
 * Used on representative and legislator profile pages
 */
export function ProfilePageSchema({ person, url }: ProfilePageSchemaProps) {
  const personData: Record<string, unknown> = {
    '@type': 'Person',
    // Stable @id distinct from the ProfilePage node @id (which is `url`),
    // so the Knowledge Graph can disambiguate the person from the page.
    '@id': `${url}#person`,
    name: person.name,
    jobTitle: person.jobTitle,
  };

  if (person.description) personData.description = person.description;
  // Emit an absolute image URL — validators (Rich Results, schema.org) flag
  // relative paths, and crawlers resolve them inconsistently. Resolve against
  // the page's own absolute `url` so relative proxy paths become fully-qualified.
  if (person.image) {
    try {
      personData.image = new URL(person.image, url).toString();
    } catch {
      personData.image = person.image;
    }
  }
  if (person.birthDate) personData.birthDate = person.birthDate;

  if (person.affiliation) {
    personData.affiliation = { '@type': 'Organization', name: person.affiliation };
  }

  if (person.worksFor) {
    personData.worksFor = {
      '@type': 'GovernmentOrganization',
      name: person.worksFor.name,
      ...(person.worksFor.url && { url: person.worksFor.url }),
    };
  }

  if (person.memberOf && person.memberOf.length > 0) {
    personData.memberOf = person.memberOf.map(org => ({
      '@type': 'Organization',
      name: org.name,
      ...(org.url && { url: org.url }),
    }));
  }

  if (person.sameAs && person.sameAs.length > 0) {
    personData.sameAs = person.sameAs;
  }

  if (person.knowsAbout && person.knowsAbout.length > 0) {
    personData.knowsAbout = person.knowsAbout;
  }

  personData.nationality = { '@type': 'Country', name: 'United States of America' };

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': url,
    url,
    mainEntity: personData,
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface ItemListSchemaProps {
  name: string;
  description?: string;
  url?: string;
  items: Array<{
    name: string;
    url: string;
    position?: number;
    image?: string;
  }>;
  itemType?: string;
}

/**
 * ItemList schema for listing/index pages
 * Enables carousel rich results in Google
 */
export function ItemListSchema({ name, description, url, items, itemType }: ItemListSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    numberOfItems: items.length,
    // A ListItem carries either a bare name/url or a nested typed `item`,
    // never both — Google's validator warns on the redundant combination.
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: item.position ?? index + 1,
      ...(itemType
        ? {
            item: {
              '@type': itemType,
              name: item.name,
              url: item.url,
              ...(item.image && { image: item.image }),
            },
          }
        : {
            name: item.name,
            url: item.url,
            ...(item.image && { image: item.image }),
          }),
    })),
  };

  if (description) schema.description = description;
  if (url) schema.url = url;

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface CollectionPageSchemaProps {
  name: string;
  description: string;
  url: string;
  hasPart?: Array<{ name: string; url: string }>;
}

/**
 * CollectionPage schema for index/hub pages
 * Signals to search engines this is a curated collection
 */
export function CollectionPageSchema({
  name,
  description,
  url,
  hasPart,
}: CollectionPageSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://civdotiq.org/#website',
    },
  };

  if (hasPart && hasPart.length > 0) {
    schema.hasPart = hasPart.map(part => ({
      '@type': 'WebPage',
      name: part.name,
      url: part.url,
    }));
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface ArticleSchemaProps {
  headline: string;
  description: string;
  url: string;
  /** ISO 8601 date (YYYY-MM-DD) — the freshness signal AI search engines read. */
  datePublished: string;
  dateModified?: string;
  /** Subject entity, e.g. the featured state on a digest issue. */
  about?: { name: string; type?: 'AdministrativeArea' | 'Thing' };
}

/**
 * Article schema for dated, issue-style pages (weekly digest issues).
 * Author and publisher reference the global Organization node by @id.
 */
export function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  about,
}: ArticleSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': url,
    headline,
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished,
    author: { '@id': 'https://civdotiq.org/#organization' },
    publisher: { '@id': 'https://civdotiq.org/#organization' },
    isPartOf: { '@type': 'WebSite', '@id': 'https://civdotiq.org/#website' },
  };

  if (dateModified) schema.dateModified = dateModified;
  if (about) {
    schema.about = { '@type': about.type ?? 'Thing', name: about.name };
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface LearningResourceSchemaProps {
  name: string;
  description: string;
  url: string;
  educationalLevel?: string;
  learningResourceType?: string;
  teaches?: string[];
  timeRequired?: string;
  educationalAlignment?: Array<{
    alignmentType: string;
    educationalFramework: string;
    targetName: string;
  }>;
  keywords?: string[];
}

/**
 * LearningResource schema for education lesson pages
 * Enables education rich results
 */
export function LearningResourceSchema({
  name,
  description,
  url,
  educationalLevel,
  learningResourceType = 'lesson plan',
  teaches,
  timeRequired,
  educationalAlignment,
  keywords,
}: LearningResourceSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LearningResource',
    name,
    description,
    url,
    learningResourceType,
    provider: {
      '@type': 'Organization',
      name: 'CIV.IQ',
      url: 'https://civdotiq.org',
    },
    inLanguage: 'en',
    isAccessibleForFree: true,
  };

  if (educationalLevel) schema.educationalLevel = educationalLevel;
  if (timeRequired) schema.timeRequired = timeRequired;

  if (teaches && teaches.length > 0) {
    schema.teaches = teaches;
  }

  if (keywords && keywords.length > 0) {
    schema.keywords = keywords;
  }

  if (educationalAlignment && educationalAlignment.length > 0) {
    schema.educationalAlignment = educationalAlignment.map(a => ({
      '@type': 'AlignmentObject',
      alignmentType: a.alignmentType,
      educationalFramework: a.educationalFramework,
      targetName: a.targetName,
    }));
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface DataCatalogSchemaProps {
  name: string;
  description: string;
  url: string;
  datasets?: Array<{
    name: string;
    description: string;
    url: string;
  }>;
}

/**
 * DataCatalog schema for the /open data page
 * Wraps multiple datasets into a catalog
 */
export function DataCatalogSchema({ name, description, url, datasets }: DataCatalogSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'DataCatalog',
    name,
    description,
    url,
    provider: {
      '@type': 'Organization',
      name: 'CIV.IQ',
      url: 'https://civdotiq.org',
    },
  };

  if (datasets && datasets.length > 0) {
    schema.dataset = datasets.map(d => ({
      '@type': 'Dataset',
      name: d.name,
      description: d.description,
      url: d.url,
    }));
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface SoftwareSourceCodeSchemaProps {
  name: string;
  description: string;
  url: string;
  codeRepository?: string;
  programmingLanguage?: string[];
  runtimePlatform?: string;
}

/**
 * SoftwareSourceCode schema for /developers page
 * Describes the open-source project and its APIs
 */
export function SoftwareSourceCodeSchema({
  name,
  description,
  url,
  codeRepository,
  programmingLanguage,
  runtimePlatform,
}: SoftwareSourceCodeSchemaProps) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name,
    description,
    url,
    author: {
      '@type': 'Organization',
      name: 'CIV.IQ',
      url: 'https://civdotiq.org',
    },
  };

  if (codeRepository) schema.codeRepository = codeRepository;
  if (runtimePlatform) schema.runtimePlatform = runtimePlatform;

  if (programmingLanguage && programmingLanguage.length > 0) {
    schema.programmingLanguage = programmingLanguage;
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface AboutPageSchemaProps {
  name: string;
  description: string;
  url: string;
}

/**
 * AboutPage schema for /about
 * Signals this is the canonical about page for the organization
 */
export function AboutPageSchema({ name, description, url }: AboutPageSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    name,
    description,
    url,
    isPartOf: {
      '@type': 'WebSite',
      '@id': 'https://civdotiq.org/#website',
    },
    about: {
      '@type': 'Organization',
      '@id': 'https://civdotiq.org/#organization',
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

interface SpeakableSchemaProps {
  url: string;
  cssSelectors: string[];
}

/**
 * Speakable schema for Google Assistant readback
 * Identifies which parts of the page are suitable for audio playback
 */
export function SpeakableSchema({ url, cssSelectors }: SpeakableSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': url,
    speakable: {
      '@type': 'SpeakableSpecification',
      cssSelector: cssSelectors,
    },
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

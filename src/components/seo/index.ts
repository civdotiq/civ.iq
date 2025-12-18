/**
 * SEO Components for structured data and rich snippets
 */
export {
  OrganizationSchema,
  WebSiteSchema,
  PersonSchema,
  GovernmentOrganizationSchema,
  BreadcrumbSchema,
  FAQSchema,
  LegislativeEventSchema,
} from './JsonLd';

/**
 * Wikipedia-style SEO components for maximum discoverability
 */
export {
  TableOfContents,
  RelatedLinks,
  FAQSection,
  FreshnessTimestamp,
  Infobox,
  InternalLink,
  CategoryTags,
} from './WikipediaStyleSEO';

export type { TOCItem, RelatedLink, FAQItem, InfoboxField } from './WikipediaStyleSEO';

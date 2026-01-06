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
export { TableOfContents, FAQSection } from './WikipediaStyleSEO';

export type { TOCItem, FAQItem } from './WikipediaStyleSEO';

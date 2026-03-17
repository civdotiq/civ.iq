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
  LegislationSchema,
  AdministrativeAreaSchema,
  DatasetSchema,
  DefinedTermSchema,
  GovernmentServiceSchema,
  WebAPISchema,
  CommentPeriodEventSchema,
} from './JsonLd';

/**
 * Wikipedia-style SEO components for maximum discoverability
 */
export { TableOfContents, FAQSection } from './WikipediaStyleSEO';

export type { TOCItem, FAQItem } from './WikipediaStyleSEO';

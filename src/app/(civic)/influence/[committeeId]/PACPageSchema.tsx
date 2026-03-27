/**
 * Schema.org Organization markup for PAC pages
 * Uses Organization (not GovernmentOrganization) per the entity pages plan.
 */

function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

interface Props {
  name: string;
  description: string;
  url: string;
  sector: string | null;
}

export function PACPageSchema({ name, description, url, sector }: Props) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  if (sector) {
    schema.keywords = sector;
  }

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

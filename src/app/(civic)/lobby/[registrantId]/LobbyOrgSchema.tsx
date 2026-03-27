/**
 * Schema.org Organization markup for lobbying org pages
 */

import type { LobbyingOrgProfile } from '@/app/api/lobby/[registrantId]/route';

function safeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

interface Props {
  profile: LobbyingOrgProfile;
  url: string;
}

export function LobbyOrgSchema({ profile, url }: Props) {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: profile.name,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    description: `Lobbying organization registered with the U.S. Senate. ${profile.totalFilings} filings on record.`,
  };

  if (profile.wiki?.website) {
    schema.sameAs = [profile.wiki.website];
  }
  if (profile.wiki?.wikidataId) {
    const sameAs = (schema.sameAs as string[]) ?? [];
    sameAs.push(`https://www.wikidata.org/wiki/${profile.wiki.wikidataId}`);
    schema.sameAs = sameAs;
  }
  if (profile.wiki?.headquarters) {
    schema.address = {
      '@type': 'PostalAddress',
      addressLocality: profile.wiki.headquarters,
    };
  }
  if (profile.wiki?.foundingDate) {
    schema.foundingDate = profile.wiki.foundingDate;
  }

  schema.memberOf = {
    '@type': 'GovernmentOrganization',
    name: 'Senate Lobbying Disclosure',
    url: 'https://lda.senate.gov',
  };

  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(schema) }} />
  );
}

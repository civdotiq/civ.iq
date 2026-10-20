/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Source registry for the per-page "Sources and method" block.
 *
 * One entry per upstream: who publishes it, its license, and where our
 * methodology covers it. Pages add only what they know at render time (what
 * the source supplies here, its as-of line, when we loaded it). Licenses
 * were checked against each publisher: federal records are U.S. government
 * works (17 U.S.C. § 105); the @unitedstates repos are CC0 1.0.
 */

import type { DataSource } from '@/shared/components/ui/DataProvenance';

const PUBLIC_DOMAIN = {
  license: 'Public domain (17 U.S.C. § 105)',
  licenseHref: 'https://www.law.cornell.edu/uscode/text/17/105',
};

const CC0 = {
  license: 'CC0 1.0 (public domain dedication)',
  licenseHref: 'https://creativecommons.org/publicdomain/zero/1.0/',
};

const METHOD_SOURCES = { methodHref: '/methodology#data-sources', methodLabel: 'Data sources' };
const METHOD_FINANCE = {
  methodHref: '/methodology#campaign-finance',
  methodLabel: 'Campaign finance',
};

/** Methodology anchor for AI-written text. */
export const METHOD_AI = '/methodology#how-we-analyze';

interface RegistryEntry {
  name: string;
  shortName: string;
  publisher: string;
  href: string;
  license: string;
  licenseHref: string;
  methodHref: string;
  methodLabel: string;
}

export const SOURCE_REGISTRY = {
  congressGov: {
    name: 'Congress.gov',
    shortName: 'Congress.gov',
    publisher: 'Library of Congress',
    href: 'https://www.congress.gov',
    ...PUBLIC_DOMAIN,
    ...METHOD_SOURCES,
  },
  crs: {
    name: 'CRS bill summary',
    shortName: 'CRS',
    publisher: 'Congressional Research Service, via Congress.gov',
    href: 'https://www.congress.gov',
    ...PUBLIC_DOMAIN,
    ...METHOD_SOURCES,
  },
  houseClerk: {
    name: 'House roll-call votes',
    shortName: 'House Clerk',
    publisher: 'Office of the Clerk, U.S. House of Representatives',
    href: 'https://clerk.house.gov/Votes',
    ...PUBLIC_DOMAIN,
    ...METHOD_SOURCES,
  },
  senate: {
    name: 'Senate roll-call votes',
    shortName: 'Senate',
    publisher: 'U.S. Senate',
    href: 'https://www.senate.gov/legislative/votes_new.htm',
    ...PUBLIC_DOMAIN,
    ...METHOD_SOURCES,
  },
  cbo: {
    name: 'CBO cost estimates',
    shortName: 'CBO',
    publisher: 'Congressional Budget Office',
    href: 'https://www.cbo.gov',
    ...PUBLIC_DOMAIN,
    ...METHOD_SOURCES,
  },
  usaspending: {
    name: 'USAspending.gov',
    shortName: 'USAspending',
    publisher: 'U.S. Department of the Treasury',
    href: 'https://www.usaspending.gov',
    ...PUBLIC_DOMAIN,
    ...METHOD_SOURCES,
  },
  fec: {
    name: 'FEC filings',
    shortName: 'FEC',
    publisher: 'Federal Election Commission',
    href: 'https://www.fec.gov/data/',
    ...PUBLIC_DOMAIN,
    ...METHOD_FINANCE,
  },
  lda: {
    name: 'Lobbying disclosures (LDA)',
    shortName: 'LDA',
    publisher: 'Secretary of the Senate and Clerk of the House',
    href: 'https://lda.gov',
    ...PUBLIC_DOMAIN,
    ...METHOD_FINANCE,
  },
  congressLegislators: {
    name: 'congress-legislators',
    shortName: 'congress-legislators',
    publisher: '@unitedstates project',
    href: 'https://github.com/unitedstates/congress-legislators',
    ...CC0,
    ...METHOD_SOURCES,
  },
} satisfies Record<string, RegistryEntry>;

export type SourceKey = keyof typeof SOURCE_REGISTRY;

/**
 * A registry entry plus what this page knows about it. Pass `href` to link
 * the specific record (e.g. the bill on Congress.gov) instead of the site.
 */
export function registrySource(
  key: SourceKey,
  details: { covers: string; asOf?: string; fetchedAt?: string; href?: string }
): DataSource {
  const entry = SOURCE_REGISTRY[key];
  return { ...entry, ...details, href: details.href ?? entry.href, status: 'available' };
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Atom Feed Generator
 *
 * Generates valid Atom 1.0 feeds for CIV.IQ content.
 * Follows the Atom Syndication Format (RFC 4287).
 *
 * @see https://validator.w3.org/feed/docs/atom.html
 */

export interface AtomFeedConfig {
  id: string;
  title: string;
  subtitle?: string;
  link: string;
  updated: Date;
  author?: {
    name: string;
    uri?: string;
    email?: string;
  };
  icon?: string;
  logo?: string;
  rights?: string;
  generator?: {
    name: string;
    uri?: string;
    version?: string;
  };
}

export interface AtomEntry {
  id: string;
  title: string;
  link: string;
  updated: Date;
  published?: Date;
  author?: {
    name: string;
    uri?: string;
  };
  summary?: string;
  content?: string;
  contentType?: 'text' | 'html' | 'xhtml';
  categories?: Array<{
    term: string;
    scheme?: string;
    label?: string;
  }>;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Format date to RFC 3339 (Atom format)
 */
function formatAtomDate(date: Date): string {
  return date.toISOString();
}

/**
 * Generate the feed header (opening tags)
 */
function generateFeedHeader(config: AtomFeedConfig): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    `  <id>${escapeXml(config.id)}</id>`,
    `  <title>${escapeXml(config.title)}</title>`,
    `  <updated>${formatAtomDate(config.updated)}</updated>`,
    `  <link href="${escapeXml(config.link)}" rel="alternate" type="text/html"/>`,
    `  <link href="${escapeXml(config.link)}" rel="self" type="application/atom+xml"/>`,
  ];

  if (config.subtitle) {
    lines.push(`  <subtitle>${escapeXml(config.subtitle)}</subtitle>`);
  }

  if (config.author) {
    lines.push('  <author>');
    lines.push(`    <name>${escapeXml(config.author.name)}</name>`);
    if (config.author.uri) {
      lines.push(`    <uri>${escapeXml(config.author.uri)}</uri>`);
    }
    if (config.author.email) {
      lines.push(`    <email>${escapeXml(config.author.email)}</email>`);
    }
    lines.push('  </author>');
  }

  if (config.icon) {
    lines.push(`  <icon>${escapeXml(config.icon)}</icon>`);
  }

  if (config.logo) {
    lines.push(`  <logo>${escapeXml(config.logo)}</logo>`);
  }

  if (config.rights) {
    lines.push(`  <rights>${escapeXml(config.rights)}</rights>`);
  }

  // Generator info
  const generator = config.generator ?? {
    name: 'CIV.IQ',
    uri: 'https://civdotiq.org',
    version: '1.0',
  };
  lines.push(
    `  <generator uri="${escapeXml(generator.uri ?? '')}" version="${escapeXml(generator.version ?? '1.0')}">${escapeXml(generator.name)}</generator>`
  );

  return lines.join('\n');
}

/**
 * Generate a single entry element
 */
function generateEntry(entry: AtomEntry): string {
  const lines: string[] = [
    '  <entry>',
    `    <id>${escapeXml(entry.id)}</id>`,
    `    <title>${escapeXml(entry.title)}</title>`,
    `    <link href="${escapeXml(entry.link)}" rel="alternate" type="text/html"/>`,
    `    <updated>${formatAtomDate(entry.updated)}</updated>`,
  ];

  if (entry.published) {
    lines.push(`    <published>${formatAtomDate(entry.published)}</published>`);
  }

  if (entry.author) {
    lines.push('    <author>');
    lines.push(`      <name>${escapeXml(entry.author.name)}</name>`);
    if (entry.author.uri) {
      lines.push(`      <uri>${escapeXml(entry.author.uri)}</uri>`);
    }
    lines.push('    </author>');
  }

  if (entry.summary) {
    lines.push(`    <summary>${escapeXml(entry.summary)}</summary>`);
  }

  if (entry.content) {
    const type = entry.contentType ?? 'text';
    if (type === 'html') {
      lines.push(`    <content type="html">${escapeXml(entry.content)}</content>`);
    } else {
      lines.push(`    <content type="${type}">${escapeXml(entry.content)}</content>`);
    }
  }

  if (entry.categories) {
    for (const cat of entry.categories) {
      let catAttr = `term="${escapeXml(cat.term)}"`;
      if (cat.scheme) catAttr += ` scheme="${escapeXml(cat.scheme)}"`;
      if (cat.label) catAttr += ` label="${escapeXml(cat.label)}"`;
      lines.push(`    <category ${catAttr}/>`);
    }
  }

  lines.push('  </entry>');
  return lines.join('\n');
}

/**
 * Generate a complete Atom feed
 */
export function generateAtomFeed(config: AtomFeedConfig, entries: AtomEntry[]): string {
  const header = generateFeedHeader(config);
  const entryXml = entries.map(generateEntry).join('\n');
  const footer = '</feed>';

  return `${header}\n${entryXml}\n${footer}`;
}

/**
 * Helper: Create a representative activity feed config
 */
export function createRepresentativeFeedConfig(
  bioguideId: string,
  name: string,
  party: string,
  state: string
): AtomFeedConfig {
  const baseUrl = 'https://civdotiq.org';

  return {
    id: `${baseUrl}/feeds/representative/${bioguideId}`,
    title: `${name} (${party}-${state}) - Activity Feed | CIV.IQ`,
    subtitle: `Legislative activity, votes, and news for ${name}`,
    link: `${baseUrl}/representative/${bioguideId}`,
    updated: new Date(),
    author: {
      name: 'CIV.IQ',
      uri: baseUrl,
    },
    icon: `${baseUrl}/favicon.ico`,
    logo: `${baseUrl}/images/civiq-logo.png`,
    rights: `Data sourced from Congress.gov, FEC, and other government APIs`,
  };
}

/**
 * Helper: Create a bills feed config
 */
export function createBillsFeedConfig(): AtomFeedConfig {
  const baseUrl = 'https://civdotiq.org';

  return {
    id: `${baseUrl}/feeds/bills`,
    title: 'Latest Bills | CIV.IQ',
    subtitle: 'Recently introduced and updated legislation in Congress',
    link: `${baseUrl}/bills`,
    updated: new Date(),
    author: {
      name: 'CIV.IQ',
      uri: baseUrl,
    },
    icon: `${baseUrl}/favicon.ico`,
    logo: `${baseUrl}/images/civiq-logo.png`,
    rights: 'Data sourced from Congress.gov',
  };
}

/**
 * Helper: Create a floor activity feed config
 */
export function createFloorFeedConfig(): AtomFeedConfig {
  const baseUrl = 'https://civdotiq.org';

  return {
    id: `${baseUrl}/feeds/floor`,
    title: 'Congressional Floor Activity | CIV.IQ',
    subtitle: 'House and Senate floor schedule and votes',
    link: `${baseUrl}/floor`,
    updated: new Date(),
    author: {
      name: 'CIV.IQ',
      uri: baseUrl,
    },
    icon: `${baseUrl}/favicon.ico`,
    logo: `${baseUrl}/images/civiq-logo.png`,
    rights: 'Data sourced from Congress.gov',
  };
}

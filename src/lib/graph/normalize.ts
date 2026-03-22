/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Canonical ID generation and parsing for graph nodes.
 *
 * ID patterns:
 *   representative → rep:{bioguideId}
 *   bill           → bill:{congress}-{type}-{number}
 *   committee      → cmte:{committeeCode}
 *   agency         → agency:{slug}
 *   organization   → org:{normalizedName}
 *   sector         → sector:{sectorKey}
 *   contract       → contract:{awardId}
 *   regulation     → reg:{documentNumber}
 */

import type { GraphNodeType, GRAPH_NODE_TYPES } from '@/types/graph';

const TYPE_PREFIXES: Record<GraphNodeType, string> = {
  representative: 'rep',
  bill: 'bill',
  committee: 'cmte',
  agency: 'agency',
  organization: 'org',
  sector: 'sector',
  contract: 'contract',
  regulation: 'reg',
  facility: 'fac',
  disaster: 'dis',
  institution: 'inst',
  complaint: 'cmp',
};

const PREFIX_TO_TYPE: Record<string, GraphNodeType> = Object.fromEntries(
  Object.entries(TYPE_PREFIXES).map(([type, prefix]) => [prefix, type as GraphNodeType])
) as Record<string, GraphNodeType>;

/** Build a canonical graph node ID from type + identifier */
export function toCanonicalId(type: GraphNodeType, identifier: string): string {
  const prefix = TYPE_PREFIXES[type];
  return `${prefix}:${identifier}`;
}

/** Parse a canonical ID into its type and identifier. Returns null on invalid format. */
export function parseCanonicalId(
  canonicalId: string
): { type: GraphNodeType; identifier: string } | null {
  const colonIdx = canonicalId.indexOf(':');
  if (colonIdx === -1) return null;

  const prefix = canonicalId.slice(0, colonIdx);
  const identifier = canonicalId.slice(colonIdx + 1);

  if (!identifier) return null;

  const type = PREFIX_TO_TYPE[prefix];
  if (!type) return null;

  return { type, identifier };
}

/** Normalize an organization name for use as an ID component */
export function normalizeOrgName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Format a human-readable label for a graph node */
export function formatNodeLabel(type: GraphNodeType, properties: Record<string, unknown>): string {
  switch (type) {
    case 'representative': {
      const name = properties['name'] as string | undefined;
      const party = properties['party'] as string | undefined;
      const state = properties['state'] as string | undefined;
      if (name && party && state) return `${name} (${party}-${state})`;
      return name ?? 'Unknown Representative';
    }
    case 'bill': {
      const title = properties['title'] as string | undefined;
      const number = properties['number'] as string | undefined;
      return number ? `${number}: ${title ?? ''}`.trim() : (title ?? 'Unknown Bill');
    }
    case 'committee':
      return (properties['name'] as string) ?? 'Unknown Committee';
    case 'agency':
      return (properties['name'] as string) ?? 'Unknown Agency';
    case 'organization':
      return (properties['name'] as string) ?? 'Unknown Organization';
    case 'sector':
      return (properties['name'] as string) ?? 'Unknown Sector';
    case 'contract': {
      const recipient = properties['recipientName'] as string | undefined;
      const amount = properties['amount'] as number | undefined;
      if (recipient && amount) return `${recipient} ($${(amount / 1e6).toFixed(1)}M)`;
      return recipient ?? 'Unknown Contract';
    }
    case 'regulation':
      return (properties['title'] as string) ?? 'Unknown Regulation';
    default:
      return 'Unknown';
  }
}

/**
 * Title-case an ALL CAPS organization name for display.
 *
 * Handles three categories:
 * 1. Known acronyms/suffixes (LLC, IBM, PAC) — preserved uppercase
 * 2. Common connector words (of, the, and) — lowercased (except at start)
 * 3. Everything else — title-cased, including hyphenated parts (e.g. "Smith-Jones")
 */

const LOWERCASE_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'nor',
  'of',
  'on',
  'or',
  'the',
  'to',
  'via',
  'with',
]);

const PRESERVE_UPPERCASE = new Set([
  // Business entity suffixes
  'LLC',
  'LLP',
  'PAC',
  'INC',
  'CORP',
  'LTD',
  'PLC',
  'LP',
  'NA',
  'CO',
  'PLLC',
  'PC',
  'PA',
  'SC',
  'APC',
  'ASSN',
  'INTL',
  // Well-known acronyms common in FEC/lobbying data
  'IBM',
  'ATT',
  'USA',
  'US',
  'HP',
  'GE',
  'GM',
  'BP',
  'UPS',
  'AFL',
  'CIO',
  'UAW',
  'SEIU',
  'BAE',
  'CSX',
  'SAP',
  // Geography abbreviations
  'DC',
  'PR',
  'NY',
  'LA',
  'UK',
]);

function titleCaseWord(word: string): string {
  return word
    .toLowerCase()
    .split('-')
    .map(part => {
      if (!part) return part;
      const letters = part.replace(/[^A-Za-z]/g, '');
      if (letters && PRESERVE_UPPERCASE.has(letters.toUpperCase())) {
        return part.toUpperCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('-');
}

export function toTitleCase(name: string): string {
  return name
    .split(/\s+/)
    .map((word, i) => {
      const letters = word.replace(/[^A-Za-z]/g, '');
      if (!letters) return word;

      // Preserve known acronyms and business suffixes
      if (PRESERVE_UPPERCASE.has(letters.toUpperCase())) {
        return word.toUpperCase();
      }

      // Lowercase common connector words (except first word)
      if (i > 0 && LOWERCASE_WORDS.has(letters.toLowerCase())) {
        return word.toLowerCase();
      }

      // Title case with hyphen awareness (e.g. "AFL-CIO" preserves both parts)
      return titleCaseWord(word);
    })
    .join(' ');
}

/** Build an edge ID from source, type, and target */
export function toEdgeId(sourceId: string, type: string, targetId: string): string {
  return `${sourceId}->${type}->${targetId}`;
}

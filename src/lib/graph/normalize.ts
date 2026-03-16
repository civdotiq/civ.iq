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

/** Build an edge ID from source, type, and target */
export function toEdgeId(sourceId: string, type: string, targetId: string): string {
  return `${sourceId}->${type}->${targetId}`;
}

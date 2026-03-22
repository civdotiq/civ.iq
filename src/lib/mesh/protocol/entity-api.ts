/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Entity API Handler
 *
 * Returns everything the Civic Mesh knows about an entity:
 * identity, neighborhood, computed intelligence, and temporal context.
 * Self-describing — includes schema so clients know the data shape.
 */

import type { GraphNode, GraphEdge, GraphNodeType, NeighborhoodCompleteness } from '@/types/graph';
import type { InsightBase } from '@/lib/intelligence/types';
import type { EntitySchema } from '../schema';
import type { TemporalProfile } from '../temporal-types';
import type { DistrictProfile } from '../district-profile-types';
import { GRAPH_NODE_TYPES } from '@/types/graph';
import { ensureMeshInitialized } from '../init';
import { meshRegistry } from '../registry';
import { getEntitySchema } from '../schema';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import { buildTemporalProfile } from '../temporal';
import { buildDistrictProfile } from '../district-profile';
import logger from '@/lib/logging/simple-logger';

// ── Response Types ───────────────────────────────────────────────────

export interface MeshEntityResponse {
  entity: {
    id: string;
    type: GraphNodeType;
    label: string;
    properties: Record<string, unknown>;
    schema: EntitySchema;
  };
  neighborhood: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    completeness: NeighborhoodCompleteness;
    truncated?: boolean;
    truncatedAt?: number;
  };
  intelligence: {
    insights: Record<string, InsightBase | null>;
    districtProfile?: DistrictProfile;
    temporalProfile?: TemporalProfile;
  };
  meta: {
    generatedAt: string;
    dataSources: string[];
    cacheStatus: 'fresh';
    meshVersion: string;
  };
}

const MESH_VERSION = '1.0.0';

/**
 * Parse a canonical mesh ID (e.g., "rep:A000360") into type + identifier.
 * Returns null for invalid IDs.
 */
export function parseMeshId(id: string): { type: GraphNodeType; identifier: string } | null {
  const colonIndex = id.indexOf(':');
  if (colonIndex < 1) return null;

  const prefix = id.substring(0, colonIndex);
  const identifier = id.substring(colonIndex + 1);
  if (!identifier) return null;

  // Map prefix to node type via schema registry
  ensureMeshInitialized();
  for (const nodeType of GRAPH_NODE_TYPES) {
    const schema = getEntitySchema(nodeType);
    if (schema?.idPrefix === prefix) {
      return { type: nodeType, identifier };
    }
  }
  return null;
}

/**
 * Resolve a full mesh entity response for a canonical ID.
 */
export async function resolveEntity(canonicalId: string): Promise<MeshEntityResponse | null> {
  const parsed = parseMeshId(canonicalId);
  if (!parsed) return null;

  const schema = getEntitySchema(parsed.type);
  if (!schema) return null;

  // Hydrate neighborhood
  const neighborhood = await hydrateNeighborhood(canonicalId);
  if (!neighborhood) return null;

  // Fetch type-specific intelligence in parallel
  const intelligence = await fetchIntelligence(parsed.type, canonicalId, neighborhood.center);

  // Build temporal profile (non-blocking — missing data is fine)
  let temporalProfile: TemporalProfile | undefined;
  try {
    temporalProfile = (await buildTemporalProfile(canonicalId, { quarters: 8 })) ?? undefined;
  } catch (err) {
    logger.warn('[Mesh:Entity] Temporal profile unavailable', { canonicalId, error: String(err) });
  }

  // Collect data sources from neighborhood
  const dataSources = collectDataSources(neighborhood.edges);

  return {
    entity: {
      id: canonicalId,
      type: parsed.type,
      label: neighborhood.center.label,
      properties: neighborhood.center.properties,
      schema,
    },
    neighborhood: {
      nodes: neighborhood.connectedNodes,
      edges: neighborhood.edges,
      completeness: neighborhood.completeness,
    },
    intelligence: {
      insights: intelligence,
      temporalProfile,
    },
    meta: {
      generatedAt: new Date().toISOString(),
      dataSources,
      cacheStatus: 'fresh',
      meshVersion: MESH_VERSION,
    },
  };
}

/**
 * Fetch relevant intelligence insights based on entity type.
 * Each insight is fetched independently — failures return null.
 */
async function fetchIntelligence(
  type: GraphNodeType,
  canonicalId: string,
  center: GraphNode
): Promise<Record<string, InsightBase | null>> {
  const insights: Record<string, InsightBase | null> = {};

  if (type === 'representative') {
    const bioguideId = canonicalId.replace('rep:', '');
    const fetches = await safeParallelFetch({
      'vote-finance': fetchInsightSafe(
        `/api/intelligence/representative/${bioguideId}/vote-finance`
      ),
      'finance-jurisdiction': fetchInsightSafe(
        `/api/intelligence/representative/${bioguideId}/finance-jurisdiction`
      ),
      'vote-prediction': fetchInsightSafe(
        `/api/intelligence/representative/${bioguideId}/vote-prediction`
      ),
      'influence-chain': fetchInsightSafe(
        `/api/intelligence/representative/${bioguideId}/influence-chain`
      ),
    });
    Object.assign(insights, fetches);
  } else if (type === 'committee') {
    const code = canonicalId.replace('cmte:', '');
    const fetches = await safeParallelFetch({
      'lobbying-pipeline': fetchInsightSafe(
        `/api/intelligence/committee/${code}/lobbying-pipeline`
      ),
    });
    Object.assign(insights, fetches);
  }
  // Other types: intelligence will grow as more analyzers ship

  return insights;
}

/**
 * Safely fetch an internal insight endpoint. Returns null on any failure.
 * Uses internal fetch (server-side) to reuse existing API route logic.
 */
function getInternalBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

async function fetchInsightSafe(path: string): Promise<InsightBase | null> {
  try {
    const baseUrl = getInternalBaseUrl();
    const res = await fetch(`${baseUrl}${path}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data.confidence === 'number') return data as InsightBase;
    return null;
  } catch {
    return null;
  }
}

/**
 * Run multiple insight fetches in parallel, collecting results by key.
 */
async function safeParallelFetch(
  fetches: Record<string, Promise<InsightBase | null>>
): Promise<Record<string, InsightBase | null>> {
  const keys = Object.keys(fetches);
  const results = await Promise.allSettled(Object.values(fetches));
  const output: Record<string, InsightBase | null> = {};
  for (let i = 0; i < keys.length; i++) {
    const result = results[i]!;
    output[keys[i]!] = result.status === 'fulfilled' ? result.value : null;
  }
  return output;
}

/** Collect unique data source labels from edges */
function collectDataSources(edges: GraphEdge[]): string[] {
  const sources = new Set<string>();
  for (const edge of edges) {
    if (edge.sourceLabel) sources.add(edge.sourceLabel);
  }
  return Array.from(sources);
}

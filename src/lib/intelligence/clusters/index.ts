/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Cluster Serving Layer
 *
 * Loads precomputed influence clusters (JSON) and provides query functions.
 * The data is generated offline by scripts/compute-influence-clusters.py
 * and checked into git (~100-150KB).
 */

import type { InfluenceClusterData, LegislatorClusterPoint, ClusterMetadata } from './types';

/** Module-level cache — loaded once per process. */
let clusterCache: InfluenceClusterData | null = null;

/** Whether we've already tried and failed to load. */
let loadFailed = false;

/**
 * Load precomputed influence clusters.
 * Returns null if the data file doesn't exist (clusters not yet computed).
 */
export function getInfluenceClusters(): InfluenceClusterData | null {
  if (clusterCache) return clusterCache;
  if (loadFailed) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    clusterCache = require('./influence-clusters.json') as InfluenceClusterData;
    return clusterCache;
  } catch {
    loadFailed = true;
    return null;
  }
}

/**
 * Get a specific legislator's cluster assignment and cluster members.
 * Returns null if clusters are not available or the legislator is not found.
 */
export function getLegislatorCluster(bioguideId: string): {
  point: LegislatorClusterPoint;
  cluster: ClusterMetadata | null;
  clusterMembers: LegislatorClusterPoint[];
} | null {
  const data = getInfluenceClusters();
  if (!data) return null;

  const point = data.legislators.find(l => l.bioguideId === bioguideId);
  if (!point) return null;

  const cluster = point.clusterId >= 0 ? (data.clusters[point.clusterId] ?? null) : null;

  const clusterMembers =
    point.clusterId >= 0 ? data.legislators.filter(l => l.clusterId === point.clusterId) : [];

  return { point, cluster, clusterMembers };
}

/**
 * Get all cross-party clusters (the most interesting findings).
 */
export function getCrossPartyClusters(): Array<{
  clusterId: number;
  metadata: ClusterMetadata;
  members: LegislatorClusterPoint[];
}> {
  const data = getInfluenceClusters();
  if (!data) return [];

  return Object.entries(data.clusters)
    .filter(([, meta]) => meta.isCrossParty)
    .map(([id, meta]) => ({
      clusterId: Number(id),
      metadata: meta,
      members: data.legislators.filter(l => l.clusterId === Number(id)),
    }));
}

/**
 * Reset internal state. Only for testing.
 */
export function _resetForTesting(): void {
  clusterCache = null;
  loadFailed = false;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Weighted Influence Path Scoring
 *
 * Scores influence paths between two entities by weighting edges
 * with dollar amounts, temporal proximity, and confidence.
 *
 * Edge scoring:
 * - donated_to: weighted by dollar amount (log-scaled)
 * - lobbied: weighted by filing spend (log-scaled)
 * - voted_on: weighted by vote alignment (0 or 1)
 * - temporal: more recent = higher weight (exponential decay)
 * - confidence: existing edge confidence (0-1)
 *
 * Path score = product of edge scores along path
 */

import logger from '@/lib/logging/simple-logger';
import { findPaths } from '@/lib/graph/path-finder';
import type { GraphEdge, GraphEdgeType } from '@/types/graph';

// ── Types ────────────────────────────────────────────────────────────

export interface EdgeScore {
  edgeId: string;
  dollarWeight: number;
  temporalWeight: number;
  confidenceWeight: number;
  combinedScore: number;
}

export interface ScoredPath {
  nodes: string[];
  edges: GraphEdge[];
  score: number;
  edgeScores: EdgeScore[];
  narrative: string;
}

export interface InfluenceScore {
  fromId: string;
  toId: string;
  aggregateScore: number;
  paths: ScoredPath[];
  pathCount: number;
  confidence: number;
  methodology: string;
}

// ── Constants ─────────────────────────────────────────────────────────

/** Temporal decay: ~6-month half-life. */
const TEMPORAL_DECAY_LAMBDA = 0.005;

/** Max dollar amount for normalization (log scale). */
const MAX_DOLLAR_LOG = Math.log10(10_000_000 + 1); // $10M

/** Edge types that carry dollar amounts. */
const DOLLAR_EDGE_TYPES: ReadonlySet<GraphEdgeType> = new Set([
  'donated_to',
  'lobbied',
  'awarded_contract',
]);

// ── Public API ───────────────────────────────────────────────────────

export async function scoreInfluence(
  fromId: string,
  toId: string,
  options?: { maxDepth?: number; maxPaths?: number }
): Promise<InfluenceScore> {
  const maxDepth = options?.maxDepth ?? 3;
  const maxPaths = options?.maxPaths ?? 5;

  logger.info('[PathScorer] Scoring influence', { fromId, toId, maxDepth });

  const pathResult = await findPaths(fromId, toId, { maxDepth });

  const scoredPaths: ScoredPath[] = pathResult.paths
    .slice(0, maxPaths)
    .map(path => {
      const edgeScores = path.edges.map(edge => scoreEdge(edge));
      const score = edgeScores.reduce((product, es) => product * es.combinedScore, 1);
      const narrative = buildPathNarrative(path.nodes, path.edges);

      return {
        nodes: path.nodes.map(n => n.id),
        edges: path.edges,
        score,
        edgeScores,
        narrative,
      };
    })
    .sort((a, b) => b.score - a.score);

  const aggregateScore =
    scoredPaths.length > 0
      ? scoredPaths.reduce((sum, p) => sum + p.score, 0) / scoredPaths.length
      : 0;

  const confidence = scoredPaths.length > 0 ? Math.min(scoredPaths.length / 5, 0.9) : 0;

  return {
    fromId,
    toId,
    aggregateScore,
    paths: scoredPaths,
    pathCount: scoredPaths.length,
    confidence,
    methodology:
      'Edge scoring: dollar amount (log-scaled) * temporal recency (exponential decay) * ' +
      'data confidence. Path score = product of edge scores. Aggregate = average of path scores.',
  };
}

// ── Edge Scoring ─────────────────────────────────────────────────────

export function scoreEdge(edge: GraphEdge): EdgeScore {
  const dollarWeight = computeDollarWeight(edge);
  const temporalWeight = computeTemporalWeight(edge);
  const confidenceWeight = edge.confidence;

  const combinedScore = dollarWeight * temporalWeight * confidenceWeight;

  return {
    edgeId: edge.id,
    dollarWeight,
    temporalWeight,
    confidenceWeight,
    combinedScore,
  };
}

function computeDollarWeight(edge: GraphEdge): number {
  if (!DOLLAR_EDGE_TYPES.has(edge.type)) {
    // Non-dollar edges get a flat weight based on their type
    return edge.type === 'voted_on' ? 0.8 : 0.5;
  }

  const amount =
    typeof edge.properties.amount === 'number'
      ? edge.properties.amount
      : typeof edge.properties.spending === 'number'
        ? edge.properties.spending
        : 0;

  // Inferred edges (sector-based fallback) have no dollar amounts.
  // Use their confidence as a reasonable proxy instead of the 0.1 penalty.
  if (amount <= 0) {
    return edge.properties.inferred ? edge.confidence : 0.1;
  }

  return Math.log10(amount + 1) / MAX_DOLLAR_LOG;
}

function computeTemporalWeight(edge: GraphEdge): number {
  if (!edge.temporal?.date) return 0.5; // Unknown date → middle weight

  const date = new Date(edge.temporal.lastSeen ?? edge.temporal.date);
  const now = new Date();
  const daysSince = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);

  return Math.exp(-TEMPORAL_DECAY_LAMBDA * Math.max(daysSince, 0));
}

// ── Narrative ─────────────────────────────────────────────────────────

const EDGE_VERBS: Partial<Record<GraphEdgeType, string>> = {
  donated_to: 'donated to',
  lobbied: 'lobbied',
  serves_on: 'serves on',
  voted_on: 'voted on',
  sponsored: 'sponsored',
  oversees: 'oversees',
  awarded_contract: 'awarded a contract to',
  affects_sector: 'affects',
  traded_stock: 'traded stock in',
  regulates: 'regulates',
  lobbying_matches: 'matches lobbying for',
  referred_to: 'was referred to',
};

function buildPathNarrative(
  nodes: Array<{ id: string; label: string }>,
  edges: GraphEdge[]
): string {
  if (nodes.length === 0) return '';

  const parts: string[] = [nodes[0]!.label];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    const verb = EDGE_VERBS[edge.type] ?? edge.type;
    const nextNode = nodes[i + 1];
    if (nextNode) {
      const amount = getDollarAmount(edge);
      const amountStr = amount > 0 ? ` ($${formatAmount(amount)})` : '';
      parts.push(`${verb} ${nextNode.label}${amountStr}`);
    }
  }

  return parts.join(', who ');
}

function getDollarAmount(edge: GraphEdge): number {
  if (typeof edge.properties.amount === 'number') return edge.properties.amount;
  if (typeof edge.properties.spending === 'number') return edge.properties.spending;
  return 0;
}

function formatAmount(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toFixed(0);
}

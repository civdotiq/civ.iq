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
import type { GraphEdge, GraphEdgeType, GraphNodeType } from '@/types/graph';
import { getCommitteeDisplayName } from '@/types/committee';
import { getLDAIssueLabel } from '@civiq/entity-resolution';

// ── Types ────────────────────────────────────────────────────────────

export interface EdgeScore {
  edgeId: string;
  dollarWeight: number;
  temporalWeight: number;
  confidenceWeight: number;
  combinedScore: number;
}

export interface PathNodeInfo {
  id: string;
  label: string;
  type: GraphNodeType;
  profileUrl?: string;
}

export interface PathStep {
  from: string;
  to: string;
  relationship: string;
  dollars: number | null;
  period: string | null;
  source: string | null;
}

export interface PathSummary {
  totalDollars: number;
  timeRange: string | null;
  issueAreas: string[];
  steps: PathStep[];
}

export interface ScoredPath {
  nodes: PathNodeInfo[];
  edges: GraphEdge[];
  score: number;
  edgeScores: EdgeScore[];
  narrative: string;
  summary: PathSummary;
}

export interface InfluenceScore {
  fromId: string;
  toId: string;
  fromLabel: string;
  toLabel: string;
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
      const nodeInfos: PathNodeInfo[] = path.nodes.map(n => ({
        id: n.id,
        label: n.label,
        type: n.type,
        profileUrl: n.profileUrl,
      }));
      const summary = buildPathSummary(path.nodes, path.edges);

      return {
        nodes: nodeInfos,
        edges: path.edges,
        score,
        edgeScores,
        narrative,
        summary,
      };
    })
    .sort((a, b) => b.score - a.score);

  const aggregateScore =
    scoredPaths.length > 0
      ? scoredPaths.reduce((sum, p) => sum + p.score, 0) / scoredPaths.length
      : 0;

  const confidence = scoredPaths.length > 0 ? Math.min(scoredPaths.length / 5, 0.9) : 0;

  // Resolve labels from the first path's endpoints, or fall back to readable names
  const fromLabel = scoredPaths[0]?.nodes[0]?.label ?? humanizeId(fromId);
  const toLabel = scoredPaths[0]?.nodes[scoredPaths[0].nodes.length - 1]?.label ?? humanizeId(toId);

  return {
    fromId,
    toId,
    fromLabel,
    toLabel,
    aggregateScore,
    paths: scoredPaths,
    pathCount: scoredPaths.length,
    confidence,
    methodology:
      'We trace publicly reported campaign contributions, lobbying filings, and ' +
      'committee assignments using data from FEC.gov and Senate lobbying disclosures.',
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

// ── Path Summary ─────────────────────────────────────────────────────

function buildPathSummary(
  nodes: Array<{ id: string; label: string }>,
  edges: GraphEdge[]
): PathSummary {
  let totalDollars = 0;
  let earliest: string | null = null;
  let latest: string | null = null;
  const issueSet = new Set<string>();
  const steps: PathStep[] = [];

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    const fromNode = nodes[i]!;
    const toNode = nodes[i + 1];

    const dollars = getDollarAmount(edge);
    if (dollars > 0) totalDollars += dollars;

    // Collect time range
    const edgeDate = edge.temporal?.lastSeen ?? edge.temporal?.date;
    if (edgeDate) {
      if (!earliest || edgeDate < earliest) earliest = edgeDate;
      if (!latest || edgeDate > latest) latest = edgeDate;
    }

    // Collect issue areas from lobbying edges (resolve raw LDA codes to labels)
    const issueCodes = edge.properties.issueCodes;
    if (Array.isArray(issueCodes)) {
      for (const code of issueCodes) {
        if (typeof code === 'string') issueSet.add(getLDAIssueLabel(code));
      }
    }

    steps.push({
      from: fromNode.label,
      to: toNode?.label ?? '',
      relationship: buildStepRelationship(edge),
      dollars: dollars > 0 ? dollars : null,
      period:
        edge.temporal?.period ??
        formatDateRange(edge.temporal?.firstSeen, edge.temporal?.lastSeen) ??
        null,
      source: edge.sourceLabel ?? null,
    });
  }

  return {
    totalDollars,
    timeRange: formatDateRange(earliest, latest),
    issueAreas: [...issueSet],
    steps,
  };
}

function buildStepRelationship(edge: GraphEdge): string {
  const dollars = getDollarAmount(edge);
  const dollarStr = dollars > 0 ? ` ($${formatAmount(dollars)})` : '';

  const STEP_DESCRIPTIONS: Partial<Record<GraphEdgeType, string>> = {
    donated_to: `contributed${dollarStr} to`,
    lobbied: `lobbied${dollarStr}`,
    serves_on: 'is a member of',
    voted_on: 'voted on',
    sponsored: 'sponsored',
    oversees: 'has oversight of',
    awarded_contract: `awarded${dollarStr} in contracts to`,
    affects_sector: 'affects the',
    in_sector: 'operates in the',
    traded_stock: `traded stock${dollarStr} in`,
    regulates: 'regulates',
    lobbying_matches: 'has lobbying aligned with',
    referred_to: 'was referred to',
  };

  return STEP_DESCRIPTIONS[edge.type] ?? edge.type;
}

function formatDateRange(start?: string | null, end?: string | null): string | null {
  if (!start && !end) return null;

  const fmt = (iso: string): string | null => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (start && end) {
    const s = fmt(start);
    const e = fmt(end);
    if (!s && !e) return null;
    if (!s) return e;
    if (!e) return s;
    return s === e ? s : `${s} - ${e}`;
  }

  return fmt(start ?? end!);
}

/** Convert a canonical mesh ID to a human-readable name when no graph label is available. */
function humanizeId(id: string): string {
  const colonIdx = id.indexOf(':');
  if (colonIdx < 0) return id;

  const prefix = id.slice(0, colonIdx);
  const value = id.slice(colonIdx + 1);

  if (prefix === 'cmte') {
    return getCommitteeDisplayName(value);
  }

  if (prefix === 'org') {
    // "national-assn-of-realtors" → "National Assn of Realtors"
    return value
      .split('-')
      .map(w => (w.length <= 2 ? w : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ');
  }

  // rep, bill, etc. — just strip the prefix
  return value;
}

// ── Narrative ─────────────────────────────────────────────────────────

const EDGE_VERBS: Partial<Record<GraphEdgeType, string>> = {
  donated_to: 'contributed to',
  lobbied: 'lobbied',
  serves_on: 'includes members of',
  voted_on: 'voted on legislation in',
  sponsored: 'sponsored legislation in',
  oversees: 'oversees',
  awarded_contract: 'awarded contracts to',
  affects_sector: 'affects',
  traded_stock: 'traded stock in',
  regulates: 'regulates',
  lobbying_matches: 'has lobbying aligned with',
  referred_to: 'was referred to',
};

function buildPathNarrative(
  nodes: Array<{ id: string; label: string }>,
  edges: GraphEdge[]
): string {
  if (nodes.length === 0) return '';
  if (edges.length === 0) return nodes[0]!.label;

  // Build a flowing sentence rather than a "who" chain
  const firstNode = nodes[0]!.label;

  // For single-edge paths, build a direct sentence
  if (edges.length === 1) {
    const edge = edges[0]!;
    const verb = EDGE_VERBS[edge.type] ?? edge.type;
    const amount = getDollarAmount(edge);
    const amountStr = amount > 0 ? ` ($${formatAmount(amount)})` : '';
    const filingCount =
      typeof edge.properties.filingCount === 'number' ? edge.properties.filingCount : 0;
    const filingStr = filingCount > 0 ? ` across ${filingCount} filings` : '';
    const period = edge.temporal?.period;
    const periodStr = period ? ` (${period})` : '';

    return `${firstNode} ${verb} ${nodes[1]!.label}${amountStr}${filingStr}${periodStr}.`;
  }

  // For multi-edge paths, describe the chain
  const parts: string[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    const nextNode = nodes[i + 1];
    if (!nextNode) continue;

    const verb = EDGE_VERBS[edge.type] ?? edge.type;
    const amount = getDollarAmount(edge);
    const amountStr = amount > 0 ? ` ($${formatAmount(amount)})` : '';

    if (i === 0) {
      parts.push(`${firstNode} ${verb} ${nextNode.label}${amountStr}`);
    } else {
      parts.push(`which ${verb} ${nextNode.label}${amountStr}`);
    }
  }

  return parts.join(', ') + '.';
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

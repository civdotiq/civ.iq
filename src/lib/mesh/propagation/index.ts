/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Propagation — Civic Mesh Phase 4
 *
 * Path scoring: "How strongly is Org A connected to Regulation B?"
 */

export { scoreInfluence, scoreEdge } from './path-scorer';
export type {
  ScoredPath,
  InfluenceScore,
  EdgeScore,
  PathNodeInfo,
  PathStep,
  PathSummary,
} from './path-scorer';

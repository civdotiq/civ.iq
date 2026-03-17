/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Propagation — Civic Mesh Phase 4
 *
 * Three ML-driven capabilities:
 * - Counterfactual: "What would this rep vote without Sector X?"
 * - Path scoring: "How strongly is Org A connected to Regulation B?"
 * - Cascade: "If energy funding increases 20%, which votes shift?"
 */

export { runCounterfactual, maskDonorProfile } from './counterfactual';
export type {
  CounterfactualQuery,
  CounterfactualResult,
  CounterfactualPrediction,
} from './counterfactual';

export { scoreInfluence, scoreEdge } from './path-scorer';
export type { ScoredPath, InfluenceScore, EdgeScore } from './path-scorer';

export { simulateCascade, perturbSectorFunding } from './cascade';
export type { CascadeQuery, CascadeResult, CascadeRepEffect } from './cascade';

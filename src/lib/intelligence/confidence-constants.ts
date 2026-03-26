/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Centralized confidence constants for influence chain link types.
 *
 * Each value has a documented rationale. All are heuristic estimates
 * because the underlying links cannot be verified probabilistically.
 */
export const LINK_CONFIDENCE = {
  /** Committee membership is verifiable fact from Congress.gov */
  committee: 0.95,
  /** Bill-sector classification uses ML with 4-tier fallback */
  billSectorMatch: 0.7,
  /** Vote record is verifiable fact from House Clerk / Senate */
  vote: 1.0,
  /** Regulation-bill link via committee-agency mapping is deterministic */
  regulationLink: 0.8,
  /** Lobbying-committee match: direct alias hit */
  lobbyingDirect: 0.9,
  /** Lobbying-committee match: fuzzy string match */
  lobbyingFuzzy: 0.7,
  /** FEC contribution match: exact name match */
  contributionExact: 0.9,
  /** FEC contribution match: fuzzy name match */
  contributionFuzzy: 0.6,
} as const;

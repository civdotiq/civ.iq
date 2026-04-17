/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { IndustrySector } from './industry-taxonomy';

// ── Government Entity Resolution ─────────────────────────────────────

/** Result of resolving a single LDA government_entities string. */
export interface GovernmentEntityResolution {
  /** Original text from the LDA filing. */
  rawText: string;
  /** Resolution outcome. */
  type: 'committee' | 'agency' | 'noise' | 'unresolved';
  /** Committee code (e.g., "SSFI") if resolved to a committee. */
  committeeCode?: string;
  /** Committee name if resolved. */
  committeeName?: string;
  /** Agency slug if resolved to an agency. */
  agencySlug?: string;
  /** Resolution confidence: 1.0 for exact, 0.85+ for fuzzy, 0 for noise. */
  confidence: number;
}

// ── Ticker Resolution ────────────────────────────────────────────────

/**
 * Result of resolving a stock ticker to an industry sector.
 * Returns null for ETFs, mutual funds, and unresolvable tickers.
 */
export interface TickerResolution {
  sector: IndustrySector;
  sicCode: string;
  confidence: number;
}

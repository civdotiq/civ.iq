/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { MIN_VOTES_PER_SECTOR } from '@/lib/intelligence/statistics/civic-stats';

/**
 * Minimum signals the Intelligence tab needs to render a non-empty panel.
 *
 * The Intelligence tab fans out to multiple analyzers; each one short-circuits
 * to `null` below its own sample-size floor (see
 * `.claude/rules/intelligence-layer.md`). This helper does a preflight check
 * using signals already loaded by the profile page, so the tab is hidden
 * entirely when no analyzer can possibly clear its threshold — avoiding the
 * "half-empty tab" failure mode on freshmen and other low-activity members.
 *
 * Thresholds come from `@civiq/civic-statistics`; do not invent new ones.
 */
export interface IntelligenceSignals {
  /** Number of committees the member currently sits on. */
  committeeCount: number;
  /** Total roll-call votes participated in (from the summary batch). */
  votesParticipated: number | undefined;
}

export function hasIntelligenceData(signals: IntelligenceSignals): boolean {
  const { committeeCount, votesParticipated } = signals;

  // Summary hasn't resolved yet — stay optimistic so the tab is visible
  // while data loads. Hiding only kicks in once we have evidence both
  // signal paths fall below threshold.
  if (votesParticipated === undefined) return true;

  // ≥1 committee → lobbying-pipeline, stock-committee, influence-chain and
  // influence-graph analyzers have at least the structural prerequisite.
  // ≥MIN_VOTES_PER_SECTOR votes → vote-finance and temporal-vote analyzers
  // can reach their per-sector and per-quarter sample minimums.
  // If both fail, every analyzer's floor is unreachable.
  return committeeCount > 0 || votesParticipated >= MIN_VOTES_PER_SECTOR;
}

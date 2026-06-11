/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Response shapes consumed by the redesigned profile overview.
 * Votes and bills reuse the canonical types from the voting/legislation
 * tabs so one batch fetch can feed both the overview sections and the
 * drill-down dashboard panels.
 */

import type { VoteResponse } from '../VotingTab';
import type { BillsResponse } from '../BillsTab';

/**
 * Finance payload from the batch service. Declared as a type alias (not an
 * interface) so it stays assignable to the dashboard's
 * `Record<string, unknown>` finance prop.
 */
export type ProfileFinance = {
  totalRaised?: number;
  totalSpent?: number;
  cashOnHand?: number;
  individualContributions?: number;
  pacContributions?: number;
  partyContributions?: number;
  candidateContributions?: number;
  metadata?: { matchedCycle?: number; note?: string };
};

export interface ProfileBatchResponse {
  success?: boolean;
  data?: {
    votes?: VoteResponse;
    bills?: BillsResponse;
    finance?: ProfileFinance;
  };
}

export interface ProfileSummary {
  billsSponsored?: number;
  billsCosponsored?: number;
  totalRaised?: number;
  totalSpent?: number;
  cashOnHand?: number;
  votesParticipated?: number;
  financeCycle?: number;
}

export interface ProfileSummaryResponse {
  success?: boolean;
  data?: ProfileSummary;
}

/** Committee entry as actually delivered by congress.service (ids included). */
export interface ProfileCommittee {
  name: string;
  role?: string;
  title?: string;
  id?: string;
  thomas_id?: string;
}

/** Compact currency for stat displays: $9.7M / $410K / $980 */
export function formatMoney(amount: number | undefined | null): string | null {
  if (amount === undefined || amount === null || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${Math.round(amount).toLocaleString()}`;
}

/** Party chip border/text classes — party colors are for party identity ONLY. */
export function partyChipClasses(party: string | undefined): string {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('d')) return 'border-party-dem text-party-dem';
  if (p.startsWith('r')) return 'border-civiq-red text-civiq-red';
  return 'border-gray-400 text-gray-700';
}

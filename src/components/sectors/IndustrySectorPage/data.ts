/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Helpers for the redesigned IndustrySectorPage. Pure functions only —
 * data fetching is done client-side via SWR (matches IndustrySectorClient).
 */

import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { ContributorRow, IndustryOrganizationsResponse, LeaderboardEntry } from './types';

const SECTOR_TO_LEADERBOARD_SLUG: Record<IndustrySector, string> = {
  [IndustrySector.AGRIBUSINESS]: 'agribusiness',
  [IndustrySector.COMMUNICATIONS_ELECTRONICS]: 'communications-electronics',
  [IndustrySector.CONSTRUCTION]: 'construction',
  [IndustrySector.DEFENSE]: 'defense',
  [IndustrySector.ENERGY_NATURAL_RESOURCES]: 'energy-natural-resources',
  [IndustrySector.FINANCE_INSURANCE_REAL_ESTATE]: 'finance-insurance-real-estate',
  [IndustrySector.HEALTH]: 'health',
  [IndustrySector.LAWYERS_LOBBYISTS]: 'lawyers-lobbyists',
  [IndustrySector.TRANSPORTATION]: 'transportation',
  [IndustrySector.MISC_BUSINESS]: 'misc-business',
  [IndustrySector.LABOR]: 'labor',
  [IndustrySector.IDEOLOGY_SINGLE_ISSUE]: 'ideology-single-issue',
  [IndustrySector.OTHER]: 'other',
};

export function sectorToLeaderboardSlug(sector: IndustrySector): string {
  return SECTOR_TO_LEADERBOARD_SLUG[sector];
}

export function formatCompactDollars(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${n.toLocaleString('en-US')}`;
}

export function formatExactDollars(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `$${n.toLocaleString('en-US')}`;
}

/** Two-letter party code → 'd' | 'r' | 'i'. */
export function partyChipVariant(party: string): 'd' | 'r' | 'i' {
  const upper = party?.toUpperCase?.() ?? '';
  if (upper === 'D' || upper === 'DEM' || upper === 'DEMOCRAT') return 'd';
  if (upper === 'R' || upper === 'REP' || upper === 'REPUBLICAN') return 'r';
  return 'i';
}

export function partyShort(party: string): string {
  const v = partyChipVariant(party);
  if (v === 'd') return 'D';
  if (v === 'r') return 'R';
  return 'I';
}

interface PartyTotals {
  d: number;
  r: number;
  other: number;
  total: number;
}

export function computePartyTotals(entries: LeaderboardEntry[]): PartyTotals {
  const totals: PartyTotals = { d: 0, r: 0, other: 0, total: 0 };
  for (const e of entries) {
    const v = partyChipVariant(e.party);
    if (v === 'd') totals.d += e.sectorDonationAmount;
    else if (v === 'r') totals.r += e.sectorDonationAmount;
    else totals.other += e.sectorDonationAmount;
    totals.total += e.sectorDonationAmount;
  }
  return totals;
}

/** Top recipients by raw sector donation amount. */
export function topRecipients(entries: LeaderboardEntry[], limit = 8): LeaderboardEntry[] {
  return [...entries]
    .sort((a, b) => b.sectorDonationAmount - a.sectorDonationAmount)
    .slice(0, limit);
}

/** Format chamber + state into a compact district label, e.g. "D-NY-08" or "R-SC · S". */
export function memberDistrictLabel(entry: LeaderboardEntry): string {
  const party = partyShort(entry.party);
  if (entry.chamber === 'Senate') return `${party}-${entry.state} · S`;
  return `${party}-${entry.state}`;
}

/**
 * Build a spending leaderboard from lobbying-org rows, sorted by amount.
 * PACs are excluded: the FEC committee-search endpoint returns no spend totals,
 * so there is no real amount to rank or display for them.
 */
export function combinedContributors(
  orgs: IndustryOrganizationsResponse | undefined,
  limit = 8
): ContributorRow[] {
  if (!orgs) return [];
  const rows: ContributorRow[] = [];
  for (const lobby of orgs.topLobbyingOrgs) {
    rows.push({
      kind: 'lobby',
      registrantId: lobby.registrantId,
      name: lobby.name,
      amount: lobby.totalSpending,
      sublabel: `Lobbying · ${lobby.filingCount} filing${lobby.filingCount === 1 ? '' : 's'}`,
    });
  }
  return rows.sort((a, b) => b.amount - a.amount).slice(0, limit);
}

/** Format a Congress.gov bill type+number as "H.R. 123" / "S. 45" / "H.J.Res. 7". */
export function formatBillNumber(type: string, number: string): string {
  const upper = (type ?? '').toUpperCase();
  if (upper === 'HR') return `H.R. ${number}`;
  if (upper === 'S') return `S. ${number}`;
  if (upper === 'HJRES') return `H.J.Res. ${number}`;
  if (upper === 'SJRES') return `S.J.Res. ${number}`;
  if (upper === 'HCONRES') return `H.Con.Res. ${number}`;
  if (upper === 'SCONRES') return `S.Con.Res. ${number}`;
  if (upper === 'HRES') return `H.Res. ${number}`;
  if (upper === 'SRES') return `S.Res. ${number}`;
  return `${upper} ${number}`;
}

/** Build the route to a bill detail page from the connections.recentBills shape. */
export function billDetailHref(bill: { congress: number; type: string; number: string }): string {
  return `/bills/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}`;
}

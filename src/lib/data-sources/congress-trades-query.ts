/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cross-Congress Stock Trade Query
 *
 * Aggregates STOCK Act trades across all members of Congress and applies
 * member-level (chamber, party, name) and trade-level (ticker, type,
 * date range) filters.
 *
 * Data paths (same corpus the stock-trade leaderboard analyzer reads):
 * - Senate: Congress Trading Monitor bulk load (per-filer files, 24h cached)
 * - House: Congress Trading Monitor bulk load (per-filer files, 24h cached).
 *   Replaced the Redis PTR corpus + House Clerk PDF parser 2026-07.
 *
 * Party/state come from an enrichment map cached 24h; members that cannot
 * be resolved are excluded from party filters rather than guessed.
 */

import logger from '@/lib/logging/simple-logger';
import { cachedFetch } from '@/lib/cache';
import { congressTradingMonitor } from '@/lib/data-sources/senate-disclosure-service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import type { StockTrade } from '@/types/stock-trades';

/** Concurrency limit for member enrichment calls */
const ENRICHMENT_CONCURRENCY = 5;

/** Member info cache: 24 hours */
const MEMBER_INFO_TTL = 24 * 60 * 60;

export interface TradeQueryFilters {
  chamber?: 'house' | 'senate';
  party?: 'D' | 'R' | 'I';
  /** Case-insensitive substring match on member name */
  name?: string;
  bioguideId?: string;
  /** Exact ticker symbol, case-insensitive */
  ticker?: string;
  transactionType?: 'purchase' | 'sale' | 'exchange';
  /** ISO date (YYYY-MM-DD), inclusive, on transactionDate */
  from?: string;
  /** ISO date (YYYY-MM-DD), inclusive, on transactionDate */
  to?: string;
}

export interface CongressTradeRecord extends StockTrade {
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
}

export interface TradeQueryResult {
  trades: CongressTradeRecord[];
  total: number;
  membersMatched: number;
  sources: {
    senateMembersLoaded: number;
    houseMembersLoaded: number;
  };
}

interface MemberTrades {
  bioguideId: string;
  chamber: 'House' | 'Senate';
  trades: StockTrade[];
}

interface MemberInfo {
  party: string;
  state: string;
}

/**
 * Normalize a party value to a single-letter code (D/R/I).
 * getEnhancedRepresentative returns full names ("Democrat"); other data
 * paths already use letter codes. Unknown values normalize to ''.
 */
export function normalizePartyCode(party: string | null | undefined): string {
  if (!party) return '';
  const p = party.trim().toUpperCase();
  if (p === 'D' || p.startsWith('DEMOCRAT')) return 'D';
  if (p === 'R' || p.startsWith('REPUBLICAN')) return 'R';
  if (p === 'I' || p.startsWith('INDEPENDENT')) return 'I';
  return '';
}

/**
 * Apply trade-level filters to a single trade. Exported for tests.
 */
export function tradeMatchesFilters(trade: StockTrade, filters: TradeQueryFilters): boolean {
  if (filters.ticker) {
    if (!trade.ticker || trade.ticker.toUpperCase() !== filters.ticker.toUpperCase()) {
      return false;
    }
  }

  if (filters.transactionType) {
    const type = trade.transactionType;
    switch (filters.transactionType) {
      case 'purchase':
        if (type !== 'Purchase') return false;
        break;
      case 'sale':
        if (!type.startsWith('Sale')) return false;
        break;
      case 'exchange':
        if (type !== 'Exchange') return false;
        break;
    }
  }

  // ISO date strings (YYYY-MM-DD) compare correctly as strings
  if (filters.from && trade.transactionDate < filters.from) return false;
  if (filters.to && trade.transactionDate > filters.to) return false;

  return true;
}

/**
 * Load all members' trades from both chambers.
 */
async function loadAllMemberTrades(): Promise<{
  members: MemberTrades[];
  senateMembersLoaded: number;
  houseMembersLoaded: number;
}> {
  const members: MemberTrades[] = [];
  let senateMembersLoaded = 0;
  let houseMembersLoaded = 0;

  try {
    const senateMap = await congressTradingMonitor.getAllSenatorTrades();
    for (const [bioguideId, trades] of senateMap) {
      members.push({ bioguideId, chamber: 'Senate', trades });
    }
    senateMembersLoaded = senateMap.size;
  } catch (error) {
    logger.warn('[TradesQuery] Failed to load Senate trades', {
      error: (error as Error).message,
    });
  }

  try {
    const houseMap = await congressTradingMonitor.getAllRepresentativeTrades();
    for (const [bioguideId, trades] of houseMap) {
      // A member should never appear in both chambers, but guard anyway
      if (members.some(m => m.bioguideId === bioguideId)) continue;
      members.push({ bioguideId, chamber: 'House', trades });
      houseMembersLoaded++;
    }
  } catch (error) {
    logger.warn('[TradesQuery] Failed to load House trades', {
      error: (error as Error).message,
    });
  }

  return { members, senateMembersLoaded, houseMembersLoaded };
}

/**
 * Build (or read cached) party/state info for the given members.
 * Members that cannot be resolved are omitted, never guessed.
 */
async function getMemberInfoMap(bioguideIds: string[]): Promise<Record<string, MemberInfo>> {
  return cachedFetch(
    'trades-query:member-info:v2', // v2: party normalized to letter codes
    async () => {
      const map: Record<string, MemberInfo> = {};

      for (let i = 0; i < bioguideIds.length; i += ENRICHMENT_CONCURRENCY) {
        const batch = bioguideIds.slice(i, i + ENRICHMENT_CONCURRENCY);
        await Promise.all(
          batch.map(async bioguideId => {
            try {
              const rep = await getEnhancedRepresentative(bioguideId);
              if (rep) {
                map[bioguideId] = { party: normalizePartyCode(rep.party), state: rep.state };
              }
            } catch {
              // Unresolvable member — omitted from the map
            }
          })
        );
      }

      logger.info('[TradesQuery] Built member info map', {
        requested: bioguideIds.length,
        resolved: Object.keys(map).length,
      });

      return map;
    },
    MEMBER_INFO_TTL
  );
}

/**
 * Query congressional stock trades across both chambers with filters.
 * Results are sorted by transaction date descending.
 */
export async function queryCongressionalTrades(
  filters: TradeQueryFilters,
  limit: number,
  offset: number
): Promise<TradeQueryResult> {
  const { members, senateMembersLoaded, houseMembersLoaded } = await loadAllMemberTrades();

  // Member-level filters that don't need enrichment: chamber, bioguideId, name
  let candidates = members;
  if (filters.chamber) {
    candidates = candidates.filter(m => m.chamber.toLowerCase() === filters.chamber);
  }
  if (filters.bioguideId) {
    const wanted = filters.bioguideId.toUpperCase();
    candidates = candidates.filter(m => m.bioguideId === wanted);
  }
  if (filters.name) {
    const needle = filters.name.toLowerCase();
    candidates = candidates.filter(m =>
      m.trades.some(t => t.memberName.toLowerCase().includes(needle))
    );
  }

  // Party filter needs the enrichment map; unresolved members are excluded
  // (unknown party is not evidence of any party)
  let infoMap: Record<string, MemberInfo> = {};
  if (candidates.length > 0) {
    infoMap = await getMemberInfoMap(members.map(m => m.bioguideId));
  }
  if (filters.party) {
    candidates = candidates.filter(m => infoMap[m.bioguideId]?.party === filters.party);
  }

  // Flatten surviving members' trades and apply trade-level filters
  const matched: CongressTradeRecord[] = [];
  for (const member of candidates) {
    const info = infoMap[member.bioguideId];
    for (const trade of member.trades) {
      if (!tradeMatchesFilters(trade, filters)) continue;
      matched.push({
        ...trade,
        party: info?.party ?? '',
        state: info?.state ?? '',
        chamber: member.chamber,
      });
    }
  }

  matched.sort(
    (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
  );

  const membersMatched = new Set(matched.map(t => t.bioguideId)).size;

  return {
    trades: matched.slice(offset, offset + limit),
    total: matched.length,
    membersMatched,
    sources: { senateMembersLoaded, houseMembersLoaded },
  };
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { getRedisCache } from '@/lib/cache/redis-client';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { getComprehensiveBillsByMember } from '@/services/congress/optimized-congress.service';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { getFECIdFromBioguide } from '@/lib/data/legislator-mappings';
import logger from '@/lib/logging/simple-logger';
import type { AlertType, WatchedEntity } from './subscription-store';

const STATE_KEY_PREFIX = 'alert:state:';
const STATE_TTL = 7 * 24 * 60 * 60; // 7 days

interface VoteSnapshot {
  latestVoteId: string | null;
  voteCount: number;
}

interface BillsSnapshot {
  latestBillId: string | null;
  sponsoredCount: number;
}

interface FinanceSnapshot {
  totalReceipts: number;
  cycle: number;
}

interface EntityState {
  votes?: VoteSnapshot;
  bills?: BillsSnapshot;
  finance?: FinanceSnapshot;
  updatedAt: string;
}

export interface DetectedChange {
  entity: WatchedEntity;
  alertType: AlertType;
  data: VoteChangeData | LegislationChangeData | FinanceChangeData;
}

export interface VoteChangeData {
  type: 'vote';
  votes: Array<{
    voteId: string;
    date: string;
    position: string;
    billTitle: string;
    billId: string;
    question: string;
  }>;
}

export interface LegislationChangeData {
  type: 'legislation';
  bills: Array<{
    billId: string;
    title: string;
    date: string;
    relationship: 'sponsored' | 'cosponsored';
  }>;
}

export interface FinanceChangeData {
  type: 'finance';
  totalRaised: string;
  previousTotal: string;
  cycle: number;
}

function stateKey(entity: WatchedEntity): string {
  return `${STATE_KEY_PREFIX}${entity.type}:${entity.id}`;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

/**
 * Detect changes for a representative entity.
 * Compares current state against last-known snapshot in Redis.
 */
export async function detectChanges(
  entity: WatchedEntity,
  alertTypes: AlertType[]
): Promise<DetectedChange[]> {
  const cache = getRedisCache();
  const key = stateKey(entity);
  const previousState = await cache.get<EntityState>(key);

  const changes: DetectedChange[] = [];
  const newState: EntityState = { updatedAt: new Date().toISOString() };

  if (alertTypes.includes('votes')) {
    try {
      const voteChange = await detectVoteChanges(entity, previousState?.votes ?? null);
      newState.votes = voteChange.snapshot;
      if (voteChange.change) changes.push(voteChange.change);
    } catch (error) {
      logger.error('[Alerts] Vote detection failed', error as Error, { entityId: entity.id });
      newState.votes = previousState?.votes;
    }
  }

  if (alertTypes.includes('legislation')) {
    try {
      const billChange = await detectBillChanges(entity, previousState?.bills ?? null);
      newState.bills = billChange.snapshot;
      if (billChange.change) changes.push(billChange.change);
    } catch (error) {
      logger.error('[Alerts] Bill detection failed', error as Error, { entityId: entity.id });
      newState.bills = previousState?.bills;
    }
  }

  if (alertTypes.includes('finance')) {
    try {
      const financeChange = await detectFinanceChanges(entity, previousState?.finance ?? null);
      newState.finance = financeChange.snapshot;
      if (financeChange.change) changes.push(financeChange.change);
    } catch (error) {
      logger.error('[Alerts] Finance detection failed', error as Error, { entityId: entity.id });
      newState.finance = previousState?.finance;
    }
  }

  await cache.set(key, newState, STATE_TTL);
  return changes;
}

async function detectVoteChanges(
  entity: WatchedEntity,
  previous: VoteSnapshot | null
): Promise<{ snapshot: VoteSnapshot; change: DetectedChange | null }> {
  let votes: Array<{
    voteId: string;
    date: string;
    position: string;
    question: string;
    bill?: { congress: number; type: string; number: string; title: string };
  }> = [];

  // Use chamber from subscription data to call the right API directly
  if (entity.chamber === 'Senate') {
    votes = await batchVotingService.getSenateMemberVotes(
      entity.id,
      getCurrentCongressNumber(),
      undefined,
      10
    );
  } else if (entity.chamber === 'House') {
    votes = await batchVotingService.getHouseMemberVotes(
      entity.id,
      getCurrentCongressNumber(),
      undefined,
      10
    );
  } else {
    // Fallback: try House first (more common), then Senate
    try {
      votes = await batchVotingService.getHouseMemberVotes(
        entity.id,
        getCurrentCongressNumber(),
        undefined,
        10
      );
    } catch {
      votes = await batchVotingService.getSenateMemberVotes(
        entity.id,
        getCurrentCongressNumber(),
        undefined,
        10
      );
    }
  }

  const snapshot: VoteSnapshot = {
    latestVoteId: votes[0]?.voteId ?? null,
    voteCount: votes.length,
  };

  // First run — save baseline, don't alert
  if (!previous) {
    return { snapshot, change: null };
  }

  if (!previous.latestVoteId || snapshot.latestVoteId === previous.latestVoteId) {
    return { snapshot, change: null };
  }

  // Collect votes newer than the last-seen vote
  const newVotes = [];
  for (const vote of votes) {
    if (vote.voteId === previous.latestVoteId) break;
    newVotes.push({
      voteId: vote.voteId,
      date: vote.date,
      position: vote.position,
      billTitle: vote.bill?.title ?? vote.question,
      billId: vote.bill ? `${vote.bill.type}${vote.bill.number}` : vote.voteId,
      question: vote.question,
    });
  }

  if (newVotes.length === 0) {
    return { snapshot, change: null };
  }

  return {
    snapshot,
    change: {
      entity,
      alertType: 'votes',
      data: { type: 'vote', votes: newVotes },
    },
  };
}

async function detectBillChanges(
  entity: WatchedEntity,
  previous: BillsSnapshot | null
): Promise<{ snapshot: BillsSnapshot; change: DetectedChange | null }> {
  const result = await getComprehensiveBillsByMember({
    bioguideId: entity.id,
    limit: 10,
    page: 1,
    congress: getCurrentCongressNumber(),
  });

  const bills = result.bills ?? [];
  const snapshot: BillsSnapshot = {
    latestBillId: bills[0]?.id ?? null,
    sponsoredCount: result.metadata?.sponsoredCount ?? bills.length,
  };

  if (!previous) {
    return { snapshot, change: null };
  }

  if (!previous.latestBillId || snapshot.latestBillId === previous.latestBillId) {
    return { snapshot, change: null };
  }

  const newBills = [];
  for (const bill of bills) {
    if (bill.id === previous.latestBillId) break;
    newBills.push({
      // Canonical <congress>-<type>-<number> slug for the alert email link.
      // bill.id is the bare number, which 404s on the bill route; build the
      // route-valid slug from the separate fields instead.
      billId: `${bill.congress}-${(bill.type ?? '').toLowerCase()}-${bill.number}`,
      title: bill.title,
      date: bill.introducedDate,
      relationship: (bill.relationship ?? 'sponsored') as 'sponsored' | 'cosponsored',
    });
  }

  if (newBills.length === 0) {
    return { snapshot, change: null };
  }

  return {
    snapshot,
    change: {
      entity,
      alertType: 'legislation',
      data: { type: 'legislation', bills: newBills },
    },
  };
}

async function detectFinanceChanges(
  entity: WatchedEntity,
  previous: FinanceSnapshot | null
): Promise<{ snapshot: FinanceSnapshot; change: DetectedChange | null }> {
  const fecId = await getFECIdFromBioguide(entity.id);
  if (!fecId) {
    // No FEC mapping — can't detect finance changes
    return {
      snapshot: previous ?? { totalReceipts: 0, cycle: 0 },
      change: null,
    };
  }

  // Try current cycle, fall back to previous
  const currentYear = new Date().getFullYear();
  const cycle = currentYear % 2 === 0 ? currentYear : currentYear - 1;

  const summary = await fecApiService.getFinancialSummary(fecId, cycle);
  if (!summary) {
    return {
      snapshot: previous ?? { totalReceipts: 0, cycle },
      change: null,
    };
  }

  const snapshot: FinanceSnapshot = {
    totalReceipts: summary.receipts,
    cycle: summary.cycle,
  };

  // First run — save baseline
  if (!previous) {
    return { snapshot, change: null };
  }

  // No change (or same cycle with same total)
  if (previous.totalReceipts === snapshot.totalReceipts) {
    return { snapshot, change: null };
  }

  return {
    snapshot,
    change: {
      entity,
      alertType: 'finance',
      data: {
        type: 'finance',
        totalRaised: formatCurrency(snapshot.totalReceipts),
        previousTotal: formatCurrency(previous.totalReceipts),
        cycle: snapshot.cycle,
      },
    },
  };
}

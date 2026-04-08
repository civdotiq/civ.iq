/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { getComprehensiveBillsByMember } from '@/services/congress/optimized-congress.service';
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

interface EntityState {
  votes?: VoteSnapshot;
  bills?: BillsSnapshot;
  updatedAt: string;
}

export interface DetectedChange {
  entity: WatchedEntity;
  alertType: AlertType;
  data: VoteChangeData | LegislationChangeData;
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

function stateKey(entity: WatchedEntity): string {
  return `${STATE_KEY_PREFIX}${entity.type}:${entity.id}`;
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

  // Detect vote changes
  if (alertTypes.includes('votes')) {
    try {
      const voteChange = await detectVoteChanges(entity, previousState?.votes ?? null);
      newState.votes = voteChange.snapshot;
      if (voteChange.change) {
        changes.push(voteChange.change);
      }
    } catch (error) {
      logger.error('[Alerts] Vote detection failed', error as Error, {
        entityId: entity.id,
      });
      // Preserve previous state on error
      newState.votes = previousState?.votes;
    }
  }

  // Detect legislation changes
  if (alertTypes.includes('legislation')) {
    try {
      const billChange = await detectBillChanges(entity, previousState?.bills ?? null);
      newState.bills = billChange.snapshot;
      if (billChange.change) {
        changes.push(billChange.change);
      }
    } catch (error) {
      logger.error('[Alerts] Bill detection failed', error as Error, {
        entityId: entity.id,
      });
      newState.bills = previousState?.bills;
    }
  }

  // Save updated state
  await cache.set(key, newState, STATE_TTL);

  return changes;
}

async function detectVoteChanges(
  entity: WatchedEntity,
  previous: VoteSnapshot | null
): Promise<{ snapshot: VoteSnapshot; change: DetectedChange | null }> {
  // Determine chamber from bioguideId prefix convention
  // Senators typically have different patterns — fetch both and use whichever returns data
  let votes: Array<{
    voteId: string;
    date: string;
    position: string;
    question: string;
    bill?: { congress: number; type: string; number: string; title: string };
  }> = [];

  try {
    votes = await batchVotingService.getHouseMemberVotes(entity.id, 119, undefined, 10);
  } catch {
    // Try Senate if House fails
    try {
      votes = await batchVotingService.getSenateMemberVotes(entity.id, 119, undefined, 10);
    } catch {
      // No votes available
    }
  }

  const snapshot: VoteSnapshot = {
    latestVoteId: votes[0]?.voteId ?? null,
    voteCount: votes.length,
  };

  // First run — no previous state, just save baseline
  if (!previous) {
    return { snapshot, change: null };
  }

  // Find new votes since last check
  if (!previous.latestVoteId || snapshot.latestVoteId === previous.latestVoteId) {
    return { snapshot, change: null };
  }

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
    congress: 119,
  });

  const bills = result.bills ?? [];
  const snapshot: BillsSnapshot = {
    latestBillId: bills[0]?.id ?? null,
    sponsoredCount: result.metadata?.sponsoredCount ?? bills.length,
  };

  // First run — save baseline
  if (!previous) {
    return { snapshot, change: null };
  }

  // No change
  if (!previous.latestBillId || snapshot.latestBillId === previous.latestBillId) {
    return { snapshot, change: null };
  }

  const newBills = [];
  for (const bill of bills) {
    if (bill.id === previous.latestBillId) break;
    newBills.push({
      billId: bill.id ?? `${bill.type}${bill.number}`,
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

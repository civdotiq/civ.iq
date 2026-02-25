/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislature Event Detector
 * Detects state bill introductions, actions, and votes via OpenStates API
 * for publishing to the Nostr relay network.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { nostrConfig } from '@/config/nostr.config';
import type {
  CivicEvent,
  StateBillIntroducedEvent,
  StateBillActionEvent,
  StateVoteEvent,
} from '@/types/nostr';
import type { OpenStatesBill } from '@/lib/openstates-api';
import logger from '@/lib/logging/simple-logger';

const OPENSTATES_BASE = 'https://v3.openstates.org';

interface OpenStatesV3BillResponse {
  results: OpenStatesV3Bill[];
  pagination: { total_items: number };
}

interface OpenStatesV3Bill {
  id: string;
  identifier: string;
  title: string;
  session: string;
  classification: string[];
  from_organization: { classification: string } | null;
  jurisdiction: { name: string };
  sponsorships: Array<{ name: string; primary: boolean }>;
  actions: Array<{
    description: string;
    date: string;
    classification: string[];
  }>;
  votes: Array<{
    id: string;
    motion_text: string;
    start_date: string;
    result: string;
    counts: Array<{ option: string; value: number }>;
  }>;
  first_action_date: string | null;
  latest_action_date: string | null;
  latest_action_description: string | null;
  openstates_url: string;
  created_at: string;
  updated_at: string;
}

/** Fetch recent bills from OpenStates for a given state */
async function fetchStateBills(state: string, limit = 20): Promise<OpenStatesV3Bill[]> {
  const apiKey = process.env.OPENSTATES_API_KEY;
  if (!apiKey) return [];

  const url = `${OPENSTATES_BASE}/bills?jurisdiction=${state}&per_page=${Math.min(limit, 20)}&sort=latest_action_date&include=sponsorships&include=actions&include=votes`;

  const response = await fetch(url, {
    headers: {
      'X-API-KEY': apiKey,
      'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
    },
  });

  if (!response.ok) {
    throw new Error(`OpenStates API error: ${response.status}`);
  }

  const data: OpenStatesV3BillResponse = await response.json();
  return data.results;
}

/** Get chamber string from OpenStates organization classification */
function getStateChamber(bill: OpenStatesV3Bill): 'upper' | 'lower' {
  return bill.from_organization?.classification === 'upper' ? 'upper' : 'lower';
}

/** Get primary sponsor name */
function getPrimarySponsor(bill: OpenStatesV3Bill): string {
  const primary = bill.sponsorships.find(s => s.primary);
  return primary?.name ?? '';
}

/** Build a state bill introduction event */
function buildStateBillIntroduced(bill: OpenStatesV3Bill, state: string): CivicEvent {
  const chamber = getStateChamber(bill);
  const data: StateBillIntroducedEvent = {
    billId: bill.id,
    identifier: bill.identifier,
    state: state.toUpperCase(),
    title: bill.title,
    chamber,
    session: bill.session,
    sponsor: getPrimarySponsor(bill),
    introducedDate: bill.first_action_date ?? bill.created_at.split('T')[0]!,
    openstatesUrl: bill.openstates_url,
  };

  const stateName = bill.jurisdiction.name;
  return {
    type: 'state-bill-introduced',
    id: `state-bill-intro-${state}-${bill.identifier}-${bill.session}`,
    timestamp: Math.floor(new Date(data.introducedDate).getTime() / 1000),
    title: `${stateName}: ${bill.identifier} — ${bill.title}`,
    summary: `${bill.identifier} introduced in ${stateName} ${chamber === 'upper' ? 'Senate' : 'House'}: ${bill.title}`,
    tags: ['state-legislation', state, chamber],
    source: {
      url: bill.openstates_url,
      api: 'openstates.org',
    },
    data,
  };
}

/** Build a state bill action event */
function buildStateBillAction(
  bill: OpenStatesV3Bill,
  action: OpenStatesV3Bill['actions'][0],
  state: string
): CivicEvent {
  const chamber = getStateChamber(bill);
  const data: StateBillActionEvent = {
    billId: bill.id,
    identifier: bill.identifier,
    state: state.toUpperCase(),
    actionText: action.description,
    actionDate: action.date,
    chamber,
    classification: action.classification,
  };

  const stateName = bill.jurisdiction.name;
  return {
    type: 'state-bill-action',
    id: `state-bill-action-${state}-${bill.identifier}-${action.date}`,
    timestamp: Math.floor(new Date(action.date).getTime() / 1000),
    title: `${stateName} ${bill.identifier}: ${action.description}`,
    summary: `${bill.title} — ${action.description}`,
    tags: ['state-legislation', state, ...action.classification],
    source: {
      url: bill.openstates_url,
      api: 'openstates.org',
    },
    data,
  };
}

/** Build a state vote event */
function buildStateVote(
  bill: OpenStatesV3Bill,
  vote: OpenStatesV3Bill['votes'][0],
  state: string
): CivicEvent {
  const chamber = getStateChamber(bill);
  const yeas = vote.counts.find(c => c.option === 'yes')?.value ?? 0;
  const nays = vote.counts.find(c => c.option === 'no')?.value ?? 0;

  const data: StateVoteEvent = {
    voteId: vote.id,
    state: state.toUpperCase(),
    chamber,
    billIdentifier: bill.identifier,
    motionText: vote.motion_text,
    result: vote.result,
    date: vote.start_date,
    yeas,
    nays,
  };

  const stateName = bill.jurisdiction.name;
  return {
    type: 'state-vote',
    id: `state-vote-${state}-${vote.id.split('/').pop()}`,
    timestamp: Math.floor(new Date(vote.start_date).getTime() / 1000),
    title: `${stateName} Vote: ${bill.identifier} — ${vote.motion_text}`,
    summary: `${vote.result}: ${yeas} yeas, ${nays} nays on ${bill.identifier}`,
    tags: ['state-vote', state, chamber],
    source: {
      url: bill.openstates_url,
      api: 'openstates.org',
    },
    data,
  };
}

/** Detect state legislature events across enabled states */
export async function detectStateEvents(): Promise<CivicEvent[]> {
  if (!process.env.OPENSTATES_API_KEY) {
    logger.info('OpenStates API key not configured, skipping state events', {
      operation: 'nostr_publisher',
    });
    return [];
  }

  const cache = getRedisCache();
  const events: CivicEvent[] = [];
  const states = nostrConfig.enabledStates;

  // Process states sequentially to avoid rate limiting
  for (const state of states) {
    try {
      const bills = await fetchStateBills(state);

      logger.info(`Fetched ${bills.length} state bills for ${state.toUpperCase()}`, {
        state,
        operation: 'nostr_publisher',
      });

      for (const bill of bills) {
        // Check for new bill introductions
        if (bill.first_action_date) {
          const introId = `state-bill-intro-${state}-${bill.identifier}-${bill.session}`;
          const introDedupKey = `${nostrConfig.dedupPrefix}${introId}`;
          const introPublished = await cache.exists(introDedupKey);

          if (!introPublished) {
            events.push(buildStateBillIntroduced(bill, state));
          }
        }

        // Check for recent actions (latest only to avoid flooding)
        if (bill.latest_action_date && bill.latest_action_description) {
          const actionId = `state-bill-action-${state}-${bill.identifier}-${bill.latest_action_date}`;
          const actionDedupKey = `${nostrConfig.dedupPrefix}${actionId}`;
          const actionPublished = await cache.exists(actionDedupKey);

          if (!actionPublished) {
            const latestAction = bill.actions[0];
            if (latestAction) {
              events.push(buildStateBillAction(bill, latestAction, state));
            }
          }
        }

        // Check for votes
        for (const vote of bill.votes) {
          const voteIdSuffix = vote.id.split('/').pop() ?? vote.id;
          const voteEventId = `state-vote-${state}-${voteIdSuffix}`;
          const voteDedupKey = `${nostrConfig.dedupPrefix}${voteEventId}`;
          const votePublished = await cache.exists(voteDedupKey);

          if (!votePublished) {
            events.push(buildStateVote(bill, vote, state));
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to detect state events for ${state.toUpperCase()}`, error as Error, {
        state,
        operation: 'nostr_publisher',
      });
    }
  }

  return events;
}

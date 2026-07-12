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
  StateStalenessInfo,
} from '@/types/nostr';

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

  const url = `${OPENSTATES_BASE}/bills?jurisdiction=${state}&per_page=${Math.min(limit, 20)}&sort=latest_action_desc&include=sponsorships&include=actions&include=votes`;

  // OpenStates can hang or 504 for 60s+ when degraded; without a timeout,
  // 15 sequential state calls can eat the whole cron budget.
  const response = await fetch(url, {
    headers: {
      'X-API-KEY': apiKey,
      'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
    },
    signal: AbortSignal.timeout(15000),
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

/**
 * Only publish activity this recent. Without this, the first run (and any
 * run after dedup TTL expiry) floods the feed with every action OpenStates
 * returns — over 1,600 events, most of them months old.
 */
const MAX_EVENT_AGE_DAYS = 7;

export function isFreshStateActivity(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const age = Date.now() - new Date(dateStr).getTime();
  return age >= 0 ? age <= MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000 : true;
}

/** Bill identifiers like "AB 181" contain spaces; event ids become URLs (AP note ids), so strip them. */
function idSafeIdentifier(identifier: string): string {
  return identifier.replace(/\s+/g, '');
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
    id: `state-bill-intro-${state}-${idSafeIdentifier(bill.identifier)}-${bill.session}`,
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
    id: `state-bill-action-${state}-${idSafeIdentifier(bill.identifier)}-${action.date}`,
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

/** Staleness threshold: 14 days without updated_at activity */
const STALENESS_THRESHOLD_DAYS = 14;

/** Check staleness for a set of bills */
export function checkStateStaleness(state: string, bills: OpenStatesV3Bill[]): StateStalenessInfo {
  if (bills.length === 0) {
    // No data to judge from — don't flag as stale
    return { state: state.toUpperCase(), stale: false, lastUpdate: null, billsChecked: 0 };
  }

  // Find the most recent updated_at across all bills
  let mostRecentUpdate: Date | null = null;
  for (const bill of bills) {
    const updated = new Date(bill.updated_at);
    if (!mostRecentUpdate || updated > mostRecentUpdate) {
      mostRecentUpdate = updated;
    }
  }

  const daysSinceUpdate = mostRecentUpdate
    ? (Date.now() - mostRecentUpdate.getTime()) / (1000 * 60 * 60 * 24)
    : Infinity;

  const stale = daysSinceUpdate > STALENESS_THRESHOLD_DAYS;

  if (stale) {
    logger.warn(`OpenStates data stale for ${state.toUpperCase()}`, {
      state: state.toUpperCase(),
      lastUpdate: mostRecentUpdate?.toISOString() ?? null,
      daysSinceUpdate: Math.round(daysSinceUpdate),
      operation: 'nostr_publisher',
    });
  }

  return {
    state: state.toUpperCase(),
    stale,
    lastUpdate: mostRecentUpdate?.toISOString() ?? null,
    billsChecked: bills.length,
  };
}

export interface StateEventsWithStaleness {
  events: CivicEvent[];
  staleness: StateStalenessInfo[];
}

/**
 * Detect state legislature events with staleness monitoring.
 *
 * @param deadline Epoch ms; when set, remaining states are skipped once it
 * passes. OpenStates can be slow (60s+ gateway timeouts when degraded), and
 * 15 unbounded sequential calls previously ate the cron's entire 300s budget
 * and killed the run before anything published. Partial results beat none.
 */
export async function detectStateEventsWithStaleness(
  deadline?: number
): Promise<StateEventsWithStaleness> {
  if (!process.env.OPENSTATES_API_KEY) {
    logger.info('OpenStates API key not configured, skipping state events', {
      operation: 'nostr_publisher',
    });
    return { events: [], staleness: [] };
  }

  const cache = getRedisCache();
  const events: CivicEvent[] = [];
  const staleness: StateStalenessInfo[] = [];
  const states = nostrConfig.enabledStates;

  for (const state of states) {
    if (deadline && Date.now() >= deadline) {
      logger.warn('State detection deadline reached, skipping remaining states', {
        statesCompleted: staleness.length,
        statesTotal: states.length,
        operation: 'nostr_publisher',
      });
      break;
    }
    try {
      const bills = await fetchStateBills(state);

      // Check staleness
      staleness.push(checkStateStaleness(state, bills));

      logger.info(`Fetched ${bills.length} state bills for ${state.toUpperCase()}`, {
        state,
        operation: 'nostr_publisher',
      });

      for (const bill of bills) {
        if (bill.first_action_date && isFreshStateActivity(bill.first_action_date)) {
          const introEvent = buildStateBillIntroduced(bill, state);
          const introDedupKey = `${nostrConfig.dedupPrefix}${introEvent.id}`;

          if (!(await cache.exists(introDedupKey))) {
            events.push(introEvent);
          }
        }

        if (
          bill.latest_action_date &&
          bill.latest_action_description &&
          isFreshStateActivity(bill.latest_action_date)
        ) {
          // OpenStates returns actions oldest-first; the latest is last
          const latestAction = bill.actions[bill.actions.length - 1];
          if (latestAction) {
            const actionEvent = buildStateBillAction(bill, latestAction, state);
            const actionDedupKey = `${nostrConfig.dedupPrefix}${actionEvent.id}`;

            if (!(await cache.exists(actionDedupKey))) {
              events.push(actionEvent);
            }
          }
        }

        for (const vote of bill.votes) {
          if (!isFreshStateActivity(vote.start_date)) continue;
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

  return { events, staleness };
}

/** Detect state legislature events across enabled states */
export async function detectStateEvents(deadline?: number): Promise<CivicEvent[]> {
  return (await detectStateEventsWithStaleness(deadline)).events;
}

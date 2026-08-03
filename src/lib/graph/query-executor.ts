/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Graph Query Executor
 *
 * Executes structured queries by:
 * 1. Using filters to get candidate nodes from existing services (no self-fetch)
 * 2. Fetching neighborhoods and filtering edges/nodes per traversals
 * 3. Returning matching subgraph + explanation
 */

import logger from '@/lib/logging/simple-logger';
import { hydrateNeighborhood } from './hydrator';
import { toCanonicalId, formatNodeLabel, normalizeOrgName } from './normalize';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';
import { searchOrganizationNames } from '@/lib/data-sources/lda-corpus/load-filings';
import type { StructuredQuery } from './query-compiler';
import { getStateName } from '@/lib/data/us-states';
import type { GraphNode, GraphEdge } from '@/types/graph';

const BILL_TYPE_SLUGS: Record<string, string> = {
  hr: 'house-bill',
  s: 'senate-bill',
  hres: 'house-resolution',
  sres: 'senate-resolution',
  hjres: 'house-joint-resolution',
  sjres: 'senate-joint-resolution',
  hconres: 'house-concurrent-resolution',
  sconres: 'senate-concurrent-resolution',
};

export interface QueryResult {
  matchingNodes: GraphNode[];
  relatedEdges: GraphEdge[];
  explanation: string;
  truncated: boolean;
}

const MAX_CANDIDATES = 50;

export async function executeQuery(query: StructuredQuery): Promise<QueryResult> {
  logger.info('[Graph:Query] Executing', { find: query.find, traversals: query.traversals.length });

  switch (query.find) {
    case 'representative':
      return executeRepresentativeQuery(query);
    case 'bill':
      return executeBillQuery(query);
    case 'committee':
      return executeCommitteeQuery(query);
    case 'organization':
      return executeOrganizationQuery(query);
    default:
      return {
        matchingNodes: [],
        relatedEdges: [],
        explanation: `Query execution for "${query.find}" type is not yet implemented.`,
        truncated: false,
      };
  }
}

// ── Shared traversal logic ───────────────────────────────────────────

async function hydrateTraversals(
  matchingNodes: GraphNode[],
  query: StructuredQuery
): Promise<GraphEdge[]> {
  if (query.traversals.length === 0 || matchingNodes.length > 10) {
    return [];
  }

  const edgeResults = await Promise.allSettled(
    matchingNodes.map(async node => {
      const nbr = await hydrateNeighborhood(node.id);
      if (!nbr) return [];

      return nbr.edges.filter(edge => {
        for (const traversal of query.traversals) {
          if (edge.type !== traversal.edge) continue;

          const isOutgoing =
            traversal.direction === 'outgoing'
              ? edge.sourceId === node.id
              : edge.targetId === node.id;
          if (!isOutgoing) continue;

          if (traversal.nodeFilter) {
            const otherNodeId = edge.sourceId === node.id ? edge.targetId : edge.sourceId;
            const otherNode = nbr.connectedNodes.find(n => n.id === otherNodeId);
            if (!otherNode) continue;

            const fieldValue = otherNode.properties[traversal.nodeFilter.field];
            if (fieldValue === undefined) continue;

            if (
              traversal.nodeFilter.op === 'contains' &&
              !String(fieldValue)
                .toLowerCase()
                .includes(String(traversal.nodeFilter.value).toLowerCase())
            ) {
              continue;
            }
            if (
              traversal.nodeFilter.op === 'eq' &&
              String(fieldValue).toLowerCase() !== String(traversal.nodeFilter.value).toLowerCase()
            ) {
              continue;
            }
          }

          return true;
        }
        return false;
      });
    })
  );

  return edgeResults
    .filter((r): r is PromiseFulfilledResult<GraphEdge[]> => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ── Human-readable explanation helpers ───────────────────────────────

const TYPE_LABELS: Record<string, { singular: string; plural: string }> = {
  representative: { singular: 'representative', plural: 'representatives' },
  bill: { singular: 'bill', plural: 'bills' },
  committee: { singular: 'committee', plural: 'committees' },
  organization: { singular: 'organization', plural: 'organizations' },
};

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

/** Convert party code to adjective form for natural sentence composition */
function getPartyAdjective(value: string): string {
  const v = value.toLowerCase();
  if (v === 'd' || v === 'democrat' || v === 'democratic') return 'Democratic';
  if (v === 'r' || v === 'republican') return 'Republican';
  if (v === 'i' || v === 'independent') return 'Independent';
  return '';
}

/** Translate a graph traversal into a plain-English sentence */
function humanizeTraversal(edge: string, direction: string): string | null {
  if (edge === 'donated_to') return 'Showing their campaign finance connections';
  if (edge === 'serves_on') return 'Showing their committee assignments';
  if (edge === 'lobbied' && direction === 'incoming')
    return 'Showing organizations that lobbied them';
  if (edge === 'lobbied' && direction === 'outgoing') return 'Showing who they lobbied';
  if (edge === 'voted_on') return 'Showing their voting record';
  if (edge === 'sponsored') return 'Showing bills they sponsored';
  if (edge === 'oversees') return 'Showing agencies under their oversight';
  return null;
}

/** Resolve the correct singular/plural label, absorbing chamber into the type */
function getTypeLabel(
  typeName: string,
  query: StructuredQuery
): { singular: string; plural: string } {
  const base = TYPE_LABELS[typeName] ?? { singular: typeName, plural: `${typeName}s` };
  if (typeName !== 'representative') return base;

  const chamberFilter = query.filters.find(f => f.field === 'chamber');
  if (chamberFilter) {
    const chamber = String(chamberFilter.value).toLowerCase();
    if (chamber === 'senate') return { singular: 'senator', plural: 'senators' };
    if (chamber === 'house') return { singular: 'House member', plural: 'House members' };
  }
  return base;
}

/**
 * Build a citizen-readable explanation from a structured query result.
 *
 * Composes a single natural sentence instead of concatenating filter dumps.
 * Examples:
 *   "2 senators from Texas."
 *   "8 Democratic representatives."
 *   "No Republican senators found from California."
 *   "3 committees matching "armed". Showing their members."
 */
function buildExplanation(
  typeName: string,
  count: number,
  query: StructuredQuery,
  truncated: boolean
): string {
  const labels = getTypeLabel(typeName, query);
  const typeWord = count === 1 ? labels.singular : labels.plural;

  // Party becomes an adjective before the type: "Democratic senators"
  const partyFilter = query.filters.find(f => f.field === 'party');
  const partyAdj = partyFilter ? getPartyAdjective(String(partyFilter.value)) : '';

  // Build the noun phrase: "[count] [party] [type]" or "No [party] [type] found"
  let sentence: string;
  if (count === 0) {
    sentence = `No ${partyAdj ? partyAdj + ' ' : ''}${typeWord} found`;
  } else {
    sentence = `${count} ${partyAdj ? partyAdj + ' ' : ''}${typeWord}`;
  }

  // Append modifier phrases: "from Texas", 'matching "Pelosi"'
  const modifiers: string[] = [];

  const stateFilter = query.filters.find(f => f.field === 'state');
  if (stateFilter) {
    const code = String(stateFilter.value).toUpperCase();
    modifiers.push(`from ${getStateName(code) ?? String(stateFilter.value)}`);
  }

  const textFilter = query.filters.find(f => f.field === 'name' || f.field === 'title');
  if (textFilter) {
    modifiers.push(
      textFilter.op === 'contains'
        ? `matching \u201c${textFilter.value}\u201d`
        : `named \u201c${textFilter.value}\u201d`
    );
  }

  // Fallback for any filter we haven't explicitly humanized
  const handledFields = new Set(['party', 'state', 'name', 'title', 'chamber', 'congress']);
  for (const f of query.filters) {
    if (handledFields.has(f.field)) continue;
    const opLabel =
      f.op === 'contains' ? 'matching' : f.op === 'gt' ? 'above' : f.op === 'lt' ? 'below' : '';
    modifiers.push(`with ${f.field} ${opLabel} \u201c${f.value}\u201d`.replace(/\s{2,}/g, ' '));
  }

  if (modifiers.length > 0) {
    sentence += ' ' + modifiers.join(', ');
  }
  sentence += '.';

  if (truncated) sentence += ' Showing first results.';

  // Traversals become separate follow-up sentences
  for (const t of query.traversals) {
    const readable = humanizeTraversal(t.edge, t.direction);
    if (readable) sentence += ' ' + readable + '.';
  }

  return sentence;
}

/** Apply structured filters to an array of objects with string-keyed fields */
function applyFilters<T>(
  items: T[],
  filters: StructuredQuery['filters'],
  fieldMapper?: (field: string) => keyof T | undefined
): T[] {
  let result = items;
  for (const filter of filters) {
    result = result.filter(item => {
      const key = fieldMapper ? fieldMapper(filter.field) : (filter.field as keyof T);
      if (key === undefined) return true;
      const value = (item as Record<string, unknown>)[key as string];
      if (value === undefined) return true;

      switch (filter.op) {
        case 'eq':
          return String(value).toLowerCase() === String(filter.value).toLowerCase();
        case 'contains':
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'gt':
          return Number(value) > Number(filter.value);
        case 'lt':
          return Number(value) < Number(filter.value);
        default:
          return true;
      }
    });
  }
  return result;
}

// ── Representative query ─────────────────────────────────────────────

async function executeRepresentativeQuery(query: StructuredQuery): Promise<QueryResult> {
  try {
    const allReps = await getAllEnhancedRepresentatives();

    let candidates = applyFilters(
      allReps.map(rep => ({
        bioguideId: rep.bioguideId,
        name: rep.name,
        party: rep.party,
        state: rep.state,
        chamber: rep.chamber as string,
        district: rep.district,
      })),
      query.filters
    );

    const limit = Math.min(query.limit ?? 20, MAX_CANDIDATES);
    const truncated = candidates.length > limit;
    candidates = candidates.slice(0, limit);

    const matchingNodes: GraphNode[] = candidates.map(rep => ({
      id: toCanonicalId('representative', rep.bioguideId),
      type: 'representative' as const,
      label: formatNodeLabel('representative', {
        name: rep.name,
        party: rep.party,
        state: rep.state,
      }),
      properties: {
        name: rep.name,
        party: rep.party,
        state: rep.state,
        chamber: rep.chamber,
        district: rep.district,
        bioguideId: rep.bioguideId,
      },
      dataAsOf: new Date().toISOString(),
      profileUrl: `/representative/${rep.bioguideId}`,
    }));

    const relatedEdges = await hydrateTraversals(matchingNodes, query);

    return {
      matchingNodes,
      relatedEdges,
      explanation: buildExplanation('representative', matchingNodes.length, query, truncated),
      truncated,
    };
  } catch (error) {
    logger.error('[Graph:Query] Representative query failed', error as Error);
    return {
      matchingNodes: [],
      relatedEdges: [],
      explanation: 'Could not fetch representative data.',
      truncated: false,
    };
  }
}

// ── Bill query ───────────────────────────────────────────────────────

interface CongressBillResult {
  congress: number;
  number: number;
  type: string;
  title: string;
  latestAction?: { text: string; actionDate: string };
  updateDate?: string;
}

async function executeBillQuery(query: StructuredQuery): Promise<QueryResult> {
  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      logger.warn('[Graph:Query] CONGRESS_API_KEY not set');
      return {
        matchingNodes: [],
        relatedEdges: [],
        explanation: 'Bill data unavailable (API key not configured).',
        truncated: false,
      };
    }

    const congress = query.filters.find(f => f.field === 'congress')?.value ?? 119;
    const limit = Math.min(query.limit ?? 20, MAX_CANDIDATES);

    // Build URL manually to avoid URLSearchParams encoding '+' as '%2B'
    // Congress.gov API expects 'updateDate+desc' with literal '+'
    const params = [
      `api_key=${encodeURIComponent(apiKey)}`,
      `limit=${limit}`,
      `offset=0`,
      `sort=updateDate+desc`,
      `format=json`,
    ].join('&');
    const url = `https://api.congress.gov/v3/bill/${congress}?${params}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      logger.warn('[Graph:Query] Congress API returned', { status: response.status });
      return {
        matchingNodes: [],
        relatedEdges: [],
        explanation: 'Could not fetch bill data from Congress.gov.',
        truncated: false,
      };
    }

    const data = (await response.json()) as { bills?: CongressBillResult[] };
    let bills = data.bills ?? [];

    // Apply non-congress filters (title, type, number)
    const otherFilters = query.filters.filter(f => f.field !== 'congress');
    if (otherFilters.length > 0) {
      bills = applyFilters(bills, otherFilters, field => {
        if (field === 'title') return 'title';
        if (field === 'type') return 'type';
        if (field === 'number') return 'number';
        return undefined;
      });
    }

    const truncated = bills.length >= limit;

    const matchingNodes: GraphNode[] = bills.map(bill => {
      const billType = bill.type.toLowerCase();
      const identifier = `${bill.congress}-${billType}-${bill.number}`;
      const congressOrdinal = ordinalSuffix(bill.congress);
      const billTypeSlug = BILL_TYPE_SLUGS[billType] ?? billType;
      return {
        id: toCanonicalId('bill', identifier),
        type: 'bill' as const,
        label: formatNodeLabel('bill', {
          title: bill.title,
          number: `${bill.type.toUpperCase()} ${bill.number}`,
        }),
        properties: {
          title: bill.title,
          number: `${bill.type.toUpperCase()} ${bill.number}`,
          congress: bill.congress,
          type: billType,
          latestAction: bill.latestAction?.text,
        },
        dataAsOf: bill.updateDate ?? new Date().toISOString(),
        profileUrl: `/bill/${identifier}`,
        sourceUrl: `https://www.congress.gov/bill/${congressOrdinal}-congress/${billTypeSlug}/${bill.number}`,
        sourceLabel: 'Congress.gov',
      };
    });

    const relatedEdges = await hydrateTraversals(matchingNodes, query);

    return {
      matchingNodes,
      relatedEdges,
      explanation: buildExplanation('bill', matchingNodes.length, query, truncated),
      truncated,
    };
  } catch (error) {
    logger.error('[Graph:Query] Bill query failed', error as Error);
    return {
      matchingNodes: [],
      relatedEdges: [],
      explanation: 'Bill query failed. Please try again.',
      truncated: false,
    };
  }
}

// ── Committee query ──────────────────────────────────────────────────

async function executeCommitteeQuery(query: StructuredQuery): Promise<QueryResult> {
  try {
    type CommitteeCandidate = {
      committeeCode: string;
      committeeName: string;
      chamber: string;
      topics: string[];
    };

    let candidates: CommitteeCandidate[] = ALL_COMMITTEE_MAPPINGS.map(m => ({
      committeeCode: m.committeeCode,
      committeeName: m.committeeName,
      chamber: m.chamber,
      topics: m.topics,
    }));

    // Apply filters — map 'name' to 'committeeName' for the filter engine
    candidates = applyFilters(candidates, query.filters, field => {
      if (field === 'name') return 'committeeName';
      if (field === 'chamber') return 'chamber';
      if (field === 'code') return 'committeeCode';
      return undefined;
    });

    const limit = Math.min(query.limit ?? 20, MAX_CANDIDATES);
    const truncated = candidates.length > limit;
    candidates = candidates.slice(0, limit);

    const matchingNodes: GraphNode[] = candidates.map(c => ({
      id: toCanonicalId('committee', c.committeeCode),
      type: 'committee' as const,
      label: formatNodeLabel('committee', { name: c.committeeName }),
      properties: {
        name: c.committeeName,
        code: c.committeeCode,
        chamber: c.chamber,
        topics: c.topics,
      },
      dataAsOf: new Date().toISOString(),
    }));

    const relatedEdges = await hydrateTraversals(matchingNodes, query);

    return {
      matchingNodes,
      relatedEdges,
      explanation: buildExplanation('committee', matchingNodes.length, query, truncated),
      truncated,
    };
  } catch (error) {
    logger.error('[Graph:Query] Committee query failed', error as Error);
    return {
      matchingNodes: [],
      relatedEdges: [],
      explanation: 'Committee query failed. Please try again.',
      truncated: false,
    };
  }
}

// ── Organization query ───────────────────────────────────────────────

async function executeOrganizationQuery(query: StructuredQuery): Promise<QueryResult> {
  try {
    const nameFilter = query.filters.find(
      f => f.field === 'name' && (f.op === 'contains' || f.op === 'eq')
    );

    if (!nameFilter) {
      return {
        matchingNodes: [],
        relatedEdges: [],
        explanation:
          'Organization queries require a name filter. Try: "organizations named defense".',
        truncated: false,
      };
    }

    // Searched against the corpus dictionaries rather than filing rows. Client
    // and registrant names are dictionary-encoded, so this scans ~22,000 client
    // names and the registrant table without decoding a single filing — where
    // the API path searched the 25 filings of its first page and reported
    // "no organizations named X" for almost every X.
    const limit = Math.min(query.limit ?? 20, MAX_CANDIDATES);
    const searchTerm = String(nameFilter.value);
    const found = await searchOrganizationNames(searchTerm, {
      op: nameFilter.op === 'eq' ? 'eq' : 'contains',
      // Over-fetch so name normalization can collapse variants of the same
      // organization before the limit is applied.
      limit: limit * 4,
    });

    if (!found) {
      return {
        matchingNodes: [],
        relatedEdges: [],
        explanation:
          'Organization search is unavailable — the Senate LDA corpus could not be read.',
        truncated: false,
      };
    }

    // Deduplicate orgs by normalized name, collecting from both registrant and client fields
    const orgMap = new Map<string, { name: string; role: string }>();
    for (const match of found.matches) {
      const key = normalizeOrgName(match.name);
      if (!orgMap.has(key)) orgMap.set(key, { name: match.name, role: match.role });
    }

    const orgs = Array.from(orgMap.entries()).slice(0, limit);
    const truncated = found.total > orgs.length;

    const matchingNodes: GraphNode[] = orgs.map(([normalizedName, org]) => ({
      id: toCanonicalId('organization', normalizedName),
      type: 'organization' as const,
      label: formatNodeLabel('organization', { name: org.name }),
      properties: {
        name: org.name,
        lobbyingRole: org.role,
      },
      dataAsOf: new Date().toISOString(),
      sourceUrl: `https://lda.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(org.name)}`,
      sourceLabel: 'Senate LDA filings',
    }));

    const relatedEdges = await hydrateTraversals(matchingNodes, query);

    return {
      matchingNodes,
      relatedEdges,
      explanation: buildExplanation('organization', matchingNodes.length, query, truncated),
      truncated,
    };
  } catch (error) {
    logger.error('[Graph:Query] Organization query failed', error as Error);
    return {
      matchingNodes: [],
      relatedEdges: [],
      explanation: 'Organization query failed. Please try again.',
      truncated: false,
    };
  }
}

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
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import type { StructuredQuery } from './query-compiler';
import type { GraphNode, GraphEdge } from '@/types/graph';

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

function buildExplanation(
  typeName: string,
  count: number,
  query: StructuredQuery,
  truncated: boolean
): string {
  const filterDesc = query.filters.map(f => `${f.field} ${f.op} "${f.value}"`).join(', ');
  const traversalDesc = query.traversals.map(t => `${t.direction} ${t.edge}`).join(', ');

  return `Found ${count} ${typeName}${count !== 1 ? 's' : ''}${filterDesc ? ` matching ${filterDesc}` : ''}${traversalDesc ? ` with ${traversalDesc}` : ''}.${truncated ? ' Results truncated.' : ''}`;
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

    const filings = await senateLobbyingAPI.fetchRecentFilings();
    const searchTerm = String(nameFilter.value).toLowerCase();

    // Deduplicate orgs by normalized name, collecting from both registrant and client fields
    const orgMap = new Map<string, { name: string; role: string }>();

    for (const filing of filings) {
      const registrantName = filing.registrant.name;
      const clientName = filing.client.name;

      if (
        nameFilter.op === 'contains'
          ? registrantName.toLowerCase().includes(searchTerm)
          : registrantName.toLowerCase() === searchTerm
      ) {
        const key = normalizeOrgName(registrantName);
        if (!orgMap.has(key)) {
          orgMap.set(key, { name: registrantName, role: 'registrant' });
        }
      }

      if (
        nameFilter.op === 'contains'
          ? clientName.toLowerCase().includes(searchTerm)
          : clientName.toLowerCase() === searchTerm
      ) {
        const key = normalizeOrgName(clientName);
        if (!orgMap.has(key)) {
          orgMap.set(key, { name: clientName, role: 'client' });
        }
      }
    }

    const limit = Math.min(query.limit ?? 20, MAX_CANDIDATES);
    const orgs = Array.from(orgMap.entries()).slice(0, limit);
    const truncated = orgMap.size > limit;

    const matchingNodes: GraphNode[] = orgs.map(([normalizedName, org]) => ({
      id: toCanonicalId('organization', normalizedName),
      type: 'organization' as const,
      label: formatNodeLabel('organization', { name: org.name }),
      properties: {
        name: org.name,
        lobbyingRole: org.role,
      },
      dataAsOf: new Date().toISOString(),
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

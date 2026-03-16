/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import type { GraphNode, GraphEdge } from '@/types/graph';

// ── Formatting helpers ──────────────────────────────────────────────

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

const PARTY_NAMES: Record<string, string> = {
  D: 'Democrat',
  R: 'Republican',
  I: 'Independent',
};

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
  PR: 'Puerto Rico',
  GU: 'Guam',
  VI: 'U.S. Virgin Islands',
  AS: 'American Samoa',
  MP: 'Northern Mariana Islands',
};

const SKIP_KEYS = new Set(['name', 'bioguideId', 'imageUrl']);

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

function formatConfidence(value: number): string {
  const pct = Math.round(value * 100);
  const level = pct >= 80 ? 'High' : pct >= 50 ? 'Medium' : 'Low';
  return `${level} confidence (${pct}%)`;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function formatProperty(
  key: string,
  value: unknown,
  _nodeType: string
): { label: string; display: string } | null {
  if (SKIP_KEYS.has(key)) return null;
  if (value === undefined || value === null) return null;

  switch (key) {
    case 'totalAmount':
    case 'amount':
      return {
        label: key === 'totalAmount' ? 'Total' : 'Amount',
        display: formatCompact(Number(value)),
      };
    case 'contributionCount':
      return {
        label: 'Contributions',
        display: `${Number(value)} individual contributions`,
      };
    case 'party':
      return {
        label: 'Party',
        display: PARTY_NAMES[String(value)] ?? String(value),
      };
    case 'state':
      return {
        label: 'State',
        display: STATE_NAMES[String(value)] ?? String(value),
      };
    case 'chamber': {
      const ch = String(value).toLowerCase();
      const display =
        ch === 'house' ? 'U.S. House' : ch === 'senate' ? 'U.S. Senate' : String(value);
      return { label: 'Chamber', display };
    }
    case 'congress':
      return {
        label: 'Congress',
        display: `${ordinalSuffix(Number(value))} Congress`,
      };
    case 'confidence':
      return {
        label: 'Confidence',
        display: formatConfidence(Number(value)),
      };
    case 'vote':
    case 'position': {
      const v = String(value).toLowerCase();
      const display =
        v === 'yes' || v === 'yea'
          ? 'Voted Yes'
          : v === 'no' || v === 'nay'
            ? 'Voted No'
            : v === 'not voting' || v === 'present'
              ? 'Not Voting'
              : String(value);
      return { label: 'Vote', display };
    }
    case 'lobbyingSpending':
    case 'spending':
      return {
        label: 'Lobbying',
        display: `${formatCompact(Number(value))} in lobbying`,
      };
    case 'district':
      return { label: 'District', display: String(value) };
    default:
      return {
        label: humanizeKey(key),
        display: String(value),
      };
  }
}

// ── Empty-state messaging ───────────────────────────────────────────

function getEmptyStateMessages(node: GraphNode, connectedEdges: GraphEdge[]): string[] {
  const messages: string[] = [];

  // If node has no edges at all, it likely hasn't been expanded yet
  if (connectedEdges.length === 0) {
    if (node.type === 'organization') {
      messages.push(
        'Limited public records found for this organization. Try searching by a different name variation.'
      );
    } else {
      messages.push("No connections found. Double-click to expand this node's network.");
    }
    return messages;
  }

  // Node has been hydrated — show type-specific messages for missing data sources
  const edgeTypes = new Set(connectedEdges.map(e => e.type));

  if (node.type === 'representative') {
    if (!edgeTypes.has('donated_to')) {
      messages.push('No FEC contribution data available for the current election cycle.');
    }
    if (!edgeTypes.has('voted_on')) {
      messages.push('Vote records are updated daily. Recent votes may not yet be available.');
    }
  }

  if (node.type === 'committee' && !edgeTypes.has('lobbied')) {
    messages.push('No lobbying filings found matching this committee in Senate LDA records.');
  }

  return messages;
}

// ── Edge grouping ───────────────────────────────────────────────────

const EDGE_GROUP_LABELS: Record<string, string> = {
  donated_to: 'Campaign Finance',
  lobbied: 'Lobbying',
  lobbying_matches: 'Lobbying',
  voted_on: 'Legislative Activity',
  sponsored: 'Legislative Activity',
  serves_on: 'Committee Work',
  in_sector: 'Sector Connections',
  affects_sector: 'Sector Connections',
};

function groupEdgesByCategory(edgeList: GraphEdge[]): Map<string, GraphEdge[]> {
  const groups = new Map<string, GraphEdge[]>();
  for (const edge of edgeList) {
    const label = EDGE_GROUP_LABELS[edge.type] ?? 'Other Connections';
    const group = groups.get(label);
    if (group) {
      group.push(edge);
    } else {
      groups.set(label, [edge]);
    }
  }
  return groups;
}

// ── Components ──────────────────────────────────────────────────────

interface GraphSidebarProps {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
}

export function GraphSidebar({ selectedNodeId, selectedEdgeId, nodes, edges }: GraphSidebarProps) {
  const selectedNode = selectedNodeId ? (nodes.get(selectedNodeId) ?? null) : null;
  const selectedEdge = selectedEdgeId ? (edges.get(selectedEdgeId) ?? null) : null;

  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="border-2 border-gray-200 dark:border-gray-700 p-4">
        <p className="type-sm text-gray-500">Select a node or edge to view details.</p>
      </aside>
    );
  }

  if (selectedNode) {
    return (
      <aside className="border-2 border-gray-200 dark:border-gray-700 p-4">
        <NodeDetail node={selectedNode} edges={edges} />
      </aside>
    );
  }

  if (selectedEdge) {
    return (
      <aside className="border-2 border-gray-200 dark:border-gray-700 p-4">
        <EdgeDetail edge={selectedEdge} nodes={nodes} />
      </aside>
    );
  }

  return null;
}

function NodeDetail({ node, edges }: { node: GraphNode; edges: Map<string, GraphEdge> }) {
  const connectedEdges = Array.from(edges.values()).filter(
    e => e.sourceId === node.id || e.targetId === node.id
  );

  const formattedProperties = Object.entries(node.properties)
    .map(([key, value]) => formatProperty(key, value, node.type))
    .filter((p): p is { label: string; display: string } => p !== null);

  const emptyMessages = getEmptyStateMessages(node, connectedEdges);
  const edgeGroups = groupEdgesByCategory(connectedEdges);

  return (
    <div>
      <div className="mb-4">
        <span className="type-xs text-gray-500 uppercase">{node.type}</span>
        <h3 className="aicher-heading text-lg">{node.label}</h3>
      </div>

      {node.profileUrl && (
        <a href={node.profileUrl} className="type-sm text-[#3ea2d4] hover:underline block mb-4">
          View full profile
        </a>
      )}

      {/* Properties */}
      {formattedProperties.length > 0 && (
        <div className="space-y-2 mb-4">
          {formattedProperties.map(({ label, display }) => (
            <div key={label} className="flex justify-between gap-2">
              <span className="type-xs text-gray-500">{label}</span>
              <span className="type-xs text-right">{display}</span>
            </div>
          ))}
        </div>
      )}

      {/* Connected edges grouped by category */}
      <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="type-xs font-bold text-gray-500 mb-2">
          {connectedEdges.length} connection{connectedEdges.length !== 1 ? 's' : ''}
        </h4>
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {Array.from(edgeGroups.entries()).map(([groupLabel, groupEdges]) => (
            <div key={groupLabel}>
              <h5 className="type-xs font-bold text-gray-400 uppercase mb-1">{groupLabel}</h5>
              <div className="space-y-1">
                {groupEdges.slice(0, 20).map(edge => (
                  <div key={edge.id} className="type-xs text-gray-600 dark:text-gray-400 truncate">
                    {edge.label}
                  </div>
                ))}
                {groupEdges.length > 20 && (
                  <p className="type-xs text-gray-400">+{groupEdges.length - 20} more</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty-state messages */}
      {emptyMessages.length > 0 && (
        <div>
          {emptyMessages.map((msg, i) => (
            <div key={i} className="border-2 border-gray-200 dark:border-gray-700 p-2 mt-2">
              <p className="type-xs text-gray-500">{msg}</p>
            </div>
          ))}
        </div>
      )}

      <p className="type-xs text-gray-400 mt-4">
        Data as of {new Date(node.dataAsOf).toLocaleDateString()}
      </p>
    </div>
  );
}

function EdgeDetail({ edge, nodes }: { edge: GraphEdge; nodes: Map<string, GraphNode> }) {
  const source = nodes.get(edge.sourceId);
  const target = nodes.get(edge.targetId);

  return (
    <div>
      <div className="mb-4">
        <span className="type-xs text-gray-500 uppercase">{edge.type.replace(/_/g, ' ')}</span>
        <h3 className="aicher-heading text-lg">{edge.label}</h3>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="type-xs text-gray-500">From</span>
          <span className="type-xs">{source?.label ?? edge.sourceId}</span>
        </div>
        <div className="flex justify-between">
          <span className="type-xs text-gray-500">To</span>
          <span className="type-xs">{target?.label ?? edge.targetId}</span>
        </div>
        <div className="flex justify-between">
          <span className="type-xs text-gray-500">Confidence</span>
          <span
            className={`type-xs font-bold ${
              edge.confidence >= 0.8
                ? 'text-[#0a9338]'
                : edge.confidence >= 0.6
                  ? 'text-[#d97706]'
                  : 'text-[#e11d07]'
            }`}
          >
            {(edge.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <div className="flex justify-between">
          <span className="type-xs text-gray-500">Weight</span>
          <span className="type-xs">{edge.weight.toFixed(2)}</span>
        </div>
      </div>

      {/* Properties */}
      <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 space-y-2">
        {Object.entries(edge.properties).map(([key, value]) => {
          if (value === undefined || value === null) return null;
          const displayValue =
            typeof value === 'number' && key.includes('amount')
              ? `$${value.toLocaleString()}`
              : String(value);
          return (
            <div key={key} className="flex justify-between gap-2">
              <span className="type-xs text-gray-500 capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </span>
              <span className="type-xs text-right">{displayValue}</span>
            </div>
          );
        })}
      </div>

      {edge.temporal && (
        <div className="border-t-2 border-gray-200 dark:border-gray-700 pt-4 mt-4">
          <div className="flex justify-between">
            <span className="type-xs text-gray-500">Date</span>
            <span className="type-xs">{edge.temporal.date}</span>
          </div>
          {edge.temporal.period && (
            <div className="flex justify-between">
              <span className="type-xs text-gray-500">Period</span>
              <span className="type-xs">{edge.temporal.period}</span>
            </div>
          )}
        </div>
      )}

      <p className="type-xs text-gray-400 mt-4">
        Data as of {new Date(edge.dataAsOf).toLocaleDateString()}
      </p>
    </div>
  );
}

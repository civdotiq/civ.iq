/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { getStateName } from '@/lib/data/us-states';
import type { GraphNode, GraphEdge, GraphEdgeType } from '@/types/graph';

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

const SKIP_KEYS = new Set([
  'name',
  'bioguideId',
  'imageUrl',
  'code',
  'committeeCode',
  'fecCandidateId',
]);

function ordinalSuffix(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const mod10 = n % 10;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim();
}

function formatProperty(key: string, value: unknown): { label: string; display: string } | null {
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
      return { label: 'Contributions', display: `${Number(value)} individual contributions` };
    case 'party':
      return { label: 'Party', display: PARTY_NAMES[String(value)] ?? String(value) };
    case 'state':
      return { label: 'State', display: getStateName(String(value)) ?? String(value) };
    case 'chamber': {
      const ch = String(value).toLowerCase();
      const display =
        ch === 'house' ? 'U.S. House' : ch === 'senate' ? 'U.S. Senate' : String(value);
      return { label: 'Chamber', display };
    }
    case 'congress':
      return { label: 'Congress', display: `${ordinalSuffix(Number(value))} Congress` };
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
      return { label: 'Lobbying', display: `${formatCompact(Number(value))} in lobbying` };
    case 'district':
      return { label: 'District', display: `District ${String(value)}` };
    case 'jurisdiction':
      return { label: 'Jurisdiction', display: String(value) };
    case 'role':
      return { label: 'Role', display: String(value) };
    default:
      return { label: humanizeKey(key), display: String(value) };
  }
}

// ── Confidence explanations per edge type ────────────────────────────

const CONFIDENCE_EXPLANATIONS: Record<GraphEdgeType, string> = {
  donated_to: 'Employer names from FEC individual contribution filings.',
  lobbied: 'Registrant/client name matched in Senate LDA filings.',
  serves_on: 'Official committee membership from Congress.gov.',
  voted_on: 'Official roll call vote from Congressional record.',
  sponsored: 'Official bill sponsorship from Congress.gov.',
  oversees: 'Based on statutory oversight jurisdiction.',
  awarded_contract: 'USASpending.gov federal award records.',
  affects_sector: 'ML classification of bill subject matter.',
  in_sector: 'Keyword-based industry classification.',
  traded_stock: 'Congressional financial disclosure filings.',
  regulates: 'Federal Register rulemaking records.',
  lobbying_matches: 'Text similarity between lobbying issues and legislation.',
  referred_to: 'Official committee referral from Congress.gov.',
  employs_donor: 'FEC employer field matching.',
  located_in_district: 'Geocoded facility address matched to congressional district.',
  violates_regulation: 'EPA ECHO enforcement and compliance records.',
  receives_grant: 'USASpending.gov federal grant award records.',
  complained_against: 'CFPB consumer complaint database records.',
  declared_in: 'FEMA disaster declaration records.',
};

// ── Empty-state messaging ───────────────────────────────────────────

function getEmptyStateMessages(node: GraphNode, connectedEdges: GraphEdge[]): string[] {
  const messages: string[] = [];

  if (connectedEdges.length === 0) {
    if (node.type === 'organization') {
      messages.push(
        'Limited public records found for this organization. Try searching by a different name variation.'
      );
    } else {
      messages.push('No connections found yet. Double-click to load more data.');
    }
    return messages;
  }

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

// ── Human-friendly type labels ──────────────────────────────────────

const NODE_TYPE_LABELS: Record<string, string> = {
  representative: 'Elected Official',
  bill: 'Legislation',
  committee: 'Congressional Committee',
  agency: 'Government Agency',
  organization: 'Organization',
  sector: 'Industry Sector',
  contract: 'Federal Contract',
  regulation: 'Regulation',
};

// ── Edge grouping ───────────────────────────────────────────────────

const EDGE_GROUP_LABELS: Record<string, string> = {
  donated_to: 'Money In',
  lobbied: 'Lobbying',
  lobbying_matches: 'Lobbying',
  voted_on: 'Voting Record',
  sponsored: 'Bills Sponsored',
  serves_on: 'Committees',
  in_sector: 'Industry Ties',
  affects_sector: 'Industry Ties',
  oversees: 'Oversight Power',
  referred_to: 'Bills Sponsored',
  awarded_contract: 'Federal Contracts',
  traded_stock: 'Stock Trades',
  regulates: 'Rulemaking',
  employs_donor: 'Money In',
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

// ── Shared sub-components ───────────────────────────────────────────

function SourceLink({ url, label }: { url?: string; label?: string }) {
  if (!url && !label) return null;

  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 type-xs text-[#3ea2d4] hover:underline"
      >
        {label ?? 'Source'}
        <ExternalLink className="w-3 h-3" />
      </a>
    );
  }

  return <span className="type-xs text-gray-400">{label}</span>;
}

function ConfidenceBadge({ value, edgeType }: { value: number; edgeType: GraphEdgeType }) {
  const pct = Math.round(value * 100);
  const level = pct >= 80 ? 'High' : pct >= 50 ? 'Medium' : 'Low';
  const colorClass = pct >= 80 ? 'text-[#0a9338]' : pct >= 50 ? 'text-[#d97706]' : 'text-[#e11d07]';

  const explanation = CONFIDENCE_EXPLANATIONS[edgeType];

  return (
    <div>
      <div className="flex justify-between items-baseline">
        <span className="type-xs text-gray-500">Data confidence</span>
        <span className={`type-xs font-bold ${colorClass}`}>
          {level} ({pct}%)
        </span>
      </div>
      {explanation && <p className="type-xs text-gray-400 mt-1">{explanation}</p>}
    </div>
  );
}

function NodeLink({
  node,
  onSelectNode,
}: {
  node: GraphNode | undefined;
  onSelectNode?: (id: string) => void;
}) {
  if (!node) return null;

  return (
    <button
      onClick={() => onSelectNode?.(node.id)}
      className="type-xs text-[#3ea2d4] hover:underline text-left"
      title={`Select ${node.label} in graph`}
    >
      {node.label}
    </button>
  );
}

// ── Correlation disclaimer ──────────────────────────────────────────

const MONEY_EDGE_TYPES = new Set<GraphEdgeType>(['donated_to', 'lobbied', 'employs_donor']);

function hasMoneyAndVotes(edges: GraphEdge[]): boolean {
  let hasMoney = false;
  let hasVotes = false;
  for (const e of edges) {
    if (MONEY_EDGE_TYPES.has(e.type)) hasMoney = true;
    if (e.type === 'voted_on') hasVotes = true;
    if (hasMoney && hasVotes) return true;
  }
  return false;
}

// ── Plain-language summary ───────────────────────────────────────────

interface EdgeCounts {
  donations: number;
  lobbying: number;
  votes: number;
  sponsors: number;
  committees: number;
  contracts: number;
  stocks: number;
  donationTotal: number;
  yeas: number;
  nays: number;
}

function countEdges(connectedEdges: GraphEdge[]): EdgeCounts {
  const c: EdgeCounts = {
    donations: 0,
    lobbying: 0,
    votes: 0,
    sponsors: 0,
    committees: 0,
    contracts: 0,
    stocks: 0,
    donationTotal: 0,
    yeas: 0,
    nays: 0,
  };
  for (const e of connectedEdges) {
    switch (e.type) {
      case 'donated_to':
      case 'employs_donor':
        c.donations++;
        c.donationTotal += Number(e.properties.totalAmount ?? e.properties.amount ?? 0);
        break;
      case 'lobbied':
      case 'lobbying_matches':
        c.lobbying++;
        break;
      case 'voted_on': {
        c.votes++;
        const pos = String(e.properties.position ?? '').toLowerCase();
        if (pos === 'yes' || pos === 'yea') c.yeas++;
        else if (pos === 'no' || pos === 'nay') c.nays++;
        break;
      }
      case 'sponsored':
        c.sponsors++;
        break;
      case 'serves_on':
        c.committees++;
        break;
      case 'awarded_contract':
        c.contracts++;
        break;
      case 'traded_stock':
        c.stocks++;
        break;
    }
  }
  return c;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n !== 1 ? 's' : ''}`;
}

function generateSummary(node: GraphNode, connectedEdges: GraphEdge[]): string[] {
  if (connectedEdges.length === 0) {
    return ['No public connections found yet. Double-click to load more data.'];
  }

  const c = countEdges(connectedEdges);
  const summary: string[] = [];

  if (node.type === 'representative') {
    const name = node.properties.name as string | undefined;
    const firstName =
      name?.split(',')[1]?.trim()?.split(' ')[0] ?? name?.split(' ')[0] ?? 'This official';

    if (c.donations > 0) {
      const amountStr = c.donationTotal > 0 ? ` totaling ${formatCompact(c.donationTotal)}` : '';
      summary.push(
        `Received campaign contributions from ${plural(c.donations, 'source')}${amountStr}.`
      );
    }
    if (c.lobbying > 0)
      summary.push(`Connected to ${plural(c.lobbying, 'lobbying relationship')}.`);
    if (c.committees > 0) summary.push(`Serves on ${plural(c.committees, 'committee')}.`);
    if (c.votes > 0)
      summary.push(`${plural(c.votes, 'recorded vote')} shown (${c.yeas} yes, ${c.nays} no).`);
    if (c.sponsors > 0) summary.push(`Sponsored or co-sponsored ${plural(c.sponsors, 'bill')}.`);
    if (c.stocks > 0) summary.push(`${plural(c.stocks, 'stock trade')} disclosed.`);
    if (c.contracts > 0)
      summary.push(`${plural(c.contracts, 'federal contract')} in ${firstName}'s district.`);
  } else if (node.type === 'committee') {
    if (c.committees > 0) summary.push(`${plural(c.committees, 'member')} shown.`);
    if (c.lobbying > 0) summary.push(`Targeted by ${plural(c.lobbying, 'lobbying effort')}.`);
  } else if (node.type === 'organization') {
    if (c.donations > 0) summary.push(`Employees donated to ${plural(c.donations, 'official')}.`);
    if (c.lobbying > 0) summary.push(`Filed ${plural(c.lobbying, 'lobbying disclosure')}.`);
    if (c.contracts > 0) summary.push(`Received ${plural(c.contracts, 'federal contract')}.`);
  } else if (node.type === 'bill') {
    if (c.sponsors > 0) summary.push(`${plural(c.sponsors, 'sponsor')}.`);
    if (c.votes > 0) summary.push(`${plural(c.votes, 'recorded vote')}.`);
  } else {
    summary.push(`${plural(connectedEdges.length, 'connection')} found.`);
  }

  return summary;
}

// ── Main Components ─────────────────────────────────────────────────

export interface GraphSidebarProps {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge>;
  onSelectNode?: (id: string) => void;
  onExpandNode?: (id: string) => void;
}

export function GraphSidebar({
  selectedNodeId,
  selectedEdgeId,
  nodes,
  edges,
  onSelectNode,
  onExpandNode,
}: GraphSidebarProps) {
  const selectedNode = selectedNodeId ? (nodes.get(selectedNodeId) ?? null) : null;
  const selectedEdge = selectedEdgeId ? (edges.get(selectedEdgeId) ?? null) : null;

  if (!selectedNode && !selectedEdge) {
    return (
      <aside className="border-2 border-gray-200 dark:border-gray-700 p-4">
        <h3 className="type-sm font-bold mb-2">How to use this tool</h3>
        <ol className="space-y-2 type-xs text-gray-600 dark:text-gray-400">
          <li>
            <span className="font-bold text-gray-800 dark:text-gray-200">1.</span> Search for any
            elected official, committee, or organization above.
          </li>
          <li>
            <span className="font-bold text-gray-800 dark:text-gray-200">2.</span> Click any shape
            in the graph to see who they are and how they connect.
          </li>
          <li>
            <span className="font-bold text-gray-800 dark:text-gray-200">3.</span> Double-click to
            expand and see more of their network.
          </li>
        </ol>
        <p className="type-xs text-gray-400 mt-4">All data comes from official public records.</p>
      </aside>
    );
  }

  if (selectedNode) {
    return (
      <aside className="border-2 border-gray-200 dark:border-gray-700 p-4 overflow-y-auto max-h-[80vh]">
        <NodeDetail
          node={selectedNode}
          edges={edges}
          nodes={nodes}
          onSelectNode={onSelectNode}
          onExpandNode={onExpandNode}
        />
      </aside>
    );
  }

  if (selectedEdge) {
    return (
      <aside className="border-2 border-gray-200 dark:border-gray-700 p-4 overflow-y-auto max-h-[80vh]">
        <EdgeDetail edge={selectedEdge} nodes={nodes} onSelectNode={onSelectNode} />
      </aside>
    );
  }

  return null;
}

// ── Node Detail ─────────────────────────────────────────────────────

function NodeDetail({
  node,
  edges,
  nodes,
  onSelectNode,
  onExpandNode,
}: {
  node: GraphNode;
  edges: Map<string, GraphEdge>;
  nodes: Map<string, GraphNode>;
  onSelectNode?: (id: string) => void;
  onExpandNode?: (id: string) => void;
}) {
  const connectedEdges = Array.from(edges.values()).filter(
    e => e.sourceId === node.id || e.targetId === node.id
  );

  const formattedProperties = Object.entries(node.properties)
    .map(([key, value]) => formatProperty(key, value))
    .filter((p): p is { label: string; display: string } => p !== null);

  const emptyMessages = getEmptyStateMessages(node, connectedEdges);
  const edgeGroups = groupEdgesByCategory(connectedEdges);
  const showDisclaimer = hasMoneyAndVotes(connectedEdges);
  const summaryLines = generateSummary(node, connectedEdges);

  const typeLabel = NODE_TYPE_LABELS[node.type] ?? node.type;

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <span className="type-xs text-gray-500 uppercase tracking-wide">{typeLabel}</span>
        <h3 className="aicher-heading text-lg leading-tight">{node.label}</h3>

        {/* Links row */}
        <div className="flex flex-wrap gap-3 mt-2">
          {node.profileUrl && (
            <a
              href={node.profileUrl}
              className="inline-flex items-center gap-1 type-xs text-[#3ea2d4] hover:underline font-bold"
            >
              View full profile
            </a>
          )}
          {node.sourceUrl && (
            <a
              href={node.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 type-xs text-[#3ea2d4] hover:underline"
            >
              {node.sourceLabel ?? 'View source'}
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* Properties */}
      {formattedProperties.length > 0 && (
        <div className="space-y-1 mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
          {formattedProperties.map(({ label, display }) => (
            <div key={label} className="flex justify-between gap-2">
              <span className="type-xs text-gray-500">{label}</span>
              <span className="type-xs text-right font-medium">{display}</span>
            </div>
          ))}
        </div>
      )}

      {/* Plain-language summary — the hero section */}
      {summaryLines.length > 0 && (
        <div className="mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
          <h4 className="type-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            At a glance
          </h4>
          <ul className="space-y-1.5">
            {summaryLines.map((line, i) => (
              <li key={i} className="type-sm text-gray-800 dark:text-gray-200">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Collapsible connection groups */}
      <div className="space-y-1">
        {Array.from(edgeGroups.entries()).map(([groupLabel, groupEdges]) => (
          <CollapsibleGroup
            key={groupLabel}
            label={groupLabel}
            count={groupEdges.length}
            edges={groupEdges}
            centerNodeId={node.id}
            nodes={nodes}
            onSelectNode={onSelectNode}
          />
        ))}
      </div>

      {/* Expand button */}
      {onExpandNode && (
        <button
          onClick={() => onExpandNode(node.id)}
          className="w-full mt-4 py-2 type-xs font-bold border-2 border-[#3ea2d4] text-[#3ea2d4] hover:bg-[#3ea2d4] hover:text-white transition-colors"
        >
          Show more connections
        </button>
      )}

      {/* Empty-state messages */}
      {emptyMessages.length > 0 && (
        <div className="mt-4">
          {emptyMessages.map((msg, i) => (
            <div key={i} className="border-2 border-gray-200 dark:border-gray-700 p-2 mt-2">
              <p className="type-xs text-gray-500">{msg}</p>
            </div>
          ))}
        </div>
      )}

      {/* Correlation disclaimer */}
      {showDisclaimer && (
        <div className="mt-4 p-2 border-2 border-[#d97706] bg-amber-50 dark:bg-amber-950">
          <p className="type-xs text-[#d97706] font-bold mb-1">Correlation, not causation</p>
          <p className="type-xs text-gray-600 dark:text-gray-400">
            Donation patterns shown alongside voting records do not establish that contributions
            influenced any vote. Many factors determine legislative decisions.
          </p>
        </div>
      )}

      <p className="type-xs text-gray-400 mt-4">
        Data as of {new Date(node.dataAsOf).toLocaleDateString()}
      </p>
    </div>
  );
}

// ── Collapsible Connection Group ─────────────────────────────────────

function CollapsibleGroup({
  label,
  count,
  edges: groupEdges,
  centerNodeId,
  nodes,
  onSelectNode,
}: {
  label: string;
  count: number;
  edges: GraphEdge[];
  centerNodeId: string;
  nodes: Map<string, GraphNode>;
  onSelectNode?: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-2 border-gray-100 dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
      >
        <span className="type-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>
        <span className="flex items-center gap-1">
          <span className="type-xs text-gray-400">{count}</span>
          {isOpen ? (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {groupEdges.slice(0, 15).map(edge => {
            const otherNodeId = edge.sourceId === centerNodeId ? edge.targetId : edge.sourceId;
            const otherNode = nodes.get(otherNodeId);

            return (
              <div
                key={edge.id}
                className="px-3 py-2 border-b border-gray-50 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <p className="type-xs font-medium text-gray-800 dark:text-gray-200">{edge.label}</p>
                {otherNode && (
                  <div className="mt-0.5 flex items-center gap-2">
                    <button
                      onClick={() => onSelectNode?.(otherNode.id)}
                      className="type-xs text-[#3ea2d4] hover:underline text-left"
                    >
                      {otherNode.label}
                    </button>
                    {otherNode.profileUrl && (
                      <a
                        href={otherNode.profileUrl}
                        className="type-xs text-gray-400 hover:text-[#3ea2d4]"
                      >
                        (profile)
                      </a>
                    )}
                  </div>
                )}
                <div className="mt-0.5">
                  <SourceLink url={edge.sourceUrl} label={edge.sourceLabel} />
                </div>
              </div>
            );
          })}
          {groupEdges.length > 15 && (
            <p className="px-3 py-2 type-xs text-gray-400">+{groupEdges.length - 15} more</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Edge Detail ─────────────────────────────────────────────────────

function EdgeDetail({
  edge,
  nodes,
  onSelectNode,
}: {
  edge: GraphEdge;
  nodes: Map<string, GraphNode>;
  onSelectNode?: (id: string) => void;
}) {
  const source = nodes.get(edge.sourceId);
  const target = nodes.get(edge.targetId);

  // Format edge properties for display, excluding internal keys
  const skipEdgeKeys = new Set([
    'committeeId',
    'committeeName',
    'cycle',
    'matchSource',
    'matchedKeyword',
  ]);
  const edgeProperties = Object.entries(edge.properties)
    .filter(([key, value]) => !skipEdgeKeys.has(key) && value !== undefined && value !== null)
    .map(([key, value]) => {
      if (
        typeof value === 'number' &&
        (key.includes('amount') || key.includes('spending') || key === 'totalOrgSpending')
      ) {
        return { label: humanizeKey(key), display: formatCompact(value) };
      }
      if (key === 'issueCodes' && Array.isArray(value)) {
        return value.length > 0 ? { label: 'Issue areas', display: value.join(', ') } : null;
      }
      if (key === 'position') {
        const v = String(value).toLowerCase();
        const display =
          v === 'yes' || v === 'yea'
            ? 'Voted Yes'
            : v === 'no' || v === 'nay'
              ? 'Voted No'
              : String(value);
        return { label: 'Position', display };
      }
      if (key === 'contributionCount') {
        return { label: 'Contributions', display: `${value} individual contributions` };
      }
      if (key === 'transactionCount') {
        return { label: 'Transactions', display: `${value} transactions` };
      }
      if (key === 'filingCount') {
        return { label: 'Filings', display: `${value} filings` };
      }
      return { label: humanizeKey(key), display: String(value) };
    })
    .filter((p): p is { label: string; display: string } => p !== null);

  return (
    <div>
      {/* Header */}
      <div className="mb-4">
        <span className="type-xs text-gray-500 uppercase tracking-wide">
          {edge.type.replace(/_/g, ' ')}
        </span>
        <h3 className="aicher-heading text-lg leading-tight">{edge.label}</h3>
      </div>

      {/* Source and Target — clickable to navigate graph */}
      <div className="space-y-2 mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-start gap-2">
          <span className="type-xs text-gray-500 shrink-0">From</span>
          <div className="text-right">
            <NodeLink node={source} onSelectNode={onSelectNode} />
            {source?.profileUrl && (
              <a
                href={source.profileUrl}
                className="type-xs text-gray-400 hover:text-[#3ea2d4] ml-1"
              >
                (profile)
              </a>
            )}
          </div>
        </div>
        <div className="flex justify-between items-start gap-2">
          <span className="type-xs text-gray-500 shrink-0">To</span>
          <div className="text-right">
            <NodeLink node={target} onSelectNode={onSelectNode} />
            {target?.profileUrl && (
              <a
                href={target.profileUrl}
                className="type-xs text-gray-400 hover:text-[#3ea2d4] ml-1"
              >
                (profile)
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Properties */}
      {edgeProperties.length > 0 && (
        <div className="space-y-1 mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
          {edgeProperties.map(({ label, display }) => (
            <div key={label} className="flex justify-between gap-2">
              <span className="type-xs text-gray-500">{label}</span>
              <span className="type-xs text-right font-medium">{display}</span>
            </div>
          ))}
        </div>
      )}

      {/* Temporal context */}
      {edge.temporal && (
        <div className="mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
          <div className="flex justify-between">
            <span className="type-xs text-gray-500">Date</span>
            <span className="type-xs font-medium">{edge.temporal.date}</span>
          </div>
          {edge.temporal.period && (
            <div className="flex justify-between">
              <span className="type-xs text-gray-500">Period</span>
              <span className="type-xs font-medium">{edge.temporal.period}</span>
            </div>
          )}
        </div>
      )}

      {/* Confidence with explanation */}
      <div className="mb-4 pb-4 border-b-2 border-gray-200 dark:border-gray-700">
        <ConfidenceBadge value={edge.confidence} edgeType={edge.type} />
      </div>

      {/* Source attribution */}
      <div className="mb-4">
        <span className="type-xs text-gray-500 block mb-1">Data source</span>
        <SourceLink url={edge.sourceUrl} label={edge.sourceLabel} />
      </div>

      {/* Correlation disclaimer for money edges */}
      {MONEY_EDGE_TYPES.has(edge.type) && (
        <div className="p-2 border-2 border-[#d97706] bg-amber-50 dark:bg-amber-950 mb-4">
          <p className="type-xs text-[#d97706] font-bold mb-1">Correlation, not causation</p>
          <p className="type-xs text-gray-600 dark:text-gray-400">
            Financial relationships do not establish that money influenced any legislative action.
          </p>
        </div>
      )}

      <p className="type-xs text-gray-400">
        Data as of {new Date(edge.dataAsOf).toLocaleDateString()}
      </p>
    </div>
  );
}

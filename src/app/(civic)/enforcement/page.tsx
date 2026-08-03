/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { ExploreFooter } from '@/components/seo/ExploreFooter';

// ── Types ────────────────────────────────────────────────────────────

interface EnforcementAction {
  agency: 'EPA' | 'OSHA' | 'SEC' | 'CFPB';
  actionType: string;
  organization: string;
  penaltyAmount: number;
  date: string;
  state: string;
}

interface EnforcementInsightResponse {
  scope:
    | { type: 'sector'; sector: string }
    | { type: 'state'; state: string }
    | { type: 'organization'; name: string };
  actions: EnforcementAction[];
  stats: {
    totalActions: number;
    /** When true, totalActions is a floor: an agency feed was read to its cap. */
    totalIsLowerBound: boolean;
    totalPenalties: number;
    byAgency: Array<{ agency: string; count: number; penalties: number }>;
    trend: 'increasing' | 'decreasing' | 'stable';
    periodMonths: number;
  };
  narrative: string;
  confidence: number;
  dataAsOf: string;
  methodology: string;
  disclaimer: string;
}

// ── Constants ────────────────────────────────────────────────────────

const SECTORS = [
  { value: 'Agribusiness', label: 'Agribusiness' },
  { value: 'Communications/Electronics', label: 'Communications / Electronics' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Defense', label: 'Defense' },
  { value: 'Energy/Natural Resources', label: 'Energy / Natural Resources' },
  { value: 'Finance/Insurance/Real Estate', label: 'Finance / Insurance / Real Estate' },
  { value: 'Health', label: 'Health' },
  { value: 'Lawyers & Lobbyists', label: 'Lawyers & Lobbyists' },
  { value: 'Transportation', label: 'Transportation' },
  { value: 'Misc Business', label: 'Misc Business' },
  { value: 'Labor', label: 'Labor' },
];

const STATES: Array<{ code: string; name: string }> = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

// ── Helpers ──────────────────────────────────────────────────────────

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function formatPenalty(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

const TREND_LABELS: Record<string, string> = {
  increasing: 'Increasing',
  decreasing: 'Decreasing',
  stable: 'Stable',
};

// ── Main Page ────────────────────────────────────────────────────────

export default function EnforcementExplorerPage() {
  const [filterType, setFilterType] = useState<'state' | 'sector'>('state');
  const [selectedState, setSelectedState] = useState('');
  const [selectedSector, setSelectedSector] = useState('');

  const apiUrl =
    filterType === 'state' && selectedState
      ? `/api/intelligence/enforcement/state/${selectedState}`
      : filterType === 'sector' && selectedSector
        ? `/api/intelligence/enforcement/sector/${encodeURIComponent(selectedSector)}`
        : null;

  const { data, error, isLoading } = useSWR<EnforcementInsightResponse>(apiUrl, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 600_000,
  });

  const hasSelection =
    (filterType === 'state' && selectedState) || (filterType === 'sector' && selectedSector);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="type-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="text-gray-900">Enforcement</span>
        </nav>

        {/* Header */}
        <div className="border-2 border-gray-900 bg-white p-6 sm:p-8 mb-6">
          <h1 className="aicher-heading text-3xl text-gray-900 mb-2">
            Federal Enforcement Explorer
          </h1>
          <p className="type-sm text-gray-600 max-w-2xl">
            Explore federal enforcement actions from EPA, OSHA, and CFPB public records. See how
            agencies enforce regulations by state or industry sector.
          </p>
        </div>

        {/* Filter bar */}
        <div className="border-2 border-gray-200 bg-white p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filter type toggle */}
            <div className="flex gap-1">
              <button
                onClick={() => {
                  setFilterType('state');
                  setSelectedSector('');
                }}
                className={`px-4 py-2 min-h-[44px] type-sm aicher-heading transition-colors ${
                  filterType === 'state'
                    ? 'border-2 border-gray-900 bg-white text-gray-900 border-b-[3px] border-b-[#3ea2d4]'
                    : 'border-2 border-gray-200 text-gray-500 hover:text-gray-900'
                }`}
              >
                By state
              </button>
              <button
                onClick={() => {
                  setFilterType('sector');
                  setSelectedState('');
                }}
                className={`px-4 py-2 min-h-[44px] type-sm aicher-heading transition-colors ${
                  filterType === 'sector'
                    ? 'border-2 border-gray-900 bg-white text-gray-900 border-b-[3px] border-b-[#3ea2d4]'
                    : 'border-2 border-gray-200 text-gray-500 hover:text-gray-900'
                }`}
              >
                By sector
              </button>
            </div>

            {/* Selector */}
            {filterType === 'state' && (
              <select
                value={selectedState}
                onChange={e => setSelectedState(e.target.value)}
                className="border-2 border-gray-200 bg-white px-3 py-2 min-h-[44px] type-sm text-gray-900 flex-1 max-w-xs"
                aria-label="Select state"
              >
                <option value="">Select a state</option>
                {STATES.map(s => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {filterType === 'sector' && (
              <select
                value={selectedSector}
                onChange={e => setSelectedSector(e.target.value)}
                className="border-2 border-gray-200 bg-white px-3 py-2 min-h-[44px] type-sm text-gray-900 flex-1 max-w-xs"
                aria-label="Select industry sector"
              >
                <option value="">Select a sector</option>
                {SECTORS.map(s => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Empty state */}
        {!hasSelection && (
          <div className="border-2 border-gray-200 bg-white p-8 text-center">
            <p className="type-sm text-gray-500">
              Select a state or industry sector to view enforcement data.
            </p>
          </div>
        )}

        {/* Loading */}
        {hasSelection && isLoading && (
          <div className="border-2 border-gray-200 bg-white p-6 animate-pulse">
            <div className="h-5 bg-gray-100 w-48 mb-4" />
            <div className="h-4 bg-gray-100 w-full mb-3" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 bg-gray-100" />
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {hasSelection && error && !isLoading && (
          <div className="border-2 border-gray-200 bg-white p-6 text-center">
            <p className="type-sm text-gray-500">
              Enforcement data not available for this selection. The minimum threshold is 3
              enforcement actions.
            </p>
          </div>
        )}

        {/* Results */}
        {data && data.stats && !isLoading && <EnforcementResults data={data} />}

        <ExploreFooter
          variant="federal"
          currentSection="Enforcement"
          relatedLinks={[
            { href: '/states', label: 'All 50 States' },
            { href: '/industry/Energy%2FNatural%20Resources', label: 'Energy Sector' },
            { href: '/industry/Health', label: 'Health Sector' },
          ]}
        />
      </main>
    </div>
  );
}

// ── Results ──────────────────────────────────────────────────────────

function EnforcementResults({ data }: { data: EnforcementInsightResponse }) {
  const [showActions, setShowActions] = useState(false);
  const { stats, narrative, actions } = data;

  const scopeLabel =
    data.scope.type === 'state'
      ? (STATES.find(s => s.code === (data.scope as { type: 'state'; state: string }).state)
          ?.name ?? (data.scope as { type: 'state'; state: string }).state)
      : data.scope.type === 'sector'
        ? (data.scope as { type: 'sector'; sector: string }).sector
        : '';

  // Aggregate top organizations
  const orgCounts = new Map<string, { count: number; penalties: number }>();
  for (const action of actions) {
    const existing = orgCounts.get(action.organization) ?? { count: 0, penalties: 0 };
    orgCounts.set(action.organization, {
      count: existing.count + 1,
      penalties: existing.penalties + action.penaltyAmount,
    });
  }
  const topOrgs = [...orgCounts.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="border-2 border-gray-900 bg-white p-4 sm:p-6">
        <h2 className="aicher-heading type-lg text-gray-900 mb-2">Enforcement in {scopeLabel}</h2>

        {narrative && (
          <p className="type-sm text-gray-700 mb-4 border-l-[3px] border-[#3ea2d4] pl-3">
            {narrative}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatBox
            label={stats.totalIsLowerBound ? 'Actions found (at least)' : 'Total actions'}
            value={stats.totalActions.toLocaleString()}
          />
          <StatBox label="Total penalties" value={formatPenalty(stats.totalPenalties)} />
          <StatBox label="Trend" value={TREND_LABELS[stats.trend] ?? stats.trend} />
          <StatBox
            label="Period"
            value={
              stats.periodMonths >= 12
                ? `${Math.round(stats.periodMonths / 12)} yr`
                : `${stats.periodMonths} mo`
            }
          />
        </div>
      </div>

      {/* Agency breakdown */}
      {stats.byAgency.length > 0 && (
        <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
          <h3 className="aicher-heading type-sm text-gray-900 mb-3">By agency</h3>
          <div className="space-y-1">
            {stats.byAgency.map(a => (
              <div
                key={a.agency}
                className="flex items-center justify-between py-2 type-sm border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-900 font-medium">{a.agency}</span>
                <span className="text-gray-500 tabular-nums">
                  {a.count} action{a.count !== 1 ? 's' : ''} · {formatPenalty(a.penalties)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top organizations */}
      {topOrgs.length > 0 && (
        <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
          <h3 className="aicher-heading type-sm text-gray-900 mb-3">Most cited organizations</h3>
          <div className="space-y-1">
            {topOrgs.map(([name, orgData]) => (
              <div
                key={name}
                className="flex items-start justify-between py-2 type-sm border-b border-gray-100 last:border-0"
              >
                <span className="text-gray-900">{name}</span>
                <span className="text-gray-500 tabular-nums flex-shrink-0 ml-2">
                  {orgData.count} action{orgData.count !== 1 ? 's' : ''}
                  {orgData.penalties > 0 ? ` · ${formatPenalty(orgData.penalties)}` : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Individual actions */}
      {actions.length > 0 && (
        <div className="border-2 border-gray-200 bg-white p-4 sm:p-6">
          <button
            onClick={() => setShowActions(prev => !prev)}
            className="type-sm text-[#3ea2d4] aicher-heading py-2 min-h-[44px] inline-flex items-center"
            aria-expanded={showActions}
          >
            {showActions ? 'Hide individual actions' : `Show ${actions.length} individual actions`}
          </button>
          {showActions && (
            <div className="space-y-1 mt-2">
              {actions.slice(0, 30).map((action, i) => (
                <div
                  key={i}
                  className="flex items-start justify-between py-2 type-xs border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-900">{action.organization}</span>
                    <span className="text-gray-400 ml-2">
                      {action.agency} · {action.actionType}
                    </span>
                    {action.date && (
                      <span className="text-gray-400 ml-2">
                        {new Date(action.date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 tabular-nums flex-shrink-0 ml-2">
                    {action.penaltyAmount > 0 ? formatPenalty(action.penaltyAmount) : '—'}
                  </span>
                </div>
              ))}
              {actions.length > 30 && (
                <p className="type-xs text-gray-400 pt-1">Showing 30 of {actions.length} actions</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      {data.disclaimer && <p className="type-xs text-gray-400">{data.disclaimer}</p>}

      <p className="type-xs text-gray-400">
        Sources: EPA ECHO, OSHA, CFPB
        {data.dataAsOf && ` · Data as of ${new Date(data.dataAsOf).toLocaleDateString()}`}
      </p>
    </div>
  );
}

// ── UI Primitives ────────────────────────────────────────────────────

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-2 border-gray-200 bg-white p-3">
      <div className="aicher-heading type-2xl text-gray-900">{value}</div>
      <div className="type-xs text-gray-500 aicher-heading-wide">{label}</div>
    </div>
  );
}

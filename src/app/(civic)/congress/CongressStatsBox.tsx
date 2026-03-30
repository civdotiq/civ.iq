/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';

interface CongressStats {
  total: { members: number; house: number; senate: number };
  byParty: {
    democrat: { total: number; house: number; senate: number };
    republican: { total: number; house: number; senate: number };
    independent: { total: number; house: number; senate: number };
  };
  demographics: {
    averageAge?: number;
    genderDistribution?: { male: number; female: number; unknown: number };
  };
  session: { congress: string; period: string; startDate: string; endDate: string };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error?.message || 'Failed to load stats');
  return data.statistics as CongressStats;
};

export function CongressStatsBox() {
  const {
    data: stats,
    error,
    isLoading,
  } = useSWR('/api/congress/119th/stats', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });

  if (error) {
    return <StatsBoxFallback />;
  }

  if (isLoading || !stats) {
    return (
      <div className="bg-white border-2 border-gray-200 p-4 my-6 animate-pulse">
        <div className="h-5 bg-gray-100 w-48 mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i}>
              <div className="h-3 bg-gray-100 w-20 mb-2" />
              <div className="h-8 bg-gray-100 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { byParty, demographics } = stats;
  const hasGender =
    demographics.genderDistribution &&
    demographics.genderDistribution.unknown < stats.total.members;
  const senateTotal = stats.total.senate;
  const houseTotal = stats.total.house;

  return (
    <div className="bg-white border-2 border-gray-200 p-4 my-6 space-y-4">
      <h3 className="font-bold text-gray-800">119th Congress at a Glance</h3>

      {/* Headline stats */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Senators</dt>
          <dd className="text-2xl font-bold text-gray-900">{senateTotal}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Representatives</dt>
          <dd className="text-2xl font-bold text-gray-900">{houseTotal}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Total members</dt>
          <dd className="text-2xl font-bold text-gray-900">{stats.total.members}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Session</dt>
          <dd className="text-2xl font-bold text-gray-900">{stats.session.period}</dd>
        </div>
      </dl>

      {/* Party breakdown */}
      <div>
        <h4 className="text-sm font-bold text-gray-700 mb-2">Party breakdown</h4>
        <div className="space-y-2">
          <PartyRow
            label="Republican"
            color="bg-[#e11d07]"
            senate={byParty.republican.senate}
            house={byParty.republican.house}
            total={byParty.republican.total}
            maxTotal={stats.total.members}
          />
          <PartyRow
            label="Democrat"
            color="bg-[#0a9338]"
            senate={byParty.democrat.senate}
            house={byParty.democrat.house}
            total={byParty.democrat.total}
            maxTotal={stats.total.members}
          />
          {byParty.independent.total > 0 && (
            <PartyRow
              label="Independent"
              color="bg-gray-500"
              senate={byParty.independent.senate}
              house={byParty.independent.house}
              total={byParty.independent.total}
              maxTotal={stats.total.members}
            />
          )}
        </div>
      </div>

      {/* Demographics — only show if data is meaningful */}
      {(demographics.averageAge || hasGender) && (
        <div>
          <h4 className="text-sm font-bold text-gray-700 mb-2">Demographics</h4>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {demographics.averageAge && (
              <div>
                <dt className="text-gray-500">Average age</dt>
                <dd className="text-lg font-bold text-gray-900">
                  {demographics.averageAge.toFixed(1)}
                </dd>
              </div>
            )}
            {hasGender && demographics.genderDistribution && (
              <>
                <div>
                  <dt className="text-gray-500">Women</dt>
                  <dd className="text-lg font-bold text-gray-900">
                    {demographics.genderDistribution.female}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Men</dt>
                  <dd className="text-lg font-bold text-gray-900">
                    {demographics.genderDistribution.male}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      )}

      <p className="text-xs text-gray-400">Source: Congress.gov member data</p>
    </div>
  );
}

function PartyRow({
  label,
  color,
  senate,
  house,
  total,
  maxTotal,
}: {
  label: string;
  color: string;
  senate: number;
  house: number;
  total: number;
  maxTotal: number;
}) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-gray-700 font-medium">{label}</span>
      <div className="flex-1 h-4 bg-gray-100 border border-gray-200">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-28 text-right text-gray-600 text-xs tabular-nums">
        {total} ({senate}S / {house}H)
      </span>
    </div>
  );
}

/** Static fallback matching original hardcoded values */
function StatsBoxFallback() {
  return (
    <div className="bg-white border-2 border-gray-200 p-4 my-6">
      <h3 className="font-bold text-gray-800 mb-3">119th Congress at a Glance</h3>
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <dt className="text-gray-500">Senators</dt>
          <dd className="text-2xl font-bold text-gray-900">100</dd>
        </div>
        <div>
          <dt className="text-gray-500">Representatives</dt>
          <dd className="text-2xl font-bold text-gray-900">435</dd>
        </div>
        <div>
          <dt className="text-gray-500">Committees</dt>
          <dd className="text-2xl font-bold text-gray-900">45+</dd>
        </div>
        <div>
          <dt className="text-gray-500">Session</dt>
          <dd className="text-2xl font-bold text-gray-900">2025-27</dd>
        </div>
      </dl>
      <p className="text-xs text-gray-400 mt-3">
        Live data unavailable — showing constitutional baseline
      </p>
    </div>
  );
}

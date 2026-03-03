'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { DetailData, ChartType } from '@/app/(civic)/compare/page';

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  yearsInOffice: number;
  committees: Array<{ name: string }>;
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    missedVotes: number;
  };
  billsSponsored: number;
  billsCosponsored: number;
}

interface ComparisonChartProps {
  representatives: Representative[];
  chartType: ChartType;
  detailData: Map<string, DetailData>;
}

function getPartyColor(party: string): string {
  if (party === 'Republican') return '#e11d07';
  if (party === 'Democrat' || party === 'Democratic') return '#0a9338';
  if (party === 'Independent') return '#3ea2d4';
  return '#6b7280';
}

function getPartyBadgeClass(party: string): string {
  if (party === 'Democrat' || party === 'Democratic') return 'bg-[#0a9338] text-white';
  if (party === 'Republican') return 'bg-[#e11d07] text-white';
  return 'bg-gray-600 text-white';
}

function getPartyAbbrev(party: string): string {
  if (party === 'Democrat' || party === 'Democratic') return 'D';
  if (party === 'Republican') return 'R';
  if (party === 'Independent') return 'I';
  return party.charAt(0);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

function LoadingBlock() {
  return (
    <div className="p-6 text-center">
      <div className="aicher-loading w-6 h-6 mx-auto mb-2" />
      <p className="text-sm text-gray-500 dark:text-gray-400">Loading detail data...</p>
    </div>
  );
}

function anyLoading(reps: Representative[], detailData: Map<string, DetailData>): boolean {
  return reps.some(r => {
    const d = detailData.get(r.bioguideId);
    return !d || d.loading;
  });
}

// ── Overview Section ──────────────────────────────────────────────────────

function OverviewSection({
  representatives,
  detailData,
}: {
  representatives: Representative[];
  detailData: Map<string, DetailData>;
}) {
  if (anyLoading(representatives, detailData)) return <LoadingBlock />;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.min(representatives.length, 4)}, 1fr)` }}
    >
      {representatives.map(rep => {
        const detail = detailData.get(rep.bioguideId);
        const summary = detail?.summary;
        const finance = detail?.finance;

        return (
          <div key={rep.bioguideId} className="border-2 border-gray-300 dark:border-gray-600 p-4">
            {/* Name + party badge */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                  {rep.name}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {rep.chamber === 'Senate' ? 'Sen.' : 'Rep.'} &middot; {rep.state}
                  {rep.district ? `-${rep.district}` : ''}
                </p>
              </div>
              <span
                className={`inline-block px-1.5 py-0.5 text-xs font-bold ${getPartyBadgeClass(rep.party)}`}
              >
                {getPartyAbbrev(rep.party)}
              </span>
            </div>

            {/* Stats grid */}
            <div className="space-y-2 text-sm">
              <StatRow label="Years in Office" value={String(rep.yearsInOffice)} />
              <StatRow
                label="Bills Sponsored"
                value={String(summary?.billsSponsored ?? rep.billsSponsored)}
              />
              <StatRow
                label="Votes Cast"
                value={String(summary?.votesParticipated ?? rep.votingRecord.totalVotes)}
              />
              <StatRow
                label="Total Raised"
                value={
                  summary?.totalRaised
                    ? formatNumber(summary.totalRaised)
                    : finance?.totalRaised
                      ? formatNumber(finance.totalRaised)
                      : 'N/A'
                }
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500 dark:text-gray-400">{label}</span>
      <span className="font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}

// ── Voting Section ────────────────────────────────────────────────────────

function VotingSection({
  representatives,
  detailData,
}: {
  representatives: Representative[];
  detailData: Map<string, DetailData>;
}) {
  if (anyLoading(representatives, detailData)) return <LoadingBlock />;

  // Build vote maps per member: key = "chamber-rollNumber"
  const voteMaps = new Map<string, Map<string, string>>();
  for (const rep of representatives) {
    const detail = detailData.get(rep.bioguideId);
    const map = new Map<string, string>();
    for (const v of detail?.votes ?? []) {
      map.set(`${v.chamber}-${v.rollNumber}`, v.position);
    }
    voteMaps.set(rep.bioguideId, map);
  }

  // Compute agreement matrix for pairs
  const pairs: Array<{
    a: Representative;
    b: Representative;
    agree: number;
    total: number;
  }> = [];

  for (let i = 0; i < representatives.length; i++) {
    for (let j = i + 1; j < representatives.length; j++) {
      const a = representatives[i] as Representative | undefined;
      const b = representatives[j] as Representative | undefined;
      if (!a || !b) continue;
      const mapA = voteMaps.get(a.bioguideId);
      const mapB = voteMaps.get(b.bioguideId);
      if (!mapA || !mapB) continue;

      let agree = 0;
      let total = 0;
      for (const [key, posA] of mapA) {
        const posB = mapB.get(key);
        if (posB && posA !== 'Not Voting' && posB !== 'Not Voting') {
          total++;
          if (posA === posB) agree++;
        }
      }
      pairs.push({ a, b, agree, total });
    }
  }

  // Find shared votes (votes where 2+ selected members participated)
  const allVoteKeys = new Map<
    string,
    { bill: string; question: string; date: string; result: string }
  >();
  for (const rep of representatives) {
    const detail = detailData.get(rep.bioguideId);
    for (const v of detail?.votes ?? []) {
      const key = `${v.chamber}-${v.rollNumber}`;
      if (!allVoteKeys.has(key)) {
        allVoteKeys.set(key, {
          bill: v.bill?.number || v.description || 'Unknown',
          question: v.question,
          date: v.date,
          result: v.result,
        });
      }
    }
  }

  // Filter to shared votes only
  const sharedVotes: Array<{
    key: string;
    bill: string;
    question: string;
    date: string;
    result: string;
    positions: Map<string, string>;
  }> = [];

  for (const [key, info] of allVoteKeys) {
    const positions = new Map<string, string>();
    for (const rep of representatives) {
      const pos = voteMaps.get(rep.bioguideId)?.get(key);
      if (pos) positions.set(rep.bioguideId, pos);
    }
    if (positions.size >= 2) {
      sharedVotes.push({ key, ...info, positions });
    }
  }

  // Sort by date descending
  sharedVotes.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const displayVotes = sharedVotes.slice(0, 25);

  return (
    <div className="space-y-6">
      {/* Agreement Matrix */}
      {pairs.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Voting Agreement
          </h4>
          <div className="space-y-2">
            {pairs.map(({ a, b, agree, total }) => {
              const pct = total > 0 ? Math.round((agree / total) * 100) : 0;
              return (
                <div key={`${a.bioguideId}-${b.bioguideId}`} className="flex items-center gap-3">
                  <span className="text-sm text-gray-700 dark:text-gray-300 w-48 shrink-0 truncate">
                    {a.name.split(' ').slice(-1)[0]} &amp; {b.name.split(' ').slice(-1)[0]}
                  </span>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 relative">
                    <div className="h-full bg-[#3ea2d4]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-20 text-right">
                    {pct}% ({total})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Shared Votes Table */}
      {displayVotes.length > 0 ? (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Shared Votes ({sharedVotes.length} found)
          </h4>
          <div className="overflow-x-auto border-2 border-gray-300 dark:border-gray-600">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#1a1a1e] border-b-2 border-gray-300 dark:border-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                    Bill / Vote
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                    Date
                  </th>
                  {representatives.map(rep => (
                    <th
                      key={rep.bioguideId}
                      className="text-center px-3 py-2 font-semibold text-gray-900 dark:text-gray-100"
                    >
                      {rep.name.split(' ').slice(-1)[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayVotes.map(vote => (
                  <tr key={vote.key} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[240px] truncate">
                      {vote.bill}
                    </td>
                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {vote.date
                        ? new Date(vote.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })
                        : ''}
                    </td>
                    {representatives.map(rep => {
                      const pos = vote.positions.get(rep.bioguideId);
                      return (
                        <td key={rep.bioguideId} className="px-3 py-2 text-center">
                          {pos ? (
                            <PositionBadge position={pos} />
                          ) : (
                            <span className="text-gray-300 dark:text-gray-600">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No shared votes found between selected members.
        </p>
      )}
    </div>
  );
}

function PositionBadge({ position }: { position: string }) {
  if (position === 'Yea') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-bold bg-[#0a9338] text-white">
        Yea
      </span>
    );
  }
  if (position === 'Nay') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-bold bg-[#e11d07] text-white">
        Nay
      </span>
    );
  }
  if (position === 'Present') {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-bold bg-gray-400 text-white">
        Present
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-bold bg-gray-300 text-gray-700">NV</span>
  );
}

// ── Bills Section ─────────────────────────────────────────────────────────

function BillsSection({
  representatives,
  detailData,
}: {
  representatives: Representative[];
  detailData: Map<string, DetailData>;
}) {
  if (anyLoading(representatives, detailData)) return <LoadingBlock />;

  const maxSponsored = Math.max(
    ...representatives.map(r => {
      const d = detailData.get(r.bioguideId);
      return d?.summary?.billsSponsored ?? r.billsSponsored ?? 0;
    }),
    1
  );

  const maxCosponsored = Math.max(...representatives.map(r => r.billsCosponsored ?? 0), 1);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Bills Sponsored
        </h4>
        <div className="space-y-2">
          {representatives.map(rep => {
            const d = detailData.get(rep.bioguideId);
            const count = d?.summary?.billsSponsored ?? rep.billsSponsored ?? 0;
            const pct = Math.round((count / maxSponsored) * 100);
            return (
              <div key={rep.bioguideId} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 w-32 shrink-0 truncate">
                  {rep.name.split(' ').slice(-1)[0]}
                </span>
                <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 relative">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: getPartyColor(rep.party) }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Bills Cosponsored
        </h4>
        <div className="space-y-2">
          {representatives.map(rep => {
            const count = rep.billsCosponsored ?? 0;
            const pct = Math.round((count / maxCosponsored) * 100);
            return (
              <div key={rep.bioguideId} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 w-32 shrink-0 truncate">
                  {rep.name.split(' ').slice(-1)[0]}
                </span>
                <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 relative">
                  <div
                    className="h-full"
                    style={{ width: `${pct}%`, backgroundColor: getPartyColor(rep.party) }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-12 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Finance Section ───────────────────────────────────────────────────────

function FinanceSection({
  representatives,
  detailData,
}: {
  representatives: Representative[];
  detailData: Map<string, DetailData>;
}) {
  if (anyLoading(representatives, detailData)) return <LoadingBlock />;

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: `repeat(${Math.min(representatives.length, 4)}, 1fr)` }}
    >
      {representatives.map(rep => {
        const detail = detailData.get(rep.bioguideId);
        const fin = detail?.finance;

        if (!fin || !fin.totalRaised) {
          return (
            <div key={rep.bioguideId} className="border-2 border-gray-300 dark:border-gray-600 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  {rep.name.split(' ').slice(-1)[0]}
                </span>
                <span
                  className={`inline-block px-1.5 py-0.5 text-xs font-bold ${getPartyBadgeClass(rep.party)}`}
                >
                  {getPartyAbbrev(rep.party)}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Finance data unavailable</p>
            </div>
          );
        }

        const indPct =
          fin.totalRaised > 0
            ? Math.round((fin.individualContributions / fin.totalRaised) * 100)
            : 0;
        const pacPct =
          fin.totalRaised > 0 ? Math.round((fin.pacContributions / fin.totalRaised) * 100) : 0;
        const topIndustries = (fin.industryBreakdown || []).slice(0, 5);

        return (
          <div key={rep.bioguideId} className="border-2 border-gray-300 dark:border-gray-600 p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                {rep.name.split(' ').slice(-1)[0]}
              </span>
              <span
                className={`inline-block px-1.5 py-0.5 text-xs font-bold ${getPartyBadgeClass(rep.party)}`}
              >
                {getPartyAbbrev(rep.party)}
              </span>
            </div>

            <div className="space-y-3 text-sm">
              <StatRow label="Total Raised" value={formatNumber(fin.totalRaised)} />
              <StatRow label="Total Spent" value={formatNumber(fin.totalSpent)} />
              <StatRow label="Cash on Hand" value={formatNumber(fin.cashOnHand)} />

              {/* Individual vs PAC split bar */}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Individual vs PAC</p>
                <div className="h-4 flex bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full bg-[#3ea2d4]"
                    style={{ width: `${indPct}%` }}
                    title={`Individual: ${indPct}%`}
                  />
                  <div
                    className="h-full bg-gray-500"
                    style={{ width: `${pacPct}%` }}
                    title={`PAC: ${pacPct}%`}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span>Ind. {indPct}%</span>
                  <span>PAC {pacPct}%</span>
                </div>
              </div>

              {/* Top Industries */}
              {topIndustries.length > 0 && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Top Industries</p>
                  <div className="space-y-1">
                    {topIndustries.map((ind, idx) => (
                      <div key={idx} className="flex justify-between text-xs">
                        <span className="text-gray-700 dark:text-gray-300 truncate mr-2">
                          {ind.sector}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 shrink-0">
                          {formatNumber(ind.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Alignment Section ─────────────────────────────────────────────────────

function AlignmentSection({
  representatives,
  detailData,
}: {
  representatives: Representative[];
  detailData: Map<string, DetailData>;
}) {
  if (anyLoading(representatives, detailData)) return <LoadingBlock />;

  return (
    <div className="space-y-6">
      {/* Party Loyalty Bar */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Party Loyalty
        </h4>
        <div className="space-y-2">
          {representatives.map(rep => {
            const detail = detailData.get(rep.bioguideId);
            const alignment = detail?.alignment;
            const pct = alignment?.overall_alignment ?? 0;

            return (
              <div key={rep.bioguideId} className="flex items-center gap-3">
                <span className="text-sm text-gray-700 dark:text-gray-300 w-32 shrink-0 truncate">
                  {rep.name.split(' ').slice(-1)[0]}
                </span>
                <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-800 relative">
                  <div
                    className="h-full"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: getPartyColor(rep.party),
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 w-16 text-right">
                  {pct > 0 ? `${pct}%` : 'N/A'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Voting Breakdown */}
      <div>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Voting Breakdown
        </h4>
        <div className="overflow-x-auto border-2 border-gray-300 dark:border-gray-600">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-[#1a1a1e] border-b-2 border-gray-300 dark:border-gray-600">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                  Member
                </th>
                <th className="text-right px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                  With Party
                </th>
                <th className="text-right px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                  Against Party
                </th>
                <th className="text-right px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                  Bipartisan
                </th>
                <th className="text-right px-3 py-2 font-semibold text-gray-900 dark:text-gray-100">
                  Total Analyzed
                </th>
              </tr>
            </thead>
            <tbody>
              {representatives.map(rep => {
                const detail = detailData.get(rep.bioguideId);
                const a = detail?.alignment;
                const vp = a?.voting_patterns;

                return (
                  <tr
                    key={rep.bioguideId}
                    className="border-b border-gray-200 dark:border-gray-700"
                  >
                    <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                      <span className="flex items-center gap-2">
                        {rep.name.split(' ').slice(-1)[0]}
                        <span
                          className={`inline-block px-1.5 py-0.5 text-xs font-bold ${getPartyBadgeClass(rep.party)}`}
                        >
                          {getPartyAbbrev(rep.party)}
                        </span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      {vp?.with_party ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      {vp?.against_party ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      {a?.bipartisan_votes ?? vp?.bipartisan ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">
                      {a?.total_votes_analyzed ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Main ComparisonChart ──────────────────────────────────────────────────

export default function ComparisonChart({
  representatives,
  chartType,
  detailData,
}: ComparisonChartProps) {
  if (representatives.length === 0) {
    return (
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Select representatives above to see comparison data.
        </p>
      </div>
    );
  }

  const titles: Record<ChartType, string> = {
    overview: 'Performance Overview',
    voting: 'Voting Comparison',
    bills: 'Legislative Activity',
    finance: 'Campaign Finance',
    alignment: 'Party Alignment',
  };

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] overflow-hidden">
      <div className="px-6 py-4 border-b-2 border-black dark:border-[#333333]">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {titles[chartType]}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Comparing {representatives.length} representative
          {representatives.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="p-6">
        {chartType === 'overview' && (
          <OverviewSection representatives={representatives} detailData={detailData} />
        )}
        {chartType === 'voting' && (
          <VotingSection representatives={representatives} detailData={detailData} />
        )}
        {chartType === 'bills' && (
          <BillsSection representatives={representatives} detailData={detailData} />
        )}
        {chartType === 'finance' && (
          <FinanceSection representatives={representatives} detailData={detailData} />
        )}
        {chartType === 'alignment' && (
          <AlignmentSection representatives={representatives} detailData={detailData} />
        )}
      </div>
    </div>
  );
}

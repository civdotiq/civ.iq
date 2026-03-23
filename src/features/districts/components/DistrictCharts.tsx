'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

interface DistrictChartsProps {
  districtData: {
    demographics?: {
      population: number;
      medianIncome: number;
      medianAge: number;
      white_percent: number;
      black_percent: number;
      hispanic_percent: number;
      asian_percent: number;
      poverty_rate: number;
      bachelor_degree_percent: number;
      urbanPercentage: number;
      ageDistribution?: Array<{ bracket: string; count: number }>;
      incomeDistribution?: Array<{ bracket: string; count: number }>;
      employmentByIndustry?: Array<{ industry: string; count: number }>;
    };
    political: {
      cookPVI: string;
      lastElection: {
        winner: string;
        margin: number;
        turnout: number;
      };
      electionHistory?: {
        districtId: string;
        entries: Array<{
          year: number;
          result: {
            dem: number;
            rep: number;
            other: number;
            total: number;
            winner: string;
            margin: number;
            demPct: number;
            repPct: number;
          };
          redistricted: boolean;
        }>;
        redistrictingYear: number;
      };
    };
  };
}

export function AgeDistributionChart({
  medianAge,
  ageDistribution,
}: {
  medianAge: number;
  ageDistribution?: Array<{ bracket: string; count: number }>;
}) {
  if (!ageDistribution || ageDistribution.length === 0) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
        <div className="flex items-center justify-center h-48 text-center">
          <div>
            <p className="text-gray-600">Data unavailable</p>
            <p className="text-sm text-gray-500 mt-1">Census ACS age data not returned</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Median age: <strong>{medianAge.toFixed(1)} years</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Age Distribution</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={ageDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
          />
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Bar dataKey="count" fill="#3ea2d4" name="Population" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-2">
        Median age: <strong>{medianAge.toFixed(1)} years</strong> | Source:{' '}
        <a
          href="https://data.census.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Census ACS 5-Year
        </a>
      </p>
    </div>
  );
}

export function IncomeDistributionChart({
  medianIncome,
  incomeDistribution,
}: {
  medianIncome: number;
  incomeDistribution?: Array<{ bracket: string; count: number }>;
}) {
  if (!incomeDistribution || incomeDistribution.length === 0) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Household Income Distribution</h3>
        <div className="flex items-center justify-center h-48 text-center">
          <div>
            <p className="text-gray-600">Data unavailable</p>
            <p className="text-sm text-gray-500 mt-1">Census ACS income data not returned</p>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Median household income: <strong>${medianIncome.toLocaleString()}</strong>
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Household Income Distribution</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={incomeDistribution} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="bracket"
            tick={{ fontSize: 9 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
          />
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Bar dataKey="count" fill="#0a9338" name="Households" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-2">
        Median household income: <strong>${medianIncome.toLocaleString()}</strong> | Source:{' '}
        <a
          href="https://data.census.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Census ACS 5-Year
        </a>
      </p>
    </div>
  );
}

interface DemographicsData {
  white_percent: number;
  black_percent: number;
  hispanic_percent: number;
  asian_percent: number;
}

export function RacialCompositionChart({ demographics }: { demographics: DemographicsData }) {
  const data = useMemo(
    () =>
      [
        { name: 'White', value: demographics.white_percent, color: '#3b82f6' },
        {
          name: 'Black/African American',
          value: demographics.black_percent,
          color: '#ef4444',
        },
        { name: 'Hispanic/Latino', value: demographics.hispanic_percent, color: '#f59e0b' },
        { name: 'Asian', value: demographics.asian_percent, color: '#10b981' },
        {
          name: 'Other',
          value: Math.max(
            0,
            100 -
              demographics.white_percent -
              demographics.black_percent -
              demographics.hispanic_percent -
              demographics.asian_percent
          ),
          color: '#8b5cf6',
        },
      ].filter(item => item.value > 0),
    [demographics]
  );

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Racial & Ethnic Composition</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={value => `${Number(value).toFixed(1)}%`} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ElectionHistoryChart({
  currentPVI,
  currentMargin,
  winner,
  turnout,
  electionHistory,
}: {
  currentPVI: string;
  currentMargin: number;
  winner?: string;
  turnout?: number;
  electionHistory?: {
    entries: Array<{
      year: number;
      result: {
        winner: string;
        margin: number;
        demPct: number;
        repPct: number;
        total: number;
      };
      redistricted: boolean;
    }>;
    redistrictingYear: number;
  };
}) {
  const hasRealData = winner && winner !== 'Data unavailable';
  const pviMatch = currentPVI?.match(/^([DR])\+/);
  const entries = electionHistory?.entries ?? [];
  const hasHistory = entries.length > 1;

  // Determine display values for the latest election
  const winnerLabel = hasRealData
    ? winner
    : pviMatch?.[1] === 'D'
      ? 'Democratic'
      : pviMatch?.[1] === 'R'
        ? 'Republican'
        : null;

  const winnerColor =
    winnerLabel === 'Democrat' || winnerLabel === 'Democratic' ? '#0a9338' : '#e11d07';

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {hasHistory ? 'Election History (2014-2024)' : '2024 Election Results'}
      </h3>

      {hasHistory ? (
        <>
          {/* Multi-year margin chart */}
          <div className="space-y-2">
            {entries.map((entry, idx) => {
              const isDem = entry.result.winner === 'D';
              const barColor = isDem ? '#0a9338' : '#e11d07';
              const barWidth = Math.min(Math.abs(entry.result.margin) * 2, 100);
              const prevEntry = idx > 0 ? entries[idx - 1] : null;
              const showRedistrictLine = prevEntry && !prevEntry.redistricted && entry.redistricted;

              return (
                <div key={entry.year}>
                  {showRedistrictLine && (
                    <div className="flex items-center gap-2 my-2">
                      <div className="flex-1 border-t-2 border-dashed border-gray-300" />
                      <span className="text-xs text-gray-400">Redistricted</span>
                      <div className="flex-1 border-t-2 border-dashed border-gray-300" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-10 text-right tabular-nums">
                      {entry.year}
                    </span>
                    <div className="flex-1 flex items-center">
                      {/* Center-aligned margin bar */}
                      <div className="w-full h-5 bg-gray-100 border border-black relative">
                        {/* Center line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
                        {/* Margin bar */}
                        <div
                          className="absolute top-0 bottom-0"
                          style={{
                            backgroundColor: barColor,
                            width: `${barWidth}%`,
                            left: isDem ? `${50 - barWidth}%` : '50%',
                          }}
                        />
                      </div>
                    </div>
                    <span
                      className="text-xs tabular-nums w-16 text-right"
                      style={{ color: barColor }}
                    >
                      {isDem ? 'D' : 'R'}+{Math.abs(entry.result.margin).toFixed(1)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-gray-200">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border border-black" style={{ backgroundColor: '#0a9338' }} />
              <span className="text-xs text-gray-500">Democrat</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border border-black" style={{ backgroundColor: '#e11d07' }} />
              <span className="text-xs text-gray-500">Republican</span>
            </div>
          </div>

          {/* Latest result summary */}
          {hasRealData && (
            <div className="mt-3 space-y-1">
              <p className="text-sm text-gray-700">
                2024: <strong style={{ color: winnerColor }}>{winner}</strong> won by{' '}
                <strong>{Math.abs(currentMargin).toFixed(1)}%</strong>
              </p>
              {turnout && turnout > 0 ? (
                <p className="text-sm text-gray-500">{turnout.toLocaleString()} total votes cast</p>
              ) : null}
            </div>
          )}

          <p className="text-xs text-gray-400 mt-2">
            Source:{' '}
            <a
              href="https://electionlab.mit.edu/data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] hover:underline"
            >
              MIT Election Data + Science Lab (MEDSL)
            </a>
            . Districts changed after the 2020 Census.
          </p>
        </>
      ) : hasRealData ? (
        <>
          {/* Single-year view (fallback) */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: '#0a9338', fontWeight: 600 }}>Democrat</span>
                <span style={{ color: '#0a9338' }}>
                  {(winnerLabel === 'Democrat' || winnerLabel === 'Democratic'
                    ? 50 + currentMargin / 2
                    : 50 - currentMargin / 2
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-100 h-6 border border-black">
                <div
                  className="h-full"
                  style={{
                    width: `${winnerLabel === 'Democrat' || winnerLabel === 'Democratic' ? 50 + currentMargin / 2 : 50 - currentMargin / 2}%`,
                    backgroundColor: '#0a9338',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: '#e11d07', fontWeight: 600 }}>Republican</span>
                <span style={{ color: '#e11d07' }}>
                  {(winnerLabel === 'Democrat' || winnerLabel === 'Democratic'
                    ? 50 - currentMargin / 2
                    : 50 + currentMargin / 2
                  ).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-100 h-6 border border-black">
                <div
                  className="h-full"
                  style={{
                    width: `${winnerLabel === 'Democrat' || winnerLabel === 'Democratic' ? 50 - currentMargin / 2 : 50 + currentMargin / 2}%`,
                    backgroundColor: '#e11d07',
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
            <p className="text-sm text-gray-700">
              <strong style={{ color: winnerColor }}>{winner}</strong> won by{' '}
              <strong>{Math.abs(currentMargin).toFixed(1)}%</strong>
            </p>
            {turnout && turnout > 0 ? (
              <p className="text-sm text-gray-500">{turnout.toLocaleString()} total votes cast</p>
            ) : null}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Source:{' '}
            <a
              href="https://electionlab.mit.edu/data"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3ea2d4] hover:underline"
            >
              MIT Election Data + Science Lab (MEDSL)
            </a>
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center h-48 text-center">
            <div>
              <p className="text-gray-600">Data unavailable</p>
              <p className="text-sm text-gray-500 mt-1">
                Election results not yet published for this state
              </p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Estimated from Cook PVI:{' '}
            {winnerLabel ? (
              <strong>
                {winnerLabel} +{Math.abs(currentMargin).toFixed(1)}%
              </strong>
            ) : (
              <strong>{Math.abs(currentMargin).toFixed(1)}% margin</strong>
            )}
          </p>
        </>
      )}
    </div>
  );
}

export function EmploymentByIndustryChart({
  employmentByIndustry,
}: {
  employmentByIndustry?: Array<{ industry: string; count: number }>;
}) {
  if (!employmentByIndustry || employmentByIndustry.length === 0) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment by Occupation</h3>
        <div className="flex items-center justify-center h-48 text-center">
          <div>
            <p className="text-gray-600">Data unavailable</p>
            <p className="text-sm text-gray-500 mt-1">Census ACS occupation data not returned</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Employment by Occupation</h3>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart
          data={employmentByIndustry}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 120, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            tick={{ fontSize: 11 }}
            tickFormatter={v => (v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v)}
          />
          <YAxis type="category" dataKey="industry" tick={{ fontSize: 10 }} width={110} />
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Bar dataKey="count" fill="#e11d07" name="Workers" />
        </BarChart>
      </ResponsiveContainer>
      <p className="text-sm text-gray-600 mt-2">
        Civilian employed population 16+ | Source:{' '}
        <a
          href="https://data.census.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Census ACS 5-Year
        </a>
      </p>
    </div>
  );
}

export function DistrictCharts({ districtData }: DistrictChartsProps) {
  if (!districtData.demographics) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <p className="text-gray-600">Demographic data not available for enhanced visualizations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AgeDistributionChart
          medianAge={districtData.demographics.medianAge}
          ageDistribution={districtData.demographics.ageDistribution}
        />
        <IncomeDistributionChart
          medianIncome={districtData.demographics.medianIncome}
          incomeDistribution={districtData.demographics.incomeDistribution}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RacialCompositionChart demographics={districtData.demographics} />
        <ElectionHistoryChart
          currentPVI={districtData.political.cookPVI}
          currentMargin={districtData.political.lastElection.margin}
          winner={districtData.political.lastElection.winner}
          turnout={districtData.political.lastElection.turnout}
          electionHistory={districtData.political.electionHistory}
        />
      </div>

      <EmploymentByIndustryChart
        employmentByIndustry={districtData.demographics.employmentByIndustry}
      />
    </div>
  );
}

'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
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
import { SEMANTIC_COLORS } from '@/lib/constants/chart-colors';
import type { ElectionParty, RaceCandidateResult } from '@/types/elections';

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
        candidates?: RaceCandidateResult[];
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
          Median household income: <strong>${medianIncome.toLocaleString('en-US')}</strong>
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
        Median household income: <strong>${medianIncome.toLocaleString('en-US')}</strong> | Source:{' '}
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

const PARTY_NAMES: Record<ElectionParty, string> = {
  D: 'Democrat',
  R: 'Republican',
  L: 'Libertarian',
  OTHER: 'Other',
};

function candidatePartyColor(party: ElectionParty): string {
  if (party === 'D') return SEMANTIC_COLORS.democrat;
  if (party === 'R') return SEMANTIC_COLORS.republican;
  return SEMANTIC_COLORS.independent;
}

/** Top three by votes; the rest fold into one line so minor candidates don't crowd the card. */
const SHOWN_CANDIDATES = 3;

export function ElectionHistoryChart({
  currentMargin,
  winner,
  turnout,
  candidates,
}: {
  currentMargin: number;
  winner?: string;
  turnout?: number;
  candidates?: RaceCandidateResult[];
}) {
  const hasRealData = winner && winner !== 'Data unavailable';
  const leader = candidates?.[0];
  const unopposed = candidates?.length === 1;
  const shown = candidates?.slice(0, SHOWN_CANDIDATES) ?? [];
  const restPct = (candidates?.slice(SHOWN_CANDIDATES) ?? []).reduce((sum, c) => sum + c.pct, 0);

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">2024 Election Results</h3>
      {hasRealData ? (
        <>
          {!unopposed && shown.length > 0 && (
            <div className="space-y-3">
              {shown.map(c => (
                <div key={c.name}>
                  <div className="flex justify-between gap-2 text-sm mb-1">
                    <span>
                      <span className="font-semibold text-gray-900">{c.name}</span>{' '}
                      <span style={{ color: candidatePartyColor(c.partyCode) }}>
                        {PARTY_NAMES[c.partyCode]}
                      </span>
                    </span>
                    <span className="text-gray-700">{c.pct.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 h-6 border border-black">
                    <div
                      className="h-full"
                      style={{
                        width: `${c.pct}%`,
                        backgroundColor: candidatePartyColor(c.partyCode),
                      }}
                    />
                  </div>
                </div>
              ))}
              {restPct > 0 && (
                <p className="text-sm text-gray-500">Other candidates: {restPct.toFixed(1)}%</p>
              )}
            </div>
          )}
          <div className="mt-4 pt-3 border-t border-gray-200 space-y-1">
            <p className="text-sm text-gray-700">
              {leader ? (
                <strong style={{ color: candidatePartyColor(leader.partyCode) }}>
                  {leader.name}
                </strong>
              ) : (
                <strong>{winner}</strong>
              )}{' '}
              {unopposed ? (
                'ran unopposed'
              ) : (
                <>
                  won by <strong>{Math.abs(currentMargin).toFixed(1)}%</strong>
                </>
              )}
            </p>
            {unopposed && !turnout ? (
              <p className="text-sm text-gray-500">
                Not printed on the ballot, so no votes were tallied
              </p>
            ) : null}
            {turnout && turnout > 0 ? (
              <p className="text-sm text-gray-500">
                {turnout.toLocaleString('en-US')} total votes cast
              </p>
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
        <div className="flex items-center justify-center h-48 text-center">
          <div>
            <p className="text-gray-600">Data unavailable</p>
            <p className="text-sm text-gray-500 mt-1">
              No 2024 House result for this seat in the MIT Election Data + Science Lab (MEDSL)
              dataset
            </p>
          </div>
        </div>
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
          currentMargin={districtData.political.lastElection.margin}
          winner={districtData.political.lastElection.winner}
          turnout={districtData.political.lastElection.turnout}
          candidates={districtData.political.lastElection.candidates}
        />
      </div>

      <EmploymentByIndustryChart
        employmentByIndustry={districtData.demographics.employmentByIndustry}
      />
    </div>
  );
}

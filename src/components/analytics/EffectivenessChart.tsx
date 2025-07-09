'use client';


/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart
} from 'recharts';

interface EffectivenessData {
  year: number;
  period: string;
  overallScore: number;
  billsSponsored: number;
  billsEnacted: number;
  billsInCommittee: number;
  billsPassedHouse: number;
  billsPassedSenate: number;
  amendmentsOffered: number;
  amendmentsAdopted: number;
  committeeMemberships: number;
  subcommitteeChairs: number;
  bipartisanBills: number;
  significantLegislation: Array<{
    title: string;
    status: 'enacted' | 'passed_house' | 'passed_senate' | 'in_committee';
    significance: 'major' | 'moderate' | 'minor';
    bipartisan: boolean;
  }>;
  rankings: {
    overall: number;
    party: number;
    state: number;
    freshmanClass?: number;
  };
  specializations: Array<{
    area: string;
    score: number;
    billCount: number;
  }>;
}

interface EffectivenessResponse {
  bioguideId: string;
  period: string;
  data: EffectivenessData[];
  summary: {
    averageScore: number;
    totalBillsSponsored: number;
    totalBillsEnacted: number;
    overallSuccessRate: number;
    scoresTrend: string;
    bestYear: EffectivenessData;
    topSpecializations: Array<{
      area: string;
      score: number;
      billCount: number;
    }>;
  };
}

interface EffectivenessChartProps {
  bioguideId: string;
  years?: number;
  className?: string;
}

export function EffectivenessChart({ bioguideId, years = 8, className = '' }: EffectivenessChartProps) {
  const [data, setData] = useState<EffectivenessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'trends' | 'activity' | 'specializations'>('trends');

  useEffect(() => {
    const fetchEffectiveness = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/effectiveness?bioguideId=${bioguideId}&years=${years}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch effectiveness data');
        }
        
        const effectivenessData = await response.json();
        setData(effectivenessData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load effectiveness data');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchEffectiveness();
  }, [bioguideId, years]);

  const renderTrendsChart = () => {
    if (!data) return null;

    const chartData = data.data.map(item => ({
      year: item.year,
      score: item.overallScore,
      billsSponsored: item.billsSponsored,
      billsEnacted: item.billsEnacted,
      successRate: item.billsSponsored > 0 ? Math.round((item.billsEnacted / item.billsSponsored) * 100) : 0,
      bipartisanBills: item.bipartisanBills
    }));

    return (
      <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" stroke="#666" fontSize={12} />
        <YAxis 
          yAxisId="left"
          stroke="#666" 
          fontSize={12}
          label={{ value: 'Score', angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          stroke="#666" 
          fontSize={12}
          label={{ value: 'Bills', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <Legend />
        <Bar yAxisId="right" dataKey="billsSponsored" fill="#3ea2d4" name="Bills Sponsored" />
        <Bar yAxisId="right" dataKey="billsEnacted" fill="#0b983c" name="Bills Enacted" />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="score" 
          stroke="#e11d07" 
          strokeWidth={3}
          dot={{ fill: '#e11d07', strokeWidth: 2, r: 4 }}
          name="Effectiveness Score"
        />
      </ComposedChart>
    );
  };

  const renderActivityChart = () => {
    if (!data) return null;

    const chartData = data.data.map(item => ({
      year: item.year,
      sponsored: item.billsSponsored,
      enacted: item.billsEnacted,
      inCommittee: item.billsInCommittee,
      passedHouse: item.billsPassedHouse,
      passedSenate: item.billsPassedSenate,
      amendments: item.amendmentsAdopted
    }));

    return (
      <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="year" stroke="#666" fontSize={12} />
        <YAxis 
          stroke="#666" 
          fontSize={12}
          label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="enacted" stackId="1" stroke="#0b983c" fill="#0b983c" name="Enacted" />
        <Area type="monotone" dataKey="passedSenate" stackId="1" stroke="#3ea2d4" fill="#3ea2d4" name="Passed Senate" />
        <Area type="monotone" dataKey="passedHouse" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Passed House" />
        <Area type="monotone" dataKey="inCommittee" stackId="1" stroke="#6b7280" fill="#6b7280" name="In Committee" />
      </AreaChart>
    );
  };

  const renderSpecializationsChart = () => {
    if (!data || !data.summary.topSpecializations.length) return null;

    const radarData = data.summary.topSpecializations.map(spec => ({
      area: spec.area,
      score: spec.score,
      bills: spec.billCount * 10 // Scale for better visualization
    }));

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4 text-center">Policy Area Expertise</h4>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="area" tick={{ fontSize: 12 }} />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fontSize: 10 }} 
                tickCount={6}
              />
              <Radar 
                name="Expertise Score" 
                dataKey="score" 
                stroke="#0b983c" 
                fill="#0b983c" 
                fillOpacity={0.3}
                strokeWidth={2}
              />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Top Specializations</h4>
          <div className="space-y-4">
            {data.summary.topSpecializations.map((spec, index) => (
              <div key={spec.area} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-civiq-blue text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{spec.area}</div>
                    <div className="text-sm text-gray-600">{spec.billCount} bills</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                    <div 
                      className="bg-civiq-green h-2 rounded-full" 
                      style={{ width: `${spec.score}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">{spec.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Legislative Effectiveness</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">{error || 'Unable to load effectiveness data'}</div>
          <p className="text-sm text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Legislative Effectiveness</h3>
          <div className="flex border border-gray-300 rounded overflow-hidden">
            {(['trends', 'activity', 'specializations'] as const).map((viewType) => (
              <button
                key={viewType}
                onClick={() => setView(viewType)}
                className={`px-3 py-1 text-sm capitalize ${
                  view === viewType
                    ? 'bg-civiq-blue text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {viewType}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-green">{data.summary.averageScore}</div>
            <div className="text-sm text-gray-600">Avg Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-blue">{data.summary.totalBillsSponsored}</div>
            <div className="text-sm text-gray-600">Bills Sponsored</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-red">{data.summary.totalBillsEnacted}</div>
            <div className="text-sm text-gray-600">Bills Enacted</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">{data.summary.overallSuccessRate}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 w-full">
          {view !== 'specializations' && (
            <ResponsiveContainer width="100%" height="100%">
              {view === 'trends' ? (renderTrendsChart() || <div />) : (renderActivityChart() || <div />)}
            </ResponsiveContainer>
          )}
          {view === 'specializations' && renderSpecializationsChart()}
        </div>

        {/* Performance Insights */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <h4 className="font-medium text-gray-900 mb-3">Performance Insights</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Best Year:</span>
              <span className="ml-2 font-medium">
                {data.summary.bestYear.year} (Score: {data.summary.bestYear.overallScore})
              </span>
            </div>
            <div>
              <span className="text-gray-600">Trend:</span>
              <span className={`ml-2 font-medium ${
                data.summary.scoresTrend === 'improving' ? 'text-civiq-green' : 
                data.summary.scoresTrend === 'declining' ? 'text-civiq-red' : 'text-gray-600'
              }`}>
                {data.summary.scoresTrend}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Top Area:</span>
              <span className="ml-2 font-medium">
                {data.summary.topSpecializations[0]?.area || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
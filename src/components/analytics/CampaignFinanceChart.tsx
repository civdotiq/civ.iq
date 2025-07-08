'use client';

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
  PieChart,
  Pie,
  Cell,
  ComposedChart
} from 'recharts';

interface CampaignFinanceData {
  year: number;
  quarter: number;
  period: string;
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  smallDollarContributions: number;
  largeDollarContributions: number;
  fundraisingEvents: number;
  averageDonation: number;
  donorCount: number;
  topIndustries: Array<{
    industry: string;
    amount: number;
    percentage: number;
  }>;
  expenditures: {
    mediaAdvertising: number;
    staffSalaries: number;
    travelAndEvents: number;
    consultants: number;
    other: number;
  };
}

interface CampaignFinanceResponse {
  bioguideId: string;
  period: string;
  data: CampaignFinanceData[];
  summary: {
    totalRaised: number;
    totalSpent: number;
    currentCashOnHand: number;
    averageQuarterlyRaising: number;
    fundraisingTrend: string;
    smallDollarPercentage: number;
  };
}

interface CampaignFinanceChartProps {
  bioguideId: string;
  years?: number;
  className?: string;
}

export function CampaignFinanceChart({ bioguideId, years = 6, className = '' }: CampaignFinanceChartProps) {
  const [data, setData] = useState<CampaignFinanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'trends' | 'sources' | 'spending'>('trends');

  useEffect(() => {
    const fetchCampaignFinance = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/analytics/campaign-finance?bioguideId=${bioguideId}&years=${years}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch campaign finance data');
        }
        
        const financeData = await response.json();
        setData(financeData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load campaign finance data');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaignFinance();
  }, [bioguideId, years]);

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  const renderTrendsChart = () => {
    if (!data) return null;

    const chartData = data.data.map(item => ({
      period: item.period,
      raised: item.totalRaised,
      spent: item.totalSpent,
      cashOnHand: item.cashOnHand,
      individual: item.individualContributions,
      pac: item.pacContributions
    }));

    return (
      <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" stroke="#666" fontSize={12} />
        <YAxis 
          stroke="#666" 
          fontSize={12}
          tickFormatter={formatCurrency}
          label={{ value: 'Amount ($)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip 
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
        />
        <Legend />
        <Bar dataKey="raised" fill="#0b983c" name="Raised" />
        <Bar dataKey="spent" fill="#e11d07" name="Spent" />
        <Line 
          type="monotone" 
          dataKey="cashOnHand" 
          stroke="#3ea2d4" 
          strokeWidth={3}
          name="Cash on Hand"
        />
      </ComposedChart>
    );
  };

  const renderSourcesChart = () => {
    if (!data) return null;

    const latestData = data.data[data.data.length - 1];
    if (!latestData) return null;

    const sourceData = [
      { name: 'Individual', value: latestData.individualContributions, color: '#0b983c' },
      { name: 'PAC', value: latestData.pacContributions, color: '#e11d07' },
      { name: 'Other', value: latestData.totalRaised - latestData.individualContributions - latestData.pacContributions, color: '#3ea2d4' }
    ].filter(item => item.value > 0);

    const smallVsLargeData = [
      { name: 'Small Dollar (<$200)', value: latestData.smallDollarContributions, color: '#0b983c' },
      { name: 'Large Dollar (>$2000)', value: latestData.largeDollarContributions, color: '#e11d07' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4 text-center">Contribution Sources</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={sourceData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {sourceData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4 text-center">Small vs Large Dollar</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={smallVsLargeData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
              >
                {smallVsLargeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderSpendingChart = () => {
    if (!data) return null;

    const spendingData = data.data.map(item => ({
      period: item.period,
      media: item.expenditures.mediaAdvertising,
      staff: item.expenditures.staffSalaries,
      travel: item.expenditures.travelAndEvents,
      consultants: item.expenditures.consultants,
      other: item.expenditures.other
    }));

    return (
      <AreaChart data={spendingData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="period" stroke="#666" fontSize={12} />
        <YAxis 
          stroke="#666" 
          fontSize={12}
          tickFormatter={formatCurrency}
          label={{ value: 'Spending ($)', angle: -90, position: 'insideLeft' }}
        />
        <Tooltip formatter={(value: number) => formatCurrency(value)} />
        <Legend />
        <Area type="monotone" dataKey="media" stackId="1" stroke="#e11d07" fill="#e11d07" name="Media/Advertising" />
        <Area type="monotone" dataKey="staff" stackId="1" stroke="#0b983c" fill="#0b983c" name="Staff Salaries" />
        <Area type="monotone" dataKey="consultants" stackId="1" stroke="#3ea2d4" fill="#3ea2d4" name="Consultants" />
        <Area type="monotone" dataKey="travel" stackId="1" stroke="#f59e0b" fill="#f59e0b" name="Travel/Events" />
        <Area type="monotone" dataKey="other" stackId="1" stroke="#6b7280" fill="#6b7280" name="Other" />
      </AreaChart>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Finance</h3>
        <div className="text-center py-8">
          <div className="text-gray-500 mb-2">{error || 'Unable to load campaign finance data'}</div>
          <p className="text-sm text-gray-400">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Campaign Finance</h3>
          <div className="flex border border-gray-300 rounded overflow-hidden">
            {(['trends', 'sources', 'spending'] as const).map((viewType) => (
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
            <div className="text-2xl font-bold text-civiq-green">
              {formatCurrency(data.summary.totalRaised)}
            </div>
            <div className="text-sm text-gray-600">Total Raised</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-red">
              {formatCurrency(data.summary.totalSpent)}
            </div>
            <div className="text-sm text-gray-600">Total Spent</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-blue">
              {formatCurrency(data.summary.currentCashOnHand)}
            </div>
            <div className="text-sm text-gray-600">Cash on Hand</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-700">
              {data.summary.smallDollarPercentage}%
            </div>
            <div className="text-sm text-gray-600">Small Dollar</div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-80 w-full">
          {view === 'trends' && (
            <ResponsiveContainer width="100%" height="100%">
              {renderTrendsChart() || <div />}
            </ResponsiveContainer>
          )}
          {view === 'spending' && (
            <ResponsiveContainer width="100%" height="100%">
              {renderSpendingChart() || <div />}
            </ResponsiveContainer>
          )}
          {view === 'sources' && renderSourcesChart()}
        </div>

        {/* Recent Data */}
        {data.data.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h4 className="font-medium text-gray-900 mb-3">Latest Quarter Insights</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Latest Quarter:</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(data.data[data.data.length - 1].totalRaised)} raised
                </span>
              </div>
              <div>
                <span className="text-gray-600">Fundraising Trend:</span>
                <span className={`ml-2 font-medium ${
                  data.summary.fundraisingTrend === 'increasing' ? 'text-civiq-green' : 'text-civiq-red'
                }`}>
                  {data.summary.fundraisingTrend}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Avg per Quarter:</span>
                <span className="ml-2 font-medium">
                  {formatCurrency(data.summary.averageQuarterlyRaising)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
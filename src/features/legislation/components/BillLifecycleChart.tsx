'use client';

import useSWR from 'swr';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { JoinMetadata } from '@/types/joins';

interface BillLifecycleResponse {
  filters: {
    status: string | null;
    since: string;
    until: string;
    chamber: string | null;
  };
  bills: unknown[];
  statusCounts: Record<string, number>;
  metadata: JoinMetadata;
}

interface BillLifecycleChartProps {
  since?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

const STATUS_LABELS: Record<string, string> = {
  introduced: 'Introduced',
  referred: 'Referred',
  reported: 'Reported',
  passed_house: 'Passed House',
  passed_senate: 'Passed Senate',
  passed_both: 'Passed Both',
  enacted: 'Enacted',
  failed: 'Failed',
  vetoed: 'Vetoed',
};

const STATUS_COLORS: Record<string, string> = {
  introduced: '#9ca3af',
  referred: '#fbbf24',
  reported: '#60a5fa',
  passed_house: '#3ea2d4',
  passed_senate: '#2563eb',
  passed_both: '#0a9338',
  enacted: '#059669',
  failed: '#e11d07',
  vetoed: '#dc2626',
};

const STATUS_ORDER = [
  'introduced',
  'referred',
  'reported',
  'passed_house',
  'passed_senate',
  'passed_both',
  'enacted',
];

export function BillLifecycleChart({ since = '30d' }: BillLifecycleChartProps) {
  const { data, error, isLoading, mutate } = useSWR<BillLifecycleResponse>(
    `/api/bills/lifecycle?since=${since}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Bill Pipeline
        </h2>
        <div className="animate-pulse">
          <div className="h-48 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Bill Pipeline
        </h2>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load lifecycle data</p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading lifecycle data"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || Object.keys(data.statusCounts).length === 0) {
    return null;
  }

  const chartData = STATUS_ORDER.filter(status => (data.statusCounts[status] ?? 0) > 0).map(
    status => ({
      status,
      label: STATUS_LABELS[status] ?? status,
      count: data.statusCounts[status] ?? 0,
      fill: STATUS_COLORS[status] ?? '#9ca3af',
    })
  );

  if (chartData.length === 0) return null;

  const totalBills = chartData.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="bg-white border-2 border-black p-6 mb-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Activity className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        Bill Pipeline ({totalBills} bills, last 30 days)
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Where recent legislation stands in the legislative process
      </p>

      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 100, right: 24 }}>
          <XAxis type="number" stroke="#9ca3af" allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="label"
            stroke="#9ca3af"
            width={95}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => [value, 'Bills']}
            contentStyle={{
              border: '2px solid #000',
              borderRadius: '0',
              backgroundColor: '#fff',
            }}
          />
          <Bar dataKey="count" maxBarSize={24}>
            {chartData.map(entry => (
              <Cell key={entry.status} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <DataProvenance
        sources={data.metadata.dataSources.map(name => ({
          name,
          status: 'available' as const,
        }))}
        generatedAt={data.metadata.generatedAt}
        quality={data.metadata.dataQuality}
        className="mt-4"
      />
    </div>
  );
}

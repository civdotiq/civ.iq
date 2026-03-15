/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import type { QuarterData, VoteShift } from '@/lib/intelligence/types';

interface VoteShiftTimelineProps {
  quarters: QuarterData[];
  shifts: VoteShift[];
}

interface ChartDataPoint {
  quarter: string;
  alignment: number;
  rollingAverage: number | null;
  isShift: boolean;
}

export function VoteShiftTimeline({ quarters, shifts }: VoteShiftTimelineProps) {
  if (quarters.length === 0) {
    return (
      <div className="bg-white border-2 border-gray-200 p-6">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">Party Alignment Over Time</h3>
        <div className="flex items-center justify-center h-48 text-center">
          <p className="type-sm text-gray-500">Insufficient voting data for timeline</p>
        </div>
      </div>
    );
  }

  const shiftQuarters = new Set(shifts.map(s => s.quarter));

  const chartData: ChartDataPoint[] = quarters.map(q => ({
    quarter: q.quarter,
    alignment: Math.round(q.alignmentScore * 1000) / 10,
    rollingAverage: q.rollingAverage !== null ? Math.round(q.rollingAverage * 1000) / 10 : null,
    isShift: shiftQuarters.has(q.quarter),
  }));

  const shiftPoints = chartData.filter(d => d.isShift);

  return (
    <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
      <h3 className="aicher-heading type-lg text-gray-900 mb-4">Party Alignment Over Time</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === 'alignment' ? 'Quarterly alignment' : 'Rolling average',
            ]}
            labelFormatter={(label: string) => label}
          />
          <Line
            type="monotone"
            dataKey="alignment"
            stroke="#3ea2d4"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3ea2d4', stroke: '#3ea2d4' }}
            name="alignment"
          />
          <Line
            type="monotone"
            dataKey="rollingAverage"
            stroke="#9ca3af"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            connectNulls={false}
            name="rollingAverage"
          />
          {shiftPoints.map(point => (
            <ReferenceDot
              key={point.quarter}
              x={point.quarter}
              y={point.alignment}
              r={6}
              fill="#e11d07"
              stroke="#e11d07"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap items-center gap-4 mt-3 type-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-4 h-0.5" style={{ backgroundColor: '#3ea2d4' }} />
          Quarterly alignment
        </span>
        <span className="flex items-center gap-1">
          <span
            className="inline-block w-4 h-0.5"
            style={{ backgroundColor: '#9ca3af', borderTop: '1px dashed #9ca3af' }}
          />
          Rolling average
        </span>
        {shifts.length > 0 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2 h-2" style={{ backgroundColor: '#e11d07' }} />
            Detected shift
          </span>
        )}
      </div>
    </div>
  );
}

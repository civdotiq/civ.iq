/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
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
  partyLineRate: number;
  rollingAverage: number | null;
  isShift: boolean;
}

export function VoteShiftTimeline({ quarters, shifts }: VoteShiftTimelineProps) {
  if (quarters.length === 0) {
    return (
      <div className="bg-gray-50 p-6">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">
          Party-line voting rate over time
        </h3>
        <div className="flex items-center justify-center h-48 text-center">
          <p className="type-sm text-gray-500">Insufficient voting data for timeline</p>
        </div>
      </div>
    );
  }

  const shiftQuarters = new Set(shifts.map(s => s.quarter));

  const chartData: ChartDataPoint[] = quarters.map(q => ({
    quarter: q.quarter,
    partyLineRate: Math.round(q.alignmentScore * 1000) / 10,
    rollingAverage: q.rollingAverage !== null ? Math.round(q.rollingAverage * 1000) / 10 : null,
    isShift: shiftQuarters.has(q.quarter),
  }));

  const shiftPoints = chartData.filter(d => d.isShift);

  return (
    <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
      <h3 className="aicher-heading type-lg text-gray-900 mb-4">
        Party-line voting rate over time
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === 'partyLineRate' ? 'Quarterly rate' : 'Rolling average',
            ]}
            labelFormatter={(label: string) => label}
          />
          <Line
            type="monotone"
            dataKey="partyLineRate"
            stroke="#3ea2d4"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3ea2d4', stroke: '#3ea2d4' }}
            name="partyLineRate"
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
              y={point.partyLineRate}
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
          Quarterly rate
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

      {/* Shift context disclosures */}
      {shifts.length > 0 && <ShiftContextList shifts={shifts} />}
    </div>
  );
}

function ShiftContextList({ shifts }: { shifts: VoteShift[] }) {
  const [expandedShift, setExpandedShift] = useState<string | null>(null);

  const shiftsWithContext = shifts.filter(
    s =>
      s.context.newCommittees.length > 0 ||
      s.context.largeContributions > 0 ||
      s.context.electionProximity
  );

  if (shiftsWithContext.length === 0) return null;

  return (
    <div className="mt-4 border-t-2 border-gray-100 pt-3 space-y-1">
      <h4 className="aicher-heading type-xs text-gray-500 mb-2">Why these shifts?</h4>
      {shiftsWithContext.map(shift => {
        const isExpanded = expandedShift === shift.quarter;
        return (
          <div key={shift.quarter}>
            <button
              onClick={() => setExpandedShift(isExpanded ? null : shift.quarter)}
              className="w-full text-left flex items-start gap-2 py-2 min-h-[44px] aicher-focus"
              aria-expanded={isExpanded}
            >
              <span className="text-gray-400 mt-0.5 flex-shrink-0" aria-hidden="true">
                {isExpanded ? '−' : '+'}
              </span>
              <span className="type-sm text-gray-900">
                {shift.quarter}: {shift.magnitude.toFixed(1)}pp {shift.direction}
              </span>
            </button>
            {isExpanded && (
              <div className="ml-5 pb-2 space-y-1">
                {shift.context.newCommittees.length > 0 && (
                  <p className="type-xs text-gray-600">
                    Joined: {shift.context.newCommittees.join(', ')}
                  </p>
                )}
                {shift.context.largeContributions > 0 && (
                  <p className="type-xs text-gray-600">
                    {shift.context.largeContributions} large contribution
                    {shift.context.largeContributions !== 1 ? 's' : ''} received this quarter
                  </p>
                )}
                {shift.context.electionProximity && (
                  <p className="type-xs text-gray-600">Within 6 months of next election</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

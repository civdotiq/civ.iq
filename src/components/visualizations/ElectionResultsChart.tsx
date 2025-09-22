'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useMemo } from 'react';

interface ElectionResultsData {
  chamber: 'house' | 'senate';
  democrats: number;
  republicans: number;
  independents: number;
  totalSeats: number;
}

interface ElectionResultsChartProps {
  data: ElectionResultsData;
  className?: string;
}

export function ElectionResultsChart({ data, className = '' }: ElectionResultsChartProps) {
  const { seats, majorityThreshold } = useMemo(() => {
    const seats = [
      { party: 'Republican', count: data.republicans, color: '#dc2626' },
      { party: 'Democrat', count: data.democrats, color: '#2563eb' },
      { party: 'Independent', count: data.independents, color: '#6b7280' },
    ];

    const majorityThreshold = Math.floor(data.totalSeats / 2) + 1;

    return { seats, majorityThreshold };
  }, [data]);

  // Calculate percentages and angles for semicircle visualization
  const { chartData, totalAngle } = useMemo(() => {
    let currentAngle = 0;
    const chartData = seats.map(seat => {
      const percentage = (seat.count / data.totalSeats) * 100;
      const angle = (seat.count / data.totalSeats) * 180; // 180 degrees for semicircle
      const startAngle = currentAngle;
      currentAngle += angle;

      return {
        ...seat,
        percentage,
        angle,
        startAngle,
        endAngle: currentAngle,
      };
    });

    return { chartData, totalAngle: 180 };
  }, [seats, data.totalSeats]);

  // Generate SVG path for semicircle segments
  const generateArcPath = (startAngle: number, endAngle: number, radius: number) => {
    const centerX = 150;
    const centerY = 150;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(Math.PI - startAngleRad);
    const y1 = centerY - radius * Math.sin(Math.PI - startAngleRad);
    const x2 = centerX + radius * Math.cos(Math.PI - endAngleRad);
    const y2 = centerY - radius * Math.sin(Math.PI - endAngleRad);

    const largeArcFlag = endAngle - startAngle > 90 ? 1 : 0;

    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${x2} ${y2} Z`;
  };

  const getMajorityStatus = () => {
    const republicanMajority = data.republicans >= majorityThreshold;
    const democratMajority = data.democrats >= majorityThreshold;

    if (republicanMajority) {
      return { party: 'Republican', majority: true, color: '#dc2626' };
    } else if (democratMajority) {
      return { party: 'Democrat', majority: true, color: '#2563eb' };
    } else {
      return { party: 'None', majority: false, color: '#6b7280' };
    }
  };

  const majorityStatus = getMajorityStatus();

  return (
    <div className={`bg-white border border-gray-200 p-6 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Chart */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {data.chamber === 'house' ? 'House of Representatives' : 'Senate'} Composition
          </h3>

          <div className="relative">
            <svg width="300" height="200" viewBox="0 0 300 200" className="mx-auto">
              {/* Semicircle segments */}
              {chartData.map((segment, index) => (
                <path
                  key={segment.party}
                  d={generateArcPath(segment.startAngle, segment.endAngle, 120)}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="2"
                  className="hover:opacity-80 transition-opacity"
                />
              ))}

              {/* Center text showing total seats */}
              <text x="150" y="140" textAnchor="middle" className="text-lg font-bold fill-gray-700">
                {data.totalSeats}
              </text>
              <text x="150" y="160" textAnchor="middle" className="text-sm fill-gray-500">
                Total Seats
              </text>

              {/* Majority line indicator */}
              <line
                x1="150"
                y1="150"
                x2="30"
                y2="150"
                stroke="#374151"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.5"
              />
              <text x="25" y="145" textAnchor="end" className="text-xs fill-gray-500">
                Majority: {majorityThreshold}
              </text>
            </svg>
          </div>
        </div>

        {/* Legend and Statistics */}
        <div className="lg:w-80">
          <div className="space-y-4">
            {/* Majority Status */}
            <div className="bg-white p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Control</h4>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: majorityStatus.color }}
                ></div>
                <span className="font-medium" style={{ color: majorityStatus.color }}>
                  {majorityStatus.party} {majorityStatus.majority ? 'Majority' : 'Control'}
                </span>
              </div>
            </div>

            {/* Party Breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Breakdown</h4>
              <div className="space-y-3">
                {chartData.map(segment => (
                  <div key={segment.party} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: segment.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">{segment.party}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-900">{segment.count}</div>
                      <div className="text-xs text-gray-500">{segment.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Numbers */}
            <div className="bg-blue-50 p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Key Numbers</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Majority Needed:</span>
                  <span className="font-medium text-blue-900">{majorityThreshold}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Total Seats:</span>
                  <span className="font-medium text-blue-900">{data.totalSeats}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useMemo } from 'react';

interface HemicycleData {
  chamber: 'house' | 'senate';
  democrats: number;
  republicans: number;
  independents: number;
  totalSeats: number;
}

interface HemicycleChartProps {
  data: HemicycleData;
  className?: string;
}

export function HemicycleChart({ data, className = '' }: HemicycleChartProps) {
  const seats = useMemo(() => {
    // Create array of seats with party affiliation
    const allSeats = [];

    // Add seats by party (Republicans first, then Democrats, then Independents)
    for (let i = 0; i < data.republicans; i++) {
      allSeats.push({ party: 'Republican', color: '#dc2626' });
    }
    for (let i = 0; i < data.democrats; i++) {
      allSeats.push({ party: 'Democrat', color: '#2563eb' });
    }
    for (let i = 0; i < data.independents; i++) {
      allSeats.push({ party: 'Independent', color: '#6b7280' });
    }

    return allSeats;
  }, [data]);

  const { seatPositions, svgDimensions } = useMemo(() => {
    const totalSeats = seats.length;
    const radius = 180;
    const centerX = 280;
    const centerY = 220;

    // Calculate positions for hemicycle layout
    const positions = [];

    if (data.chamber === 'house') {
      // House: Multiple rows in semicircle
      const rowData = [
        { startRadius: 80, seats: Math.ceil(totalSeats * 0.15) },
        { startRadius: 110, seats: Math.ceil(totalSeats * 0.2) },
        { startRadius: 140, seats: Math.ceil(totalSeats * 0.25) },
        { startRadius: 170, seats: Math.ceil(totalSeats * 0.4) },
      ];

      let seatIndex = 0;
      rowData.forEach(row => {
        const seatsInRow = Math.min(row.seats, totalSeats - seatIndex);
        const angleSpan = Math.PI; // 180 degrees
        const angleStep = angleSpan / (seatsInRow + 1);

        for (let i = 0; i < seatsInRow; i++) {
          const angle = angleStep * (i + 1);
          const x = centerX + row.startRadius * Math.cos(Math.PI - angle);
          const y = centerY - row.startRadius * Math.sin(Math.PI - angle);

          if (seatIndex < totalSeats) {
            const seat = seats[seatIndex];
            if (seat) {
              positions.push({
                x,
                y,
                party: seat.party,
                color: seat.color,
              });
              seatIndex++;
            }
          }
        }
      });
    } else {
      // Senate: Single row semicircle (simpler layout)
      const angleSpan = Math.PI; // 180 degrees
      const angleStep = angleSpan / (totalSeats + 1);

      for (let i = 0; i < totalSeats; i++) {
        const angle = angleStep * (i + 1);
        const x = centerX + radius * Math.cos(Math.PI - angle);
        const y = centerY - radius * Math.sin(Math.PI - angle);

        const seat = seats[i];
        if (seat) {
          positions.push({
            x,
            y,
            party: seat.party,
            color: seat.color,
          });
        }
      }
    }

    return {
      seatPositions: positions,
      svgDimensions: { width: 560, height: 280 },
    };
  }, [seats, data.chamber]);

  const partyCounts = useMemo(() => {
    return [
      { party: 'Republican', count: data.republicans, color: '#dc2626' },
      { party: 'Democrat', count: data.democrats, color: '#2563eb' },
      { party: 'Independent', count: data.independents, color: '#6b7280' },
    ].filter(p => p.count > 0);
  }, [data]);

  const majorityThreshold = Math.floor(data.totalSeats / 2) + 1;
  const majorityParty =
    data.republicans >= majorityThreshold
      ? 'Republican'
      : data.democrats >= majorityThreshold
        ? 'Democrat'
        : 'None';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Hemicycle Chart */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {data.chamber === 'house' ? 'House of Representatives' : 'Senate'} Composition
          </h3>

          <div className="relative flex justify-center">
            <svg
              width={svgDimensions.width}
              height={svgDimensions.height}
              viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
              className="mx-auto"
            >
              {/* Individual seats */}
              {seatPositions.map((seat, index) => (
                <circle
                  key={index}
                  cx={seat.x}
                  cy={seat.y}
                  r={data.chamber === 'house' ? 3 : 5}
                  fill={seat.color}
                  stroke="white"
                  strokeWidth="0.5"
                  className="hover:opacity-80 transition-opacity"
                />
              ))}

              {/* Center line and labels */}
              <line
                x1={svgDimensions.width / 2}
                y1="30"
                x2={svgDimensions.width / 2}
                y2="220"
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="3,3"
              />

              {/* Total seats label */}
              <text
                x={svgDimensions.width / 2}
                y="250"
                textAnchor="middle"
                className="text-base font-medium fill-gray-700"
              >
                {data.totalSeats} Total Seats
              </text>
            </svg>
          </div>
        </div>

        {/* Legend and Statistics */}
        <div className="lg:w-80">
          <div className="space-y-4">
            {/* Control Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Control</h4>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{
                    backgroundColor:
                      majorityParty === 'Republican'
                        ? '#dc2626'
                        : majorityParty === 'Democrat'
                          ? '#2563eb'
                          : '#6b7280',
                  }}
                ></div>
                <span
                  className="font-medium"
                  style={{
                    color:
                      majorityParty === 'Republican'
                        ? '#dc2626'
                        : majorityParty === 'Democrat'
                          ? '#2563eb'
                          : '#6b7280',
                  }}
                >
                  {majorityParty} {majorityParty !== 'None' ? 'Majority' : 'Control'}
                </span>
              </div>
            </div>

            {/* Party Breakdown */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Party Breakdown</h4>
              <div className="space-y-3">
                {partyCounts.map(party => {
                  const percentage = (party.count / data.totalSeats) * 100;
                  return (
                    <div key={party.party} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: party.color }}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">{party.party}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">{party.count}</div>
                        <div className="text-xs text-gray-500">{percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Key Numbers */}
            <div className="bg-blue-50 rounded-lg p-4">
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
                {data.chamber === 'house' && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">Districts:</span>
                    <span className="font-medium text-blue-900">435</span>
                  </div>
                )}
                {data.chamber === 'senate' && (
                  <div className="flex justify-between">
                    <span className="text-blue-700">States:</span>
                    <span className="font-medium text-blue-900">50</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

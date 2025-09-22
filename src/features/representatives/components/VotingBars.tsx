/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';

interface VotingDistribution {
  yes: number;
  no: number;
  absent: number;
  present?: number;
}

interface VotingBarsProps {
  dist: VotingDistribution;
}

export function VotingBars({ dist }: VotingBarsProps) {
  const bars = [
    { label: 'Yes', pct: dist.yes, bg: 'bg-[#0a9338]' },
    { label: 'No', pct: dist.no, bg: 'bg-[#e11d07]' },
    { label: 'Absent', pct: dist.absent, bg: 'bg-gray-300' },
  ];

  return (
    <section className="mt-12">
      <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">Distribution</h2>
      <div className="space-y-4">
        {bars.map(b => (
          <div key={b.label} className="flex items-center gap-4">
            <span className="text-sm w-16 text-gray-700">{b.label}</span>
            <div className="flex-1 h-1 bg-white border-2 border-gray-300 rounded-full">
              <div
                className={`h-1 ${b.bg} rounded-full transition-all duration-300`}
                style={{ width: `${b.pct}%` }}
              />
            </div>
            <span className="text-sm text-gray-400 w-12 text-right">{b.pct}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

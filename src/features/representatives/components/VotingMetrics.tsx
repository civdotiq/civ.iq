/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import React from 'react';

interface VotingData {
  total: number;
  yes: number;
  no: number;
  present: number;
  absent?: number;
}

interface VotingMetricsProps {
  data: VotingData;
}

export function VotingMetrics({ data }: VotingMetricsProps) {
  const metrics = [
    { label: 'Total', value: data.total, color: '' },
    { label: 'Yes', value: data.yes, color: 'text-[#0a9338]' },
    { label: 'No', value: data.no, color: 'text-[#e11d07]' },
    { label: 'Present', value: data.present, color: 'text-gray-400' },
  ];

  return (
    <section>
      <h2 className="text-xs uppercase tracking-[0.15em] text-gray-400 mb-6">Voting Analysis</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
        {metrics.map(m => (
          <div key={m.label} className="group">
            <div className={`text-3xl font-light ${m.color || 'text-gray-900'}`}>{m.value}</div>
            <div className="text-xs text-gray-400 uppercase tracking-wider">{m.label} Votes</div>
          </div>
        ))}
      </div>
    </section>
  );
}

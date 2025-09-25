/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { Users, FileText, DollarSign, Award } from 'lucide-react';
import { AicherMetricCard } from './AicherMetricCard';

interface KeyStatsBarProps {
  stats: {
    billsSponsored?: number;
    votesParticipated?: number;
    totalRaised?: number;
    committees?: number;
  };
  loading?: boolean;
}

export function KeyStatsBar({ stats, loading = false }: KeyStatsBarProps) {
  // Format currency values
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  };

  return (
    <div className="aicher-grid aicher-grid-4">
      <AicherMetricCard
        icon={FileText}
        label="Bills Sponsored"
        value={stats.billsSponsored !== undefined ? stats.billsSponsored : '—'}
        subtitle="Current Congress"
        accentColor="blue"
        isLoading={loading}
      />

      <AicherMetricCard
        icon={Users}
        label="Votes Cast"
        value={stats.votesParticipated !== undefined ? stats.votesParticipated : '—'}
        subtitle="This term"
        accentColor="green"
        isLoading={loading}
      />

      <AicherMetricCard
        icon={DollarSign}
        label="Total Raised"
        value={stats.totalRaised !== undefined ? formatCurrency(stats.totalRaised) : '—'}
        subtitle="Current cycle"
        accentColor="red"
        isLoading={loading}
      />

      <AicherMetricCard
        icon={Award}
        label="Committees"
        value={stats.committees !== undefined ? stats.committees : '—'}
        subtitle="Current"
        accentColor="blue"
        isLoading={loading}
      />
    </div>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { TrendingUp, Users, FileText, DollarSign, Calendar, Award } from 'lucide-react';

interface KeyStatsBarProps {
  stats: {
    billsSponsored?: number;
    votesParticipated?: number;
    partyAlignment?: number;
    totalRaised?: number;
    yearsInOffice?: number;
    committees?: number;
  };
  loading?: boolean;
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'gray';
  loading?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  subtitle,
  color = 'blue',
  loading = false,
}: StatCardProps) {
  const colorClasses = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    red: 'text-red-600 bg-red-50',
    gray: 'text-gray-600 bg-gray-50',
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]} animate-pulse`}>{icon}</div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
            <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
            {subtitle && <div className="h-3 bg-gray-200 rounded animate-pulse w-12 mt-1"></div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
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

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${Math.round(value)}%`;
  };

  // Calculate years in office from terms or provide fallback
  const yearsInOffice = stats.yearsInOffice || 0;

  return (
    <div className="bg-gray-50 py-6">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard
            icon={<FileText className="w-5 h-5" />}
            label="Bills Sponsored"
            value={stats.billsSponsored ?? '—'}
            subtitle="Current Congress"
            color="blue"
            loading={loading}
          />

          <StatCard
            icon={<Users className="w-5 h-5" />}
            label="Votes Cast"
            value={stats.votesParticipated ?? '—'}
            subtitle="This term"
            color="green"
            loading={loading}
          />

          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Party Alignment"
            value={stats.partyAlignment ? formatPercentage(stats.partyAlignment) : '—'}
            subtitle="Voting record"
            color="purple"
            loading={loading}
          />

          <StatCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Total Raised"
            value={stats.totalRaised ? formatCurrency(stats.totalRaised) : '—'}
            subtitle="Current cycle"
            color="orange"
            loading={loading}
          />

          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="Years in Office"
            value={yearsInOffice || '—'}
            subtitle="Experience"
            color="red"
            loading={loading}
          />

          <StatCard
            icon={<Award className="w-5 h-5" />}
            label="Committees"
            value={stats.committees ?? '—'}
            subtitle="Current"
            color="gray"
            loading={loading}
          />
        </div>

        {/* Additional context for stats */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Statistics updated from Congress.gov, FEC, and official records • Some data may be
            incomplete
          </p>
        </div>
      </div>
    </div>
  );
}

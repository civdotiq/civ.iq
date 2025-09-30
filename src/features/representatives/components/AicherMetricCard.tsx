/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface AicherMetricCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subtitle?: string;
  accentColor: 'red' | 'green' | 'blue';
  isLoading?: boolean;
  className?: string;
}

export function AicherMetricCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accentColor,
  isLoading = false,
  className = '',
}: AicherMetricCardProps) {
  const getAccentClass = () => {
    switch (accentColor) {
      case 'red':
        return 'accent-bar-red';
      case 'green':
        return 'accent-bar-green';
      case 'blue':
        return 'accent-bar-blue';
    }
  };

  return (
    <div className={`stat-card ${getAccentClass()} ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-6 h-6 opacity-60">
          <Icon className="w-full h-full" strokeWidth={2} />
        </div>
        <span className="stat-label">{label}</span>
      </div>

      {isLoading ? (
        <div className="h-12 w-20 bg-gray-200 animate-pulse"></div>
      ) : (
        <div className="stat-number mb-2">
          {value === null || value === undefined ? '—' : value}
        </div>
      )}

      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}

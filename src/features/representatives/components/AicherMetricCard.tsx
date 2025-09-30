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
        return 'aicher-metric-accent-red';
      case 'green':
        return 'aicher-metric-accent-green';
      case 'blue':
        return 'aicher-metric-accent-blue';
    }
  };

  return (
    <div className={`aicher-metric-card ${className}`}>
      {/* Colored accent bar */}
      <div className={`aicher-metric-accent-bar ${getAccentClass()}`}></div>

      <div className="p-3 sm:p-4 sm:pl-8">
        {/* Metric header with icon */}
        <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
          <div className="w-6 h-6 opacity-80">
            <Icon className="w-full h-full" strokeWidth={2} />
          </div>
          <span className="aicher-heading-wide type-xs text-gray-600">{label}</span>
        </div>

        {/* Metric value */}
        <div className="mb-1">
          {isLoading ? (
            <div className="aicher-loading h-10 sm:h-12 w-16 sm:w-20"></div>
          ) : (
            <div className="text-2xl sm:text-3xl md:type-3xl font-black leading-none text-gray-900">
              {value === null || value === undefined ? '—' : value}
            </div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && <div className="type-xs sm:type-sm text-gray-600 font-medium">{subtitle}</div>}
      </div>
    </div>
  );
}

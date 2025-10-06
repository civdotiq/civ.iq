/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * Data Quality Badge Component
 *
 * Displays visual indicators of data completeness and confidence
 * Helps users understand the reliability of campaign finance information
 */

interface DataQualityBadgeProps {
  confidence: 'high' | 'medium' | 'low';
  completeness?: number; // 0-100
  label?: string;
  showTooltip?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function DataQualityBadge({
  confidence,
  completeness,
  label = 'Data Quality',
  showTooltip = true,
  size = 'medium',
}: DataQualityBadgeProps) {
  const config = {
    high: {
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: '✓',
      text: 'High Quality',
      description: 'Complete FEC data with detailed contribution information',
    },
    medium: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: '!',
      text: 'Moderate Quality',
      description: 'Partial FEC data available, some details may be limited',
    },
    low: {
      color: 'bg-red-100 text-red-800 border-red-300',
      icon: '?',
      text: 'Limited Data',
      description: 'Minimal FEC data available, may be incomplete or outdated',
    },
  };

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-sm px-3 py-1.5',
    large: 'text-base px-4 py-2',
  };

  const { color, icon, text, description } = config[confidence];

  return (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${color} ${sizeClasses[size]}`}
        title={showTooltip ? description : undefined}
        role="status"
        aria-label={`${label}: ${text}`}
      >
        <span className="font-bold" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
        {completeness !== undefined && <span className="ml-1 font-semibold">{completeness}%</span>}
      </span>

      {showTooltip && (
        <div className="group relative inline-block">
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
            aria-label="More information about data quality"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <div
            className="hidden group-hover:block absolute z-10 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg -top-2 left-6"
            role="tooltip"
          >
            <p className="font-semibold mb-1">{text}</p>
            <p className="text-gray-300">{description}</p>
            {completeness !== undefined && (
              <p className="mt-2 text-gray-400">Data Completeness: {completeness}%</p>
            )}
            <div className="absolute top-3 -left-1 w-2 h-2 bg-gray-900 transform rotate-45"></div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Compact Data Quality Indicator
 * Minimal badge for space-constrained layouts
 */
export function DataQualityIndicator({ confidence }: { confidence: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-green-500',
    medium: 'bg-yellow-500',
    low: 'bg-red-500',
  };

  const labels = {
    high: 'High quality data',
    medium: 'Moderate quality data',
    low: 'Limited data available',
  };

  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[confidence]}`}
      title={labels[confidence]}
      aria-label={labels[confidence]}
      role="status"
    ></span>
  );
}

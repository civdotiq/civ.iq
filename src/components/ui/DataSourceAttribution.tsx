/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * DataSourceAttribution Component
 *
 * Provides clear, visible attribution for all external data sources
 * as required for civic platform transparency and legal compliance.
 *
 * This component MUST be used wherever external data is displayed.
 */

// Using inline SVG icon instead of external dependency

interface DataSourceAttributionProps {
  /** Name of the data source (e.g., "Federal Election Commission") */
  sourceName: string;
  /** Optional URL to the data source */
  sourceUrl?: string;
  /** Additional context about the data (e.g., "via GDELT Project") */
  sourceContext?: string;
  /** Data freshness indicator */
  lastUpdated?: string;
  /** Data quality/reliability indicator */
  reliability?: 'high' | 'medium' | 'low';
  /** Optional disclaimer text */
  disclaimer?: string;
  /** Visual style variant */
  variant?: 'default' | 'compact' | 'prominent';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Standard data source configurations for consistency
 */
export const DATA_SOURCES = {
  CONGRESS: {
    sourceName: 'Congress.gov',
    sourceUrl: 'https://www.congress.gov/',
    reliability: 'high' as const,
  },
  FEC: {
    sourceName: 'Federal Election Commission',
    sourceUrl: 'https://www.fec.gov/',
    reliability: 'high' as const,
  },
  GDELT: {
    sourceName: 'GDELT Project',
    sourceUrl: 'https://www.gdeltproject.org/',
    sourceContext: 'Global Database of Events, Language, and Tone',
    reliability: 'medium' as const,
    disclaimer:
      'GDELT data quality varies by source and region. Articles are automatically collected and may not represent editorial viewpoints.',
  },
  WIKIDATA: {
    sourceName: 'Wikidata',
    sourceUrl: 'https://www.wikidata.org/',
    sourceContext: 'Wikimedia Foundation',
    reliability: 'medium' as const,
    disclaimer: 'Wikidata is collaboratively maintained and may contain inaccuracies.',
  },
  CENSUS: {
    sourceName: 'U.S. Census Bureau',
    sourceUrl: 'https://www.census.gov/',
    reliability: 'high' as const,
  },
} as const;

export function DataSourceAttribution({
  sourceName,
  sourceUrl,
  sourceContext,
  lastUpdated,
  reliability = 'medium',
  disclaimer,
  variant = 'default',
  className = '',
}: DataSourceAttributionProps) {
  const baseClasses = 'text-sm text-gray-600 border-l-2 pl-3';

  const variantClasses = {
    default: 'border-gray-300 bg-gray-50 p-3 rounded-r',
    compact: 'border-gray-200 py-1',
    prominent: 'border-civiq-blue bg-blue-50 p-4 rounded-r shadow-sm',
  };

  const reliabilityColors = {
    high: 'text-green-700 border-green-300',
    medium: 'text-yellow-700 border-yellow-300',
    low: 'text-red-700 border-red-300',
  };

  const reliabilityLabels = {
    high: 'High Reliability',
    medium: 'Medium Reliability',
    low: 'Low Reliability - Use Caution',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-1 mb-1">
            <span className="text-xs font-medium text-gray-500">Data provided by</span>
            {sourceUrl ? (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-civiq-blue hover:text-civiq-blue/80 transition-colors inline-flex items-center gap-1"
              >
                {sourceName}
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            ) : (
              <span className="font-semibold text-gray-800">{sourceName}</span>
            )}
            {sourceContext && <span className="text-xs text-gray-500">({sourceContext})</span>}
          </div>

          {variant !== 'compact' && (
            <div className="flex items-center gap-3 text-xs">
              <div className={`flex items-center gap-1 ${reliabilityColors[reliability]}`}>
                <div
                  className={`w-2 h-2 rounded-full ${
                    reliability === 'high'
                      ? 'bg-green-500'
                      : reliability === 'medium'
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                  }`}
                />
                {reliabilityLabels[reliability]}
              </div>

              {lastUpdated && (
                <span className="text-gray-500">
                  Updated: {new Date(lastUpdated).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {disclaimer && variant !== 'compact' && (
            <div className="mt-2 text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
              <strong>Note:</strong> {disclaimer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience components for common data sources
 */
export function CongressAttribution(
  props: Omit<DataSourceAttributionProps, 'sourceName' | 'sourceUrl' | 'reliability'>
) {
  return <DataSourceAttribution {...DATA_SOURCES.CONGRESS} {...props} />;
}

export function FECAttribution(
  props: Omit<DataSourceAttributionProps, 'sourceName' | 'sourceUrl' | 'reliability'>
) {
  return <DataSourceAttribution {...DATA_SOURCES.FEC} {...props} />;
}

export function GDELTAttribution(
  props: Omit<
    DataSourceAttributionProps,
    'sourceName' | 'sourceUrl' | 'reliability' | 'sourceContext' | 'disclaimer'
  >
) {
  return <DataSourceAttribution {...DATA_SOURCES.GDELT} {...props} />;
}

export function WikidataAttribution(
  props: Omit<
    DataSourceAttributionProps,
    'sourceName' | 'sourceUrl' | 'reliability' | 'sourceContext' | 'disclaimer'
  >
) {
  return <DataSourceAttribution {...DATA_SOURCES.WIKIDATA} {...props} />;
}

export function CensusAttribution(
  props: Omit<DataSourceAttributionProps, 'sourceName' | 'sourceUrl' | 'reliability'>
) {
  return <DataSourceAttribution {...DATA_SOURCES.CENSUS} {...props} />;
}

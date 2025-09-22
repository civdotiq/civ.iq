/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, Database, CheckCircle, AlertCircle, Info, ExternalLink } from 'lucide-react';

// Types for data transparency metadata
export interface DataMetadata {
  source: string;
  cached: boolean;
  fetchedAt: string;
  dataQuality: 'high' | 'medium' | 'low' | 'unavailable';
  ttl?: number;
  freshness?: string;
  validationScore?: number;
  dataSource?: string;
}

// Data source mapping to official URLs and display names
const DATA_SOURCES = {
  'congress.gov': {
    displayName: 'Congress.gov',
    url: 'https://www.congress.gov',
    description: 'Official U.S. Congress legislative data',
    color: 'bg-blue-600',
  },
  'congress-legislators': {
    displayName: 'Congress Legislators',
    url: 'https://github.com/unitedstates/congress-legislators',
    description: 'Open source congressional biographical data',
    color: 'bg-green-600',
  },
  'fec.gov': {
    displayName: 'FEC.gov',
    url: 'https://www.fec.gov',
    description: 'Federal Election Commission campaign finance data',
    color: 'bg-purple-600',
  },
  census: {
    displayName: 'U.S. Census',
    url: 'https://www.census.gov',
    description: 'Congressional district mapping data',
    color: 'bg-orange-600',
  },
  'house-senate-clerk-xml': {
    displayName: 'House/Senate Clerk',
    url: 'https://clerk.house.gov',
    description: 'Official voting records from House/Senate Clerk',
    color: 'bg-red-600',
  },
  gdelt: {
    displayName: 'GDELT Project',
    url: 'https://www.gdeltproject.org',
    description: 'Global news and events database',
    color: 'bg-gray-600',
  },
} as const;

interface DataSourceBadgeProps {
  source: string;
  className?: string;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function DataSourceBadge({
  source,
  className = '',
  showDescription = false,
  size = 'md',
}: DataSourceBadgeProps) {
  // Extract primary source from compound sources like"congress-legislators + census"
  const firstPart = source.split(' + ')[0] || '';
  const primarySource = (firstPart.split(' (')[0] || '').toLowerCase().trim();
  const sourceConfig = DATA_SOURCES[primarySource as keyof typeof DATA_SOURCES];

  if (!sourceConfig) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-white0 text-white ${className}`}
      >
        <Database className="w-3 h-3" />
        {source}
      </span>
    );
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={`inline-flex flex-col gap-1 ${className}`}>
      <Link
        href={sourceConfig?.url || '#'}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1 ${sizeClasses[size]} rounded-full text-white hover:opacity-90 transition-opacity ${sourceConfig?.color || 'bg-white0'}`}
        title={`Data from ${sourceConfig?.displayName || source}`}
      >
        <Database className={iconSizes[size]} />
        <span>{sourceConfig?.displayName || source}</span>
        <ExternalLink className={`${iconSizes[size]} opacity-70`} />
      </Link>
      {showDescription && sourceConfig?.description && (
        <span className="text-xs text-gray-600 max-w-48">{sourceConfig.description}</span>
      )}
    </div>
  );
}

interface CacheStatusIndicatorProps {
  cached: boolean;
  className?: string;
  showLabel?: boolean;
}

export function CacheStatusIndicator({
  cached,
  className = '',
  showLabel = true,
}: CacheStatusIndicatorProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
        cached
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-blue-100 text-blue-800 border border-blue-200'
      } ${className}`}
      title={cached ? 'Data served from cache for faster loading' : 'Fresh data from source'}
    >
      {cached ? (
        <Database className="w-3 h-3" />
      ) : (
        <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      )}
      {showLabel && <span>{cached ? 'Cached' : 'Fresh'}</span>}
    </div>
  );
}

interface DataQualityIndicatorProps {
  quality: 'high' | 'medium' | 'low' | 'unavailable';
  validationScore?: number;
  className?: string;
  showScore?: boolean;
}

export function DataQualityIndicator({
  quality,
  validationScore,
  className = '',
  showScore = false,
}: DataQualityIndicatorProps) {
  const qualityConfig = {
    high: {
      icon: CheckCircle,
      color: 'text-green-600 bg-green-50 border-green-200',
      label: 'High Quality',
      description: 'Complete and validated data',
    },
    medium: {
      icon: Info,
      color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      label: 'Medium Quality',
      description: 'Most data available with minor gaps',
    },
    low: {
      icon: AlertCircle,
      color: 'text-orange-600 bg-orange-50 border-orange-200',
      label: 'Low Quality',
      description: 'Limited data availability',
    },
    unavailable: {
      icon: AlertCircle,
      color: 'text-red-600 bg-red-50 border-red-200',
      label: 'Unavailable',
      description: 'Data currently unavailable',
    },
  };

  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${config.color} ${className}`}
      title={`${config.description}${validationScore ? ` (Score: ${validationScore}%)` : ''}`}
    >
      <Icon className="w-3 h-3" />
      <span>{config.label}</span>
      {showScore && validationScore && <span className="font-mono">({validationScore}%)</span>}
    </div>
  );
}

interface DataFreshnessIndicatorProps {
  fetchedAt: string | Date;
  ttl?: number;
  className?: string;
  format?: 'relative' | 'absolute' | 'both';
}

export function DataFreshnessIndicator({
  fetchedAt,
  ttl,
  className = '',
  format = 'relative',
}: DataFreshnessIndicatorProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Prevent hydration mismatch by only calculating time on client
  if (!isClient) {
    return (
      <div
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border text-gray-600 bg-white border-gray-200 ${className}`}
        title="Loading freshness info..."
      >
        <Clock className="w-3 h-3" />
        <span>Loading...</span>
      </div>
    );
  }

  const fetchDate = new Date(fetchedAt);
  const now = new Date();
  const ageMs = now.getTime() - fetchDate.getTime();
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);
  const ageDays = Math.floor(ageHours / 24);

  // Determine freshness level
  const freshness = ageMinutes < 5 ? 'fresh' : ageMinutes < 30 ? 'recent' : 'older';

  const freshnessColors = {
    fresh: 'text-green-600 bg-green-50 border-green-200',
    recent: 'text-blue-600 bg-blue-50 border-blue-200',
    older: 'text-gray-600 bg-white border-gray-200',
  };

  // Format relative time
  const getRelativeTime = () => {
    if (ageMinutes < 1) return 'Just now';
    if (ageMinutes < 60) return `${ageMinutes}m ago`;
    if (ageHours < 24) return `${ageHours}h ago`;
    return `${ageDays}d ago`;
  };

  // Format absolute time
  const getAbsoluteTime = () => {
    return fetchDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // TTL remaining
  const getTTLInfo = () => {
    if (!ttl) return null;
    const remaining = ttl - ageMs / 1000;
    if (remaining <= 0) return 'Expired';
    const remainingMinutes = Math.floor(remaining / 60);
    const remainingHours = Math.floor(remainingMinutes / 60);
    if (remainingHours > 0) return `${remainingHours}h left`;
    return `${remainingMinutes}m left`;
  };

  const displayText = () => {
    switch (format) {
      case 'absolute':
        return getAbsoluteTime();
      case 'both':
        return `${getRelativeTime()} (${getAbsoluteTime()})`;
      default:
        return getRelativeTime();
    }
  };

  const ttlInfo = getTTLInfo();

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full border ${freshnessColors[freshness]} ${className}`}
      title={`Data fetched: ${fetchDate.toLocaleString()}${ttlInfo ? ` • ${ttlInfo}` : ''}`}
    >
      <Clock className="w-3 h-3" />
      <span>{displayText()}</span>
      {ttlInfo && <span className="opacity-70">• {ttlInfo}</span>}
    </div>
  );
}

// Composite component that shows all transparency info
interface DataTransparencyPanelProps {
  metadata: DataMetadata;
  className?: string;
  layout?: 'horizontal' | 'vertical';
  showAll?: boolean;
}

export function DataTransparencyPanel({
  metadata,
  className = '',
  layout = 'horizontal',
  showAll = true,
}: DataTransparencyPanelProps) {
  const containerClass =
    layout === 'horizontal'
      ? 'flex flex-wrap items-center gap-2'
      : 'flex flex-col items-start gap-2';

  return (
    <div className={`${containerClass} ${className}`}>
      {showAll && <DataSourceBadge source={metadata.dataSource || metadata.source} size="sm" />}

      {showAll && <CacheStatusIndicator cached={metadata.cached} />}

      {metadata.dataQuality && metadata.dataQuality !== 'unavailable' && (
        <DataQualityIndicator
          quality={metadata.dataQuality}
          validationScore={metadata.validationScore}
          showScore={showAll}
        />
      )}

      <DataFreshnessIndicator
        fetchedAt={metadata.fetchedAt}
        ttl={metadata.ttl}
        format={showAll ? 'both' : 'relative'}
      />
    </div>
  );
}

// Utility function to extract metadata from API responses
export function extractTransparencyMetadata(
  apiResponse: Record<string, unknown>
): DataMetadata | null {
  if (!apiResponse || !apiResponse.metadata) return null;

  const meta = apiResponse.metadata as Record<string, unknown>;

  return {
    source: (meta.dataSource as string) || (meta.source as string) || 'unknown',
    cached: Boolean(meta.cached),
    fetchedAt:
      (meta.timestamp as string) ||
      (meta.generatedAt as string) ||
      (meta.lastUpdated as string) ||
      new Date().toISOString(),
    dataQuality: (meta.dataQuality as 'high' | 'medium' | 'low' | 'unavailable') || 'medium',
    ttl: meta.ttl as number | undefined,
    freshness: meta.freshness as string | undefined,
    validationScore: meta.validationScore as number | undefined,
    dataSource: (meta.dataSource as string) || (meta.source as string),
  };
}

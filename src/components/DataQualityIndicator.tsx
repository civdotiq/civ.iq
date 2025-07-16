'use client';


/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

interface DataQualityIndicatorProps {
  quality: 'high' | 'medium' | 'low' | 'unavailable';
  source: string;
  freshness?: string;
  className?: string;
}

function getFreshnessInfo(freshness?: string) {
  if (!freshness) return null;
  
  // Parse different freshness formats
  if (freshness.includes('Retrieved in')) {
    const timeMatch = freshness.match(/Retrieved in (\d+)ms/);
    if (timeMatch) {
      const ms = parseInt(timeMatch[1]);
      if (ms < 100) return { status: 'real-time', color: 'text-green-600', icon: '🔥' };
      if (ms < 1000) return { status: 'fast', color: 'text-blue-600', icon: '⚡' };
      return { status: 'live', color: 'text-orange-600', icon: '🐌' };
    }
  }
  
  if (freshness.includes('Failed after')) {
    return { status: 'failed', color: 'text-red-600', icon: '❌' };
  }
  
  if (freshness.includes('cached')) {
    return { status: 'cached', color: 'text-purple-600', icon: '💾' };
  }
  
  return { status: 'unknown', color: 'text-gray-600', icon: '❓' };
}

export function DataQualityIndicator({ quality, source, freshness, className = '' }: DataQualityIndicatorProps) {
  const getQualityConfig = () => {
    switch (quality) {
      case 'high':
        return {
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: '✓',
          label: 'High Quality',
          description: 'Complete and current data'
        };
      case 'medium':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: '⚠',
          label: 'Medium Quality',
          description: 'Some data may be missing'
        };
      case 'low':
        return {
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: '!',
          label: 'Low Quality',
          description: 'Limited data available'
        };
      case 'unavailable':
        return {
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: '✗',
          label: 'Unavailable',
          description: 'Data could not be retrieved'
        };
    }
  };

  const config = getQualityConfig();
  const freshnessInfo = getFreshnessInfo(freshness);

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-md border text-xs font-medium ${config.color} ${className}`}>
      <span className="text-xs">{config.icon}</span>
      <span>{config.label}</span>
      {freshnessInfo && (
        <span className={`text-xs ${freshnessInfo.color}`}>
          • {freshnessInfo.icon} {freshnessInfo.status}
        </span>
      )}
    </div>
  );
}

interface ErrorStateProps {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    zipCode: string;
    dataQuality: 'high' | 'medium' | 'low' | 'unavailable';
    dataSource: string;
    cacheable: boolean;
    freshness?: string;
  };
  onRetry?: () => void;
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diff = now - time;
  
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export function ErrorState({ error, metadata, onRetry }: ErrorStateProps) {
  const getErrorIcon = () => {
    switch (error.code) {
      case 'DISTRICT_NOT_FOUND':
      case 'INVALID_ZIP_CODE':
        return '🔍';
      case 'SERVICE_TEMPORARILY_UNAVAILABLE':
      case 'SERVICE_TIMEOUT':
        return '⏱️';
      case 'REPRESENTATIVES_DATA_UNAVAILABLE':
        return '📊';
      case 'CONFIGURATION_ERROR':
        return '⚙️';
      default:
        return '❌';
    }
  };

  const getErrorSeverity = () => {
    switch (error.code) {
      case 'DISTRICT_NOT_FOUND':
      case 'INVALID_ZIP_CODE':
        return 'warning';
      case 'SERVICE_TEMPORARILY_UNAVAILABLE':
      case 'SERVICE_TIMEOUT':
        return 'error';
      case 'CONFIGURATION_ERROR':
        return 'error';
      default:
        return 'error';
    }
  };

  const severity = getErrorSeverity();
  const severityStyles = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className={`p-6 rounded-lg border ${severityStyles[severity]}`}>
      <div className="flex items-start gap-4">
        <span className="text-2xl">{getErrorIcon()}</span>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">{error.message}</h3>
          
          {error.details && typeof error.details === 'string' && (
            <p className="text-sm mb-4 opacity-90">{error.details}</p>
          )}
          
          {error.details && typeof error.details === 'object' && (
            <div className="text-sm mb-4 opacity-90">
              <p className="font-medium mb-2">Additional Details:</p>
              <pre className="bg-black/10 p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs opacity-75 mb-4">
            <span>Error Code: {error.code}</span>
            <span>Occurred: {getTimeAgo(metadata.timestamp)}</span>
            {metadata.freshness && <span>{metadata.freshness}</span>}
            <DataSourceBadge source={metadata.dataSource} />
          </div>

          <div className="flex items-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            )}
            <DataQualityIndicator
              quality={metadata.dataQuality}
              source={metadata.dataSource}
              freshness={metadata.freshness}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface DataSourceBadgeProps {
  source: string;
  className?: string;
  showTrustLevel?: boolean;
}

export function DataSourceBadge({ source, className = '', showTrustLevel = false }: DataSourceBadgeProps) {
  const getSourceConfig = () => {
    if (source.includes('congress-legislators')) {
      return {
        color: 'bg-blue-100 text-blue-800',
        icon: '🏛️',
        label: 'Congress Data',
        trustLevel: 'official',
        trustScore: 95
      };
    } else if (source.includes('census')) {
      return {
        color: 'bg-green-100 text-green-800',
        icon: '🗺️',
        label: 'Census Data',
        trustLevel: 'official',
        trustScore: 98
      };
    } else if (source.includes('congress.gov')) {
      return {
        color: 'bg-blue-100 text-blue-800',
        icon: '⚖️',
        label: 'Congress.gov',
        trustLevel: 'official',
        trustScore: 99
      };
    } else if (source.includes('fec')) {
      return {
        color: 'bg-purple-100 text-purple-800',
        icon: '💰',
        label: 'FEC Data',
        trustLevel: 'official',
        trustScore: 92
      };
    } else if (source.includes('mock') || source.includes('fallback')) {
      return {
        color: 'bg-gray-100 text-gray-800',
        icon: '🔧',
        label: 'Test Data',
        trustLevel: 'synthetic',
        trustScore: 0
      };
    } else if (source.includes('error') || source.includes('failed')) {
      return {
        color: 'bg-red-100 text-red-800',
        icon: '❌',
        label: 'Error',
        trustLevel: 'error',
        trustScore: 0
      };
    } else {
      return {
        color: 'bg-gray-100 text-gray-800',
        icon: '📊',
        label: 'Data',
        trustLevel: 'unknown',
        trustScore: 50
      };
    }
  };

  const config = getSourceConfig();

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.color} ${className}`}>
      <span className="text-xs">{config.icon}</span>
      {config.label}
      {showTrustLevel && (
        <span className="text-xs opacity-75">({config.trustScore}% trust)</span>
      )}
    </span>
  );
}
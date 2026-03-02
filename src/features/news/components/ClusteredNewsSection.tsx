/**
 * ClusteredNewsSection - Drop-in replacement for SimpleNewsSection
 *
 * Fetches news articles, clusters them via NewsClusteringEngine,
 * and renders interactive ClusterControls + NewsClusterComponent list.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { EnhancedArticle, enhanceArticle, NewsArticle } from '../types/news';
import { NewsClusteringEngine, NewsCluster } from '../services/news-clustering-engine';
import { NewsClusterComponent, NewsViewMode } from './NewsCluster';
import { ClusterControls, NewsFilters } from './ClusterControls';
import { LoadingSkeleton } from './LoadingSkeleton';

export interface ClusteredNewsSectionProps {
  representative: EnhancedRepresentative;
  initialLimit?: number;
  className?: string;
  apiEndpoint?: string;
}

const DEFAULT_FILTERS: NewsFilters = {
  timeframe: '7d',
  sources: 'all',
  storyType: 'all',
  sortBy: 'relevance',
};

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function ClusteredNewsSection({
  representative,
  initialLimit = 20,
  className = '',
  apiEndpoint,
}: ClusteredNewsSectionProps) {
  const [clusters, setClusters] = useState<NewsCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NewsFilters>(DEFAULT_FILTERS);
  const [viewMode, setViewMode] = useState<NewsViewMode>('headlines');
  const engineRef = useRef(new NewsClusteringEngine());
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const articlesRef = useRef<EnhancedArticle[]>([]);

  const endpoint = apiEndpoint || `/api/representative/${representative.bioguideId}/news`;

  const fetchAndCluster = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${endpoint}?limit=${initialLimit}&page=1`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawArticles: NewsArticle[] = data.articles || [];

      if (rawArticles.length === 0) {
        setClusters([]);
        articlesRef.current = [];
        setLoading(false);
        return;
      }

      const enhanced = rawArticles.map(enhanceArticle);
      articlesRef.current = enhanced;

      const timeWindowMap: Record<string, number> = {
        realtime: 6,
        '24h': 24,
        '7d': 168,
        '30d': 720,
      };

      const engine = new NewsClusteringEngine({
        timeWindowHours: timeWindowMap[filters.timeframe] || 168,
      });
      engineRef.current = engine;

      const focusKeywords = [representative.lastName || '', representative.firstName || ''].filter(
        Boolean
      );

      let result = await engine.clusterArticles(enhanced, {
        maxClusters: 15,
        focusKeywords,
      });

      // Apply story type filter
      if (filters.storyType !== 'all') {
        result = result.filter(c => c.storyType === filters.storyType);
      }

      // Apply sort
      if (filters.sortBy === 'recency') {
        result.sort(
          (a, b) =>
            new Date(b.primaryArticle.publishedDate).getTime() -
            new Date(a.primaryArticle.publishedDate).getTime()
        );
      } else if (filters.sortBy === 'activity') {
        result.sort((a, b) => b.relatedArticles.length - a.relatedArticles.length);
      }

      setClusters(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
      setClusters([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, initialLimit, filters, representative.lastName, representative.firstName]);

  // Initial fetch + refetch on filter changes
  useEffect(() => {
    fetchAndCluster();
  }, [fetchAndCluster]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      fetchAndCluster();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchAndCluster]);

  const handleRefresh = useCallback(() => {
    fetchAndCluster();
  }, [fetchAndCluster]);

  // Loading state
  if (loading && clusters.length === 0) {
    return (
      <div className={className}>
        <div className="mb-4">
          <h2 className="aicher-heading type-xl text-gray-900 mb-4">Recent News Coverage</h2>
        </div>
        <LoadingSkeleton count={3} viewMode={viewMode} />
      </div>
    );
  }

  // Error state
  if (error && clusters.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">!</div>
          <div className="aicher-heading type-lg text-gray-900 mb-2">Unable to load news</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm font-medium bg-[#3ea2d4] text-white border-2 border-[#3ea2d4] hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (clusters.length === 0 && !loading) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">--</div>
          <div className="aicher-heading type-lg text-gray-900 mb-2">No recent news coverage</div>
          <div className="text-sm text-gray-600">
            No recent articles found for {representative.firstName} {representative.lastName}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="aicher-heading type-xl text-gray-900 mb-4">Recent News Coverage</h2>
      </div>

      <ClusterControls
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        clustersCount={clusters.length}
        onRefresh={handleRefresh}
        isLoading={loading}
        className="mb-6"
      />

      <div className="space-y-6">
        {clusters.map((cluster, index) => (
          <NewsClusterComponent
            key={cluster.id}
            cluster={cluster}
            viewMode={viewMode}
            index={index}
            representative={representative}
          />
        ))}
      </div>

      {/* Attribution */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
        News data from{' '}
        <a
          href="https://news.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Google News RSS
        </a>
      </div>
    </div>
  );
}

export default ClusteredNewsSection;

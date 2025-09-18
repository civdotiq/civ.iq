/**
 * Google News-Style Feed Component
 * Phase 3: UI/UX Transformation
 *
 * Main component that displays clustered news in a Google News-style layout
 * with topic navigation, filtering, and responsive design.
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import {
  ParallelSearchOrchestrator,
  MergedSearchResults,
} from '../services/parallel-search-orchestrator';
import { ArticleClusteringEngine, NewsCluster } from '../services/article-clustering-engine';
import { SearchDimension } from '../services/gdelt-query-builder-v2';
import { NewsClusterCard } from './NewsClusterCard';
import { TopicNavigation } from './TopicNavigation';
import { NewsFilters } from './NewsFilters';
import { LoadingSkeleton } from './LoadingSkeleton';
import logger from '@/lib/logging/simple-logger';

/**
 * View mode types for different news layouts
 */
export type NewsViewMode = 'headlines' | 'topics' | 'timeline' | 'coverage';

/**
 * Filter options for news display
 */
export interface NewsFilters {
  timeframe: 'realtime' | '24h' | '7d' | '30d';
  sources: 'all' | 'top-tier' | 'diverse';
  storyType: 'all' | 'breaking' | 'developing' | 'ongoing';
  dimension: 'all' | SearchDimension;
  sortBy: 'relevance' | 'recency' | 'activity';
}

/**
 * Props for GoogleNewsStyleFeed
 */
export interface GoogleNewsStyleFeedProps {
  representative: EnhancedRepresentative;
  viewMode?: NewsViewMode;
  maxClusters?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * Google News-Style Feed Component
 */
export function GoogleNewsStyleFeed({
  representative,
  viewMode = 'headlines',
  maxClusters = 10,
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
}: GoogleNewsStyleFeedProps) {
  // State management
  const [clusters, setClusters] = useState<NewsCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NewsFilters>({
    timeframe: '7d',
    sources: 'all',
    storyType: 'all',
    dimension: 'all',
    sortBy: 'relevance',
  });
  const [activeViewMode, setActiveViewMode] = useState<NewsViewMode>(viewMode);
  const [searchMetrics, setSearchMetrics] = useState<{
    totalQueries: number;
    totalResults: number;
    cacheHitRate: number;
    searchTime: number;
  } | null>(null);

  // Initialize services
  const orchestrator = useMemo(
    () =>
      new ParallelSearchOrchestrator({
        maxConcurrentRequests: 5,
        requestTimeoutMs: 8000,
        maxArticlesPerDimension: 30,
      }),
    []
  );

  const clusteringEngine = useMemo(
    () =>
      new ArticleClusteringEngine({
        minClusterSize: 2,
        maxClusterSize: 25,
        similarityThreshold: 0.4,
        timeWindowHours: 48,
        enableSubClustering: true,
      }),
    []
  );

  // Fetch and cluster news
  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Fetching news for representative', {
        component: 'GoogleNewsStyleFeed',
        metadata: {
          representative: representative.bioguideId,
          filters,
          viewMode: activeViewMode,
        },
      });

      // Phase 1: Multi-dimensional search
      const searchResults: MergedSearchResults = await orchestrator.executeParallelSearch(
        representative,
        {
          timeframe: filters.timeframe,
          focusDimensions: filters.dimension !== 'all' ? [filters.dimension] : undefined,
          maxResults: maxClusters * 8, // Get more articles than needed for clustering
        }
      );

      // Update search metrics
      setSearchMetrics({
        totalQueries: searchResults.searchStrategy.totalQueries,
        totalResults: searchResults.totalResults,
        cacheHitRate: searchResults.searchStrategy.cacheHitRate,
        searchTime: searchResults.searchStrategy.totalTimeMs,
      });

      if (searchResults.articles.length === 0) {
        setClusters([]);
        return;
      }

      // Phase 2: Cluster articles
      const newsClusters = await clusteringEngine.clusterArticles(searchResults.articles, {
        clusteringMethod: 'hierarchical',
        maxClusters,
      });

      // Apply filters
      const filteredClusters = applyFilters(newsClusters, filters);

      setClusters(filteredClusters);

      logger.info('News clustering completed', {
        component: 'GoogleNewsStyleFeed',
        metadata: {
          clustersFound: newsClusters.length,
          clustersDisplayed: filteredClusters.length,
          totalArticles: searchResults.totalResults,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch news';
      setError(errorMsg);
      logger.error('News fetch failed', {
        component: 'GoogleNewsStyleFeed',
        error: err as Error,
        metadata: { representative: representative.bioguideId },
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters to clusters
  const applyFilters = (clusters: NewsCluster[], filters: NewsFilters): NewsCluster[] => {
    let filtered = [...clusters];

    // Filter by story type
    if (filters.storyType !== 'all') {
      filtered = filtered.filter(cluster => cluster.topicType === filters.storyType);
    }

    // Filter by dimension
    if (filters.dimension !== 'all') {
      filtered = filtered.filter(cluster =>
        cluster.metadata.dimensions.includes(filters.dimension as SearchDimension)
      );
    }

    // Filter by source quality
    if (filters.sources === 'top-tier') {
      const topTierSources = [
        'reuters',
        'apnews',
        'npr',
        'bbc',
        'wsj',
        'nytimes',
        'washingtonpost',
      ];
      filtered = filtered.filter(cluster =>
        cluster.articles.some(article =>
          topTierSources.some(source => article.source.toLowerCase().includes(source))
        )
      );
    } else if (filters.sources === 'diverse') {
      filtered = filtered.filter(cluster => cluster.metadata.diversityScore > 0.5);
    }

    // Sort clusters
    switch (filters.sortBy) {
      case 'relevance':
        filtered.sort((a, b) => b.metadata.relevanceScore - a.metadata.relevanceScore);
        break;
      case 'recency':
        filtered.sort(
          (a, b) =>
            new Date(b.timeline.lastUpdate).getTime() - new Date(a.timeline.lastUpdate).getTime()
        );
        break;
      case 'activity':
        filtered.sort((a, b) => b.articles.length - a.articles.length);
        break;
    }

    return filtered;
  };

  // Get topic tabs based on available clusters
  const getTopicTabs = (): Array<{ id: string; label: string; count: number }> => {
    const tabs = [{ id: 'all', label: 'All News', count: clusters.length }];

    // Add dimension-based tabs
    const dimensionCounts = new Map<SearchDimension, number>();
    clusters.forEach(cluster => {
      cluster.metadata.dimensions.forEach(dim => {
        dimensionCounts.set(dim, (dimensionCounts.get(dim) || 0) + 1);
      });
    });

    // Add tabs for dimensions with multiple clusters
    dimensionCounts.forEach((count, dimension) => {
      if (count >= 2) {
        tabs.push({
          id: dimension,
          label: formatDimensionLabel(dimension),
          count,
        });
      }
    });

    // Add story type tabs
    const storyTypes = ['breaking', 'developing', 'ongoing'] as const;
    storyTypes.forEach(type => {
      const count = clusters.filter(c => c.topicType === type).length;
      if (count > 0) {
        tabs.push({
          id: type,
          label: formatStoryTypeLabel(type),
          count,
        });
      }
    });

    return tabs;
  };

  // Format dimension label for display
  const formatDimensionLabel = (dimension: SearchDimension): string => {
    const labels: Record<SearchDimension, string> = {
      [SearchDimension.IDENTITY]: 'Direct Mentions',
      [SearchDimension.COMMITTEE]: 'Committee Work',
      [SearchDimension.POLICY]: 'Policy Issues',
      [SearchDimension.GEOGRAPHIC]: 'State/District',
      [SearchDimension.TEMPORAL]: 'Current Events',
      [SearchDimension.LEADERSHIP]: 'Leadership',
      [SearchDimension.PARTY]: 'Party Politics',
      [SearchDimension.CROSS_REF]: 'Related',
    };
    return labels[dimension] || dimension;
  };

  // Format story type label
  const formatStoryTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      breaking: '🚨 Breaking',
      developing: '📈 Developing',
      ongoing: '📰 Ongoing',
      background: '📋 Background',
    };
    return labels[type] || type;
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchNews();

    if (autoRefresh) {
      const interval = setInterval(fetchNews, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined; // Explicit return for when autoRefresh is false
  }, [representative.bioguideId, filters, autoRefresh, refreshInterval]);

  // Render clusters based on view mode
  const renderClusters = () => {
    if (loading) {
      return <LoadingSkeleton count={5} />;
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">⚠️ Failed to load news</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={fetchNews}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (clusters.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-600 mb-4">📰 No news found</div>
          <div className="text-sm text-gray-500">
            Try adjusting your filters or check back later
          </div>
        </div>
      );
    }

    return (
      <div className={getLayoutClasses()}>
        {clusters.map((cluster, index) => (
          <NewsClusterCard
            key={cluster.id}
            cluster={cluster}
            viewMode={activeViewMode}
            index={index}
            representative={representative}
          />
        ))}
      </div>
    );
  };

  // Get layout classes based on view mode
  const getLayoutClasses = (): string => {
    switch (activeViewMode) {
      case 'headlines':
        return 'space-y-6';
      case 'topics':
        return 'grid grid-cols-1 lg:grid-cols-2 gap-6';
      case 'timeline':
        return 'space-y-4';
      case 'coverage':
        return 'space-y-8';
      default:
        return 'space-y-6';
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with metrics */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            News Coverage: {representative.firstName} {representative.lastName}
          </h2>

          {searchMetrics && (
            <div className="text-sm text-gray-500">
              {searchMetrics.totalResults} articles • {searchMetrics.totalQueries} queries •
              {(searchMetrics.cacheHitRate * 100).toFixed(0)}% cached •{searchMetrics.searchTime}ms
            </div>
          )}
        </div>

        {/* Topic Navigation */}
        <TopicNavigation
          tabs={getTopicTabs()}
          activeTab={filters.dimension === 'all' ? 'all' : filters.dimension}
          onTabChange={tabId => {
            setFilters(prev => ({
              ...prev,
              dimension: tabId === 'all' ? 'all' : (tabId as SearchDimension),
            }));
          }}
        />
      </div>

      {/* Filters and Controls */}
      <div className="mb-6">
        <NewsFilters
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={activeViewMode}
          onViewModeChange={setActiveViewMode}
          clusters={clusters}
        />
      </div>

      {/* Main Content */}
      <div className="mb-8">{renderClusters()}</div>

      {/* Footer with attribution */}
      {clusters.length > 0 && (
        <div className="text-center py-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            News data powered by{' '}
            <a
              href="https://www.gdeltproject.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GDELT Project
            </a>{' '}
            • Updated every 5 minutes
          </div>
        </div>
      )}
    </div>
  );
}

export default GoogleNewsStyleFeed;

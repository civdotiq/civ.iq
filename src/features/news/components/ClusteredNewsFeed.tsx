/**
 * ClusteredNewsFeed - Main Google News-Style Feed Component
 * Phase 3: UI/UX Transformation
 *
 * This component provides the main interface for displaying clustered news
 * with Google News-style layout, filtering, and interactive features.
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { NewsClusteringEngine, NewsCluster } from '../services/news-clustering-engine';
import { enhanceGdeltArticle, EnhancedArticle } from '../types/news';
import { NewsClusterComponent } from './NewsCluster';
import { ClusterControls } from './ClusterControls';
import { TopicNavigation } from './TopicNavigation';
import { LoadingSkeleton } from './LoadingSkeleton';
import logger from '@/lib/logging/simple-logger';
// import styles from '../styles/news-feed.module.css';

/**
 * View modes for different layout styles
 */
export type NewsViewMode = 'headlines' | 'topics' | 'timeline' | 'coverage';

/**
 * Filter configuration for news display
 */
export interface NewsFilters {
  timeframe: 'realtime' | '24h' | '7d' | '30d';
  sources: 'all' | 'top-tier' | 'diverse';
  storyType: 'all' | 'breaking' | 'developing' | 'ongoing';
  sortBy: 'relevance' | 'recency' | 'activity';
}

/**
 * Props for ClusteredNewsFeed component
 */
export interface ClusteredNewsFeedProps {
  representative: EnhancedRepresentative;
  viewMode?: NewsViewMode;
  maxClusters?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  className?: string;
}

/**
 * Main ClusteredNewsFeed component
 */
export function ClusteredNewsFeed({
  representative,
  viewMode = 'headlines',
  maxClusters = 10,
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
  className = '',
}: ClusteredNewsFeedProps) {
  // State management
  const [clusters, setClusters] = useState<NewsCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NewsFilters>({
    timeframe: '7d',
    sources: 'all',
    storyType: 'all',
    sortBy: 'relevance',
  });
  const [activeViewMode, setActiveViewMode] = useState<NewsViewMode>(viewMode);
  const [searchMetrics, setSearchMetrics] = useState<{
    totalArticles: number;
    clustersCreated: number;
    processingTime: number;
  } | null>(null);

  // Initialize clustering engine
  const clusteringEngine = useMemo(
    () =>
      new NewsClusteringEngine({
        minClusterSize: 2,
        maxClusterSize: 15,
        similarityThreshold: 0.4,
        timeWindowHours: getTimeWindowHours(filters.timeframe),
        visualPriorityWeights: {
          recency: 0.3,
          sourceQuality: 0.25,
          topicImportance: 0.25,
          engagementPrediction: 0.2,
        },
      }),
    [filters.timeframe]
  );

  /**
   * Convert timeframe filter to hours
   */
  function getTimeWindowHours(timeframe: NewsFilters['timeframe']): number {
    switch (timeframe) {
      case 'realtime':
        return 2;
      case '24h':
        return 24;
      case '7d':
        return 168;
      case '30d':
        return 720;
      default:
        return 168;
    }
  }

  /**
   * Fetch and cluster news data
   */
  const fetchNews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();

      logger.info('Fetching news for clustering', {
        component: 'ClusteredNewsFeed',
        metadata: {
          representative: representative.bioguideId,
          filters,
          viewMode: activeViewMode,
        },
      });

      // Fetch raw news data from GDELT API
      const response = await fetch(
        `/api/representative/${representative.bioguideId}/news?limit=${maxClusters * 3}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch news data');
      }

      const newsData = await response.json();

      if (!newsData.articles || newsData.articles.length === 0) {
        setClusters([]);
        setSearchMetrics({
          totalArticles: 0,
          clustersCreated: 0,
          processingTime: Date.now() - startTime,
        });
        return;
      }

      // Convert to enhanced articles
      const enhancedArticles: EnhancedArticle[] = newsData.articles.map(
        (article: {
          url: string;
          title: string;
          seendate: string;
          domain: string;
          language?: string;
          sourcecountry?: string;
          socialimage?: string;
          urlmobile?: string;
        }) => enhanceGdeltArticle(article, 0.5, [], [])
      );

      // Cluster articles using the enhanced engine
      const newsClusters = await clusteringEngine.clusterArticles(enhancedArticles, {
        maxClusters,
        focusKeywords: [
          representative.firstName,
          representative.lastName,
          representative.state,
          'congress',
          'senate',
          'house',
        ],
      });

      // Apply additional filters
      const filteredClusters = applyFilters(newsClusters, filters);

      setClusters(filteredClusters);
      setSearchMetrics({
        totalArticles: enhancedArticles.length,
        clustersCreated: filteredClusters.length,
        processingTime: Date.now() - startTime,
      });

      logger.info('News clustering completed', {
        component: 'ClusteredNewsFeed',
        metadata: {
          totalArticles: enhancedArticles.length,
          clustersCreated: filteredClusters.length,
          processingTime: Date.now() - startTime,
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch news';
      setError(errorMsg);
      logger.error('News clustering failed', {
        component: 'ClusteredNewsFeed',
        error: err as Error,
        metadata: { representative: representative.bioguideId },
      });
    } finally {
      setLoading(false);
    }
  }, [representative, filters, maxClusters, activeViewMode, clusteringEngine]);

  /**
   * Apply filters to clusters
   */
  const applyFilters = (clusters: NewsCluster[], filters: NewsFilters): NewsCluster[] => {
    let filtered = [...clusters];

    // Filter by story type
    if (filters.storyType !== 'all') {
      filtered = filtered.filter(cluster => cluster.storyType === filters.storyType);
    }

    // Filter by source quality
    if (filters.sources === 'top-tier') {
      const topTierSources = [
        'reuters.com',
        'apnews.com',
        'npr.org',
        'bbc.com',
        'wsj.com',
        'nytimes.com',
        'washingtonpost.com',
        'politico.com',
        'thehill.com',
        'rollcall.com',
      ];
      filtered = filtered.filter(cluster =>
        cluster.relatedArticles.some(article =>
          topTierSources.some(source => article.domain.includes(source))
        )
      );
    } else if (filters.sources === 'diverse') {
      filtered = filtered.filter(cluster => cluster.diversityScore > 0.5);
    }

    // Sort clusters
    switch (filters.sortBy) {
      case 'relevance':
        filtered.sort((a, b) => b.relevanceScore - a.relevanceScore);
        break;
      case 'recency':
        filtered.sort((a, b) => b.freshness - a.freshness);
        break;
      case 'activity':
        filtered.sort((a, b) => b.relatedArticles.length - a.relatedArticles.length);
        break;
    }

    return filtered;
  };

  /**
   * Get topic tabs for navigation
   */
  const getTopicTabs = () => {
    const tabs = [{ id: 'all', label: 'All News', count: clusters.length }];

    // Add story type tabs
    const storyTypes = ['breaking', 'developing', 'ongoing'] as const;
    storyTypes.forEach(type => {
      const count = clusters.filter(c => c.storyType === type).length;
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

  /**
   * Format story type label for display
   */
  const formatStoryTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      breaking: '🚨 Breaking',
      developing: '📈 Developing',
      ongoing: '📰 Ongoing',
      background: '📋 Background',
    };
    return labels[type] || type;
  };

  /**
   * Auto-refresh effect
   */
  useEffect(() => {
    fetchNews();

    if (autoRefresh) {
      const interval = setInterval(fetchNews, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchNews, autoRefresh, refreshInterval]);

  /**
   * Get layout classes based on view mode
   */
  const getLayoutClasses = (): string => {
    const baseClasses = 'grid gap-6';
    switch (activeViewMode) {
      case 'headlines':
        return `${baseClasses} grid-cols-1`;
      case 'topics':
        return `${baseClasses} grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`;
      case 'timeline':
        return `${baseClasses} grid-cols-1 max-w-4xl mx-auto`;
      case 'coverage':
        return `${baseClasses} grid-cols-12 gap-4`;
      default:
        return `${baseClasses} grid-cols-1`;
    }
  };

  /**
   * Render main content based on state
   */
  const renderContent = () => {
    if (loading) {
      return <LoadingSkeleton count={3} viewMode={activeViewMode} />;
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">⚠️ Failed to load news</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={fetchNews}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (clusters.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-600 mb-4">📰 No current news coverage available</div>
          <div className="text-sm text-gray-500">
            No recent news articles found for {representative.firstName} {representative.lastName}
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Data source: GDELT Project • Check back later for updates
          </div>
        </div>
      );
    }

    return (
      <div className={getLayoutClasses()}>
        {clusters.map((cluster, index) => (
          <NewsClusterComponent
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

  return (
    <div className={`max-w-7xl mx-auto px-4 ${className}`} style={{ backgroundColor: '#f8f9fa' }}>
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-3xl font-bold text-gray-900 leading-tight">
            📰 News Coverage: {representative.firstName} {representative.lastName}
          </h2>

          {searchMetrics && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md font-medium">
                {searchMetrics.totalArticles} articles
              </span>
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-md font-medium">
                {searchMetrics.clustersCreated} clusters
              </span>
              <span className="text-gray-400">•</span>
              <span>{searchMetrics.processingTime}ms</span>
            </div>
          )}
        </div>

        {/* Topic Navigation */}
        <TopicNavigation
          tabs={getTopicTabs()}
          activeTab="all"
          onTabChange={(tabId: string) => {
            setFilters(prev => ({
              ...prev,
              storyType: tabId === 'all' ? 'all' : (tabId as NewsFilters['storyType']),
            }));
          }}
        />
      </div>

      {/* Controls */}
      <div className="mb-6">
        <ClusterControls
          filters={filters}
          onFiltersChange={setFilters}
          viewMode={activeViewMode}
          onViewModeChange={setActiveViewMode}
          clustersCount={clusters.length}
          onRefresh={fetchNews}
          isLoading={loading}
        />
      </div>

      {/* Main Content */}
      <div className="mb-8">{renderContent()}</div>

      {/* Footer */}
      {clusters.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 text-center py-6">
          <div className="text-sm text-gray-500">
            Real news data from{' '}
            <a
              href="https://www.gdeltproject.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-medium"
            >
              GDELT Project
            </a>{' '}
            • Enhanced clustering • Updates every 5 minutes
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Showing authentic news coverage with intelligent grouping
          </div>
        </div>
      )}
    </div>
  );
}

export default ClusteredNewsFeed;

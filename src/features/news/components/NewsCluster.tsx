/**
 * NewsCluster - Individual News Cluster Component
 * Phase 3: UI/UX Transformation
 *
 * Displays a single news cluster with primary article and related articles,
 * using Google News-style visual hierarchy and layout.
 */

'use client';

import React from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { NewsCluster } from '../services/news-clustering-engine';
import { ArticleCard } from './ArticleCard';

/**
 * View modes for different display styles
 */
export type NewsViewMode = 'headlines' | 'topics' | 'timeline' | 'coverage';

/**
 * Props for NewsCluster component
 */
export interface NewsClusterProps {
  cluster: NewsCluster;
  viewMode: NewsViewMode;
  index: number;
  representative: EnhancedRepresentative;
  className?: string;
}

/**
 * NewsCluster component for displaying clustered news
 */
export function NewsClusterComponent({
  cluster,
  viewMode,
  index: _index,
  representative: _representative,
  className = '',
}: NewsClusterProps) {
  /**
   * Get visual priority styles
   */
  const getClusterStyles = () => {
    const baseStyles =
      'bg-white rounded-lg border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md';

    switch (cluster.visualPriority) {
      case 'hero':
        return `${baseStyles} shadow-lg border-blue-200 ring-1 ring-blue-100`;
      case 'featured':
        return `${baseStyles} shadow-md border-gray-300`;
      case 'standard':
        return `${baseStyles} shadow-sm`;
      case 'compact':
        return `${baseStyles} shadow-sm`;
      default:
        return `${baseStyles} shadow-sm`;
    }
  };

  /**
   * Get story type badge styles
   */
  const getStoryTypeBadge = () => {
    const badges = {
      breaking: 'bg-red-100 text-red-800 border-red-200 🚨 Breaking',
      developing: 'bg-orange-100 text-orange-800 border-orange-200 📈 Developing',
      ongoing: 'bg-blue-100 text-blue-800 border-blue-200 📰 Ongoing',
      background: 'bg-gray-100 text-gray-800 border-gray-200 📋 Background',
    };

    const badgeClass = badges[cluster.storyType] || badges.background;
    const [colorClasses, ...labelParts] = badgeClass.split(' ');
    const label = labelParts.join(' ');

    return (
      <span
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${colorClasses}`}
      >
        {label}
      </span>
    );
  };

  /**
   * Format time span for display
   */
  const formatTimeSpan = (hours: number): string => {
    if (hours < 1) return 'Recent';
    if (hours < 24) return `${Math.round(hours)}h span`;
    const days = Math.round(hours / 24);
    return `${days}d span`;
  };

  /**
   * Get layout based on visual priority and view mode
   */
  const getLayoutClasses = () => {
    if (viewMode === 'topics') {
      return cluster.layoutHints.preferredWidth === 'full' ? 'col-span-2' : '';
    }
    return '';
  };

  return (
    <div className={`${getClusterStyles()} ${getLayoutClasses()} ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50">
        <div className="flex items-center justify-between mb-3">
          {getStoryTypeBadge()}
          <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {cluster.relatedArticles.length + 1} article
            {cluster.relatedArticles.length > 0 ? 's' : ''}
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-3 leading-tight">
          {cluster.topic}
        </h3>

        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
          <span className="flex items-center gap-1">
            🏛️ {cluster.sourceCount} source{cluster.sourceCount !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center gap-1">⏱️ {formatTimeSpan(cluster.timeSpan)}</span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center gap-1">
            📊 {(cluster.relevanceScore * 100).toFixed(0)}% relevance
          </span>
        </div>
      </div>

      {/* Primary Article */}
      <div className="p-4">
        <ArticleCard
          article={cluster.primaryArticle}
          isPrimary={true}
          showImage={cluster.layoutHints.showImage && cluster.visualPriority !== 'compact'}
          compact={cluster.visualPriority === 'compact'}
        />

        {/* Related Articles */}
        {cluster.layoutHints.expandable && cluster.relatedArticles.length > 0 && (
          <div className="mt-4 space-y-3">
            {cluster.relatedArticles
              .slice(0, cluster.visualPriority === 'hero' ? 5 : 3)
              .map((article, _articleIndex) => (
                <div key={article.url} className="pt-3 border-t border-gray-100">
                  <ArticleCard
                    article={article}
                    isPrimary={false}
                    showImage={false}
                    compact={true}
                  />
                </div>
              ))}

            {cluster.relatedArticles.length > 3 && (
              <div className="text-center pt-2">
                <button className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  Show {cluster.relatedArticles.length - 3} more articles
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            Diversity: {(cluster.diversityScore * 100).toFixed(0)}% • Freshness:{' '}
            {(cluster.freshness * 100).toFixed(0)}%
          </div>
          <div>Last updated: {new Date(cluster.lastUpdated).toLocaleTimeString()}</div>
        </div>
      </div>
    </div>
  );
}

export default NewsClusterComponent;

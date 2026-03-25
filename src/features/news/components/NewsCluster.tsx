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
      'bg-white border-2 border-gray-300 overflow-hidden transition-all duration-200';

    switch (cluster.visualPriority) {
      case 'hero':
        return `${baseStyles} border-[#3ea2d4]`;
      case 'featured':
        return `${baseStyles} border-gray-900`;
      case 'standard':
        return baseStyles;
      case 'compact':
        return baseStyles;
      default:
        return baseStyles;
    }
  };

  /**
   * Get story type badge styles
   */
  const getStoryTypeBadge = () => {
    const badges: Record<string, { classes: string; label: string }> = {
      breaking: { classes: 'bg-civiq-red/10 text-civiq-red border-[#e11d07]', label: 'Breaking' },
      developing: {
        classes: 'bg-civiq-red/10 text-civiq-red border-civiq-red',
        label: 'Developing',
      },
      ongoing: { classes: 'bg-civiq-blue/10 text-civiq-blue border-[#3ea2d4]', label: 'Ongoing' },
      background: { classes: 'bg-gray-100 text-gray-800 border-gray-400', label: 'Background' },
    };

    const fallback = { classes: 'bg-gray-100 text-gray-800 border-gray-400', label: 'Background' };
    const badge = badges[cluster.storyType] ?? fallback;

    return (
      <span
        className={`inline-flex items-center px-2 py-1 text-xs font-bold uppercase border-2 ${badge.classes}`}
      >
        {badge.label}
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
      <div className="p-5 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          {getStoryTypeBadge()}
          <div className="text-sm text-gray-500 bg-gray-100 px-2 py-1 border border-gray-300">
            {cluster.relatedArticles.length + 1} article
            {cluster.relatedArticles.length > 0 ? 's' : ''}
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-3 leading-tight">
          {cluster.topic}
        </h3>

        <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
          <span className="flex items-center gap-1">
            {cluster.sourceCount} source{cluster.sourceCount !== 1 ? 's' : ''}
          </span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center gap-1">{formatTimeSpan(cluster.timeSpan)}</span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center gap-1">
            {(cluster.relevanceScore * 100).toFixed(0)}% relevance
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
                <button className="text-sm text-civiq-blue hover:text-civiq-blue hover:underline">
                  Show {cluster.relatedArticles.length - 3} more articles
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metadata Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
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

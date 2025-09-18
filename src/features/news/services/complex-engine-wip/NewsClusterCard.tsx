/**
 * News Cluster Card Component
 * Phase 3: Individual cluster display component
 *
 * Displays a single news cluster in Google News style with
 * representative article, related stories, and metadata.
 */

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { NewsCluster } from '../services/article-clustering-engine';
import { EnhancedRepresentative } from '@/types/representative';
import { NewsViewMode } from './GoogleNewsStyleFeed';
// Using native JavaScript instead of date-fns for compatibility
function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  let result = '';
  if (diffInMinutes < 1) result = 'just now';
  else if (diffInMinutes < 60) result = `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''}`;
  else if (diffInHours < 24) result = `${diffInHours} hour${diffInHours !== 1 ? 's' : ''}`;
  else if (diffInDays < 30) result = `${diffInDays} day${diffInDays !== 1 ? 's' : ''}`;
  else result = date.toLocaleDateString();

  return options?.addSuffix ? `${result} ago` : result;
}

export interface NewsClusterCardProps {
  cluster: NewsCluster;
  viewMode: NewsViewMode;
  index: number;
  representative: EnhancedRepresentative;
}

export function NewsClusterCard({
  cluster,
  viewMode,
  index,
  representative,
}: NewsClusterCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { representativeArticle, articles, metadata, timeline, topicType } = cluster;

  // Get related articles (excluding representative)
  const relatedArticles = articles.filter(a => a.url !== representativeArticle.url);

  // Format time ago
  const timeAgo = formatDistanceToNow(new Date(representativeArticle.publishedDate), {
    addSuffix: true,
  });

  // Get story type styling
  const getTopicTypeStyle = () => {
    switch (topicType) {
      case 'breaking':
        return {
          badge: 'bg-red-100 text-red-800 border-red-200',
          icon: '🚨',
          label: 'Breaking',
        };
      case 'developing':
        return {
          badge: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: '📈',
          label: 'Developing',
        };
      case 'ongoing':
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: '📰',
          label: 'Ongoing',
        };
      case 'background':
        return {
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📋',
          label: 'Background',
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: '📰',
          label: 'News',
        };
    }
  };

  const topicStyle = getTopicTypeStyle();

  // Get velocity indicator
  const getVelocityIndicator = () => {
    switch (timeline.velocity) {
      case 'accelerating':
        return { icon: '📈', color: 'text-green-600', label: 'Accelerating' };
      case 'steady':
        return { icon: '➡️', color: 'text-blue-600', label: 'Steady' };
      case 'declining':
        return { icon: '📉', color: 'text-orange-600', label: 'Declining' };
      case 'dormant':
        return { icon: '💤', color: 'text-gray-600', label: 'Dormant' };
    }
  };

  const velocity = getVelocityIndicator();

  // Render based on view mode
  const renderByViewMode = () => {
    switch (viewMode) {
      case 'headlines':
        return renderHeadlinesView();
      case 'topics':
        return renderTopicsView();
      case 'timeline':
        return renderTimelineView();
      case 'coverage':
        return renderCoverageView();
      default:
        return renderHeadlinesView();
    }
  };

  // Headlines view (default Google News style)
  const renderHeadlinesView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${topicStyle.badge}`}
            >
              <span className="mr-1">{topicStyle.icon}</span>
              {topicStyle.label}
            </span>
            <span className={`text-xs ${velocity.color}`}>
              {velocity.icon} {velocity.label}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {articles.length} article{articles.length !== 1 ? 's' : ''}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">{cluster.primaryTopic}</h3>
        <div className="text-sm text-gray-600">
          {metadata.uniqueSources} source{metadata.uniqueSources !== 1 ? 's' : ''} •{' '}
          {metadata.timeRange.span.toFixed(0)} hour span •{' '}
          {(metadata.relevanceScore * 100).toFixed(0)}% relevance
        </div>
      </div>

      {/* Main Article */}
      <div className="p-4">
        <div className="flex items-start space-x-4">
          {/* Article Image */}
          {representativeArticle.imageUrl && !imageError && (
            <div className="flex-shrink-0 w-24 h-24 relative">
              <Image
                src={representativeArticle.imageUrl}
                alt=""
                fill
                className="object-cover rounded"
                onError={() => setImageError(true)}
              />
            </div>
          )}

          {/* Article Content */}
          <div className="flex-1 min-w-0">
            <a
              href={representativeArticle.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block hover:bg-gray-50 -m-2 p-2 rounded"
            >
              <h4 className="text-base font-medium text-gray-900 mb-2 line-clamp-2">
                {representativeArticle.title}
              </h4>
              {representativeArticle.summary && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {representativeArticle.summary}
                </p>
              )}
              <div className="flex items-center text-xs text-gray-500">
                <span className="font-medium">{representativeArticle.source}</span>
                <span className="mx-2">•</span>
                <span>{timeAgo}</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-3 text-left flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
          >
            <span>
              {relatedArticles.length} more article{relatedArticles.length !== 1 ? 's' : ''}
            </span>
            <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
              ↓
            </span>
          </button>

          {expanded && (
            <div className="border-t border-gray-100 bg-gray-50">
              {relatedArticles.slice(0, 5).map((article, i) => (
                <div
                  key={article.url}
                  className="px-4 py-3 border-b border-gray-100 last:border-b-0"
                >
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-white rounded p-2 -m-2"
                  >
                    <h5 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                      {article.title}
                    </h5>
                    <div className="flex items-center text-xs text-gray-500">
                      <span>{article.source}</span>
                      <span className="mx-2">•</span>
                      <span>
                        {formatDistanceToNow(new Date(article.publishedDate), { addSuffix: true })}
                      </span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  // Topics view (focused on themes)
  const renderTopicsView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-start space-x-3">
        <div className={`w-3 h-3 rounded-full mt-2 ${getTopicColor()}`}></div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs px-2 py-1 rounded ${topicStyle.badge}`}>
              {topicStyle.icon} {topicStyle.label}
            </span>
            <span className="text-xs text-gray-500">{articles.length} articles</span>
          </div>
          <h4 className="font-medium text-gray-900 mb-2">{cluster.primaryTopic}</h4>
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{representativeArticle.title}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{metadata.uniqueSources} sources</span>
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Timeline view (chronological focus)
  const renderTimelineView = () => (
    <div className="flex items-start space-x-4">
      <div className="flex-shrink-0 w-16 text-center">
        <div className="text-xs text-gray-500">
          {new Date(representativeArticle.publishedDate).toLocaleDateString()}
        </div>
        <div className="text-sm font-medium text-gray-900">
          {new Date(representativeArticle.publishedDate).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className={`text-xs px-2 py-1 rounded ${topicStyle.badge}`}>
            {topicStyle.icon} {topicStyle.label}
          </span>
          <span className={`text-xs ${velocity.color}`}>{velocity.icon}</span>
        </div>
        <h4 className="font-medium text-gray-900 mb-2">{cluster.primaryTopic}</h4>
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{representativeArticle.title}</p>
        <div className="text-xs text-gray-500">
          {representativeArticle.source} • {articles.length} total articles
        </div>
      </div>
    </div>
  );

  // Coverage view (comprehensive)
  const renderCoverageView = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Full header with metrics */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${topicStyle.badge}`}>
              {topicStyle.icon} {topicStyle.label}
            </span>
            <span className={`text-sm ${velocity.color}`}>
              {velocity.icon} {velocity.label}
            </span>
          </div>
          <div className="text-sm text-gray-500">Story #{index + 1}</div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-3">{cluster.primaryTopic}</h3>

        {/* Story metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Articles</div>
            <div className="font-medium">{articles.length}</div>
          </div>
          <div>
            <div className="text-gray-500">Sources</div>
            <div className="font-medium">{metadata.uniqueSources}</div>
          </div>
          <div>
            <div className="text-gray-500">Timespan</div>
            <div className="font-medium">{metadata.timeRange.span.toFixed(0)}h</div>
          </div>
          <div>
            <div className="text-gray-500">Relevance</div>
            <div className="font-medium">{(metadata.relevanceScore * 100).toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Main article with full details */}
      <div className="p-6">
        <a
          href={representativeArticle.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block hover:bg-gray-50 -m-4 p-4 rounded"
        >
          <h4 className="text-lg font-semibold text-gray-900 mb-3">
            {representativeArticle.title}
          </h4>
          {representativeArticle.summary && (
            <p className="text-gray-600 mb-3">{representativeArticle.summary}</p>
          )}
          <div className="flex items-center text-sm text-gray-500">
            <span className="font-medium">{representativeArticle.source}</span>
            <span className="mx-2">•</span>
            <span>{timeAgo}</span>
            <span className="mx-2">•</span>
            <span>{representativeArticle.domain}</span>
          </div>
        </a>
      </div>

      {/* All related articles */}
      {relatedArticles.length > 0 && (
        <div className="border-t border-gray-100 bg-gray-50">
          <div className="p-4">
            <h5 className="font-medium text-gray-900 mb-3">Related Coverage</h5>
            <div className="space-y-3">
              {relatedArticles.map(article => (
                <a
                  key={article.url}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 bg-white rounded border hover:shadow-sm"
                >
                  <h6 className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">
                    {article.title}
                  </h6>
                  <div className="flex items-center text-xs text-gray-500">
                    <span>{article.source}</span>
                    <span className="mx-2">•</span>
                    <span>
                      {formatDistanceToNow(new Date(article.publishedDate), { addSuffix: true })}
                    </span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Get topic color for timeline view
  const getTopicColor = () => {
    switch (topicType) {
      case 'breaking':
        return 'bg-red-500';
      case 'developing':
        return 'bg-orange-500';
      case 'ongoing':
        return 'bg-blue-500';
      case 'background':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return <div className="transition-all duration-200 hover:shadow-md">{renderByViewMode()}</div>;
}

export default NewsClusterCard;

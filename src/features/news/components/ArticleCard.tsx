/**
 * ArticleCard - Individual Article Display Component
 * Phase 3: UI/UX Transformation
 *
 * Displays individual news articles with different layouts based on
 * importance, visual priority, and context within clusters.
 */

'use client';

import React from 'react';
import Image from 'next/image';
import { EnhancedArticle } from '../types/news';

/**
 * Props for ArticleCard component
 */
export interface ArticleCardProps {
  article: EnhancedArticle;
  isPrimary?: boolean;
  showImage?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * ArticleCard component for displaying individual articles
 */
export function ArticleCard({
  article,
  isPrimary = false,
  showImage = false,
  compact = false,
  className = '',
}: ArticleCardProps) {
  /**
   * Format published date for display
   */
  const formatPublishedDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const diffMinutes = Math.round(diffMs / (1000 * 60));
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${Math.round(diffHours)}h ago`;
    } else if (diffHours < 168) {
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  /**
   * Extract domain for display
   */
  const getDisplaySource = (): string => {
    if (article.source && article.source !== 'Unknown') {
      return article.source;
    }

    // Extract from domain
    const domain = article.domain || '';
    return (
      domain
        .replace(/^(www\.|m\.|mobile\.)/, '')
        .replace(/\.(com|org|net|gov|edu|co\.uk|co\.in)$/, '')
        .split('.')[0] || 'Unknown'
    );
  };

  /**
   * Get article layout classes
   */
  const getLayoutClasses = (): string => {
    if (compact) {
      return 'flex items-start space-x-3';
    }
    if (showImage && article.imageUrl) {
      return 'flex flex-col sm:flex-row sm:space-x-4';
    }
    return 'flex flex-col';
  };

  /**
   * Get title classes based on context
   */
  const getTitleClasses = (): string => {
    if (isPrimary) {
      return compact
        ? 'text-base font-semibold text-gray-900 line-clamp-2'
        : 'text-lg font-semibold text-gray-900 line-clamp-3';
    }
    return compact
      ? 'text-sm font-medium text-gray-900 line-clamp-2'
      : 'text-base font-medium text-gray-900 line-clamp-2';
  };

  /**
   * Get summary classes
   */
  const getSummaryClasses = (): string => {
    if (compact) {
      return 'text-xs text-gray-600 line-clamp-2 mt-1';
    }
    return isPrimary
      ? 'text-sm text-gray-600 line-clamp-3 mt-2'
      : 'text-sm text-gray-600 line-clamp-2 mt-1';
  };

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={`block hover:bg-blue-50 hover:shadow-sm -m-3 p-3 rounded-lg transition-all duration-200 group ${className}`}
    >
      <div className={getLayoutClasses()}>
        {/* Image (if shown) */}
        {showImage && article.imageUrl && (
          <div className="flex-shrink-0 relative">
            <Image
              src={article.imageUrl}
              alt={article.title}
              width={compact ? 64 : isPrimary ? 128 : 96}
              height={compact ? 64 : isPrimary ? 96 : 80}
              className={`object-cover rounded ${
                compact
                  ? 'w-16 h-16'
                  : isPrimary
                    ? 'w-full sm:w-32 h-24 sm:h-24'
                    : 'w-full sm:w-24 h-20 sm:h-20'
              }`}
              onError={e => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h4 className={`${getTitleClasses()} group-hover:text-blue-600 transition-colors`}>
            {article.title}
          </h4>

          {/* Summary (if available and not compact primary) */}
          {article.summary && !(compact && isPrimary) && (
            <p className={getSummaryClasses()}>{article.summary}</p>
          )}

          {/* Metadata */}
          <div
            className={`flex items-center mt-2 ${compact ? 'text-xs' : 'text-sm'} text-gray-500`}
          >
            <span className="font-medium">{getDisplaySource()}</span>
            <span className="mx-2">•</span>
            <span>{formatPublishedDate(article.publishedDate)}</span>

            {/* Relevance score for primary articles */}
            {isPrimary && article.relevanceScore && (
              <>
                <span className="mx-2">•</span>
                <span className="text-green-600 font-medium">
                  {(article.relevanceScore * 100).toFixed(0)}% relevant
                </span>
              </>
            )}

            {/* Local impact indicator */}
            {article.localImpact && (
              <>
                <span className="mx-2">•</span>
                <span
                  className={`font-medium ${
                    article.localImpact.localRelevance === 'high'
                      ? 'text-green-600'
                      : article.localImpact.localRelevance === 'medium'
                        ? 'text-yellow-600'
                        : 'text-gray-500'
                  }`}
                >
                  {article.localImpact.localRelevance === 'high'
                    ? '📍 Local'
                    : article.localImpact.localRelevance === 'medium'
                      ? '🏛️ Regional'
                      : '🌐 National'}
                </span>
              </>
            )}

            {/* Verified badge */}
            <span className="mx-2">•</span>
            <span className="text-green-600 font-medium">✓ Verified</span>
          </div>

          {/* Keywords/Categories (for primary articles only) */}
          {isPrimary && article.keywords && article.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {article.keywords.slice(0, 3).map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

export default ArticleCard;

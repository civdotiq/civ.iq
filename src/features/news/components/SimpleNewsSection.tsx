/**
 * SimpleNewsSection - Production-Hardened Smart Loader Pattern
 *
 * A robust news component with:
 * - Accessible "Load More" button (SEO & accessibility foundation)
 * - Optional auto-loading via Intersection Observer
 * - Scroll position restoration for browser history
 * - ARIA live regions for screen reader announcements
 * - Debounced loading to prevent race conditions
 * - User control over auto-loading behavior with persistence
 * - Mobile data consciousness
 */

'use client';

import React, { useEffect, useRef, useCallback, useState, useMemo, useLayoutEffect } from 'react';
import useSWRInfinite from 'swr/infinite';
import DOMPurify from 'isomorphic-dompurify';
import { EnhancedRepresentative } from '@/types/representative';
import logger from '@/lib/logging/simple-logger';
import { FallbackImage } from '@/components/FallbackImage';
import { ArticleSkeleton } from './ArticleSkeleton';
import styles from './SimpleNewsSection.module.css';

/**
 * Enhanced news article interface with pagination support
 */
interface SimpleNewsArticle {
  url: string;
  title: string;
  seendate: string;
  publishedDate?: string;
  domain: string;
  socialimage?: string | null;
  imageUrl?: string | null;
  summary?: string;
  source?: string;
}

/**
 * News API response with pagination metadata
 */
interface NewsResponse {
  articles: SimpleNewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'newsapi' | 'gdelt' | 'cached' | 'fallback' | 'google-news';
  cacheStatus?: string;
  pagination?: {
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    totalPages: number;
  };
}

/**
 * Props for SimpleNewsSection component
 */
export interface SimpleNewsSectionProps {
  representative: EnhancedRepresentative;
  initialLimit?: number;
  className?: string;
  maxPages?: number;
  enableAutoLoad?: boolean; // Allow users to control auto-loading
}

/**
 * SWR data fetcher for news API
 */
const fetcher = async (url: string): Promise<NewsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch news');
  }
  return response.json();
};

/**
 * Debounce function to prevent rapid-fire requests
 */
function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Get scroll position storage key for this representative
 */
const getScrollStorageKey = (bioguideId: string) => `news-scroll-position-${bioguideId}`;

/**
 * Get auto-load preference storage key
 */
const getAutoLoadPreferenceKey = () => 'news-auto-load-preference';

/**
 * SimpleNewsSection with Production-Hardened Smart Loader pattern
 */
export function SimpleNewsSection({
  representative,
  initialLimit = 8,
  className = '',
  maxPages = 10,
  enableAutoLoad = true,
}: SimpleNewsSectionProps) {
  const loadMoreButtonRef = useRef<HTMLButtonElement>(null);
  const ariaLiveRef = useRef<HTMLDivElement>(null);
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);

  // Initialize auto-load preference from localStorage
  const [isAutoLoadEnabled, setIsAutoLoadEnabled] = useState(() => {
    if (typeof window === 'undefined') return enableAutoLoad;
    const saved = localStorage.getItem(getAutoLoadPreferenceKey());
    return saved !== null ? saved === 'true' : enableAutoLoad;
  });

  // Use useSWRInfinite with page limit for memory management
  const { data, error, size, setSize, isLoading, isValidating } = useSWRInfinite(
    (pageIndex, previousPageData: NewsResponse | null) => {
      // Stop if we've reached the end
      if (previousPageData && !previousPageData.pagination?.hasNextPage) return null;

      // Implement page cap to prevent memory issues
      if (pageIndex >= maxPages) {
        logger.info('Reached maximum page limit', {
          component: 'SimpleNewsSection',
          maxPages,
          currentPage: pageIndex + 1,
        });
        return null;
      }

      // Generate the API key for the current page (pageIndex is 0-based, so add 1)
      return `/api/representative/${representative.bioguideId}/news?limit=${initialLimit}&page=${
        pageIndex + 1
      }`;
    },
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      onSuccess: newData => {
        // Announce new content to screen readers (only after second page, less verbose)
        if (size > 1 && ariaLiveRef.current) {
          ariaLiveRef.current.textContent = 'More articles loaded.';
        }

        logger.info('News data fetched successfully', {
          component: 'SimpleNewsSection',
          pagesLoaded: newData.length,
          totalArticles: newData.reduce((total, page) => total + page.articles.length, 0),
          dataSource: newData[0]?.dataSource,
        });
      },
      onError: err => {
        logger.error('News fetch failed', {
          component: 'SimpleNewsSection',
          error: err,
          size,
        });
      },
    }
  );

  // Flatten all articles from all pages
  const allArticles = data ? data.flatMap(page => page.articles) : [];
  const lastPage = data?.[data.length - 1];
  const hasNextPage = lastPage?.pagination?.hasNextPage ?? false;
  const isLoadingMore = size > 0 && isValidating;
  const reachedPageLimit = size >= maxPages;
  const canLoadMore = hasNextPage && !reachedPageLimit;
  const dataSource = data?.[0]?.dataSource;

  /**
   * Load more handler (used by both button and auto-load)
   */
  const loadMore = useCallback(() => {
    if (canLoadMore && !isValidating) {
      // Announce loading state to screen readers (only after initial load)
      if (size > 0 && ariaLiveRef.current) {
        ariaLiveRef.current.textContent = 'Loading more articles...';
      }
      setSize(size + 1);
    }
  }, [canLoadMore, isValidating, setSize, size]);

  /**
   * Use ref to maintain stable reference to loadMore for debouncing
   */
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  /**
   * Debounced load more for auto-loading (created only once)
   */
  const debouncedLoadMore = useMemo(
    () => debounce(() => loadMoreRef.current(), 300),
    [] // No dependencies, created once
  );

  /**
   * Persist auto-load preference changes
   */
  const handleAutoLoadToggle = useCallback((enabled: boolean) => {
    setIsAutoLoadEnabled(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem(getAutoLoadPreferenceKey(), String(enabled));
    }
  }, []);

  /**
   * Set up Intersection Observer for auto-loading
   */
  useEffect(() => {
    if (!isAutoLoadEnabled || !canLoadMore) return;

    const button = loadMoreButtonRef.current;
    if (!button) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            debouncedLoadMore();
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Start loading 100px before button is visible
      }
    );

    observer.observe(button);
    return () => observer.disconnect();
  }, [isAutoLoadEnabled, canLoadMore, debouncedLoadMore]);

  /**
   * Save scroll position before unload
   */
  useEffect(() => {
    const saveScrollPosition = () => {
      const scrollY = window.scrollY;
      if (scrollY > 0) {
        sessionStorage.setItem(getScrollStorageKey(representative.bioguideId), String(scrollY));
      }
    };

    // Save on page unload
    window.addEventListener('beforeunload', saveScrollPosition);

    // Also save on navigation (for SPAs)
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'A' && target.getAttribute('href')) {
        saveScrollPosition();
      }
    };
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('beforeunload', saveScrollPosition);
      document.removeEventListener('click', handleClick);
    };
  }, [representative.bioguideId]);

  /**
   * Restore scroll position after data loads (more robust with useLayoutEffect)
   */
  useLayoutEffect(() => {
    if (!hasRestoredScroll && data && data.length > 0 && allArticles.length > 0) {
      const savedPosition = sessionStorage.getItem(getScrollStorageKey(representative.bioguideId));
      if (savedPosition) {
        const scrollY = parseInt(savedPosition, 10);

        const performRestore = () => {
          window.scrollTo(0, scrollY);
          sessionStorage.removeItem(getScrollStorageKey(representative.bioguideId));
          setHasRestoredScroll(true);
        };

        // Check if document is ready
        if (document.readyState === 'complete') {
          performRestore();
        } else {
          // Wait for page to be fully loaded
          window.addEventListener('load', performRestore, { once: true });
        }
      } else {
        setHasRestoredScroll(true);
      }
    }
  }, [hasRestoredScroll, data, allArticles.length, representative.bioguideId]);

  /**
   * Format date for display
   */
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${Math.round(diffInHours)}h ago`;
      } else if (diffInHours < 168) {
        // 7 days
        return `${Math.round(diffInHours / 24)}d ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Recently';
    }
  };

  /**
   * Secure title sanitization with DOMPurify and refined cleaning
   */
  const cleanTitle = (title: string): string => {
    // First sanitize with DOMPurify to prevent XSS
    const sanitized = DOMPurify.sanitize(title, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    // Then apply refined regex cleaning for news source attribution
    return sanitized
      .replace(/\s*-\s*[^-]+\.(com|org|gov|net)$/i, '') // Remove "- CNN.com"
      .replace(/\s*\|\s*[^|]+$/i, '') // Remove "| Fox News"
      .replace(/\s*:\s*[^:]*\.(com|org|gov|net)$/i, '') // Remove ": SiteName.com"
      .trim();
  };

  /**
   * Get domain display name
   */
  const getSourceName = (domain: string): string => {
    // Clean up domain for display
    return domain
      .replace(/^www\./, '')
      .replace(/\.(com|org|gov|net)$/, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  /**
   * Retry loading news
   */
  const handleRetry = () => {
    setSize(1);
  };

  if (isLoading && size === 1) {
    return (
      <div className={`${styles.newsSection} ${styles.container} ${className}`}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent News Coverage</h2>
        </div>
        <div className={styles.articlesGrid}>
          <ArticleSkeleton count={initialLimit} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.newsSection} ${styles.container} ${className}`}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorTitle}>Unable to load news</div>
          <div className={styles.errorMessage}>{error.message || 'Failed to fetch news'}</div>
          <button onClick={handleRetry} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (allArticles.length === 0 && !isLoading) {
    return (
      <div className={`${styles.newsSection} ${styles.container} ${className}`}>
        <div className={styles.emptyContainer}>
          <div className={styles.emptyIcon}>📰</div>
          <div className={styles.emptyTitle}>No recent news coverage</div>
          <div className={styles.emptyMessage}>
            No recent articles found for {representative.firstName} {representative.lastName}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.newsSection} ${styles.container} ${className}`}>
      {/* ARIA Live Region for Screen Reader Announcements */}
      <div
        ref={ariaLiveRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      />

      <section aria-label="News articles">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent News Coverage</h2>
          {allArticles.length > 0 && (
            <div className={styles.autoLoadToggle}>
              <label htmlFor="auto-load-toggle" className={styles.toggleLabel}>
                <input
                  id="auto-load-toggle"
                  type="checkbox"
                  checked={isAutoLoadEnabled}
                  onChange={e => handleAutoLoadToggle(e.target.checked)}
                  className={styles.toggleCheckbox}
                />
                <span>Auto-load more articles</span>
              </label>
            </div>
          )}
        </div>

        <div className={styles.articlesGrid}>
          {allArticles.map((article, index) => {
            const imageUrl = article.imageUrl || article.socialimage;
            const displayDate = article.publishedDate || article.seendate;
            const sourceName = article.source || getSourceName(article.domain);

            return (
              <article key={`${article.url}-${index}`} className={styles.card}>
                <div className={styles.cardContent}>
                  <div className={styles.textContent}>
                    <h3 className={styles.title}>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.titleLink}
                      >
                        {cleanTitle(article.title)}
                      </a>
                    </h3>
                    {article.summary && <p className={styles.summary}>{article.summary}</p>}
                  </div>
                  {imageUrl && (
                    <div className={styles.thumbnail}>
                      <FallbackImage
                        src={imageUrl}
                        alt={`News from ${sourceName}`}
                        width={128}
                        height={96}
                        loading="lazy"
                        quality={75}
                        sizes="(max-width: 640px) 64px, 80px"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className={styles.metadata}>
                  <span className={styles.source}>{sourceName}</span>
                  <time className={styles.timestamp}>{formatDate(displayDate)}</time>
                </div>
              </article>
            );
          })}

          {/* Loading skeleton for next page */}
          {isLoadingMore && (
            <div className={styles.articlesGrid}>
              <ArticleSkeleton count={3} />
            </div>
          )}
        </div>

        {/* Load More Button - Foundation for SEO & Accessibility */}
        {canLoadMore && (
          <div className={styles.loadMoreSection}>
            <button
              ref={loadMoreButtonRef}
              onClick={loadMore}
              disabled={isValidating}
              className={styles.loadMoreButton}
              aria-label={`Load more news articles about ${representative.firstName} ${representative.lastName}`}
            >
              {isValidating && <div className={styles.loadingIcon} />}
              {isValidating ? 'Loading...' : 'Load More Articles'}
            </button>
            {isAutoLoadEnabled && (
              <p className={styles.autoLoadHint}>Articles will load automatically as you scroll</p>
            )}
          </div>
        )}

        {/* Show message when page limit is reached */}
        {reachedPageLimit && hasNextPage && (
          <div className={styles.pageLimitMessage}>
            <p>
              You&apos;ve loaded {size} pages of articles ({allArticles.length} total). To see the
              latest news, refresh the page.
            </p>
          </div>
        )}

        {/* Show article count for screen readers */}
        <div className="sr-only" aria-live="polite">
          Currently showing {allArticles.length} articles
        </div>
      </section>

      {/* Footer Attribution */}
      {dataSource && (
        <div className={styles.footer}>
          {dataSource === 'newsapi' ? (
            <>
              News data from{' '}
              <a
                href="https://newsapi.org/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                NewsAPI.org
              </a>
            </>
          ) : dataSource === 'google-news' ? (
            <>
              News data from{' '}
              <a
                href="https://news.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                Google News RSS
              </a>
            </>
          ) : (
            <>
              News data from{' '}
              <a
                href="https://www.gdeltproject.org/"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                GDELT Project
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SimpleNewsSection;

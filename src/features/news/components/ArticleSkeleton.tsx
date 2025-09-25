/**
 * ArticleSkeleton - Loading skeleton for news articles
 *
 * Provides visual feedback during content loading with animated placeholders
 * Following Otl Aicher design system principles
 */

import React from 'react';
import styles from './ArticleSkeleton.module.css';

interface ArticleSkeletonProps {
  count?: number;
}

export function ArticleSkeleton({ count = 3 }: ArticleSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={`skeleton-${index}`} className={styles.skeletonCard}>
          <div className={styles.cardContent}>
            <div className={styles.textContent}>
              <div className={styles.titleSkeleton} />
              <div className={styles.titleSkeleton2} />
            </div>
            <div className={styles.thumbnailSkeleton} />
          </div>
          <div className={styles.metadataSkeleton}>
            <div className={styles.sourceSkeleton} />
            <div className={styles.timestampSkeleton} />
          </div>
        </div>
      ))}
    </>
  );
}

export default ArticleSkeleton;

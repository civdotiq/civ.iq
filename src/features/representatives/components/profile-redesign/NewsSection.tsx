/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import type { NewsArticle } from '@/features/news/types/news';
import { SectionBlock, SectionEmptyState, SectionSkeleton } from './SectionBlock';

interface NewsSectionProps {
  bioguideId: string;
  memberName: string;
  onExplore: () => void;
}

interface NewsApiResponse {
  articles?: NewsArticle[];
}

const VISIBLE_ARTICLES = 4;

async function fetchNews(url: string): Promise<NewsApiResponse> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function formatNewsDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Compact recent-coverage list: date · headline (external link) · source. */
export function NewsSection({ bioguideId, memberName, onExplore }: NewsSectionProps) {
  const { data, error, isLoading } = useSWR<NewsApiResponse>(
    `/api/representative/${bioguideId}/news?limit=${VISIBLE_ARTICLES}&page=1`,
    fetchNews,
    { revalidateOnFocus: false, dedupingInterval: 300000, shouldRetryOnError: false }
  );

  const articles = (data?.articles ?? []).slice(0, VISIBLE_ARTICLES);

  return (
    <SectionBlock
      id="news"
      title="Recent news"
      action={
        <button type="button" onClick={onExplore} className="text-civiq-blue hover:underline">
          All coverage →
        </button>
      }
      source="Aggregated media coverage · headlines link to original publishers"
    >
      {isLoading ? (
        <SectionSkeleton rows={4} />
      ) : error || articles.length === 0 ? (
        <SectionEmptyState
          message={
            error
              ? 'News coverage is temporarily unavailable.'
              : `No recent articles found for ${memberName}.`
          }
        />
      ) : (
        <div>
          {articles.map(article => (
            <div
              key={article.url}
              className="grid grid-cols-[3.5rem_1fr] gap-4 py-3 border-b border-gray-300 first:pt-0 last:border-b-0 last:pb-0 text-sm"
            >
              <span className="text-xs text-gray-500 pt-0.5">
                {formatNewsDate(article.publishedDate)}
              </span>
              <div>
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-gray-900 hover:text-civiq-blue"
                >
                  {article.title}
                </a>
                <p className="text-xs text-gray-500 mt-0.5">{article.source || article.domain}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionBlock>
  );
}

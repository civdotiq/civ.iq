/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, MessageSquare, AlertTriangle, Clock, CheckCircle, Users } from 'lucide-react';
import { BreadcrumbSchema, CommentPeriodEventSchema } from '@/components/seo/JsonLd';

interface CommentPeriodItem {
  id: string;
  title: string;
  summary: string;
  agency: string;
  url: string;
  commentUrl?: string;
  daysUntilClose?: number;
  commentsCloseOn?: string;
  publishedDate?: string;
}

interface CommentPeriodsResponse {
  success: boolean;
  openComments: CommentPeriodItem[];
  closingSoon: CommentPeriodItem[];
  recentlyClosed: CommentPeriodItem[];
  stats: {
    totalOpen: number;
    closingThisWeek: number;
    avgDaysRemaining: number;
  };
}

export default function CommentPeriodsPage() {
  const [data, setData] = useState<CommentPeriodsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/federal-register/comment-periods');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comment periods');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const renderItem = (item: CommentPeriodItem, urgency: boolean = false) => (
    <div
      key={item.id}
      className={`bg-white border-2 ${urgency ? 'border-[#e11d07]' : 'border-black'} p-4 sm:p-6`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          {item.commentUrl ? (
            <a
              href={item.commentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lg font-semibold text-gray-900 hover:text-[#3ea2d4]"
            >
              {item.title}
            </a>
          ) : (
            <span className="text-lg font-semibold text-gray-900">{item.title}</span>
          )}
        </div>
        {item.daysUntilClose != null && item.daysUntilClose >= 0 && (
          <span
            className={`flex-shrink-0 text-xs font-bold border-2 px-2 py-1 ${
              item.daysUntilClose <= 7
                ? 'border-[#e11d07] bg-red-50 text-red-800'
                : 'border-gray-300 bg-gray-50 text-gray-700'
            }`}
          >
            {item.daysUntilClose}d left
          </span>
        )}
      </div>
      <div className="text-sm text-gray-500 mb-2">
        {item.agency}
        {item.commentsCloseOn && (
          <>
            {' '}
            · Closes{' '}
            {new Date(item.commentsCloseOn).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </>
        )}
      </div>
      {item.summary && <p className="text-sm text-gray-600 line-clamp-2">{item.summary}</p>}
      <div className="flex items-center gap-4 mt-2">
        {item.commentUrl && (
          <a
            href={item.commentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-[#3ea2d4] hover:underline"
          >
            Submit a comment →
          </a>
        )}
        <CommentCountBadge documentNumber={item.id} />
      </div>
    </div>
  );

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Comment Periods', url: 'https://civdotiq.org/comment-periods' },
        ]}
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="profile-hero-name text-3xl mb-2">Public Comment Periods</h1>
            <p className="text-gray-600">
              Regulations currently open for public comment — your opportunity to influence federal
              policy
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading comment periods...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-red-600 mb-2">Failed to load comment periods</div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-[#3592c0]"
              >
                Try Again
              </button>
            </div>
          ) : !data?.success ? (
            <div className="text-center py-16">
              <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-600">No comment period data available</div>
            </div>
          ) : (
            <>
              {/* Stats Bar */}
              <div className="bg-white border-2 border-black p-4 sm:p-6 mb-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{data.stats.totalOpen}</div>
                    <div className="text-xs text-gray-500 uppercase">Open for Comment</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#e11d07]">
                      {data.stats.closingThisWeek}
                    </div>
                    <div className="text-xs text-gray-500 uppercase">Closing This Week</div>
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <div className="text-3xl font-bold text-gray-900">
                      {Math.round(data.stats.avgDaysRemaining)}
                    </div>
                    <div className="text-xs text-gray-500 uppercase">Avg. Days Remaining</div>
                  </div>
                </div>
              </div>

              {/* Structured Data for open comment periods */}
              {[...data.closingSoon, ...data.openComments]
                .filter(item => item.title && item.commentsCloseOn)
                .map(item => (
                  <CommentPeriodEventSchema
                    key={`schema-${item.id}`}
                    name={item.title}
                    description={item.summary || undefined}
                    startDate={item.publishedDate || item.commentsCloseOn!}
                    endDate={item.commentsCloseOn!}
                    url={item.url || undefined}
                    organizer={item.agency}
                  />
                ))}

              {/* Closing Soon */}
              {data.closingSoon.length > 0 && (
                <div className="mb-8">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <AlertTriangle className="w-5 h-5 text-[#e11d07]" />
                    Closing Soon
                  </h2>
                  <div className="space-y-4">
                    {data.closingSoon.map(item => renderItem(item, true))}
                  </div>
                </div>
              )}

              {/* Open for Comment */}
              {data.openComments.length > 0 && (
                <div className="mb-8">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <Clock className="w-5 h-5 text-[#3ea2d4]" />
                    Open for Comment
                  </h2>
                  <div className="space-y-4">{data.openComments.map(item => renderItem(item))}</div>
                </div>
              )}

              {/* Recently Closed */}
              {data.recentlyClosed.length > 0 && (
                <div className="mb-8">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                    <CheckCircle className="w-5 h-5 text-gray-400" />
                    Recently Closed
                  </h2>
                  <div className="space-y-4">
                    {data.recentlyClosed.map(item => (
                      <div key={item.id} className="bg-white border-2 border-gray-300 p-4 sm:p-6">
                        <span className="text-lg font-semibold text-gray-500">{item.title}</span>
                        <div className="text-sm text-gray-400 mt-1">
                          {item.agency}
                          {item.commentsCloseOn && (
                            <>
                              {' '}
                              · Closed{' '}
                              {new Date(item.commentsCloseOn).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function CommentCountBadge({ documentNumber }: { documentNumber: string }) {
  const [commentCount, setCommentCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Stagger requests to avoid flooding the rate-limited API
    const delay = Math.floor(Math.random() * 2000);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/federal-register/${documentNumber}/comments?pageSize=1`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled && json?.success && json.stats?.total > 0) {
          setCommentCount(json.stats.total);
        }
      } catch {
        // Silently fail — this is supplementary data
      }
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [documentNumber]);

  if (commentCount === null) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500">
      <Users className="w-3 h-3" />
      {commentCount.toLocaleString()} comment{commentCount !== 1 ? 's' : ''}
    </span>
  );
}

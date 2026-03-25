/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';

interface ExecutiveOrder {
  id: string;
  title: string;
  summary: string;
  publishedDate: string;
  executiveOrderNumber?: string;
  url: string;
}

interface EOResponse {
  success: boolean;
  orders: ExecutiveOrder[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
  };
}

export default function ExecutiveOrdersPage() {
  const [data, setData] = useState<EOResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/federal-register/executive-orders?page=${page}&per_page=20`
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const json = await response.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load executive orders');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page]);

  const totalPages = data?.pagination
    ? Math.ceil(data.pagination.total / data.pagination.perPage)
    : 0;

  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Executive Orders', url: 'https://civdotiq.org/executive-orders' },
        ]}
      />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="profile-hero-name text-3xl mb-2">Executive Orders</h1>
            <p className="text-gray-600">
              Presidential executive orders published in the Federal Register
            </p>
          </div>

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">Loading executive orders...</span>
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <div className="text-civiq-red mb-2">Failed to load executive orders</div>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-white bg-[#3ea2d4] hover:bg-[#3592c0]"
              >
                Try Again
              </button>
            </div>
          ) : !data?.orders?.length ? (
            <div className="text-center py-16">
              <FileText className="w-8 h-8 text-gray-300 mx-auto mb-3" />
              <div className="text-gray-600">No executive orders found</div>
            </div>
          ) : (
            <div className="space-y-4">
              {data.orders.map(order => (
                <div key={order.id} className="bg-white border-2 border-black p-4 sm:p-6">
                  <div className="flex items-start gap-3 mb-2">
                    {order.executiveOrderNumber && (
                      <span className="flex-shrink-0 text-xs font-bold border-2 border-gray-400 bg-gray-100 text-gray-600 px-2 py-1">
                        EO {order.executiveOrderNumber}
                      </span>
                    )}
                    <a
                      href={order.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-gray-900 hover:text-[#3ea2d4]"
                    >
                      {order.title}
                    </a>
                  </div>
                  <div className="text-sm text-gray-500 mb-2">
                    {new Date(order.publishedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  {order.summary && (
                    <p className="text-sm text-gray-600 line-clamp-3">{order.summary}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 text-sm border-2 border-gray-300 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 text-sm border-2 border-gray-300 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

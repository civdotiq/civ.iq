'use client';

import { useState, useEffect } from 'react';
import { DollarSign, ExternalLink } from 'lucide-react';
import type { BillSpendingConnection } from '@/types/joins';

interface BillSpendingSectionProps {
  billId: string;
}

export function BillSpendingSection({ billId }: BillSpendingSectionProps) {
  const [data, setData] = useState<BillSpendingConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchSpending() {
      try {
        setLoading(true);
        setError(false);
        const response = await fetch(`/api/bill/${billId}/spending`);
        if (!response.ok) {
          setError(true);
          return;
        }
        const result = await response.json();
        if (!cancelled) {
          setData(result);
        }
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSpending();
    return () => {
      cancelled = true;
    };
  }, [billId]);

  // Silent error — section is supplementary
  if (error) return null;

  if (loading) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Related Federal Spending
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.spending.awardCount === 0) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          Related Federal Spending
        </h3>
        <div className="text-center py-6">
          <DollarSign className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No related federal spending data available</p>
          <p className="text-sm text-gray-500 mt-1">
            Spending connections are derived from bill policy areas and committee assignments
          </p>
        </div>
      </div>
    );
  }

  const topAgencies = data.relatedAgencies.slice(0, 3);
  const topAwards = data.spending.awards.slice(0, 5);

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-green-600" />
        Related Federal Spending ({data.spending.awardCount} awards)
      </h3>

      {/* Total Amount */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">
          ${data.spending.totalAmount.toLocaleString()}
        </div>
        <p className="text-sm text-gray-500">Total related federal awards</p>
      </div>

      {/* Agency Tags */}
      {topAgencies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {topAgencies.map(agency => (
            <span
              key={agency}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs border border-gray-200"
            >
              {agency}
            </span>
          ))}
        </div>
      )}

      {/* Award List */}
      <div className="space-y-3">
        {topAwards.map(award => (
          <a
            key={award.id}
            href={award.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 border border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{award.recipientName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  ${award.amount.toLocaleString()} &middot; {award.agency}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span
                  className={`px-2 py-1 text-xs font-medium ${
                    award.type === 'grant'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {award.type}
                </span>
                <ExternalLink className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Data Source Attribution */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Spending data from USASpending.gov. Connections derived from bill policy areas and
          committee assignments.
        </p>
      </div>
    </div>
  );
}

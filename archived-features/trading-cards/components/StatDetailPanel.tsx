/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { EnhancedRepresentative } from '@/types/representative';

interface StatDetail {
  id: string;
  label: string;
  value: string | number;
  icon: string;
  details?: Array<DetailItem>;
}

interface DetailItem {
  title: string;
  subtitle?: string;
  date?: string;
  value?: string;
  link?: string;
}

interface StatDetailPanelProps {
  representative: EnhancedRepresentative;
  stat: StatDetail;
  additionalData?: unknown;
  onClose: () => void;
}

export function StatDetailPanel({ 
  representative, 
  stat, 
  additionalData,
  onClose 
}: StatDetailPanelProps) {
  const [filter, setFilter] = useState<'all' | 'recent' | 'important'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatDetails = () => {
    switch (stat.id) {
      case 'bills-sponsored':
        return additionalData?.bills?.map((bill: unknown) => ({
          title: bill.title || bill.shortTitle || 'Untitled Bill',
          subtitle: bill.number,
          date: bill.introducedDate,
          value: bill.status,
          link: bill.url
        })) || [];

      case 'bills-cosponsored':
        return additionalData?.bills
          ?.filter((bill: unknown) => bill.cosponsors?.length > 0)
          ?.map((bill: unknown) => ({
            title: bill.title || bill.shortTitle || 'Untitled Bill',
            subtitle: `${bill.cosponsors.length} cosponsors`,
            date: bill.introducedDate,
            value: bill.primarySponsor,
            link: bill.url
          })) || [];

      case 'committee-roles':
        return representative.committees?.map(committee => ({
          title: committee.name,
          subtitle: committee.role || 'Member',
          value: ''
        })) || [];

      case 'voting-attendance':
        const recentVotes = additionalData?.votes?.slice(0, 20) || [];
        return recentVotes.map((vote: unknown) => ({
          title: vote.bill?.title || vote.description || 'Vote',
          subtitle: vote.bill?.number || vote.rollCall,
          date: vote.date,
          value: vote.position,
          link: vote.url
        }));

      case 'party-support':
        const partyVotes = additionalData?.votes?.filter((vote: unknown) => 
          vote.partyPosition && vote.position !== 'Not Voting'
        ).slice(0, 20) || [];
        return partyVotes.map((vote: unknown) => ({
          title: vote.bill?.title || vote.description || 'Vote',
          subtitle: vote.position === vote.partyPosition ? 'Aligned' : 'Diverged',
          date: vote.date,
          value: `${vote.position} (Party: ${vote.partyPosition})`,
          link: vote.url
        }));

      case 'bipartisan-bills':
        return additionalData?.bills
          ?.filter((bill: unknown) => bill.bipartisan)
          ?.map((bill: unknown) => ({
            title: bill.title || bill.shortTitle || 'Untitled Bill',
            subtitle: `${bill.democratCosponsors || 0} Dem, ${bill.republicanCosponsors || 0} GOP`,
            date: bill.introducedDate,
            value: 'Bipartisan',
            link: bill.url
          })) || [];

      case 'news-mentions':
        return additionalData?.news?.slice(0, 20).map((article: unknown) => ({
          title: article.title,
          subtitle: article.source,
          date: article.date,
          value: article.sentiment || 'Neutral',
          link: article.url
        })) || [];

      default:
        return stat.details || [];
    }
  };

  const details = getStatDetails();
  
  // Apply filters and search
  const filteredDetails = details.filter((detail: DetailItem) => {
    // Search filter
    if (searchTerm && !detail.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !detail.subtitle?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Time filter
    if (filter === 'recent' && detail.date) {
      const date = new Date(detail.date);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return date > thirtyDaysAgo;
    }

    if (filter === 'important') {
      // Define importance based on stat type
      if (stat.id === 'bills-sponsored') {
        return detail.value?.includes('Passed') || detail.value?.includes('Enacted');
      }
      if (stat.id === 'party-support') {
        return detail.subtitle === 'Diverged';
      }
      if (stat.id === 'news-mentions') {
        return detail.value !== 'Neutral';
      }
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <h2 className="text-2xl font-bold">{stat.label} Details</h2>
                <p className="text-indigo-100 mt-1">
                  {representative.name} • Current Value: {stat.value}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-indigo-100 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('recent')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'recent'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Recent
              </button>
              <button
                onClick={() => setFilter('important')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'important'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Important
              </button>
            </div>
          </div>
        </div>

        {/* Details List */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {filteredDetails.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-4">📊</div>
              <p>No details found matching your criteria</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDetails.map((detail: DetailItem, index: number) => (
                <div
                  key={index}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {detail.link ? (
                          <a
                            href={detail.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-800"
                          >
                            {detail.title}
                          </a>
                        ) : (
                          detail.title
                        )}
                      </h4>
                      {detail.subtitle && (
                        <p className="text-sm text-gray-600 mt-1">{detail.subtitle}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        {detail.date && (
                          <span className="text-gray-500">
                            {new Date(detail.date).toLocaleDateString()}
                          </span>
                        )}
                        {detail.value && (
                          <span className={`font-medium ${
                            detail.value.includes('Passed') || detail.value.includes('Yea') || detail.value === 'Aligned'
                              ? 'text-green-600'
                              : detail.value.includes('Failed') || detail.value.includes('Nay') || detail.value === 'Diverged'
                                ? 'text-red-600'
                                : 'text-gray-700'
                          }`}>
                            {detail.value}
                          </span>
                        )}
                      </div>
                    </div>
                    {detail.link && (
                      <a
                        href={detail.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-4 text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {filteredDetails.length} of {details.length} items
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatDetailPanel;
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { MapPin, Users, ExternalLink, Newspaper, CheckCircle } from 'lucide-react';
import { DataSourceBadge } from '@/components/shared/ui/DataTransparency';

interface RepresentativeSidebarProps {
  representative: {
    bioguideId: string;
    name: string;
    state: string;
    district?: string;
    chamber: 'House' | 'Senate';
    party: string;
  };
  dataCompleteness?: number;
  newsArticles?: Array<{
    title: string;
    url: string;
    source: string;
    publishedAt: string;
  }>;
}

export function RepresentativeSidebar({
  representative,
  dataCompleteness = 93,
  newsArticles = [],
}: RepresentativeSidebarProps) {
  const getStateFullName = (stateCode: string): string => {
    const stateNames: Record<string, string> = {
      AL: 'Alabama',
      AK: 'Alaska',
      AZ: 'Arizona',
      AR: 'Arkansas',
      CA: 'California',
      CO: 'Colorado',
      CT: 'Connecticut',
      DE: 'Delaware',
      FL: 'Florida',
      GA: 'Georgia',
      HI: 'Hawaii',
      ID: 'Idaho',
      IL: 'Illinois',
      IN: 'Indiana',
      IA: 'Iowa',
      KS: 'Kansas',
      KY: 'Kentucky',
      LA: 'Louisiana',
      ME: 'Maine',
      MD: 'Maryland',
      MA: 'Massachusetts',
      MI: 'Michigan',
      MN: 'Minnesota',
      MS: 'Mississippi',
      MO: 'Missouri',
      MT: 'Montana',
      NE: 'Nebraska',
      NV: 'Nevada',
      NH: 'New Hampshire',
      NJ: 'New Jersey',
      NM: 'New Mexico',
      NY: 'New York',
      NC: 'North Carolina',
      ND: 'North Dakota',
      OH: 'Ohio',
      OK: 'Oklahoma',
      OR: 'Oregon',
      PA: 'Pennsylvania',
      RI: 'Rhode Island',
      SC: 'South Carolina',
      SD: 'South Dakota',
      TN: 'Tennessee',
      TX: 'Texas',
      UT: 'Utah',
      VT: 'Vermont',
      VA: 'Virginia',
      WA: 'Washington',
      WV: 'West Virginia',
      WI: 'Wisconsin',
      WY: 'Wyoming',
      DC: 'District of Columbia',
    };
    return stateNames[stateCode] || stateCode;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="space-y-6">
      {/* Federal Level Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-500" />
          Federal Level
        </h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Chamber:</span>
            <span className="text-sm font-medium text-gray-900">{representative.chamber}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Party:</span>
            <span className="text-sm font-medium text-gray-900">{representative.party}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Bioguide ID:</span>
            <span className="text-sm font-mono text-gray-900">{representative.bioguideId}</span>
          </div>
        </div>
      </div>

      {/* District Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="h-5 w-5 text-green-500" />
          District Information
        </h3>

        <div className="space-y-3">
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-1">{representative.state}</div>
            <div className="text-sm text-gray-600">{getStateFullName(representative.state)}</div>
            {representative.district && (
              <div className="text-lg font-medium text-gray-700 mt-2">
                District {representative.district}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <Link
              href={`/districts/${representative.state}${representative.district ? `-${representative.district}` : ''}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
            >
              View District Details
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Data Completeness */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Completeness</h3>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Profile Information</span>
            <span className="text-sm font-medium text-gray-900">{dataCompleteness}%</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-green-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${dataCompleteness}%` }}
            />
          </div>

          <div className="text-xs text-gray-500">Based on available official government data</div>
        </div>

        {/* Data Sources */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-sm font-medium text-gray-700 mb-2">Data Sources</div>
          <div className="space-y-2">
            <DataSourceBadge source="congress-legislators" size="sm" />
            <DataSourceBadge source="congress.gov" size="sm" />
            <DataSourceBadge source="fec.gov" size="sm" />
          </div>
        </div>
      </div>

      {/* Compare Representatives */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="h-5 w-5 text-purple-500" />
          Compare Representatives
        </h3>

        <div className="space-y-3">
          <Link
            href={`/compare?reps=${representative.bioguideId}`}
            className="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Comparison
          </Link>

          <div className="text-xs text-gray-500 text-center">
            Compare voting records, bills, and campaign finance
          </div>
        </div>
      </div>

      {/* Recent News */}
      {newsArticles.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-orange-500" />
            Recent News
          </h3>

          <div className="space-y-4">
            {newsArticles.slice(0, 3).map((article, index) => (
              <div key={index} className="border-b border-gray-100 last:border-b-0 pb-3 last:pb-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded"
                >
                  <h4 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
                    {article.title}
                  </h4>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{article.source}</span>
                    <span>{formatTimeAgo(article.publishedAt)}</span>
                  </div>
                </a>
              </div>
            ))}

            {newsArticles.length > 3 && (
              <div className="pt-3 border-t border-gray-100">
                <Link
                  href={`/representative/${representative.bioguideId}/news`}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  View all news ({newsArticles.length})
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>

        <div className="space-y-2">
          <Link
            href={`/representative/${representative.bioguideId}/contact`}
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded"
          >
            Contact Information
          </Link>
          <Link
            href={`/representative/${representative.bioguideId}/committees`}
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded"
          >
            Committee Assignments
          </Link>
          <Link
            href={`/representative/${representative.bioguideId}/votes`}
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded"
          >
            Full Voting Record
          </Link>
          <Link
            href={`/representative/${representative.bioguideId}/bills`}
            className="block w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 rounded"
          >
            All Sponsored Bills
          </Link>
        </div>
      </div>
    </div>
  );
}

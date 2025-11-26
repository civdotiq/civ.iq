/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Activity, FileText, Vote, Calendar } from 'lucide-react';
import { encodeBase64Url } from '@/lib/url-encoding';
import type { StateBill } from '@/types/state-legislature';

interface ActivityItem {
  type: 'bill' | 'vote';
  date: string;
  title: string;
  description: string;
  link?: string;
  metadata?: {
    billIdentifier?: string;
    voteOption?: string;
    voteResult?: string;
  };
}

interface BillsApiResponse {
  success: boolean;
  bills: StateBill[];
}

interface VotesApiResponse {
  success: boolean;
  votes: Array<{
    vote_id: string;
    motion_text: string;
    start_date: string;
    result: string;
    option: string;
    bill_identifier: string | null;
    bill_id: string | null;
  }>;
}

interface StateLegislatorActivityFeedProps {
  state: string;
  legislatorId: string;
  maxItems?: number;
}

export const StateLegislatorActivityFeed: React.FC<StateLegislatorActivityFeedProps> = ({
  state,
  legislatorId,
  maxItems = 10,
}) => {
  const base64Id = encodeBase64Url(legislatorId);

  // Fetch bills
  const { data: billsData } = useSWR<BillsApiResponse>(
    `/api/state-legislature/${state}/legislator/${base64Id}/bills`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) return { success: false, bills: [] };
      return await response.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );

  // Fetch votes
  const { data: votesData } = useSWR<VotesApiResponse>(
    `/api/state-legislature/${state}/legislator/${base64Id}/votes?per_page=20`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) return { success: false, votes: [] };
      return await response.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 120000 }
  );

  // Combine and sort activities
  const activities: ActivityItem[] = [];

  // Add bills with their first action date
  if (billsData?.bills) {
    billsData.bills.forEach(bill => {
      if (bill.first_action_date) {
        activities.push({
          type: 'bill',
          date: bill.first_action_date,
          title: bill.identifier,
          description: bill.title,
          link: `/state-bills/${state}/${encodeBase64Url(bill.id)}`,
          metadata: { billIdentifier: bill.identifier },
        });
      }
    });
  }

  // Add votes
  if (votesData?.votes) {
    votesData.votes.forEach(vote => {
      activities.push({
        type: 'vote',
        date: vote.start_date,
        title: vote.bill_identifier || 'Floor Vote',
        description: vote.motion_text,
        link: vote.bill_id ? `/state-bills/${state}/${encodeBase64Url(vote.bill_id)}` : undefined,
        metadata: {
          voteOption: vote.option,
          voteResult: vote.result,
        },
      });
    });
  }

  // Sort by date (most recent first)
  activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Limit items
  const displayedActivities = activities.slice(0, maxItems);

  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;

      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    } catch {
      return 'Date unknown';
    }
  };

  // Get vote option styling
  const getVoteOptionStyle = (option: string) => {
    switch (option.toLowerCase()) {
      case 'yes':
        return 'bg-green-100 text-green-700';
      case 'no':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (displayedActivities.length === 0) {
    return (
      <div className="text-center py-6">
        <Activity className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">No recent activity available</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="aicher-section-label mb-3 flex items-center gap-2 text-civiq-blue">
        <Activity className="w-4 h-4" />
        RECENT ACTIVITY
      </h3>
      <div className="space-y-3">
        {displayedActivities.map((activity, index) => (
          <div
            key={`${activity.type}-${index}`}
            className="bg-gray-50 border border-gray-200 p-3 hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {activity.type === 'bill' ? (
                  <FileText className="w-4 h-4 text-civiq-blue" />
                ) : (
                  <Vote className="w-4 h-4 text-civiq-green" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {activity.link ? (
                    <Link
                      href={activity.link}
                      className="font-semibold text-sm text-blue-600 hover:underline truncate"
                    >
                      {activity.title}
                    </Link>
                  ) : (
                    <span className="font-semibold text-sm text-gray-900 truncate">
                      {activity.title}
                    </span>
                  )}
                  {activity.metadata?.voteOption && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${getVoteOptionStyle(activity.metadata.voteOption)}`}
                    >
                      {activity.metadata.voteOption.toUpperCase()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{activity.description}</p>
                <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {formatDate(activity.date)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

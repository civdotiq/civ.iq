/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useEffect, useState } from 'react';
import type { StatePersonVote } from '@/types/state-legislature';

interface StateVotingTabProps {
  state: string;
  legislatorId: string;
  legislatorName: string;
  limit?: number;
}

interface VotesResponse {
  success: boolean;
  votes: StatePersonVote[];
  count: number;
  legislator?: {
    id: string;
    name: string;
    chamber: string;
    district: string;
    party: string;
  };
  error?: string;
}

export const StateVotingTab: React.FC<StateVotingTabProps> = ({
  state,
  legislatorId,
  legislatorName,
  limit = 50,
}) => {
  const [votes, setVotes] = useState<StatePersonVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVotes = async () => {
      setLoading(true);
      setError(null);

      try {
        // Base64 encode the legislator ID for URL safety
        const base64Id = Buffer.from(legislatorId).toString('base64url');
        const response = await fetch(
          `/api/state-legislature/${state}/legislator/${base64Id}/votes?limit=${limit}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch votes: ${response.statusText}`);
        }

        const data: VotesResponse = await response.json();

        if (data.success && data.votes) {
          setVotes(data.votes);
        } else {
          setError(data.error || 'No voting records available');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load voting records');
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, [state, legislatorId, limit]);

  // Color coding for vote options
  const getVoteColor = (option: string) => {
    switch (option.toLowerCase()) {
      case 'yes':
        return 'bg-green-500 text-white';
      case 'no':
        return 'bg-red-500 text-white';
      case 'abstain':
        return 'bg-yellow-500 text-white';
      case 'not voting':
        return 'bg-gray-400 text-white';
      case 'absent':
        return 'bg-gray-300 text-gray-700';
      case 'excused':
        return 'bg-gray-300 text-gray-700';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="p-grid-4 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
        <p className="mt-grid-2 text-gray-600">Loading voting records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-grid-3">
        <div className="bg-red-50 border-2 border-red-300 p-grid-3">
          <h3 className="text-xl font-bold text-red-700 mb-grid-2">Error Loading Votes</h3>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (votes.length === 0) {
    return (
      <div className="p-grid-3">
        <div className="bg-gray-50 border-2 border-gray-300 p-grid-4 text-center">
          <p className="text-gray-600">No voting records found for {legislatorName}.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-grid-3">Voting Record</h2>

      {/* Summary Stats */}
      <div className="bg-gray-50 border-2 border-gray-300 p-grid-3 mb-grid-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-grid-3">
          <div>
            <p className="text-3xl font-bold text-blue-600">{votes.length}</p>
            <p className="text-sm text-gray-600">Total Votes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-600">
              {votes.filter(v => v.option === 'yes').length}
            </p>
            <p className="text-sm text-gray-600">Yes Votes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-600">
              {votes.filter(v => v.option === 'no').length}
            </p>
            <p className="text-sm text-gray-600">No Votes</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-600">
              {
                votes.filter(v => ['abstain', 'not voting', 'absent', 'excused'].includes(v.option))
                  .length
              }
            </p>
            <p className="text-sm text-gray-600">Other</p>
          </div>
        </div>
      </div>

      {/* Votes List */}
      <div className="space-y-grid-2">
        {votes.map((vote, index) => (
          <div key={vote.vote_id || index} className="bg-white border-2 border-gray-300 p-grid-3">
            {/* Vote Header */}
            <div className="flex items-start justify-between mb-grid-2">
              <div className="flex-1">
                <div className="flex items-center gap-grid-2 mb-grid-1">
                  <span
                    className={`px-grid-2 py-grid-1 text-sm font-bold ${getVoteColor(vote.option)}`}
                  >
                    {vote.option.toUpperCase()}
                  </span>
                  <span
                    className={`px-grid-2 py-grid-1 text-sm ${
                      vote.result === 'passed'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {vote.result === 'passed' ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <h3 className="font-bold text-lg">{vote.motion_text}</h3>
              </div>
              <div className="text-right text-sm text-gray-600">
                <p>{formatDate(vote.start_date)}</p>
                <p className="text-xs">{vote.identifier}</p>
              </div>
            </div>

            {/* Bill Info (if available) */}
            {vote.bill_identifier && (
              <div className="bg-gray-50 border-2 border-gray-300 p-grid-2 mb-grid-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-700">{vote.bill_identifier}</p>
                    {vote.bill_title && (
                      <p className="text-sm text-gray-600 mt-grid-1">{vote.bill_title}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Chamber Info */}
            <div className="text-sm text-gray-600">
              <span className="font-bold">{vote.organization_name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Notice */}
      {votes.length >= limit && (
        <div className="mt-grid-3 p-grid-3 bg-blue-50 border-2 border-blue-300 text-center">
          <p className="text-blue-700">
            Showing {votes.length} most recent votes. More voting history may be available.
          </p>
        </div>
      )}
    </div>
  );
};

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { fetcher } from '@/lib/utils/fetcher';

interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
    type: string;
    url?: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  chamber: 'House' | 'Senate';
  rollNumber: number;
  description: string;
  category?: string;
  isKeyVote?: boolean;
}

interface VoteResponse {
  votes: Vote[];
  totalResults: number;
  member: {
    bioguideId: string;
    name: string;
    chamber: string;
  };
  dataSource: string;
  success: boolean;
  error?: string;
}

interface VotingTabProps {
  bioguideId: string;
}

export function VotingTab({ bioguideId }: VotingTabProps) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<VoteResponse>(
    `/api/representative/${bioguideId}/votes`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-5 gap-4">
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
          <div className="h-16 bg-gray-100 rounded"></div>
        </div>
        <div className="space-y-2">
          <div className="h-6 bg-gray-100 rounded"></div>
          <div className="h-6 bg-gray-100 rounded"></div>
          <div className="h-6 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 mb-2">Failed to load voting records</div>
        <div className="text-sm text-gray-500">Please try refreshing the page</div>
      </div>
    );
  }

  if (!data || !data.votes) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 mb-2">No voting records available</div>
        <div className="text-sm text-gray-400">
          Voting data is sourced from Congress.gov and Senate XML feeds
        </div>
      </div>
    );
  }

  const votes = data.votes;

  // Calculate voting statistics
  const yesVotes = votes.filter(vote => vote.position === 'Yea').length;
  const nayVotes = votes.filter(vote => vote.position === 'Nay').length;
  const presentVotes = votes.filter(vote => vote.position === 'Present').length;
  const notVotingVotes = votes.filter(vote => vote.position === 'Not Voting').length;
  const totalVotes = votes.length;
  const keyVotes = votes.filter(vote => vote.category === 'key').length;

  // Extract vote ID from vote data for detailed page navigation
  const extractVoteId = (vote: Vote): string | null => {
    // For Senate votes, extract vote ID from the voteId field
    if (vote.chamber === 'Senate') {
      if (vote.voteId) {
        // Extract from format like "119-senate-00123"
        const match = vote.voteId.match(/(\d+)$/);
        return match?.[1] || null;
      }
      if (vote.rollNumber) return vote.rollNumber.toString();
    }
    return null;
  };

  // Handle vote row click
  const handleVoteClick = (vote: Vote) => {
    const voteId = extractVoteId(vote);
    if (voteId && vote.chamber === 'Senate') {
      router.push(`/vote/${voteId}`);
    }
  };

  return (
    <div data-testid="voting-record">
      <h2 className="text-lg font-semibold mb-4">Interactive Voting Analysis</h2>

      {/* Metrics */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        <div className="text-center">
          <div className="text-3xl font-bold">{totalVotes}</div>
          <div className="text-sm text-gray-500">Total Votes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-green-600">{yesVotes}</div>
          <div className="text-sm text-gray-500">Yes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-red-600">{nayVotes}</div>
          <div className="text-sm text-gray-500">Nay</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{presentVotes}</div>
          <div className="text-sm text-gray-500">Present</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{keyVotes}</div>
          <div className="text-sm text-gray-500">Key Votes</div>
        </div>
      </div>

      {/* Position Bars */}
      <h3 className="font-medium mb-3">Position Distribution</h3>
      <div className="space-y-2 mb-8">
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm">Yes</span>
          <div className="flex-1 bg-gray-200 rounded h-6">
            <div
              className="bg-green-500 h-6 rounded"
              style={{
                width: totalVotes > 0 ? `${(yesVotes / totalVotes) * 100}%` : '0%',
              }}
            ></div>
          </div>
          <span className="text-sm">
            {totalVotes > 0 ? Math.round((yesVotes / totalVotes) * 100) : 0}%
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 text-sm">Nay</span>
          <div className="flex-1 bg-gray-200 rounded h-6">
            <div
              className="bg-red-500 h-6 rounded"
              style={{
                width: totalVotes > 0 ? `${(nayVotes / totalVotes) * 100}%` : '0%',
              }}
            ></div>
          </div>
          <span className="text-sm">
            {totalVotes > 0 ? Math.round((nayVotes / totalVotes) * 100) : 0}%
          </span>
        </div>
        {presentVotes > 0 && (
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm">Present</span>
            <div className="flex-1 bg-gray-200 rounded h-6">
              <div
                className="bg-yellow-500 h-6 rounded"
                style={{
                  width: totalVotes > 0 ? `${(presentVotes / totalVotes) * 100}%` : '0%',
                }}
              ></div>
            </div>
            <span className="text-sm">
              {totalVotes > 0 ? Math.round((presentVotes / totalVotes) * 100) : 0}%
            </span>
          </div>
        )}
        {notVotingVotes > 0 && (
          <div className="flex items-center gap-3">
            <span className="w-20 text-sm">Not Voting</span>
            <div className="flex-1 bg-gray-200 rounded h-6">
              <div
                className="bg-gray-500 h-6 rounded"
                style={{
                  width: totalVotes > 0 ? `${(notVotingVotes / totalVotes) * 100}%` : '0%',
                }}
              ></div>
            </div>
            <span className="text-sm">
              {totalVotes > 0 ? Math.round((notVotingVotes / totalVotes) * 100) : 0}%
            </span>
          </div>
        )}
      </div>

      {/* Recent Votes */}
      <h3 className="font-medium mb-3">Recent Voting Record</h3>
      {votes.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No voting data available</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Bill</th>
                <th className="text-left py-2">Description</th>
                <th className="text-left py-2">Date</th>
                <th className="text-right py-2">Position</th>
              </tr>
            </thead>
            <tbody>
              {votes.slice(0, 50).map(vote => {
                const voteId = extractVoteId(vote);
                const isClickable = voteId && vote.chamber === 'Senate';

                return (
                  <tr
                    key={vote.voteId}
                    className={`border-b ${isClickable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''}`}
                    onClick={() => isClickable && handleVoteClick(vote)}
                    title={isClickable ? 'Click to view detailed vote breakdown' : ''}
                  >
                    <td className="py-3">
                      {(() => {
                        // Priority order for vote display text:
                        // 1. vote.bill.title (if it's a bill vote)
                        // 2. vote.question (the vote question)
                        // 3. vote.description (additional context)
                        // 4. "Vote" as fallback (not "Voice Vote")
                        const displayText =
                          vote.bill?.title || vote.question || vote.description || 'Vote';

                        // Truncate long text for table display
                        const truncatedText =
                          displayText.length > 60
                            ? `${displayText.substring(0, 57)}...`
                            : displayText;

                        return (
                          <div className="flex flex-col">
                            {vote.bill?.number && (
                              <div className="text-xs text-gray-500 mb-1">
                                {vote.bill.url ? (
                                  <a
                                    href={vote.bill.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    {vote.bill.number}
                                  </a>
                                ) : (
                                  <span>{vote.bill.number}</span>
                                )}
                              </div>
                            )}
                            <span
                              className={`${isClickable ? 'text-blue-600' : ''} line-clamp-2`}
                              title={displayText}
                            >
                              {truncatedText}
                            </span>
                          </div>
                        );
                      })()}
                      {isClickable && <span className="ml-1 text-xs text-gray-400">📊</span>}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {vote.bill?.title || vote.question || vote.description}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(vote.date).toLocaleDateString()}
                    </td>
                    <td className="text-right py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          vote.position === 'Yea'
                            ? 'bg-green-100 text-green-700'
                            : vote.position === 'Nay'
                              ? 'bg-red-100 text-red-700'
                              : vote.position === 'Present'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {vote.position}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * State Vote Detail View Component
 * Displays comprehensive vote information including all legislator votes
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import type { StateVoteDetail } from '@/types/state-legislature';
import { encodeBase64Url } from '@/lib/url-encoding';

interface StateVoteDetailViewProps {
  vote: StateVoteDetail;
  state: string;
}

export const StateVoteDetailView: React.FC<StateVoteDetailViewProps> = ({ vote, state }) => {
  // Group votes by option
  const votesByOption = useMemo(() => {
    const groups: Record<string, typeof vote.votes> = {
      yes: [],
      no: [],
      abstain: [],
      'not voting': [],
      absent: [],
      excused: [],
    };

    vote.votes.forEach(v => {
      const option = v.option.toLowerCase();
      if (groups[option]) {
        groups[option].push(v);
      }
    });

    return groups;
  }, [vote]);

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
      case 'absent':
      case 'excused':
        return 'bg-gray-400 text-white';
      default:
        return 'bg-gray-300 text-gray-800';
    }
  };

  // Format date
  const formattedDate = new Date(vote.start_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Vote Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">{vote.motion_text}</h1>
          <span
            className={`px-4 py-2 rounded-full font-semibold text-lg ${
              vote.result === 'passed' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {vote.result.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-semibold">Chamber:</span> {vote.organization_name}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {formattedDate}
          </div>
          <div>
            <span className="font-semibold">Identifier:</span> {vote.identifier}
          </div>
        </div>

        {/* Bill Link */}
        {vote.bill && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-2">
              <span className="font-semibold text-blue-900">Related Bill:</span>
              <div>
                <Link
                  href={`/state-legislature/${state}/bill/${encodeBase64Url(vote.bill.id)}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  {vote.bill.identifier}
                </Link>
                <p className="text-sm text-gray-700 mt-1">{vote.bill.title}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vote Counts Summary */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Vote Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {vote.counts.map(count => (
            <div key={count.option} className="text-center p-4 rounded-lg border-2 border-gray-200">
              <div
                className={`text-3xl font-bold ${getVoteColor(count.option)} px-3 py-1 rounded mb-2`}
              >
                {count.value}
              </div>
              <div className="text-sm font-medium text-gray-600 capitalize">{count.option}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Individual Votes */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">How Legislators Voted</h2>

        {(['yes', 'no', 'abstain', 'not voting', 'absent', 'excused'] as const).map(option => {
          const voters = votesByOption[option];
          if (!voters || voters.length === 0) return null;

          return (
            <div key={option} className="mb-6 last:mb-0">
              <h3 className="text-lg font-semibold text-gray-800 mb-3 capitalize flex items-center">
                <span className={`${getVoteColor(option)} px-3 py-1 rounded mr-2`}>
                  {voters.length}
                </span>
                {option}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {voters.map((voter, idx) => (
                  <div
                    key={`${voter.voter_id}-${idx}`}
                    className="p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors"
                  >
                    {voter.voter_id ? (
                      <Link
                        href={`/state-legislature/${state}/legislator/${encodeBase64Url(voter.voter_id)}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {voter.voter_name}
                      </Link>
                    ) : (
                      <span className="text-gray-700">{voter.voter_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

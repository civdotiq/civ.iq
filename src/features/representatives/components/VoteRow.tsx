/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * VoteRow Component
 *
 * Renders a single row in the voting record table with:
 * - React.memo for performance optimization
 * - Keyboard navigation (Enter/Space to click)
 * - Full ARIA accessibility attributes
 */

'use client';

import React, { useCallback, KeyboardEvent } from 'react';

export interface Vote {
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

export interface VoteRowProps {
  vote: Vote;
  index: number;
  isClickable: boolean;
  onVoteClick: (vote: Vote) => void;
}

/**
 * Extract vote ID for navigation
 */
export const extractVoteId = (vote: Vote): string | null => {
  if (!vote.voteId) return null;

  // House votes: use the full voteId (e.g., "house-119-116")
  if (vote.chamber === 'House') {
    return vote.voteId;
  }

  // Senate votes: extract numeric part from voteId or use rollNumber
  if (vote.chamber === 'Senate') {
    if (vote.voteId) {
      // Extract from format like "119-senate-00123" or use as-is if numeric
      const match = vote.voteId.match(/(\d+)$/);
      return match?.[1] || null;
    }
    if (vote.rollNumber) return vote.rollNumber.toString();
  }

  return null;
};

/**
 * Get position badge styling
 */
const getPositionStyles = (position: Vote['position']): string => {
  switch (position) {
    case 'Yea':
      return 'bg-green-100 text-green-800 border border-green-200';
    case 'Nay':
      return 'bg-red-100 text-red-800 border border-red-200';
    case 'Present':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    default:
      return 'bg-white border-2 border-gray-300 text-gray-700';
  }
};

/**
 * Get result text styling
 */
const getResultStyles = (result: string): string => {
  const lowerResult = result?.toLowerCase() || '';
  if (lowerResult.includes('passed') || lowerResult.includes('agreed')) {
    return 'text-green-700';
  }
  if (lowerResult.includes('failed') || lowerResult.includes('rejected')) {
    return 'text-red-700';
  }
  return 'text-gray-700';
};

/**
 * VoteRow component with accessibility and keyboard navigation
 */
const VoteRowComponent: React.FC<VoteRowProps> = ({ vote, index, isClickable, onVoteClick }) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTableRowElement>) => {
      if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onVoteClick(vote);
      }
    },
    [isClickable, onVoteClick, vote]
  );

  const handleClick = useCallback(() => {
    if (isClickable) {
      onVoteClick(vote);
    }
  }, [isClickable, onVoteClick, vote]);

  const displayQuestion =
    vote.question && vote.question !== 'Unknown Question'
      ? vote.question
      : vote.description || 'Vote';

  const displayTitle =
    vote.bill?.title || vote.question || vote.description || 'No description available';

  return (
    <tr
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={
        isClickable
          ? `Roll ${vote.rollNumber || 'N/A'}: ${displayQuestion}. Vote: ${vote.position}. Click to view details.`
          : undefined
      }
      className={`border-b border-gray-200 ${
        isClickable
          ? 'cursor-pointer hover:bg-blue-50 transition-colors focus:bg-blue-100 focus:outline-none'
          : ''
      } ${vote.isKeyVote ? 'bg-yellow-50' : ''} ${index % 2 === 0 ? 'bg-white' : 'bg-white/50'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {/* Roll Number */}
      <td className="py-3 px-3 align-top" style={{ width: '80px', minWidth: '80px' }}>
        <div className="flex items-center gap-1">
          <span className="font-medium text-blue-600 text-sm">{vote.rollNumber || 'N/A'}</span>
          {isClickable && <span className="text-xs text-gray-400" aria-hidden="true"></span>}
        </div>
      </td>

      {/* Date */}
      <td
        className="py-3 px-3 text-sm text-gray-600 align-top whitespace-nowrap"
        style={{ width: '100px', minWidth: '100px' }}
      >
        {vote.date
          ? new Date(vote.date).toLocaleDateString('en-US', {
              month: '2-digit',
              day: '2-digit',
              year: 'numeric',
            })
          : 'N/A'}
      </td>

      {/* Question */}
      <td className="py-3 px-3 align-top" style={{ width: '25%', minWidth: '200px' }}>
        <div className="overflow-hidden">
          <span className="text-sm text-gray-900 line-clamp-2" title={displayQuestion}>
            {displayQuestion}
          </span>
        </div>
      </td>

      {/* Result */}
      <td className="py-3 px-3 align-top" style={{ width: '120px', minWidth: '120px' }}>
        <span className={`text-sm font-medium whitespace-nowrap ${getResultStyles(vote.result)}`}>
          {vote.result || 'N/A'}
        </span>
      </td>

      {/* Title/Description */}
      <td className="py-3 px-3 align-top" style={{ width: '35%', minWidth: '250px' }}>
        <div className="overflow-hidden">
          {vote.bill?.number && (
            <div className="text-xs text-blue-600 font-medium mb-1">
              {vote.bill.url ? (
                <a
                  href={vote.bill.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline"
                  onClick={e => e.stopPropagation()}
                  aria-label={`View bill ${vote.bill.number} on Congress.gov`}
                >
                  {vote.bill.number}
                </a>
              ) : (
                vote.bill.number
              )}
            </div>
          )}
          <span className="text-sm text-gray-900 line-clamp-2" title={displayTitle}>
            {displayTitle}
          </span>
        </div>
      </td>

      {/* Vote Position */}
      <td className="text-center py-3 px-3 align-top" style={{ width: '100px', minWidth: '100px' }}>
        <span
          className={`inline-block px-3 py-1 text-xs font-semibold ${getPositionStyles(vote.position)}`}
        >
          {vote.position}
        </span>
      </td>
    </tr>
  );
};

VoteRowComponent.displayName = 'VoteRow';

export const VoteRow = React.memo(VoteRowComponent);

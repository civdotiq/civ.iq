/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { CardShell } from './CardShell';
import type { VoteCardData } from '../types';

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

interface VoteCardProps {
  data: VoteCardData;
}

export function VoteCard({ data }: VoteCardProps) {
  const positionColor =
    data.position === 'Yea'
      ? 'text-civiq-green'
      : data.position === 'Nay'
        ? 'text-civiq-red'
        : 'text-gray-600';

  return (
    <CardShell
      party={data.party}
      label={`VOTE: ${data.billNumber.toUpperCase()}`}
      shareSection="voting"
      representative={{
        name: data.name,
        party: data.party,
        state: data.state,
        bioguideId: data.bioguideId,
        chamber: data.chamber,
        district: data.district,
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <div className="aicher-heading-wide type-xs text-gray-500 mb-1">
          VOTE: {data.billNumber.toUpperCase()}
        </div>
        <h3 className="aicher-heading type-lg text-gray-900 mb-1">{data.name}</h3>
        <p className="type-sm text-gray-600 line-clamp-2">{data.billTitle}</p>
      </div>

      {/* Position + totals */}
      <div className="border-t-2 border-gray-200 pt-4">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className={`aicher-heading type-2xl ${positionColor}`}>{data.position}</div>
            <div className="aicher-heading-wide type-xs text-gray-500">
              {formatDate(data.voteDate)}
            </div>
          </div>
          {data.totalYea !== undefined && (
            <div>
              <div className="aicher-heading type-2xl text-civiq-green">{data.totalYea}</div>
              <div className="aicher-heading-wide type-xs text-gray-500">TOTAL YEA</div>
            </div>
          )}
          {data.totalNay !== undefined && (
            <div>
              <div className="aicher-heading type-2xl text-civiq-red">{data.totalNay}</div>
              <div className="aicher-heading-wide type-xs text-gray-500">TOTAL NAY</div>
            </div>
          )}
        </div>
      </div>
    </CardShell>
  );
}

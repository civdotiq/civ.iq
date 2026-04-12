/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { CardShell } from './CardShell';
import type { AlignmentCardData } from '../types';

interface AlignmentCardProps {
  data: AlignmentCardData;
}

export function AlignmentCard({ data }: AlignmentCardProps) {
  const peerComparison =
    data.peerAveragePercent != null
      ? {
          diff: Math.round(data.partyAlignmentPercent) - Math.round(data.peerAveragePercent),
          avg: Math.round(data.peerAveragePercent),
        }
      : null;

  return (
    <CardShell
      party={data.party}
      label="PARTY ALIGNMENT"
      shareSection="alignment"
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
        <div className="aicher-heading-wide type-xs text-gray-500 mb-1">PARTY ALIGNMENT</div>
        <h3 className="aicher-heading type-xl text-gray-900">{data.name}</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 border-t-2 border-gray-200 pt-4">
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {Math.round(data.partyAlignmentPercent)}%
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">PARTY ALIGNMENT</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {data.votesAgainstParty.toLocaleString()}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">AGAINST PARTY</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {data.totalVotes.toLocaleString()}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">TOTAL VOTES</div>
        </div>
      </div>

      {/* Peer comparison */}
      {peerComparison && (
        <div className="border-t-2 border-gray-200 pt-4 mt-4">
          <div className="type-sm text-gray-600">
            {peerComparison.diff > 0
              ? `${peerComparison.diff}% above party average`
              : peerComparison.diff < 0
                ? `${Math.abs(peerComparison.diff)}% below party average`
                : 'At party average'}
            <span className="text-gray-400 ml-1">({peerComparison.avg}% avg)</span>
          </div>
        </div>
      )}
    </CardShell>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { CardShell } from './CardShell';
import type { ProfileCardData } from '../types';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toFixed(0)}`;
}

function getPartyAbbrev(party: string): string {
  const p = party.toLowerCase();
  if (p.includes('democrat')) return 'D';
  if (p.includes('republican')) return 'R';
  if (p.includes('independent')) return 'I';
  return party.charAt(0).toUpperCase();
}

interface ProfileCardProps {
  data: ProfileCardData;
}

export function ProfileCard({ data }: ProfileCardProps) {
  const location = data.district ? `${data.state}-${data.district}` : data.state;

  return (
    <CardShell
      party={data.party}
      label="PROFILE"
      shareSection="overview"
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
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="aicher-heading-wide type-xs text-gray-500 mb-1">PROFILE</div>
          <h3 className="aicher-heading type-xl text-gray-900">{data.name}</h3>
          <p className="type-sm text-gray-600">
            <span className="font-semibold">{getPartyAbbrev(data.party)}</span>
            {' \u00b7 '}
            {data.chamber === 'Senate' ? 'Senator' : 'Representative'}
            {' \u00b7 '}
            {location}
          </p>
        </div>
        {data.imageUrl && (
          <div className="w-16 h-20 border-2 border-black overflow-hidden flex-shrink-0 ml-4">
            <img src={data.imageUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t-2 border-gray-200 pt-4">
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {data.billsSponsored !== undefined ? data.billsSponsored : '--'}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">BILLS</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {data.totalRaised !== undefined ? formatCurrency(data.totalRaised) : '--'}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">RAISED</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {data.committees !== undefined ? data.committees : '--'}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">COMMITTEES</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {data.votesParticipated !== undefined ? data.votesParticipated.toLocaleString() : '--'}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">VOTES</div>
        </div>
      </div>
    </CardShell>
  );
}

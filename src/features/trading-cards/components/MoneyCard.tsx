/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { CardShell } from './CardShell';
import type { MoneyCardData } from '../types';

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${Math.round(amount / 1_000)}K`;
  return `$${amount.toFixed(0)}`;
}

interface MoneyCardProps {
  data: MoneyCardData;
}

export function MoneyCard({ data }: MoneyCardProps) {
  return (
    <CardShell
      party={data.party}
      label="CAMPAIGN FINANCE"
      shareSection="finance"
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
        <div className="aicher-heading-wide type-xs text-gray-500 mb-1">CAMPAIGN FINANCE</div>
        <h3 className="aicher-heading type-xl text-gray-900">{data.name}</h3>
        <p className="type-sm text-gray-500">{data.cycle} Election Cycle</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 border-t-2 border-gray-200 pt-4">
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {formatCurrency(data.totalRaised)}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">TOTAL RAISED</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-gray-900">{data.individualPercent}%</div>
          <div className="aicher-heading-wide type-xs text-gray-500">INDIVIDUALS</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-gray-900">{data.pacPercent}%</div>
          <div className="aicher-heading-wide type-xs text-gray-500">PACs</div>
        </div>
      </div>

      {/* Top industry */}
      {data.topIndustry && (
        <div className="border-t-2 border-gray-200 pt-4 mt-4">
          <div className="type-sm text-gray-600">
            Top Industry: <span className="font-semibold text-gray-900">{data.topIndustry}</span>
            {data.topIndustryAmount !== undefined && (
              <span className="text-gray-500"> ({formatCurrency(data.topIndustryAmount)})</span>
            )}
          </div>
        </div>
      )}
    </CardShell>
  );
}

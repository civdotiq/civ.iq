/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { CardShell } from './CardShell';
import type { LegislationCardData } from '../types';

interface LegislationCardProps {
  data: LegislationCardData;
}

export function LegislationCard({ data }: LegislationCardProps) {
  return (
    <CardShell
      party={data.party}
      label="LEGISLATION"
      shareSection="legislation"
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
        <div className="aicher-heading-wide type-xs text-gray-500 mb-1">LEGISLATION</div>
        <h3 className="aicher-heading type-xl text-gray-900">{data.name}</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 border-t-2 border-gray-200 pt-4">
        <div>
          <div className="aicher-heading type-2xl text-gray-900">
            {data.billsSponsored.toLocaleString()}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">BILLS SPONSORED</div>
        </div>
        <div>
          <div className="aicher-heading type-2xl text-civiq-green">
            {data.billsEnacted.toLocaleString()}
          </div>
          <div className="aicher-heading-wide type-xs text-gray-500">BECAME LAW</div>
        </div>
      </div>

      {/* Focus areas */}
      {data.focusAreas.length > 0 && (
        <div className="border-t-2 border-gray-200 pt-4 mt-4">
          <div className="aicher-heading-wide type-xs text-gray-500 mb-2">FOCUS AREAS</div>
          <div className="flex flex-wrap gap-2">
            {data.focusAreas.map(area => (
              <span key={area} className="border border-gray-300 px-2 py-1 type-xs text-gray-700">
                {area}
              </span>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  );
}

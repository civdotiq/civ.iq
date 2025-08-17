/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import { RepresentativeHeader } from './RepresentativeHeader';
import { EnhancedTabs } from './EnhancedTabs';

interface EnhancedClientWrapperProps {
  representative: {
    bioguideId: string;
    name: string;
    party: string;
    chamber: 'House' | 'Senate';
    state: string;
    district?: string;
    title: string;
    currentTerm?: {
      start: string;
      end: string;
      office?: string;
      phone?: string;
      address?: string;
      website?: string;
      contactForm?: string;
    };
    committees?: Array<{
      name: string;
      role?: string;
    }>;
    bio?: {
      birthday?: string;
      gender?: 'M' | 'F';
      religion?: string;
    };
    socialMedia?: {
      twitter?: string;
      facebook?: string;
      youtube?: string;
      instagram?: string;
    };
    website?: string;
  };
  bioguideId: string;
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: Record<string, unknown>;
    news?: unknown[];
  };
  metrics?: {
    billsSponsored: number;
    partyVotingPercentage: number;
    attendancePercentage: number;
    profileCompleteness: number;
  };
}

export function EnhancedClientWrapper({
  representative,
  bioguideId,
  serverData,
  metrics,
}: EnhancedClientWrapperProps) {
  // Calculate basic metrics from server data if not provided
  const calculatedMetrics = metrics || {
    billsSponsored: Array.isArray(serverData?.bills) ? serverData.bills.length : 0,
    partyVotingPercentage: 85, // This would be calculated from voting data
    attendancePercentage: 92, // This would be calculated from voting data
    profileCompleteness: 93, // This would be calculated based on available data
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header Card */}
      <RepresentativeHeader representative={representative} metrics={calculatedMetrics} />

      {/* Enhanced Tabs */}
      <EnhancedTabs
        bioguideId={bioguideId}
        representative={representative}
        serverData={serverData}
      />
    </div>
  );
}

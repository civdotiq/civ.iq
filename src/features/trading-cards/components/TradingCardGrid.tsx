/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { ProfileCard } from './ProfileCard';
import { MoneyCard } from './MoneyCard';
import { AlignmentCard } from './AlignmentCard';
import { LegislationCard } from './LegislationCard';
import type {
  ProfileCardData,
  MoneyCardData,
  AlignmentCardData,
  LegislationCardData,
} from '../types';
import type { EnhancedRepresentative } from '@/types/representative';

interface TradingCardGridProps {
  representative: EnhancedRepresentative;
}

interface SummaryResponse {
  success: boolean;
  data?: {
    billsSponsored?: number;
    totalRaised?: number;
    votesParticipated?: number;
  };
}

interface AlignmentResponse {
  overall_alignment?: number;
  bipartisan_votes?: number;
  total_votes_analyzed?: number;
  alignment_trend?: 'increasing' | 'decreasing' | 'stable';
}

interface FinanceResponse {
  totalRaised?: number;
  individualContributions?: number;
  pacContributions?: number;
  industryBreakdown?: Array<{ sector: string; amount: number }>;
  cycle?: number;
}

interface BillsResponse {
  totalSponsored?: number;
  bills?: Array<{ status?: string }>;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

/** Derive focus areas from committee names */
function deriveFocusAreas(committees?: Array<{ name: string }>): string[] {
  if (!committees || committees.length === 0) return [];

  const keywordMap: Record<string, string> = {
    'armed services': 'Defense',
    judiciary: 'Judiciary',
    finance: 'Finance',
    banking: 'Banking',
    energy: 'Energy',
    commerce: 'Commerce',
    agriculture: 'Agriculture',
    education: 'Education',
    'foreign relations': 'Foreign Relations',
    'foreign affairs': 'Foreign Affairs',
    intelligence: 'Intelligence',
    homeland: 'Homeland Security',
    health: 'Health',
    environment: 'Environment',
    transportation: 'Transportation',
    oversight: 'Oversight',
    'ways and means': 'Ways & Means',
  };

  const areas = new Set<string>();
  for (const committee of committees) {
    const lower = committee.name.toLowerCase();
    for (const [keyword, label] of Object.entries(keywordMap)) {
      if (lower.includes(keyword) && areas.size < 4) {
        areas.add(label);
        break;
      }
    }
  }
  return Array.from(areas);
}

export function TradingCardGrid({ representative }: TradingCardGridProps) {
  const bioguideId = representative.bioguideId;

  // Reuse same summary endpoint as SimpleRepresentativeProfile (SWR deduplication)
  const { data: summaryData } = useSWR<SummaryResponse>(
    `/api/representative/${bioguideId}/batch?summary=true`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Fetch alignment data
  const { data: alignmentData } = useSWR<AlignmentResponse>(
    `/api/representative/${bioguideId}/party-alignment`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Fetch finance data for money card
  const { data: financeData } = useSWR<FinanceResponse>(
    `/api/representative/${bioguideId}/finance`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Fetch bills data for legislation card
  const { data: billsData } = useSWR<BillsResponse>(
    `/api/representative/${bioguideId}/bills`,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const cardBase = useMemo(
    () => ({
      bioguideId: representative.bioguideId,
      name: representative.name,
      party: representative.party,
      state: representative.state,
      district: representative.district,
      chamber: representative.chamber,
      imageUrl: representative.imageUrl,
    }),
    [representative]
  );

  // Build profile card data
  const profileCardData: ProfileCardData = useMemo(
    () => ({
      ...cardBase,
      type: 'profile' as const,
      billsSponsored: summaryData?.data?.billsSponsored,
      totalRaised: summaryData?.data?.totalRaised,
      committees: representative.committees?.length,
      votesParticipated: summaryData?.data?.votesParticipated,
    }),
    [cardBase, summaryData, representative.committees]
  );

  // Build money card data (only if finance data available)
  const moneyCardData: MoneyCardData | null = useMemo(() => {
    if (!financeData?.totalRaised) return null;
    const totalRaised = financeData.totalRaised;
    const individual = financeData.individualContributions || 0;
    const pac = financeData.pacContributions || 0;
    const currentYear = new Date().getFullYear();

    return {
      ...cardBase,
      type: 'money' as const,
      totalRaised,
      individualPercent: totalRaised > 0 ? Math.round((individual / totalRaised) * 100) : 0,
      pacPercent: totalRaised > 0 ? Math.round((pac / totalRaised) * 100) : 0,
      topIndustry: financeData.industryBreakdown?.[0]?.sector,
      topIndustryAmount: financeData.industryBreakdown?.[0]?.amount,
      cycle: financeData.cycle || (currentYear % 2 === 0 ? currentYear : currentYear + 1),
    };
  }, [cardBase, financeData]);

  // Build alignment card data
  const alignmentCardData: AlignmentCardData | null = useMemo(() => {
    if (!alignmentData?.overall_alignment) return null;
    return {
      ...cardBase,
      type: 'alignment' as const,
      partyAlignmentPercent: alignmentData.overall_alignment,
      bipartisanVotes: alignmentData.bipartisan_votes || 0,
      totalVotes: alignmentData.total_votes_analyzed || 0,
      trend: alignmentData.alignment_trend,
    };
  }, [cardBase, alignmentData]);

  // Build legislation card data
  const legislationCardData: LegislationCardData | null = useMemo(() => {
    const sponsored = billsData?.totalSponsored ?? billsData?.bills?.length;
    if (sponsored === undefined) return null;

    const enacted =
      billsData?.bills?.filter(
        b => b.status?.toLowerCase().includes('enacted') || b.status?.toLowerCase().includes('law')
      ).length || 0;

    return {
      ...cardBase,
      type: 'legislation' as const,
      billsSponsored: sponsored,
      billsEnacted: enacted,
      focusAreas: deriveFocusAreas(representative.committees),
    };
  }, [cardBase, billsData, representative.committees]);

  return (
    <div>
      <h2 className="aicher-heading type-lg text-gray-900 mb-4">Trading Cards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ProfileCard data={profileCardData} />
        {moneyCardData && <MoneyCard data={moneyCardData} />}
        {alignmentCardData && <AlignmentCard data={alignmentCardData} />}
        {legislationCardData && <LegislationCard data={legislationCardData} />}
      </div>
    </div>
  );
}

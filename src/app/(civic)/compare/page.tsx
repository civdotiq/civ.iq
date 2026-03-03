'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ComparisonHeader = dynamic(
  () => import('@/features/comparison/components/ComparisonHeader'),
  { ssr: false }
);

const RepresentativeSelector = dynamic(
  () => import('@/features/comparison/components/RepresentativeSelector'),
  { ssr: false }
);

const ComparisonChart = dynamic(() => import('@/features/comparison/components/ComparisonChart'), {
  ssr: false,
});

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  yearsInOffice: number;
  imageUrl?: string;
  committees: Array<{
    name: string;
    role?: string;
  }>;
  votingRecord: {
    totalVotes: number;
    partyLineVotes: number;
    missedVotes: number;
  };
  billsSponsored: number;
  billsCosponsored: number;
}

interface VoteRecord {
  voteId: string;
  bill: { number: string; title: string; congress: string; type: string };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
  chamber: 'House' | 'Senate';
  rollNumber: number;
  description: string;
}

interface FinanceData {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  industryBreakdown: Array<{ sector: string; amount: number; percentage: number }>;
}

interface AlignmentData {
  overall_alignment: number;
  bipartisan_votes: number;
  total_votes_analyzed: number;
  voting_patterns: {
    with_party: number;
    against_party: number;
    bipartisan: number;
    absent: number;
  };
}

interface SummaryData {
  billsSponsored?: number;
  billsCosponsored?: number;
  totalRaised?: number;
  votesParticipated?: number;
}

interface BatchSummaryEnvelope {
  success: boolean;
  data: SummaryData;
  metadata?: Record<string, unknown>;
}

export interface DetailData {
  summary: SummaryData | null;
  votes: VoteRecord[];
  finance: FinanceData | null;
  alignment: AlignmentData | null;
  loading: boolean;
  error: string | null;
}

export type ChartType = 'overview' | 'voting' | 'bills' | 'finance' | 'alignment';

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data as T;
  } catch {
    return null;
  }
}

function ComparePageContent() {
  const searchParams = useSearchParams();
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Map<string, DetailData>>(new Map());
  const [selectorCollapsed, setSelectorCollapsed] = useState(false);

  useEffect(() => {
    async function loadRepresentatives() {
      try {
        setLoading(true);
        const response = await fetch('/api/representatives/all');
        if (!response.ok) {
          throw new Error('Failed to fetch representatives');
        }
        const data = await response.json();

        if (!data.success || !data.representatives) {
          throw new Error(data.error?.message || 'Failed to fetch representatives');
        }

        const transformedReps: Representative[] = data.representatives.map(
          (rep: Record<string, unknown>) => ({
            bioguideId: (rep.bioguideId as string) || '',
            name: (rep.name as string) || '',
            party: (rep.party as string) || '',
            state: (rep.state as string) || '',
            district: rep.district as string | undefined,
            chamber: (rep.chamber as 'House' | 'Senate') || 'House',
            title:
              (rep.title as string) || `${rep.chamber === 'House' ? 'Rep.' : 'Sen.'} ${rep.name}`,
            yearsInOffice: (rep.yearsInOffice as number) || 0,
            imageUrl: rep.imageUrl as string | undefined,
            committees: (rep.committees as Array<{ name: string; role?: string }>) || [],
            votingRecord: {
              totalVotes:
                ((rep.votingRecord as Record<string, unknown>)?.totalVotes as number) || 0,
              partyLineVotes:
                ((rep.votingRecord as Record<string, unknown>)?.partyLineVotes as number) || 0,
              missedVotes:
                ((rep.votingRecord as Record<string, unknown>)?.missedVotes as number) || 0,
            },
            billsSponsored: (rep.billsSponsored as number) || 0,
            billsCosponsored: (rep.billsCosponsored as number) || 0,
          })
        );

        setRepresentatives(transformedReps);

        const preselected = searchParams.get('reps');
        if (preselected) {
          setSelectedIds(preselected.split(',').slice(0, 4));
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadRepresentatives();
  }, [searchParams]);

  const fetchDetailData = useCallback(async (bioguideId: string) => {
    setDetailData(prev => {
      const next = new Map(prev);
      next.set(bioguideId, {
        summary: null,
        votes: [],
        finance: null,
        alignment: null,
        loading: true,
        error: null,
      });
      return next;
    });

    const base = `/api/representative/${bioguideId}`;

    const [summaryEnvelope, votesRes, financeRes, alignmentRes] = await Promise.all([
      fetchJson<BatchSummaryEnvelope>(`${base}/batch?summary=true`),
      fetchJson<{ votes: VoteRecord[] }>(`${base}/votes?limit=50`),
      fetchJson<FinanceData>(`${base}/finance`),
      fetchJson<AlignmentData>(`${base}/party-alignment`),
    ]);

    // Unwrap the API envelope: { success, data: { billsSponsored, ... } }
    const summaryRes: SummaryData | null = summaryEnvelope?.data ?? null;

    setDetailData(prev => {
      const next = new Map(prev);
      next.set(bioguideId, {
        summary: summaryRes,
        votes: votesRes?.votes ?? [],
        finance: financeRes,
        alignment: alignmentRes,
        loading: false,
        error: null,
      });
      return next;
    });
  }, []);

  // Fetch detail data when selections change
  useEffect(() => {
    for (const id of selectedIds) {
      const existing = detailData.get(id);
      if (!existing) {
        fetchDetailData(id);
      }
    }
  }, [selectedIds, detailData, fetchDetailData]);

  const selectedRepresentatives = representatives.filter(rep =>
    selectedIds.includes(rep.bioguideId)
  );

  const handleSelectionChange = (newSelectedIds: string[]) => {
    setSelectedIds(newSelectedIds);
    if (newSelectedIds.length >= 2) {
      setSelectorCollapsed(true);
    }
    if (newSelectedIds.length > 0) {
      const params = new URLSearchParams();
      params.set('reps', newSelectedIds.join(','));
      window.history.replaceState(null, '', `?${params.toString()}`);
    } else {
      setSelectorCollapsed(false);
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const handleClear = () => {
    setSelectedIds([]);
    setSelectorCollapsed(false);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const handleRemoveRep = (bioguideId: string) => {
    const newIds = selectedIds.filter(id => id !== bioguideId);
    setSelectedIds(newIds);
    if (newIds.length < 2) {
      setSelectorCollapsed(false);
    }
    if (newIds.length > 0) {
      const params = new URLSearchParams();
      params.set('reps', newIds.join(','));
      window.history.replaceState(null, '', `?${params.toString()}`);
    } else {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  const tabs: ChartType[] = ['overview', 'voting', 'bills', 'finance', 'alignment'];

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <Link href="/representatives" className="hover:text-[#3ea2d4]">
            Representatives
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">Compare</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Compare Representatives
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Select up to 4 representatives to compare voting records, campaign finance, and
            legislative activity side by side.
          </p>
        </div>

        {loading && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-8 text-center">
            <div className="aicher-loading w-8 h-8 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">Loading representatives...</p>
          </div>
        )}

        {error && !loading && (
          <div className="border-l-4 border-[#e11d07] bg-red-50 dark:bg-red-900/20 p-4 mb-8">
            <p className="text-[#e11d07] dark:text-red-400 font-semibold">Error</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 px-3 py-1.5 text-sm font-medium border-2 border-[#3ea2d4] text-[#3ea2d4] hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              Try Again
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-8">
            {/* Selection bar */}
            <ComparisonHeader
              selectedReps={selectedRepresentatives.map(rep => ({
                bioguideId: rep.bioguideId,
                name: rep.name,
                party: rep.party,
                state: rep.state,
                chamber: rep.chamber,
              }))}
              onClear={handleClear}
              onRemove={handleRemoveRep}
            />

            {/* Comparison results - above selector so they're visible immediately */}
            {selectedIds.length > 0 && (
              <div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {tabs.map(type => (
                    <button
                      key={type}
                      onClick={() => setChartType(type)}
                      className={`px-3 py-1.5 text-sm font-medium capitalize ${
                        chartType === type
                          ? 'bg-[#3ea2d4] text-white'
                          : 'bg-white dark:bg-[#222226] text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>

                <ComparisonChart
                  representatives={selectedRepresentatives}
                  chartType={chartType}
                  detailData={detailData}
                />
              </div>
            )}

            {/* Selector - below comparison, collapsible */}
            <RepresentativeSelector
              representatives={representatives}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              maxSelections={4}
              collapsed={selectorCollapsed}
              onToggleCollapse={() => setSelectorCollapsed(prev => !prev)}
            />

            {/* Source */}
            <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
              Source: Congress.gov, FEC.gov &middot; Data reflects current 119th Congress session.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#1a1a1e] flex items-center justify-center">
          <div className="aicher-loading w-8 h-8" />
        </div>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React, { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { EnhancedRepresentative } from '@/types/representative';
import type { DataQuality } from '@/types/backbone-response';
import { useSectionNavigation } from '@/shared/components/dashboard';
import { hasIntelligenceData } from '@/lib/intelligence/has-intelligence-data';
import { RepresentativeDashboard, REPRESENTATIVE_SECTIONS } from '../RepresentativeDashboard';
import { deriveCommitteeCodes, deriveFocusAreas } from '../../utils/derive-profile-meta';
import { IdentityHeader } from './IdentityHeader';
import { SectionNav, type SectionNavItem } from './SectionNav';
import { GlanceBand } from './GlanceBand';
import { RecentVotesSection } from './RecentVotesSection';
import { FinanceSection } from './FinanceSection';
import { BillsSection } from './BillsSection';
import { InfluenceSection } from './InfluenceSection';
import { NewsSection } from './NewsSection';
import { ProfileSidebar } from './ProfileSidebar';
import type { ProfileBatchResponse, ProfileSummaryResponse } from './types';

interface ProfileRedesignProps {
  representative: EnhancedRepresentative;
}

interface CommitteesApiResponse {
  committees?: unknown[];
  dataQuality?: DataQuality;
}

const NAV_ITEMS: SectionNavItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'votes', label: 'Voting record' },
  { id: 'money', label: 'Campaign finance' },
  { id: 'bills', label: 'Bills' },
  { id: 'influence', label: 'Lobbying & influence' },
  { id: 'news', label: 'News' },
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.json();
}

/**
 * One batch request feeds both the overview sections and the drill-down
 * dashboard panels (votes 25 / bills 25 / finance summary — the same
 * payloads the classic tab layout requests).
 */
async function fetchOverviewBatch(bioguideId: string): Promise<ProfileBatchResponse> {
  const response = await fetch(`/api/representative/${bioguideId}/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      endpoints: ['votes', 'bills', 'finance'],
      options: {
        votes: { limit: 25 },
        bills: { summaryOnly: false, limit: 25 },
        finance: { summaryOnly: true },
      },
    }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  return response.json();
}

/**
 * Redesigned representative profile: a single scrolling overview with
 * real data inline (votes, money, bills, influence, news) plus a
 * reference sidebar. Drill-down detail reuses the existing dashboard
 * section panels via the same `?section=` navigation as the classic layout.
 */
export function ProfileRedesign({ representative }: ProfileRedesignProps) {
  const { activeSection, navigateToSection, navigateBack } = useSectionNavigation({
    validSections: [...REPRESENTATIVE_SECTIONS],
  });

  const { data: summaryResp, isLoading: summaryLoading } = useSWR<ProfileSummaryResponse>(
    `/api/representative/${representative.bioguideId}/batch?summary=true`,
    fetchJson<ProfileSummaryResponse>,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const {
    data: batchResp,
    error: batchError,
    isLoading: batchLoading,
  } = useSWR<ProfileBatchResponse>(
    `profile-overview-batch:${representative.bioguideId}`,
    () => fetchOverviewBatch(representative.bioguideId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
      shouldRetryOnError: true,
      errorRetryCount: 1,
      errorRetryInterval: 2000,
    }
  );

  // Freshness signal so the Profile drill-down can distinguish "no committees"
  // from "Congress.gov temporarily unreachable" (same contract as classic layout).
  const { data: committeesData } = useSWR<CommitteesApiResponse>(
    `/api/representative/${representative.bioguideId}/committees`,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok && response.status !== 503) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    { revalidateOnFocus: false, dedupingInterval: 300000, shouldRetryOnError: false }
  );

  const summary = summaryResp?.success ? (summaryResp.data ?? null) : null;
  const votesResponse = batchResp?.data?.votes;
  const finance = batchResp?.data?.finance;
  const bills = batchResp?.data?.bills;

  const committeeCodes = useMemo(
    () => deriveCommitteeCodes(representative.committees),
    [representative.committees]
  );
  const focusAreas = useMemo(
    () => deriveFocusAreas(representative.committees),
    [representative.committees]
  );

  const nextElection = useMemo(() => {
    const currentYear = new Date().getFullYear();
    if (representative.chamber === 'House') {
      return currentYear % 2 === 0 ? currentYear : currentYear + 1;
    }
    if (representative.currentTerm?.end) {
      return new Date(representative.currentTerm.end).getFullYear();
    }
    return null;
  }, [representative.chamber, representative.currentTerm?.end]);

  const intelligenceAvailable = useMemo(
    () =>
      hasIntelligenceData({
        committeeCount: representative.committees?.length ?? 0,
        votesParticipated: summary?.votesParticipated,
      }),
    [representative.committees, summary?.votesParticipated]
  );

  const openSection = useCallback(
    (id: string) => {
      navigateToSection(id);
      window.scrollTo({ top: 0 });
    },
    [navigateToSection]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <div data-speakable="rep-summary">
          <IdentityHeader
            representative={representative}
            nextElection={nextElection}
            focusAreas={focusAreas}
            onOpenBio={() => openSection('overview')}
          />
        </div>

        {activeSection ? (
          <div className="mt-8 bg-white aicher-border">
            <RepresentativeDashboard
              representative={representative}
              summaryData={summaryResp}
              summaryLoading={summaryLoading}
              batchData={batchResp}
              batchLoading={batchLoading}
              batchError={batchError as Error | undefined}
              committeeCodes={committeeCodes}
              committeesDataQuality={committeesData?.dataQuality}
              activeSection={activeSection}
              onSectionSelect={openSection}
              onBack={navigateBack}
            />
          </div>
        ) : (
          <>
            <div className="mt-8">
              <SectionNav items={NAV_ITEMS} />
            </div>

            {/* The overview anchor wraps ONLY the glance band. It used to wrap
                every section below it, which made it an ancestor of #votes,
                #money, #bills, #influence and #news — so the scroll-spy saw it
                intersecting at every scroll position and it beat its own
                children on every comparison. */}
            <div className="pt-8">
              <div id="overview" className="scroll-mt-16">
                <GlanceBand
                  summary={summary}
                  loading={summaryLoading}
                  committeeCount={representative.committees?.length ?? 0}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
                <main>
                  <RecentVotesSection
                    bioguideId={representative.bioguideId}
                    chamber={representative.chamber}
                    votes={votesResponse?.votes}
                    totalResults={votesResponse?.totalResults}
                    loading={batchLoading}
                    error={Boolean(batchError) || votesResponse?.success === false}
                  />

                  <FinanceSection
                    finance={finance}
                    loading={batchLoading}
                    onExplore={() => openSection('finance')}
                  />

                  <BillsSection
                    bills={bills}
                    summary={summary}
                    loading={batchLoading}
                    onExplore={() => openSection('legislation')}
                  />

                  <InfluenceSection
                    bioguideId={representative.bioguideId}
                    onExploreLobbying={() => openSection('lobbying')}
                    onExploreIntelligence={
                      intelligenceAvailable ? () => openSection('intelligence') : undefined
                    }
                  />

                  <NewsSection
                    bioguideId={representative.bioguideId}
                    memberName={representative.name}
                    onExplore={() => openSection('news')}
                  />
                </main>

                <ProfileSidebar
                  representative={representative}
                  nextElection={nextElection}
                  onExploreDistrict={() => openSection('district')}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

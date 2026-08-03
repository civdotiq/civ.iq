/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMemberLobbyingFromCorpus } from '@/lib/data-sources/lda-corpus/committee-lobbying';
import { getLDAIssueLabel } from '@civiq/entity-resolution';
import logger from '@/lib/logging/simple-logger';
import { cachedFetch } from '@/lib/cache';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';
import { getCommitteeCorpusTotals, getCorpusMeta } from '@/lib/data-sources/lda-corpus/load';

/**
 * Map a committee name to its code by bidirectional substring match against
 * ALL_COMMITTEE_MAPPINGS. Punctuation is stripped first so Congress.gov names
 * like "Committee on Veterans' Affairs" match the mapping "Veterans Affairs".
 * Kept local to avoid importing the analyzer barrel, which pulls in the AI SDK
 * (heavy, and breaks route imports in jsdom tests).
 */
function normalizeCommittee(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function committeeCodeForName(name: string): string | undefined {
  const norm = normalizeCommittee(name);
  return ALL_COMMITTEE_MAPPINGS.find(m => {
    const mNorm = normalizeCommittee(m.committeeName);
    return norm.includes(mNorm) || mNorm.includes(norm);
  })?.committeeCode;
}
import {
  fetchWithSourceStatus,
  computeDataQuality,
  type DataQuality,
  type SourceStatus,
} from '@/types/backbone-response';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

interface RepresentativeLobbyingResponse {
  representative: {
    bioguideId: string;
    name: string;
    committees: string[];
  };
  lobbyingData: {
    totalRelevantSpending: number;
    affectedCommittees: number;
    /**
     * Distinct organizations across every filing touching this member's
     * committees. Not topCompanies.length — that is a top-N display list and
     * reports its own cap, which for most members is simply 10.
     */
    organizationCount: number;
    /** Distinct filings behind the figures, each counted once across committees. */
    filingCount: number;
    topCompanies: Array<{
      name: string;
      registrantId: string | null;
      totalSpending: number;
      committees: string[];
      recentFilings: number;
    }>;
    committeeBreakdown: Array<{
      committee: string;
      totalSpending: number;
      companyCount: number;
      topIssues: string[];
    }>;
    summary: {
      quarterlyTrend: Array<{
        quarter: string;
        year: number;
        spending: number;
      }>;
      industryBreakdown: Array<{
        industry: string;
        filingCount: number;
        percentage: number;
      }>;
    };
  };
  // Corpus-backed per-committee totals (complete Senate LDA corpus, not the
  // ~0.1% live sample above). Totals only — top-orgs stay sample-based until
  // entity resolution lands (PLAN-lobbying-corpus-2026-07.md Phase 2 follow-up).
  corpusLobbying?: {
    quarters: string[];
    generatedAt: string;
    committees: Array<{
      committeeCode: string;
      committeeName: string;
      windowTotal: number;
      quarterly: Array<{ quarter: string; total: number }>;
      peer: { medianTotal: number; ratioToMedian: number };
      topIssues: Array<{ code: string; label: string; count: number }>;
      topOrgs: Array<{
        name: string;
        registrantId: string | null;
        amount: number;
        filings: number;
      }>;
    }>;
  };
  dataQuality: DataQuality;
  sourceStatus: SourceStatus[];
  metadata: {
    dataSource: string;
    lastUpdated: string;
    coveragePeriod: string;
    note: string;
  };
}

/**
 * Corpus-backed per-committee lobbying totals for a rep's committees. Maps each
 * committee name to its code, dedupes, and looks up the complete-corpus totals.
 * Returns undefined when the corpus is unavailable or none of the rep's
 * committees are represented — the sample-based sections still render.
 */
async function buildCorpusLobbying(
  committeeNames: string[]
): Promise<RepresentativeLobbyingResponse['corpusLobbying']> {
  const meta = await getCorpusMeta();
  if (!meta) return undefined;

  const seenCodes = new Set<string>();
  const committees: NonNullable<RepresentativeLobbyingResponse['corpusLobbying']>['committees'] =
    [];

  for (const name of committeeNames) {
    const code = committeeCodeForName(name);
    if (!code || seenCodes.has(code)) continue;
    seenCodes.add(code);

    const totals = await getCommitteeCorpusTotals(code);
    if (!totals) continue;
    committees.push({
      committeeCode: totals.committeeCode,
      committeeName: totals.committeeName,
      windowTotal: totals.windowTotal,
      quarterly: totals.quarterly,
      peer: totals.peer,
      topIssues: totals.topIssues,
      topOrgs: totals.topOrgs,
    });
  }

  if (committees.length === 0) return undefined;
  committees.sort((a, b) => b.windowTotal - a.windowTotal);
  return { quarters: meta.quarters, generatedAt: meta.generatedAt, committees };
}

const EMPTY_LOBBYING_DATA = {
  totalRelevantSpending: 0,
  affectedCommittees: 0,
  organizationCount: 0,
  filingCount: 0,
  topCompanies: [],
  committeeBreakdown: [],
  summary: {
    quarterlyTrend: [],
    industryBreakdown: [],
  },
} satisfies RepresentativeLobbyingResponse['lobbyingData'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const startTime = Date.now();
  const { bioguideId } = await params;

  logger.info('Lobbying data request started', { bioguideId });

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  // Step 1: Fetch representative data (Congress.gov)
  const { data: repData, sourceStatus: congressStatus } = await fetchWithSourceStatus(
    'congress.gov',
    () => getEnhancedRepresentative(bioguideId),
    null
  );

  if (!repData) {
    const quality = congressStatus.status === 'ok' ? 'empty' : 'unavailable';
    const note =
      congressStatus.status === 'ok'
        ? 'Representative not found in Congress.gov.'
        : `Congress.gov is temporarily unavailable: ${congressStatus.errorMessage ?? 'unknown error'}`;

    logger.warn('Failed to fetch representative data', { bioguideId, quality });

    return NextResponse.json(
      {
        representative: { bioguideId, name: 'Unknown', committees: [] },
        lobbyingData: EMPTY_LOBBYING_DATA,
        dataQuality: quality,
        sourceStatus: [congressStatus],
        metadata: {
          dataSource: 'congress.gov',
          lastUpdated: new Date().toISOString(),
          coveragePeriod: 'N/A',
          note,
        },
      } satisfies RepresentativeLobbyingResponse,
      { status: quality === 'unavailable' ? 503 : 404 }
    );
  }

  const committees = repData.committees?.map((c: { name: string }) => c.name) || [];

  if (committees.length === 0) {
    logger.info('Representative has no committee assignments', {
      bioguideId,
      representativeName: repData.name,
    });

    return NextResponse.json(
      {
        representative: { bioguideId, name: repData.name, committees: [] },
        lobbyingData: EMPTY_LOBBYING_DATA,
        dataQuality: 'empty' as DataQuality,
        sourceStatus: [congressStatus],
        metadata: {
          dataSource: 'senate-lda-api',
          lastUpdated: new Date().toISOString(),
          coveragePeriod: 'No committee assignments',
          note: 'Representative has no committee assignments. Lobbying data requires committee membership to identify relevant corporate influence.',
        },
      } satisfies RepresentativeLobbyingResponse,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  }

  // Step 2: Fetch lobbying data (Senate LDA) with caching
  const { data: lobbyingData, sourceStatus: ldaStatus } = await fetchWithSourceStatus(
    'senate-lda',
    async () => {
      return await cachedFetch(
        `lobbying-data-${bioguideId}`,
        async () => {
          logger.info('Fetching committee lobbying data', { bioguideId, committees });

          // Corpus only. The API path this used to call returns the LDA's first
          // 25 filings of a quarter, from which a member's lobbying picture
          // cannot be assembled — the totals, the top-10 organizations and the
          // quarterly trend were all computed from about 0.09% of the record.
          // No corpus means no lobbying section, not a thinner one.
          const rollup = await getMemberLobbyingFromCorpus(committees);

          if (!rollup) {
            logger.info('No corpus lobbying data for representative committees', {
              bioguideId,
              committees,
            });
            return null;
          }

          const topCompanies = rollup.topCompanies.slice(0, 10).map(c => ({
            name: c.name,
            registrantId: c.registrantId,
            totalSpending: c.totalSpending,
            committees: c.committees,
            recentFilings: c.filingCount,
          }));

          const committeeBreakdown = rollup.committeeBreakdown.map(c => ({
            committee: c.committee,
            totalSpending: c.attributedSpending,
            companyCount: c.companyCount,
            // The corpus stores LDA issue codes; every surface downstream
            // (SectorLink, /industry/{sector}) keys on the human label the API
            // path used to return.
            topIssues: c.topIssues.map(code => getLDAIssueLabel(code) || code),
          }));

          // Only quarters the corpus actually covers. Projecting a fixed
          // two-year window would draw a zero bar for a quarter whose filings
          // are not due yet and read as "nobody lobbied".
          const quarterlyTrend = rollup.quarters.map(key => {
            const [year, quarter] = key.split('-');
            return {
              quarter: quarter ?? key,
              year: Number(year) || 0,
              spending: rollup.quarterTotals[key] ?? 0,
            };
          });

          // Industry breakdown by filing count, not dollars
          const industryBreakdown = Object.entries(rollup.issueFilingCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([code, filingCount]) => ({
              industry: getLDAIssueLabel(code) || code,
              filingCount,
              percentage: rollup.filingCount > 0 ? (filingCount / rollup.filingCount) * 100 : 0,
            }));

          return {
            totalRelevantSpending: rollup.totalSpending,
            affectedCommittees: rollup.committeeBreakdown.length,
            organizationCount: rollup.companyCount,
            filingCount: rollup.filingCount,
            topCompanies,
            committeeBreakdown,
            coverage: 'complete' as const,
            summary: { quarterlyTrend, industryBreakdown },
          };
        },
        30 * 60
      );
    },
    null
  );

  const allStatuses = [congressStatus, ldaStatus];
  const hasLobbyingData = lobbyingData !== null;
  const dataQuality =
    ldaStatus.status !== 'ok'
      ? computeDataQuality(allStatuses, true)
      : hasLobbyingData
        ? 'complete'
        : 'empty';

  const processingTime = Date.now() - startTime;
  logger.info('Lobbying data request completed', {
    bioguideId,
    processingTime,
    dataQuality,
    totalSpending: lobbyingData?.totalRelevantSpending ?? 0,
  });

  const note =
    dataQuality === 'unavailable'
      ? `Lobbying data is temporarily unavailable: ${ldaStatus.errorMessage ?? 'Senate LDA API error'}. Please try again later.`
      : dataQuality === 'empty'
        ? "No lobbying activity found related to this representative's committee assignments."
        : "Lobbying data shows corporate spending on issues related to representative's committee assignments. Data sourced from Senate Lobbying Disclosure Act database.";

  const corpusLobbying = await buildCorpusLobbying(committees);

  const response: RepresentativeLobbyingResponse = {
    representative: { bioguideId, name: repData.name, committees },
    lobbyingData: lobbyingData ?? EMPTY_LOBBYING_DATA,
    ...(corpusLobbying ? { corpusLobbying } : {}),
    dataQuality,
    sourceStatus: allStatuses,
    metadata: {
      dataSource: 'senate-lda-api',
      lastUpdated: new Date().toISOString(),
      coveragePeriod: dataQuality === 'unavailable' ? 'Error' : 'Last 2 years (quarterly filings)',
      note,
    },
  };

  return NextResponse.json(response, {
    status: dataQuality === 'unavailable' ? 503 : 200,
    headers: {
      'Cache-Control':
        dataQuality === 'unavailable'
          ? 'no-cache'
          : 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}

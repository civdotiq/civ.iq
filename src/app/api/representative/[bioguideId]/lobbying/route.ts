/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
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
    });
  }

  if (committees.length === 0) return undefined;
  committees.sort((a, b) => b.windowTotal - a.windowTotal);
  return { quarters: meta.quarters, generatedAt: meta.generatedAt, committees };
}

const EMPTY_LOBBYING_DATA = {
  totalRelevantSpending: 0,
  affectedCommittees: 0,
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

          const committeeLobbyingData =
            await senateLobbyingAPI.getCommitteeLobbyingData(committees);

          if (committeeLobbyingData.length === 0) {
            logger.info('No lobbying data found for representative committees', {
              bioguideId,
              committees,
            });
            return null;
          }

          // De-duplicate filings across committees
          const uniqueFilingMap = new Map<
            string,
            {
              id: string;
              company: string;
              registrantId: string;
              amount: number;
              issues: string[];
              quarter: string;
              year: number;
              committees: string[];
            }
          >();

          committeeLobbyingData.forEach(committeeData => {
            committeeData.filings.forEach(filing => {
              const existing = uniqueFilingMap.get(filing.id);
              if (!existing) {
                uniqueFilingMap.set(filing.id, {
                  id: filing.id,
                  company: filing.company,
                  registrantId: filing.registrantId,
                  amount: filing.amount,
                  issues: filing.issues,
                  quarter: filing.quarter,
                  year: filing.year,
                  committees: [committeeData.committee],
                });
              } else if (!existing.committees.includes(committeeData.committee)) {
                existing.committees.push(committeeData.committee);
              }
            });
          });

          const uniqueFilings = Array.from(uniqueFilingMap.values());
          const totalRelevantSpending = uniqueFilings.reduce(
            (sum, filing) => sum + filing.amount,
            0
          );

          const allCompanies: Record<
            string,
            {
              totalSpending: number;
              committees: Set<string>;
              filings: number;
              registrantId: string | null;
            }
          > = {};

          uniqueFilings.forEach(filing => {
            if (!allCompanies[filing.company]) {
              allCompanies[filing.company] = {
                totalSpending: 0,
                committees: new Set(),
                filings: 0,
                registrantId: filing.registrantId ?? null,
              };
            }
            const company = allCompanies[filing.company];
            if (company) {
              company.totalSpending += filing.amount;
              filing.committees.forEach(c => company.committees.add(c));
              company.filings += 1;
              if (!company.registrantId && filing.registrantId) {
                company.registrantId = filing.registrantId;
              }
            }
          });

          const topCompanies = Object.entries(allCompanies)
            .map(([name, data]) => ({
              name,
              registrantId: data.registrantId,
              totalSpending: data.totalSpending,
              committees: Array.from(data.committees),
              recentFilings: data.filings,
            }))
            .sort((a, b) => b.totalSpending - a.totalSpending)
            .slice(0, 10);

          // Proportional attribution for committee breakdown
          const committeeBreakdown = committeeLobbyingData.map(committeeResult => {
            let attributedSpending = 0;
            committeeResult.filings.forEach(filing => {
              const uniqueFiling = uniqueFilingMap.get(filing.id);
              const matchedCommitteeCount = uniqueFiling?.committees.length ?? 1;
              attributedSpending += filing.amount / matchedCommitteeCount;
            });

            return {
              committee: committeeResult.committee,
              totalSpending: attributedSpending,
              companyCount: committeeResult.companyCount,
              topIssues: Array.from(new Set(committeeResult.filings.flatMap(f => f.issues))).slice(
                0,
                5
              ),
            };
          });

          // Trend over the full fetched window (last year + current year up to
          // the current quarter) — must stay in sync with fetchRecentFilings.
          const currentYear = new Date().getFullYear();
          const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);
          const quarterLabels = [
            'first_quarter',
            'second_quarter',
            'third_quarter',
            'fourth_quarter',
          ];
          const quarterlyTrend = [];
          for (const year of [currentYear - 1, currentYear]) {
            for (let q = 1; q <= 4; q++) {
              if (year === currentYear && q > currentQuarter) continue;

              const quarterSpending = uniqueFilings
                .filter(f => f.year === year && f.quarter === quarterLabels[q - 1])
                .reduce((sum, f) => sum + f.amount, 0);

              quarterlyTrend.push({
                quarter: `Q${q}`,
                year,
                spending: quarterSpending,
              });
            }
          }

          // Industry breakdown by filing count, not dollars
          const issueFilingCount: Record<string, number> = {};
          uniqueFilings.forEach(filing => {
            const issues = filing.issues.length > 0 ? filing.issues : ['Other'];
            issues.forEach(issue => {
              issueFilingCount[issue] = (issueFilingCount[issue] || 0) + 1;
            });
          });

          const totalFilings = uniqueFilings.length;
          const industryBreakdown = Object.entries(issueFilingCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([industry, filingCount]) => ({
              industry,
              filingCount,
              percentage: totalFilings > 0 ? (filingCount / totalFilings) * 100 : 0,
            }));

          return {
            totalRelevantSpending,
            affectedCommittees: committeeLobbyingData.length,
            topCompanies,
            committeeBreakdown,
            summary: { quarterlyTrend, industryBreakdown },
          };
        },
        30 * 60 * 1000
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

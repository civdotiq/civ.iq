/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import logger from '@/lib/logging/simple-logger';
import { cachedFetch } from '@/lib/cache';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

interface RepresentativeLobbyingData {
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
        spending: number;
        percentage: number;
      }>;
    };
  };
  metadata: {
    dataSource: string;
    lastUpdated: string;
    coveragePeriod: string;
    note: string;
  };
}

/**
 * Get lobbying disclosure data for a representative
 *
 * Fetches corporate lobbying data from the Senate LDA (Lobbying Disclosure Act) database,
 * showing which companies are lobbying the representative's committees.
 *
 * @param _request - Next.js request object (unused)
 * @param params - Route parameters containing bioguideId
 * @returns JSON response with lobbying data including top companies, spending, and committee breakdowns
 *
 * @example
 * GET /api/representative/K000367/lobbying
 * Returns: { representative: {...}, lobbyingData: {...}, metadata: {...} }
 *
 * @see {@link https://lda.senate.gov} Senate LDA Database
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const startTime = Date.now();
  const { bioguideId } = await params;
  // Using simple logger

  logger.info('Lobbying data request started', { bioguideId });

  try {
    if (!bioguideId) {
      return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
    }

    // Get representative data including committees directly
    const repData = await getEnhancedRepresentative(bioguideId);

    if (!repData) {
      logger.warn('Failed to fetch representative data', {
        bioguideId,
      });
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    // Extract committee information
    const committees = repData.committees?.map((c: { name: string }) => c.name) || [];

    if (committees.length === 0) {
      logger.info('Representative has no committee assignments', {
        bioguideId,
        representativeName: repData.name,
      });

      return NextResponse.json(
        {
          representative: {
            bioguideId,
            name: repData.name,
            committees: [],
          },
          lobbyingData: {
            totalRelevantSpending: 0,
            affectedCommittees: 0,
            topCompanies: [],
            committeeBreakdown: [],
            summary: {
              quarterlyTrend: [],
              industryBreakdown: [],
            },
          },
          metadata: {
            dataSource: 'senate-lda-api',
            lastUpdated: new Date().toISOString(),
            coveragePeriod: 'No committee assignments',
            note: 'Representative has no committee assignments. Lobbying data requires committee membership to identify relevant corporate influence.',
          },
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      );
    }

    // Fetch lobbying data with caching
    const lobbyingData = await cachedFetch(
      `lobbying-data-${bioguideId}`,
      async () => {
        logger.info('Fetching committee lobbying data', {
          bioguideId,
          committees,
        });

        const committeeLobbyingData = await senateLobbyingAPI.getCommitteeLobbyingData(committees);

        if (committeeLobbyingData.length === 0) {
          logger.info('No lobbying data found for representative committees', {
            bioguideId,
            committees,
          });
          return null;
        }

        // De-duplicate filings across committees — a single LDA filing
        // can match multiple committees by keyword, but its income should
        // only be counted once for totals, company aggregation, and
        // industry breakdown.
        const uniqueFilingMap = new Map<
          string,
          {
            id: string;
            company: string;
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

        // Process data for response — use de-duplicated filings
        const totalRelevantSpending = uniqueFilings.reduce((sum, filing) => sum + filing.amount, 0);

        // Get top companies across all committees (de-duplicated)
        const allCompanies: Record<
          string,
          {
            totalSpending: number;
            committees: Set<string>;
            filings: number;
          }
        > = {};

        uniqueFilings.forEach(filing => {
          if (!allCompanies[filing.company]) {
            allCompanies[filing.company] = {
              totalSpending: 0,
              committees: new Set(),
              filings: 0,
            };
          }
          const company = allCompanies[filing.company];
          if (company) {
            company.totalSpending += filing.amount;
            filing.committees.forEach(c => company.committees.add(c));
            company.filings += 1;
          }
        });

        const topCompanies = Object.entries(allCompanies)
          .map(([name, data]) => ({
            name,
            totalSpending: data.totalSpending,
            committees: Array.from(data.committees),
            recentFilings: data.filings,
          }))
          .sort((a, b) => b.totalSpending - a.totalSpending)
          .slice(0, 10);

        // Committee breakdown — use proportional attribution so committee
        // totals sum to totalRelevantSpending. When a filing matches N
        // committees, each committee is attributed income / N.
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

        // Generate quarterly trend from de-duplicated filings
        const currentYear = new Date().getFullYear();
        const quarterLabels = [
          'first_quarter',
          'second_quarter',
          'third_quarter',
          'fourth_quarter',
        ];
        const quarterlyTrend = [];
        for (let q = 1; q <= 4; q++) {
          const quarterSpending = uniqueFilings
            .filter(f => f.year === currentYear - 1 && f.quarter === quarterLabels[q - 1])
            .reduce((sum, f) => sum + f.amount, 0);

          quarterlyTrend.push({
            quarter: `Q${q}`,
            year: currentYear - 1,
            spending: quarterSpending,
          });
        }

        // Industry breakdown — aggregate by LDA issue labels from de-duplicated filings
        const issueSpending: Record<string, number> = {};
        uniqueFilings.forEach(filing => {
          const amount = filing.amount;
          const issues = filing.issues.length > 0 ? filing.issues : ['Other'];
          const perIssueAmount = amount / issues.length;
          issues.forEach(issue => {
            issueSpending[issue] = (issueSpending[issue] || 0) + perIssueAmount;
          });
        });

        const industryBreakdown = Object.entries(issueSpending)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([industry, spending]) => ({
            industry,
            spending,
            percentage: totalRelevantSpending > 0 ? (spending / totalRelevantSpending) * 100 : 0,
          }));

        return {
          totalRelevantSpending,
          affectedCommittees: committeeLobbyingData.length,
          topCompanies,
          committeeBreakdown,
          summary: {
            quarterlyTrend,
            industryBreakdown,
          },
        };
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    if (!lobbyingData) {
      return NextResponse.json(
        {
          representative: {
            bioguideId,
            name: repData.name,
            committees,
          },
          lobbyingData: {
            totalRelevantSpending: 0,
            affectedCommittees: 0,
            topCompanies: [],
            committeeBreakdown: [],
            summary: {
              quarterlyTrend: [],
              industryBreakdown: [],
            },
          },
          metadata: {
            dataSource: 'senate-lda-api',
            lastUpdated: new Date().toISOString(),
            coveragePeriod: 'Last 2 years',
            note: "No lobbying activity found related to this representative's committee assignments.",
          },
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      );
    }

    const response: RepresentativeLobbyingData = {
      representative: {
        bioguideId,
        name: repData.name,
        committees,
      },
      lobbyingData,
      metadata: {
        dataSource: 'senate-lda-api',
        lastUpdated: new Date().toISOString(),
        coveragePeriod: 'Last 2 years (quarterly filings)',
        note: "Lobbying data shows corporate spending on issues related to representative's committee assignments. Data sourced from Senate Lobbying Disclosure Act database.",
      },
    };

    const processingTime = Date.now() - startTime;
    logger.info('Lobbying data request completed', {
      bioguideId,
      processingTime,
      totalSpending: lobbyingData.totalRelevantSpending,
      affectedCommittees: lobbyingData.affectedCommittees,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Error processing lobbying data request', error as Error, {
      bioguideId,
      processingTime,
    });

    // Determine if this is an API error or other error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isApiError = errorMessage.includes('Senate LDA API') || errorMessage.includes('API');

    return NextResponse.json(
      {
        representative: {
          bioguideId,
          name: 'Unknown',
          committees: [],
        },
        lobbyingData: {
          totalRelevantSpending: 0,
          affectedCommittees: 0,
          topCompanies: [],
          committeeBreakdown: [],
          summary: {
            quarterlyTrend: [],
            industryBreakdown: [],
          },
        },
        metadata: {
          dataSource: isApiError ? 'senate-lda-api-error' : 'unavailable',
          lastUpdated: new Date().toISOString(),
          coveragePeriod: 'Error',
          note: isApiError
            ? 'Lobbying data is temporarily unavailable due to Senate LDA API error. The service may be down or experiencing issues. Please try again later.'
            : 'Lobbying data is temporarily unavailable due to a service error. Please try again later.',
        },
      },
      { status: 500 }
    );
  }
}

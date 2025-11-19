/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import logger from '@/lib/logging/simple-logger';
import { cachedFetch } from '@/lib/cache';

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

export async function GET(
  request: NextRequest,
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

    // Get representative data including committees
    const repResponse = await fetch(`${request.nextUrl.origin}/api/representative/${bioguideId}`);

    if (!repResponse.ok) {
      logger.warn('Failed to fetch representative data', {
        bioguideId,
        status: repResponse.status,
      });
      return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
    }

    const repData = await repResponse.json();

    // Extract committee information
    const committees = repData.committees?.map((c: { name: string }) => c.name) || [];

    if (committees.length === 0) {
      logger.info('Representative has no committee assignments', {
        bioguideId,
        representativeName: repData.name,
      });

      return NextResponse.json({
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
      });
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

        // Process data for response
        const totalRelevantSpending = committeeLobbyingData.reduce(
          (sum, committee) => sum + committee.totalSpending,
          0
        );

        // Get top companies across all committees
        const allCompanies: Record<
          string,
          {
            totalSpending: number;
            committees: Set<string>;
            filings: number;
          }
        > = {};

        committeeLobbyingData.forEach(committeeData => {
          committeeData.filings.forEach(filing => {
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
              company.committees.add(committeeData.committee);
              company.filings += 1;
            }
          });
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

        // Committee breakdown
        const committeeBreakdown = committeeLobbyingData.map(committee => ({
          committee: committee.committee,
          totalSpending: committee.totalSpending,
          companyCount: committee.companyCount,
          topIssues: Array.from(new Set(committee.filings.flatMap(f => f.issues).slice(0, 5))),
        }));

        // Generate quarterly trend (simplified)
        const currentYear = new Date().getFullYear();
        const quarterlyTrend = [];
        for (let q = 1; q <= 4; q++) {
          const quarterSpending = committeeLobbyingData.reduce((sum, committee) => {
            return (
              sum +
              committee.filings
                .filter(f => f.year === currentYear - 1 && f.quarter === `Q${q}`)
                .reduce((qSum, f) => qSum + f.amount, 0)
            );
          }, 0);

          quarterlyTrend.push({
            quarter: `Q${q}`,
            year: currentYear - 1,
            spending: quarterSpending,
          });
        }

        // Industry breakdown (simplified)
        const industrySpending: Record<string, number> = {};
        const totalForPercentage = topCompanies.reduce(
          (sum, company) => sum + company.totalSpending,
          0
        );

        topCompanies.forEach(company => {
          const companyName = company.name.toLowerCase();
          let industry = 'Other';

          if (companyName.includes('pharma') || companyName.includes('health'))
            industry = 'Healthcare';
          else if (companyName.includes('tech') || companyName.includes('software'))
            industry = 'Technology';
          else if (companyName.includes('oil') || companyName.includes('energy'))
            industry = 'Energy';
          else if (companyName.includes('bank') || companyName.includes('financial'))
            industry = 'Finance';
          else if (companyName.includes('defense') || companyName.includes('aerospace'))
            industry = 'Defense';

          industrySpending[industry] = (industrySpending[industry] || 0) + company.totalSpending;
        });

        const industryBreakdown = Object.entries(industrySpending)
          .map(([industry, spending]) => ({
            industry,
            spending,
            percentage: totalForPercentage > 0 ? (spending / totalForPercentage) * 100 : 0,
          }))
          .sort((a, b) => b.spending - a.spending);

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
      return NextResponse.json({
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
      });
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

    return NextResponse.json(response);
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

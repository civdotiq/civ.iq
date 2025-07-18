/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';

interface CommitteeReport {
  reportId: string;
  reportNumber: string;
  title: string;
  publishedDate: string;
  reportType: string;
  congress: number;
  chamber: string;
  summary?: string;
  url?: string;
  pages?: number;
}

interface CongressReportsApiResponse {
  reports: Array<{
    congress: number;
    number: string;
    part?: string;
    reportType: string;
    title: string;
    url: string;
    associatedBill?: {
      congress: number;
      number: string;
      type: string;
      url: string;
    };
    committees?: Array<{
      chamber: string;
      name: string;
      systemCode: string;
    }>;
    publishedDate?: string;
    text?: {
      url: string;
    };
  }>;
  pagination: {
    count: number;
    next?: string;
  };
}

/**
 * Fetch committee reports from Congress.gov API
 */
async function fetchCommitteeReports(committeeId: string): Promise<CommitteeReport[]> {
  return cachedFetch(
    `committee-reports-${committeeId}`,
    async () => {
      try {
        structuredLogger.info('Fetching reports for committee', { committeeId });
        
        const baseUrl = 'https://api.congress.gov/v3';
        const apiKey = process.env.CONGRESS_API_KEY;
        
        if (!apiKey) {
          structuredLogger.warn('Congress API key not configured');
          return [];
        }

        // Transform committee ID to match Congress.gov format
        const congressCommitteeId = transformCommitteeId(committeeId);
        const chamber = getCommitteeChamber(committeeId);
        
        const response = await fetch(
          `${baseUrl}/committee-report/119/${chamber}?committee=${congressCommitteeId}&limit=20&api_key=${apiKey}`,
          {
            headers: {
              'Accept': 'application/json',
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
        }

        const data: CongressReportsApiResponse = await response.json();
        return processReportsData(data.reports, chamber);
        
      } catch (error) {
        structuredLogger.error('Error fetching committee reports', error as Error, { committeeId });
        // Return mock data for development if API fails
        return getMockReportsData(committeeId);
      }
    },
    4 * 60 * 60 * 1000 // 4 hours cache - reports don't change frequently
  );
}

/**
 * Transform committee ID to Congress.gov format
 */
function transformCommitteeId(thomasId: string): string {
  // This would need to be mapped to the actual Congress.gov committee identifiers
  // For now, return a simplified version
  return thomasId.toLowerCase();
}

/**
 * Get chamber from committee ID
 */
function getCommitteeChamber(thomasId: string): string {
  if (thomasId.startsWith('H')) return 'house';
  if (thomasId.startsWith('S')) return 'senate';
  if (thomasId.startsWith('J')) return 'joint';
  return 'house'; // default fallback
}

/**
 * Process raw reports data from Congress.gov API
 */
function processReportsData(reports: CongressReportsApiResponse['reports'], chamber: string): CommitteeReport[] {
  return reports.map(report => ({
    reportId: `${report.congress}-${report.reportType}-${report.number}`,
    reportNumber: `${report.reportType.toUpperCase()} ${report.number}${report.part ? `-${report.part}` : ''}`,
    title: report.title,
    publishedDate: report.publishedDate || 'Unknown',
    reportType: report.reportType,
    congress: report.congress,
    chamber: chamber,
    url: report.url,
    summary: generateReportSummary(report.title, report.reportType)
  }));
}

/**
 * Generate a brief summary based on report title and type
 */
function generateReportSummary(title: string, reportType: string): string {
  if (reportType.toLowerCase().includes('majority')) {
    return 'Majority report presenting the committee\'s findings and recommendations.';
  }
  if (reportType.toLowerCase().includes('minority')) {
    return 'Minority report presenting dissenting views and alternative recommendations.';
  }
  if (reportType.toLowerCase().includes('conference')) {
    return 'Conference report reconciling differences between House and Senate versions.';
  }
  return `Committee report on ${title.toLowerCase().substring(0, 50)}...`;
}

/**
 * Mock reports data for development/fallback
 */
function getMockReportsData(committeeId: string): CommitteeReport[] {
  const mockReports: CommitteeReport[] = [
    {
      reportId: '119-hrpt-001',
      reportNumber: 'H. Rpt. 119-1',
      title: 'Committee Report on Sample Legislation',
      publishedDate: '2025-01-15',
      reportType: 'hrpt',
      congress: 119,
      chamber: 'house',
      summary: 'Committee report analyzing proposed legislation and providing recommendations for House consideration.',
      url: 'https://www.congress.gov/congressional-report/119th-congress/house-report/1'
    },
    {
      reportId: '119-hrpt-002',
      reportNumber: 'H. Rpt. 119-2',
      title: 'Oversight Report on Agency Operations',
      publishedDate: '2025-01-10',
      reportType: 'hrpt',
      congress: 119,
      chamber: 'house',
      summary: 'Oversight report examining federal agency operations and recommending improvements.',
      url: 'https://www.congress.gov/congressional-report/119th-congress/house-report/2'
    },
    {
      reportId: '119-hrpt-003',
      reportNumber: 'H. Rpt. 119-3',
      title: 'Budget Analysis and Recommendations',
      publishedDate: '2025-01-05',
      reportType: 'hrpt',
      congress: 119,
      chamber: 'house',
      summary: 'Detailed analysis of budget proposals with committee recommendations for fiscal year 2025.',
      url: 'https://www.congress.gov/congressional-report/119th-congress/house-report/3'
    }
  ];

  return mockReports;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
) {
  try {
    const { committeeId } = await params;
    
    structuredLogger.info('Committee reports API request', { committeeId });
    
    if (!committeeId) {
      return NextResponse.json(
        { error: 'Committee ID is required' },
        { status: 400 }
      );
    }

    const reports = await fetchCommitteeReports(committeeId);
    
    structuredLogger.info('Successfully fetched committee reports', {
      committeeId,
      count: reports.length
    });

    return NextResponse.json({
      success: true,
      committeeId,
      reports,
      count: reports.length
    });

  } catch (error) {
    structuredLogger.error('Committee reports API error', error as Error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch committee reports',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
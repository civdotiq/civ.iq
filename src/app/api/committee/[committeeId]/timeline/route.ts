/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export const dynamic = 'force-dynamic';

interface TimelineItem {
  id: string;
  type: 'bill' | 'report' | 'hearing' | 'markup' | 'vote' | 'amendment';
  date: string;
  title: string;
  description: string;
  metadata: {
    billNumber?: string;
    reportNumber?: string;
    sponsor?: string;
    voteResult?: {
      yeas: number;
      nays: number;
    };
    status?: string;
    url?: string;
    committeeId?: string;
  };
  relatedItems?: string[]; // IDs of related timeline items
  importance: 'high' | 'medium' | 'low';
}

interface TimelineStats {
  totalItems: number;
  billsCount: number;
  reportsCount: number;
  hearingsCount: number;
  markupsCount: number;
  votesCount: number;
  dateRange: {
    start: string;
    end: string;
  };
  activityByMonth: Record<string, number>;
  mostActiveMonth: string;
}

async function fetchBillsData(committeeId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/committee/${committeeId}/bills`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.bills || [];
  } catch (error) {
    logger.error('Error fetching bills for timeline', error as Error);
    return [];
  }
}

async function fetchReportsData(committeeId: string) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/committee/${committeeId}/reports`);
    if (!response.ok) return [];
    const data = await response.json();
    return data.reports || [];
  } catch (error) {
    logger.error('Error fetching reports for timeline', error as Error);
    return [];
  }
}

function createTimelineFromBills(bills: unknown[]): TimelineItem[] {
  const timelineItems: TimelineItem[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bills.forEach((bill: any) => {
    // Add bill introduction
    timelineItems.push({
      id: `bill-intro-${bill.billId}`,
      type: 'bill',
      date: bill.introducedDate,
      title: `${bill.billNumber} Introduced`,
      description: bill.title,
      metadata: {
        billNumber: bill.billNumber,
        sponsor: bill.sponsor.name,
        status: bill.committeeStatus,
      },
      importance: 'medium',
    });

    // Add committee actions
    if (bill.committeeActions) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      bill.committeeActions.forEach((action: any, idx: number) => {
        let type: TimelineItem['type'] = 'bill';
        let importance: TimelineItem['importance'] = 'low';

        switch (action.actionType) {
          case 'hearing':
            type = 'hearing';
            importance = 'medium';
            break;
          case 'markup':
            type = 'markup';
            importance = 'high';
            break;
          case 'vote':
            type = 'vote';
            importance = 'high';
            break;
          case 'amendment':
            type = 'amendment';
            importance = 'medium';
            break;
        }

        timelineItems.push({
          id: `bill-action-${bill.billId}-${idx}`,
          type,
          date: action.date,
          title: `${bill.billNumber}: ${action.actionType.charAt(0).toUpperCase() + action.actionType.slice(1)}`,
          description: action.text,
          metadata: {
            billNumber: bill.billNumber,
            voteResult: action.voteResult,
            committeeId: action.committeeId,
          },
          relatedItems: [`bill-intro-${bill.billId}`],
          importance,
        });
      });
    }
  });

  return timelineItems;
}

function createTimelineFromReports(reports: unknown[]): TimelineItem[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return reports.map((report: any) => ({
    id: `report-${report.reportId}`,
    type: 'report' as const,
    date: report.publishedDate,
    title: `${report.reportNumber} Published`,
    description: report.title,
    metadata: {
      reportNumber: report.reportNumber,
      status: report.reportType,
      url: report.url,
    },
    importance: 'high' as const,
  }));
}

function calculateTimelineStats(timelineItems: TimelineItem[]): TimelineStats {
  const stats: TimelineStats = {
    totalItems: timelineItems.length,
    billsCount: 0,
    reportsCount: 0,
    hearingsCount: 0,
    markupsCount: 0,
    votesCount: 0,
    dateRange: {
      start: '',
      end: '',
    },
    activityByMonth: {},
    mostActiveMonth: '',
  };

  if (timelineItems.length === 0) return stats;

  // Count by type
  timelineItems.forEach(item => {
    switch (item.type) {
      case 'bill':
        stats.billsCount++;
        break;
      case 'report':
        stats.reportsCount++;
        break;
      case 'hearing':
        stats.hearingsCount++;
        break;
      case 'markup':
        stats.markupsCount++;
        break;
      case 'vote':
        stats.votesCount++;
        break;
    }

    // Activity by month
    const monthKey = item.date.substring(0, 7); // YYYY-MM
    stats.activityByMonth[monthKey] = (stats.activityByMonth[monthKey] || 0) + 1;
  });

  // Date range
  const sortedDates = timelineItems.map(item => item.date).sort();
  stats.dateRange.start = sortedDates[0] || 'No data';
  stats.dateRange.end = sortedDates[sortedDates.length - 1] || 'No data';

  // Most active month
  let maxActivity = 0;
  Object.entries(stats.activityByMonth).forEach(([month, count]) => {
    if (count > maxActivity) {
      maxActivity = count;
      stats.mostActiveMonth = month;
    }
  });

  return stats;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
) {
  try {
    const { committeeId } = await params;
    const { searchParams } = request.nextUrl;

    const filter = searchParams.get('filter') || 'all'; // all, bills, reports
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    logger.info('Committee timeline API request', {
      committeeId,
      filter,
      limit,
      startDate,
      endDate,
    });

    // Fetch data in parallel
    const [bills, reports] = await Promise.all([
      filter === 'reports' ? [] : fetchBillsData(committeeId),
      filter === 'bills' ? [] : fetchReportsData(committeeId),
    ]);

    // Create timeline items
    let timelineItems: TimelineItem[] = [];

    if (filter !== 'reports') {
      timelineItems.push(...createTimelineFromBills(bills));
    }

    if (filter !== 'bills') {
      timelineItems.push(...createTimelineFromReports(reports));
    }

    // Apply date filtering
    if (startDate || endDate) {
      timelineItems = timelineItems.filter(item => {
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;
        return true;
      });
    }

    // Sort by date (newest first)
    timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Apply limit
    const allItems = [...timelineItems];
    if (limit > 0) {
      timelineItems = timelineItems.slice(0, limit);
    }

    // Calculate statistics
    const stats = calculateTimelineStats(allItems);

    logger.info('Successfully created committee timeline', {
      committeeId,
      itemCount: timelineItems.length,
      totalItems: allItems.length,
    });

    return NextResponse.json({
      success: true,
      committeeId,
      timeline: timelineItems,
      stats,
      filter,
      hasMore: allItems.length > timelineItems.length,
    });
  } catch (error) {
    logger.error('Committee timeline API error', error as Error);

    return NextResponse.json(
      {
        error: 'Failed to create committee timeline',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

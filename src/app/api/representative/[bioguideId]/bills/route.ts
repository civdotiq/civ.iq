/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';
import type { BillSummary } from '@/features/legislation/services/ai/bill-summarizer';

interface SponsoredBill {
  billId: string;
  number: string;
  title: string;
  congress: string;
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
    actionCode?: string;
  };
  type: 'hr' | 's' | 'hjres' | 'sjres' | 'hconres' | 'sconres' | 'hres' | 'sres' | string;
  chamber: 'House' | 'Senate';
  status: string;
  statusCategory:
    | 'introduced'
    | 'committee'
    | 'floor'
    | 'passed_chamber'
    | 'other_chamber'
    | 'enacted'
    | 'failed';
  policyArea?: string;
  policyCategory?:
    | 'Budget'
    | 'Healthcare'
    | 'Defense'
    | 'Infrastructure'
    | 'Immigration'
    | 'Environment'
    | 'Education'
    | 'Other';
  cosponsors?: number;
  sponsorshipType?: 'sponsored' | 'cosponsored';
  committees?: Array<{
    name: string;
    code: string;
    chamber: string;
  }>;
  subjects?: string[];
  isKeyLegislation?: boolean;
  congressionalSession?: string;
  url?: string;
  aiSummary?: BillSummary;
  hasAISummary?: boolean;
}

// Helper function to categorize bills by policy area
function categorizeBillPolicy(
  title: string | undefined,
  policyArea?: string
): SponsoredBill['policyCategory'] {
  const lowerTitle = title?.toLowerCase() || '';
  const lowerPolicy = policyArea?.toLowerCase() || '';

  if (
    lowerTitle.includes('budget') ||
    lowerTitle.includes('appropriation') ||
    lowerTitle.includes('spending') ||
    lowerTitle.includes('tax') ||
    lowerPolicy.includes('budget') ||
    lowerPolicy.includes('finance')
  ) {
    return 'Budget';
  } else if (
    lowerTitle.includes('health') ||
    lowerTitle.includes('medicare') ||
    lowerTitle.includes('medicaid') ||
    lowerPolicy.includes('health')
  ) {
    return 'Healthcare';
  } else if (
    lowerTitle.includes('defense') ||
    lowerTitle.includes('military') ||
    lowerTitle.includes('armed forces') ||
    lowerPolicy.includes('defense') ||
    lowerPolicy.includes('military')
  ) {
    return 'Defense';
  } else if (
    lowerTitle.includes('infrastructure') ||
    lowerTitle.includes('transportation') ||
    lowerTitle.includes('highway') ||
    lowerPolicy.includes('transportation') ||
    lowerPolicy.includes('infrastructure')
  ) {
    return 'Infrastructure';
  } else if (
    lowerTitle.includes('immigration') ||
    lowerTitle.includes('border') ||
    lowerTitle.includes('visa') ||
    lowerPolicy.includes('immigration')
  ) {
    return 'Immigration';
  } else if (
    lowerTitle.includes('environment') ||
    lowerTitle.includes('climate') ||
    lowerTitle.includes('energy') ||
    lowerPolicy.includes('environment') ||
    lowerPolicy.includes('energy')
  ) {
    return 'Environment';
  } else if (
    lowerTitle.includes('education') ||
    lowerTitle.includes('school') ||
    lowerTitle.includes('student') ||
    lowerPolicy.includes('education')
  ) {
    return 'Education';
  }
  return 'Other';
}

// Helper function to determine bill status category
function determineBillStatusCategory(latestAction: string): SponsoredBill['statusCategory'] {
  const action = latestAction.toLowerCase();

  if (
    action.includes('became public law') ||
    action.includes('enacted') ||
    action.includes('signed by president')
  ) {
    return 'enacted';
  } else if (
    action.includes('failed') ||
    action.includes('rejected') ||
    action.includes('not agreed to')
  ) {
    return 'failed';
  } else if (action.includes('passed house') || action.includes('passed senate')) {
    return 'passed_chamber';
  } else if (
    action.includes('received in') ||
    (action.includes('referred to') && (action.includes('house') || action.includes('senate')))
  ) {
    return 'other_chamber';
  } else if (
    action.includes('passed') ||
    action.includes('agreed to') ||
    action.includes('floor')
  ) {
    return 'floor';
  } else if (
    action.includes('committee') ||
    action.includes('subcommittee') ||
    action.includes('ordered to be reported')
  ) {
    return 'committee';
  } else if (action.includes('introduced') || action.includes('referred to')) {
    return 'introduced';
  }
  return 'introduced';
}

// Helper function to determine if bill is key legislation
function isKeyLegislation(title: string, policyArea?: string, cosponsors: number = 0): boolean {
  if (!title) return false;

  const lowerTitle = title.toLowerCase();
  const lowerPolicy = policyArea?.toLowerCase() || '';

  // High cosponsor count indicates significance
  if (cosponsors >= 100) return true;

  // Major policy areas often indicate key legislation
  const keyAreas = [
    'budget',
    'appropriation',
    'defense authorization',
    'infrastructure',
    'healthcare',
    'climate',
  ];
  if (keyAreas.some(area => lowerTitle.includes(area) || lowerPolicy.includes(area))) {
    return true;
  }

  // Comprehensive or omnibus bills are typically key
  if (
    lowerTitle.includes('comprehensive') ||
    lowerTitle.includes('omnibus') ||
    lowerTitle.includes('act of')
  ) {
    return true;
  }

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  // Fetching bills for bioguide ID
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');
  const includeSummaries = searchParams.get('includeSummaries') === 'true';
  const summaryFormat = searchParams.get('summaryFormat') || 'brief';

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    // Use cached fetch for better performance
    const billsData = await cachedFetch(
      `sponsored-bills-${bioguideId}-${limit}`,
      async () => {
        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        logger.info('Fetching comprehensive bills data', { bioguideId, limit });

        const sponsoredUrl = `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?format=json&limit=${Math.ceil(limit * 0.7)}&api_key=${process.env.CONGRESS_API_KEY}`;
        const cosponsoredUrl = `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation?format=json&limit=${Math.ceil(limit * 0.3)}&api_key=${process.env.CONGRESS_API_KEY}`;

        // Attempting to fetch bills from Congress.gov

        // Fetch both sponsored and cosponsored legislation for comprehensive view
        const [sponsoredResponse, cosponsoredResponse] = await Promise.all([
          fetch(sponsoredUrl, {
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            },
          }),
          fetch(cosponsoredUrl, {
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            },
          }),
        ]);

        const sponsoredMonitor = monitorExternalApi(
          'congress',
          'sponsored-legislation',
          sponsoredResponse.url
        );
        const cosponsoredMonitor = monitorExternalApi(
          'congress',
          'cosponsored-legislation',
          cosponsoredResponse.url
        );

        sponsoredMonitor.end(sponsoredResponse.ok, sponsoredResponse.status);
        cosponsoredMonitor.end(cosponsoredResponse.ok, cosponsoredResponse.status);

        const sponsoredData = sponsoredResponse.ok
          ? await sponsoredResponse.json()
          : { sponsoredLegislation: [] };
        const cosponsoredData = cosponsoredResponse.ok
          ? await cosponsoredResponse.json()
          : { cosponsoredLegislation: [] };

        logger.info('Bills data retrieved', {
          bioguideId,
          sponsoredCount: sponsoredData.sponsoredLegislation?.length || 0,
          cosponsoredCount: cosponsoredData.cosponsoredLegislation?.length || 0,
        });

        // Enhanced bill processing with better metadata
        const processedBills: SponsoredBill[] = [];

        // Process sponsored bills with enhanced metadata
        if (sponsoredData.sponsoredLegislation) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          sponsoredData.sponsoredLegislation.forEach((bill: any) => {
            // Skip amendments and null/undefined entries that aren't actual bills
            if (!bill?.type || !bill?.number || !bill?.title) {
              return;
            }

            const cosponsorCount = bill.cosponsors?.count || 0;
            const policyCategory = categorizeBillPolicy(bill.title, bill.policyArea?.name);
            const statusCategory = determineBillStatusCategory(
              bill.latestAction?.text || 'Introduced'
            );
            const isKey = isKeyLegislation(bill.title, bill.policyArea?.name, cosponsorCount);

            processedBills.push({
              billId: `${bill.congress}-${bill.type}-${bill.number}`,
              number: `${bill.type?.toUpperCase() || 'BILL'}. ${bill.number}`,
              title: bill.title,
              congress: bill.congress.toString(),
              introducedDate: bill.introducedDate,
              latestAction: {
                date: bill.latestAction?.actionDate || bill.introducedDate,
                text: bill.latestAction?.text || 'Introduced',
                actionCode: bill.latestAction?.actionCode,
              },
              type: bill.type,
              chamber:
                bill.originChamber || (bill.type?.toLowerCase().includes('h') ? 'House' : 'Senate'),
              status: bill.latestAction?.text || 'Introduced',
              statusCategory,
              policyArea: bill.policyArea?.name,
              policyCategory,
              cosponsors: cosponsorCount,
              sponsorshipType: 'sponsored',
              committees: bill.committees
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  bill.committees.map((committee: any) => ({
                    name: committee.name,
                    code: committee.systemCode,
                    chamber: committee.chamber,
                  }))
                : [],
              subjects: bill.subjects?.legislativeSubjects || [],
              isKeyLegislation: isKey,
              congressionalSession: `${bill.congress}th Congress`,
              url: bill.url,
            });
          });
        }

        // Process cosponsored bills with enhanced metadata
        if (cosponsoredData.cosponsoredLegislation) {
          cosponsoredData.cosponsoredLegislation
            .slice(0, Math.ceil(limit * 0.3))
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .forEach((bill: any) => {
              // Skip amendments and null/undefined entries that aren't actual bills
              if (!bill?.type || !bill?.number || !bill?.title) {
                return;
              }

              const cosponsorCount = bill.cosponsors?.count || 0;
              const policyCategory = categorizeBillPolicy(bill.title, bill.policyArea?.name);
              const statusCategory = determineBillStatusCategory(
                bill.latestAction?.text || 'Introduced'
              );
              const isKey = isKeyLegislation(bill.title, bill.policyArea?.name, cosponsorCount);

              processedBills.push({
                billId: `${bill.congress}-${bill.type}-${bill.number}-cosponsored`,
                number: `${bill.type?.toUpperCase() || 'BILL'}. ${bill.number}`,
                title: bill.title,
                congress: bill.congress.toString(),
                introducedDate: bill.introducedDate,
                latestAction: {
                  date: bill.latestAction?.actionDate || bill.introducedDate,
                  text: bill.latestAction?.text || 'Introduced',
                  actionCode: bill.latestAction?.actionCode,
                },
                type: bill.type,
                chamber:
                  bill.originChamber ||
                  (bill.type?.toLowerCase().includes('h') ? 'House' : 'Senate'),
                status: bill.latestAction?.text || 'Introduced',
                statusCategory,
                policyArea: bill.policyArea?.name,
                policyCategory,
                cosponsors: cosponsorCount,
                sponsorshipType: 'cosponsored',
                committees: bill.committees
                  ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    bill.committees.map((committee: any) => ({
                      name: committee.name,
                      code: committee.systemCode,
                      chamber: committee.chamber,
                    }))
                  : [],
                subjects: bill.subjects?.legislativeSubjects || [],
                isKeyLegislation: isKey,
                congressionalSession: `${bill.congress}th Congress`,
                url: bill.url,
              });
            });
        }

        // Sort by date and return limited results
        return processedBills
          .sort(
            (a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime()
          )
          .slice(0, limit);
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    // Add AI summaries if requested
    let enhancedBills = billsData;
    if (includeSummaries && billsData.length > 0) {
      enhancedBills = await addAISummariesToBills(billsData, summaryFormat);
    }

    // Generate analytics about the bills
    const analytics = {
      totalBills: enhancedBills.length,
      sponsored: enhancedBills.filter(b => b.sponsorshipType === 'sponsored').length,
      cosponsored: enhancedBills.filter(b => b.sponsorshipType === 'cosponsored').length,
      keyLegislation: enhancedBills.filter(b => b.isKeyLegislation).length,
      statusBreakdown: enhancedBills.reduce((acc: Record<string, number>, bill) => {
        acc[bill.statusCategory] = (acc[bill.statusCategory] || 0) + 1;
        return acc;
      }, {}),
      policyBreakdown: enhancedBills.reduce((acc: Record<string, number>, bill) => {
        const category = bill.policyCategory || 'Other';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {}),
      enacted: enhancedBills.filter(b => b.statusCategory === 'enacted').length,
      averageCosponsors:
        enhancedBills.length > 0
          ? Math.round(
              enhancedBills.reduce((sum, bill) => sum + (bill.cosponsors || 0), 0) /
                enhancedBills.length
            )
          : 0,
    };

    logger.info('Bills data processed and enhanced', {
      bioguideId,
      analytics,
      includeSummaries,
      summaryFormat,
    });

    return NextResponse.json({
      bills: enhancedBills,
      metadata: {
        dataSource: 'congress.gov',
        totalReturned: enhancedBills.length,
        includesCosponsored: true,
        aiSummariesIncluded: includeSummaries,
        summaryFormat: includeSummaries ? summaryFormat : null,
        analytics,
        enhancedDataUsed: true,
        note: 'Comprehensive bill tracking with enhanced categorization and metadata',
      },
    });
  } catch (error) {
    logger.error('Bills API error', error as Error, {
      bioguideId,
      limit,
      includeSummaries,
    });

    // FALLBACK DATA: Used when Congress.gov API is unavailable
    // This provides realistic bill structure to maintain UI functionality
    const mockBills: SponsoredBill[] = [
      {
        billId: 'hr1000-118',
        number: 'H.R. 1000',
        title: 'American Infrastructure Investment Act',
        congress: '118',
        introducedDate: '2024-01-15',
        latestAction: {
          date: '2024-03-20',
          text: 'Passed House by roll call vote: 245-180',
          actionCode: 'H37300',
        },
        type: 'hr',
        chamber: 'House',
        status: 'Passed House',
        statusCategory: 'passed_chamber',
        policyArea: 'Transportation and Public Works',
        policyCategory: 'Infrastructure',
        cosponsors: 89,
        sponsorshipType: 'sponsored',
        committees: [{ name: 'Transportation and Infrastructure', code: 'HSPW', chamber: 'House' }],
        subjects: ['Infrastructure', 'Transportation', 'Public Works'],
        isKeyLegislation: true,
        congressionalSession: '118th Congress',
        url: 'https://congress.gov/bill/118th-congress/house-bill/1000',
      },
      {
        billId: 'hr1001-118',
        number: 'H.R. 1001',
        title: 'Clean Energy Transition and Jobs Act',
        congress: '118',
        introducedDate: '2024-02-01',
        latestAction: {
          date: '2024-04-15',
          text: 'Ordered to be Reported by the Committee on Energy and Commerce',
          actionCode: 'H19000',
        },
        type: 'hr',
        chamber: 'House',
        status: 'Reported by Committee',
        statusCategory: 'committee',
        policyArea: 'Energy',
        policyCategory: 'Environment',
        cosponsors: 67,
        sponsorshipType: 'sponsored',
        committees: [{ name: 'Energy and Commerce', code: 'HSIF', chamber: 'House' }],
        subjects: ['Energy', 'Climate Change', 'Jobs'],
        isKeyLegislation: true,
        congressionalSession: '118th Congress',
      },
      {
        billId: 'hr1002-118',
        number: 'H.R. 1002',
        title: 'Affordable Healthcare Access Act',
        congress: '118',
        introducedDate: '2024-01-30',
        latestAction: {
          date: '2024-02-28',
          text: 'Referred to the Subcommittee on Health',
        },
        type: 'hr',
        chamber: 'House',
        status: 'In Committee',
        statusCategory: 'committee',
        policyArea: 'Health',
        policyCategory: 'Healthcare',
        cosponsors: 34,
        sponsorshipType: 'sponsored',
        committees: [{ name: 'Energy and Commerce', code: 'HSIF', chamber: 'House' }],
        subjects: ['Healthcare', 'Insurance', 'Access'],
        isKeyLegislation: false,
        congressionalSession: '118th Congress',
      },
    ];

    return NextResponse.json({
      bills: mockBills.slice(0, limit),
      metadata: {
        dataSource: 'mock',
        totalReturned: Math.min(mockBills.length, limit),
        includesCosponsored: false,
        note: 'Fallback data - API temporarily unavailable',
        error: (error as Error).message,
      },
    });
  }
}

/**
 * Add AI summaries to bills from cache
 */
async function addAISummariesToBills(
  bills: SponsoredBill[],
  format: string = 'brief'
): Promise<SponsoredBill[]> {
  try {
    // Extract bill IDs for batch retrieval
    const billIds = bills.map(
      bill => bill.billId.replace('-cosponsored', '') // Remove cosponsored suffix for cache key
    );

    // Get cached summaries in batch
    const summaries = await BillSummaryCache.getBatchSummaries(billIds);

    logger.info('Retrieved AI summaries for bills', {
      totalBills: bills.length,
      summariesFound: summaries.size,
      format,
      operation: 'bills_ai_summary_integration',
    });

    // Enhance bills with summaries
    const enhancedBills = bills.map(bill => {
      const billIdForCache = bill.billId.replace('-cosponsored', '');
      const summary = summaries.get(billIdForCache);

      const enhanced: SponsoredBill = {
        ...bill,
        hasAISummary: !!summary,
      };

      if (summary) {
        // Format summary based on requested format
        if (format === 'brief') {
          enhanced.aiSummary = {
            billId: summary.billId,
            title: summary.title,
            summary: summary.whatItDoes || summary.summary.substring(0, 150) + '...',
            whatItDoes: summary.whatItDoes,
            readingLevel: summary.readingLevel,
            confidence: summary.confidence,
            lastUpdated: summary.lastUpdated,
            source: summary.source,
            keyPoints: [],
            whoItAffects: [],
            whyItMatters: '',
          };
        } else {
          enhanced.aiSummary = summary;
        }
      }

      return enhanced;
    });

    return enhancedBills;
  } catch (error) {
    logger.error('Failed to add AI summaries to bills', error as Error, {
      billCount: bills.length,
      format,
      operation: 'bills_ai_summary_integration',
    });

    // Return bills without summaries on error
    return bills.map(bill => ({
      ...bill,
      hasAISummary: false,
    }));
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Hearings → Bills/Committees API — Gap 5 Join Endpoint
 *
 * Connects congressional hearings to related bills, committees, and
 * policy areas through keyword matching. Supports three query modes:
 *
 * - committeeId: Find hearings by a specific committee
 * - billId: Find hearings related to a specific bill (via subjects/policyArea)
 * - policyArea: Find hearings matching a policy area's topics
 *
 * At least one filter is required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';
import { getTopicsForPolicyArea } from '@/lib/connections/policy-area-map';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import type { GovInfoCollectionResponse, GovInfoPackage, GovInfoDocument } from '@/types/govinfo';
import type { JoinMetadata } from '@/types/joins';

export const dynamic = 'force-dynamic';

const GOVINFO_API = 'https://api.govinfo.gov';
const API_KEY = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';

interface HearingConnection extends GovInfoDocument {
  relevanceScore: number;
  matchedTopics: string[];
  connectionType: 'committee' | 'bill' | 'policy-area';
}

interface HearingsConnectionsResponse {
  filter: {
    committeeId?: string;
    billId?: string;
    policyArea?: string;
  };
  hearings: HearingConnection[];
  summary: {
    totalMatches: number;
    topTopics: string[];
  };
  metadata: JoinMetadata;
}

function parseChamber(docClass: string): 'House' | 'Senate' | 'Joint' {
  if (docClass.startsWith('H')) return 'House';
  if (docClass.startsWith('S')) return 'Senate';
  return 'Joint';
}

function transformHearing(pkg: GovInfoPackage): GovInfoDocument {
  return {
    id: pkg.packageId,
    title: pkg.title,
    type: 'hearing',
    congress: parseInt(pkg.congress) || 119,
    chamber: parseChamber(pkg.docClass),
    dateIssued: pkg.dateIssued,
    lastModified: pkg.lastModified,
    pages: null,
    detailsUrl: `https://www.govinfo.gov/app/details/${pkg.packageId}`,
    pdfUrl: `https://api.govinfo.gov/packages/${pkg.packageId}/pdf`,
  };
}

async function fetchRecentHearings(pageSize: number): Promise<GovInfoDocument[]> {
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);
  const startDateStr = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

  const params = new URLSearchParams();
  params.set('pageSize', Math.min(pageSize, 100).toString());
  params.set('offsetMark', '*');

  const url = `${GOVINFO_API}/collections/CHRG/${startDateStr}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        'X-API-Key': API_KEY,
      },
    });

    if (!response.ok) return [];

    const data: GovInfoCollectionResponse = await response.json();
    return data.packages.map(transformHearing);
  } catch {
    return [];
  }
}

function scoreHearing(
  hearing: GovInfoDocument,
  keywords: string[]
): { score: number; matched: string[] } {
  const titleLower = hearing.title.toLowerCase();
  const matched: string[] = [];
  let score = 0;

  for (const keyword of keywords) {
    const kw = keyword.toLowerCase();
    if (titleLower.includes(kw)) {
      matched.push(keyword);
      score += 1;
    }
  }

  return { score, matched };
}

function filterByCommittee(
  hearings: GovInfoDocument[],
  committeeId: string
): { filtered: HearingConnection[]; topics: string[] } {
  const upper = committeeId.toUpperCase();
  const mapping = ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === upper);

  if (!mapping) return { filtered: [], topics: [] };

  const { topics } = mapping;
  const chamberPrefix = mapping.chamber === 'House' ? 'H' : 'S';

  const results: HearingConnection[] = [];
  for (const h of hearings) {
    // Match by chamber first (House hearings start with H, Senate with S)
    const chamberMatch = h.id.includes(chamberPrefix + 'HRG');
    const { score, matched } = scoreHearing(h, topics);

    if (chamberMatch || score > 0) {
      results.push({
        ...h,
        relevanceScore: score + (chamberMatch ? 1 : 0),
        matchedTopics: matched,
        connectionType: 'committee',
      });
    }
  }

  return { filtered: results, topics };
}

async function filterByBill(
  hearings: GovInfoDocument[],
  billId: string
): Promise<{ filtered: HearingConnection[]; topics: string[] }> {
  const bill = await fetchBillFromCongress(billId);
  if (!bill) return { filtered: [], topics: [] };

  // Build keywords from bill's policy area, subjects, and title words
  const keywords: string[] = [];
  if (bill.policyArea) {
    const policyTopics = getTopicsForPolicyArea(bill.policyArea);
    keywords.push(...policyTopics);
    keywords.push(bill.policyArea.toLowerCase());
  }

  // Extract significant words from bill title (skip common words)
  const skipWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'of',
    'to',
    'for',
    'in',
    'on',
    'at',
    'act',
    'bill',
    'resolution',
    'with',
    'by',
    'from',
    'is',
    'are',
    'was',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'shall',
    'can',
    'not',
    'no',
    'nor',
    'but',
    'yet',
    'so',
    'if',
    'then',
    'than',
    'this',
    'that',
    'these',
    'those',
    'it',
    'its',
    'as',
    'such',
  ]);
  const titleWords = bill.title
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !skipWords.has(w));
  keywords.push(...titleWords.slice(0, 5)); // Top 5 significant title words

  const uniqueKeywords = [...new Set(keywords)];

  const results: HearingConnection[] = [];
  for (const h of hearings) {
    const { score, matched } = scoreHearing(h, uniqueKeywords);
    if (score > 0) {
      results.push({
        ...h,
        relevanceScore: score,
        matchedTopics: matched,
        connectionType: 'bill',
      });
    }
  }

  return { filtered: results, topics: uniqueKeywords };
}

function filterByPolicyArea(
  hearings: GovInfoDocument[],
  policyArea: string
): { filtered: HearingConnection[]; topics: string[] } {
  const topics = getTopicsForPolicyArea(policyArea);
  if (topics.length === 0) {
    // Fallback: use the policy area name itself as a keyword
    const fallbackTopics = [policyArea.toLowerCase()];
    const results: HearingConnection[] = [];
    for (const h of hearings) {
      const { score, matched } = scoreHearing(h, fallbackTopics);
      if (score > 0) {
        results.push({
          ...h,
          relevanceScore: score,
          matchedTopics: matched,
          connectionType: 'policy-area',
        });
      }
    }
    return { filtered: results, topics: fallbackTopics };
  }

  const results: HearingConnection[] = [];
  for (const h of hearings) {
    const { score, matched } = scoreHearing(h, topics);
    if (score > 0) {
      results.push({
        ...h,
        relevanceScore: score,
        matchedTopics: matched,
        connectionType: 'policy-area',
      });
    }
  }

  return { filtered: results, topics };
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<HearingsConnectionsResponse | { error: string }>> {
  try {
    const { searchParams } = request.nextUrl;
    const committeeId = searchParams.get('committeeId') ?? undefined;
    const billId = searchParams.get('billId') ?? undefined;
    const policyArea = searchParams.get('policyArea') ?? undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!committeeId && !billId && !policyArea) {
      return NextResponse.json(
        { error: 'At least one filter is required: committeeId, billId, or policyArea' },
        { status: 400 }
      );
    }

    logger.info('Hearings connections join request', { committeeId, billId, policyArea });

    const filterKey = committeeId ?? billId ?? policyArea ?? 'unknown';
    const cacheKey = `join-hearings-connections:${filterKey}:${limit}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // Fetch a pool of recent hearings to match against
        const hearings = await fetchRecentHearings(100);

        let filtered: HearingConnection[] = [];

        if (committeeId) {
          filtered = filterByCommittee(hearings, committeeId).filtered;
        } else if (billId) {
          filtered = (await filterByBill(hearings, billId)).filtered;
        } else if (policyArea) {
          filtered = filterByPolicyArea(hearings, policyArea).filtered;
        }

        // Sort by relevance score (desc), then by date (desc)
        filtered.sort((a, b) => {
          if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
          return new Date(b.dateIssued).getTime() - new Date(a.dateIssued).getTime();
        });

        const sliced = filtered.slice(0, limit);

        // Compute top topics across all matches
        const topicCounts = new Map<string, number>();
        for (const h of sliced) {
          for (const t of h.matchedTopics) {
            topicCounts.set(t, (topicCounts.get(t) ?? 0) + 1);
          }
        }
        const topTopics = [...topicCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([t]) => t);

        const response: HearingsConnectionsResponse = {
          filter: { committeeId, billId, policyArea },
          hearings: sliced,
          summary: {
            totalMatches: filtered.length,
            topTopics,
          },
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources:
              committeeId || policyArea ? ['govinfo.gov'] : ['govinfo.gov', 'congress.gov'],
            joinType: 'hearings-connections',
            dataQuality: sliced.length > 0 ? 'complete' : 'partial',
          },
        };

        return response;
      },
      2 * 60 * 60 * 1000 // 2 hour cache
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch hearing connections' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Hearings connections join error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

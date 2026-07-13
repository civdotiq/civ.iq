/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Industry Sector → Top Organizations (PACs + Lobbying Registrants)
 *
 * Returns the largest PACs classified into the sector (via categorizePACByName)
 * and top lobbying registrants whose filings match this sector's LDA issue codes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { categorizePACByName, IndustrySector } from '@/lib/fec/industry-taxonomy';
import { fecApiService } from '@/lib/fec/fec-api-service';
import {
  getAllLDAIssueCodes,
  getPolicyAreasForLDAIssue,
} from '@/lib/intelligence/entity-resolution/lda-issue-policy-map';
import { getIndustrySectorsForPolicyArea } from '@/lib/connections/policy-area-map';
import { reportedRawFilingAmount } from '@/lib/data-sources/lda-filing-amounts';
import { getSectorCorpusTotals } from '@/lib/data-sources/lda-corpus/load';

export const dynamic = 'force-dynamic';

interface IndustryOrganizationsResponse {
  topPACs: Array<{
    committeeId: string;
    name: string;
    sector: string;
  }>;
  topLobbyingOrgs: Array<{
    registrantId: string;
    name: string;
    totalSpending: number;
    filingCount: number;
  }>;
  metrics: {
    totalLobbyingSpending: number;
    activePACCount: number;
    activeLobbyingOrgCount: number;
  };
  // Corpus-backed lobbying totals for the sector's issue areas (complete Senate
  // LDA corpus, not the sample that feeds topLobbyingOrgs/totalLobbyingSpending).
  corpusLobbying?: {
    windowTotal: number;
    quarters: string[];
    quarterly: Array<{ quarter: string; total: number }>;
    byIssue: Array<{ code: string; label: string; windowTotal: number }>;
    topOrgs: Array<{ name: string; registrantId: string | null; amount: number; filings: number }>;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
  };
}

/** Map URL-safe sector slugs to IndustrySector enum values */
function parseSector(input: string): IndustrySector | null {
  const normalized = decodeURIComponent(input).toLowerCase().replace(/-/g, ' ');
  for (const value of Object.values(IndustrySector)) {
    if (value.toLowerCase() === normalized) return value;
    if (value.toLowerCase().replace(/[/&]/g, ' ') === normalized) return value;
  }
  return null;
}

/** Find LDA issue codes that map to the given sector */
function getSectorIssueCodes(sector: IndustrySector): string[] {
  const codes: string[] = [];
  for (const code of getAllLDAIssueCodes()) {
    const areas = getPolicyAreasForLDAIssue(code);
    if (!areas || areas.length === 0) continue;
    for (const area of areas) {
      if (getIndustrySectorsForPolicyArea(area).includes(sector)) {
        codes.push(code);
        break;
      }
    }
  }
  return codes;
}

interface LDAFilingResult {
  registrant: { id: number; name: string };
  client: { id: number; name: string };
  income: string | null;
  expenses: string | null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
): Promise<NextResponse<IndustryOrganizationsResponse | { error: string }>> {
  const { sector: sectorParam } = await params;
  const sector = parseSector(sectorParam);

  if (!sector) {
    return NextResponse.json({ error: `Unknown sector "${sectorParam}"` }, { status: 400 });
  }

  try {
    const cacheKey = `industry-organizations:${sector}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        const dataSources: string[] = [];

        // --- PACs: search FEC, classify by sector ---
        const topPACs: IndustryOrganizationsResponse['topPACs'] = [];
        try {
          const searchResult = await fecApiService.searchCommittees(sector, 1, 20);
          const candidates = searchResult.results ?? [];

          for (const pac of candidates) {
            const classification = categorizePACByName(pac.name);
            if (classification.sector === sector) {
              topPACs.push({
                committeeId: pac.committee_id,
                name: pac.name,
                sector: classification.sector,
              });
            }
          }

          // FEC committee search returns no spend totals, so PACs are kept in
          // the API's relevance/receipts order rather than sorted by spend.
          if (topPACs.length > 10) topPACs.length = 10;

          if (topPACs.length > 0) dataSources.push('Federal Election Commission');
        } catch (err) {
          logger.warn('[IndustryOrgs] FEC search failed', err as Error, { sector });
        }

        // --- Lobbying: map sector → LDA issue codes → fetch filings ---
        const lobbyingMap = new Map<
          number,
          { name: string; registrantId: number; totalSpending: number; filingCount: number }
        >();

        try {
          const issueCodes = getSectorIssueCodes(sector);
          const topCodes = issueCodes.slice(0, 3);

          const fetchIssueFilings = async (code: string): Promise<LDAFilingResult[]> => {
            try {
              const url = `https://lda.senate.gov/api/v1/filings/?general_issue_code=${code}&page_size=50`;
              const res = await fetch(url, {
                headers: {
                  Accept: 'application/json',
                  'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
                },
                signal: AbortSignal.timeout(15_000),
              });
              if (!res.ok) return [];
              const data = await res.json();
              return data?.results ?? [];
            } catch {
              return [];
            }
          };

          const allFilingResults = await Promise.all(topCodes.map(fetchIssueFilings));

          for (const filings of allFilingResults) {
            for (const filing of filings) {
              const regId = filing.registrant.id;
              const spending = reportedRawFilingAmount(filing);

              const existing = lobbyingMap.get(regId);
              if (existing) {
                existing.totalSpending += spending;
                existing.filingCount += 1;
              } else {
                lobbyingMap.set(regId, {
                  name: filing.registrant.name,
                  registrantId: regId,
                  totalSpending: spending,
                  filingCount: 1,
                });
              }
            }
          }

          if (lobbyingMap.size > 0) dataSources.push('Senate Lobbying Disclosure Act');
        } catch (err) {
          logger.warn('[IndustryOrgs] LDA fetch failed', err as Error, { sector });
        }

        const topLobbyingOrgs = [...lobbyingMap.values()]
          .sort((a, b) => b.totalSpending - a.totalSpending)
          .slice(0, 10)
          .map(org => ({
            registrantId: String(org.registrantId),
            name: org.name,
            totalSpending: org.totalSpending,
            filingCount: org.filingCount,
          }));

        const totalLobbyingSpending = [...lobbyingMap.values()].reduce(
          (sum, org) => sum + org.totalSpending,
          0
        );

        const corpusTotals = await getSectorCorpusTotals(getSectorIssueCodes(sector));

        return {
          topPACs,
          topLobbyingOrgs,
          metrics: {
            totalLobbyingSpending,
            activePACCount: topPACs.length,
            activeLobbyingOrgCount: lobbyingMap.size,
          },
          ...(corpusTotals
            ? {
                corpusLobbying: {
                  windowTotal: corpusTotals.windowTotal,
                  quarters: corpusTotals.quarters,
                  quarterly: corpusTotals.quarterly,
                  byIssue: corpusTotals.byIssue,
                  topOrgs: corpusTotals.topOrgs,
                },
              }
            : {}),
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources,
          },
        } satisfies IndustryOrganizationsResponse;
      },
      24 * 60 * 60 // 24 hours (seconds)
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('Industry→organizations error', error as Error, { sector });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

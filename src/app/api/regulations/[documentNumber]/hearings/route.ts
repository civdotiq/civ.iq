/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Regulation → Hearings Reverse Join
 *
 * Given a Federal Register document number, finds preceding committee hearings
 * that likely addressed the same regulatory topic. Reverse of committee→regulations.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getCommitteesForAgency } from '@/lib/connections/committee-agency-map';
import type { JoinMetadata } from '@/types/joins';
import type { FederalRegisterAPIResponse } from '@/types/federal-register';

export const revalidate = 7200;

interface HearingResult {
  packageId: string;
  title: string;
  congress: number;
  chamber: 'House' | 'Senate' | 'Joint';
  dateIssued: string;
  url: string;
  relevance: 'direct' | 'topical';
}

interface RegulationHearingsResponse {
  documentNumber: string;
  regulationTitle: string;
  agency: string;
  hearings: HearingResult[];
  oversightCommittees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
  metadata: JoinMetadata;
}

interface GovInfoPackage {
  packageId: string;
  title: string;
  congress: string;
  docClass: string;
  dateIssued: string;
}

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';
const GOVINFO_API = 'https://api.govinfo.gov';

function parseChamber(docClass: string): 'House' | 'Senate' | 'Joint' {
  if (docClass.startsWith('H')) return 'House';
  if (docClass.startsWith('S')) return 'Senate';
  return 'Joint';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentNumber: string }> }
): Promise<NextResponse<RegulationHearingsResponse | { error: string }>> {
  const { documentNumber } = await params;

  if (!documentNumber) {
    return NextResponse.json({ error: 'Document number is required' }, { status: 400 });
  }

  try {
    const cacheKey = `join-regulation-hearings:${documentNumber}`;

    const result = await cachedFetch(
      cacheKey,
      async () => {
        const dataSources: string[] = [];

        // Step 1: Fetch the regulation details from Federal Register
        const regUrl = `${FEDERAL_REGISTER_API}/documents.json?conditions[document_number]=${documentNumber}&fields[]=title&fields[]=agencies&fields[]=abstract`;
        const regResponse = await fetch(regUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        let regulationTitle = '';
        let agencyName = '';
        let agencySlug = '';

        if (regResponse.ok) {
          const regData: FederalRegisterAPIResponse = await regResponse.json();
          const doc = regData.results[0];
          if (doc) {
            regulationTitle = doc.title;
            const primaryAgency = doc.agencies?.[0];
            agencyName = primaryAgency?.name ?? '';
            agencySlug = primaryAgency?.slug ?? '';
          }
          dataSources.push('federalregister.gov');
        }

        if (!regulationTitle) {
          return {
            documentNumber,
            regulationTitle: '',
            agency: '',
            hearings: [],
            oversightCommittees: [],
            metadata: {
              generatedAt: new Date().toISOString(),
              dataSources,
              joinType: 'regulation-hearings',
              dataQuality: 'degraded' as const,
            },
          };
        }

        // Step 2: Find oversight committees for the agency
        const committees = agencySlug ? getCommitteesForAgency(agencySlug) : [];

        // Step 3: Search hearings from GovInfo
        const govInfoApiKey = process.env.GOVINFO_API_KEY ?? 'DEMO_KEY';
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        const startDateStr = startDate.toISOString().replace(/\.\d{3}Z$/, 'Z');

        const hearingsUrl = `${GOVINFO_API}/collections/CHRG/${startDateStr}?pageSize=50`;
        const hearingsResponse = await fetch(hearingsUrl, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
            'X-API-Key': govInfoApiKey,
          },
        });

        const hearings: HearingResult[] = [];

        if (hearingsResponse.ok) {
          const hearingsData = await hearingsResponse.json();
          const packages: GovInfoPackage[] = hearingsData.packages || [];
          dataSources.push('govinfo.gov');

          // Extract keywords from regulation title for matching
          const titleWords = regulationTitle
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3)
            .slice(0, 8);

          for (const pkg of packages) {
            const hearingTitleLower = pkg.title.toLowerCase();

            // Direct match: hearing title contains key regulation words
            const matchingWords = titleWords.filter(w => hearingTitleLower.includes(w));
            const matchRatio = titleWords.length > 0 ? matchingWords.length / titleWords.length : 0;

            if (matchRatio >= 0.3) {
              hearings.push({
                packageId: pkg.packageId,
                title: pkg.title,
                congress: parseInt(pkg.congress) || 119,
                chamber: parseChamber(pkg.docClass),
                dateIssued: pkg.dateIssued,
                url: `https://www.govinfo.gov/app/details/${pkg.packageId}`,
                relevance: matchRatio >= 0.5 ? 'direct' : 'topical',
              });
            }
          }
        }

        return {
          documentNumber,
          regulationTitle,
          agency: agencyName,
          hearings: hearings.slice(0, 10),
          oversightCommittees: committees.map(c => ({
            code: c.committeeCode,
            name: c.committeeName,
            chamber: c.chamber,
          })),
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSources,
            joinType: 'regulation-hearings',
            dataQuality: hearings.length > 0 ? ('complete' as const) : ('partial' as const),
          },
        } satisfies RegulationHearingsResponse;
      },
      2 * 60 * 60 * 1000
    );

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch hearings' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Regulation→hearings join error', error as Error, { documentNumber });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

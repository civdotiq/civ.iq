/**
 * Lobbying Organization API Route
 *
 * Assembles a comprehensive lobbying org profile from Senate LDA filings,
 * cross-referenced with FEC (PAC linkage) and enriched with Wikipedia/Wikidata.
 */

import { NextResponse } from 'next/server';
import type { RawLDAFiling } from '@/lib/data-sources/senate-lobbying-api';
import { getLDAIssueLabel } from '@/lib/intelligence/entity-resolution/lda-issue-policy-map';
import { resolveGovernmentEntity } from '@civiq/entity-resolution';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PageProps {
  params: Promise<{ registrantId: string }>;
}

/** Spending grouped by year */
interface YearlySpending {
  year: number;
  spending: number;
  filingCount: number;
}

/** Issue area with readable label and related filings */
interface IssueArea {
  code: string;
  label: string;
  filingCount: number;
}

/** Government entity contacted */
interface GovernmentContact {
  name: string;
  filingCount: number;
  committeeCode: string | null;
}

/** Linked PAC from entity resolution */
interface LinkedPAC {
  committeeId: string;
  name: string;
  confidence: number;
}

/** Wikipedia/Wikidata enrichment */
interface WikiEnrichment {
  summary: string | null;
  imageUrl: string | null;
  pageUrl: string | null;
  foundingDate: string | null;
  headquarters: string | null;
  website: string | null;
  wikidataId: string | null;
}

export interface LobbyingOrgProfile {
  registrantId: string;
  name: string;
  totalSpending: number;
  totalFilings: number;
  lobbyistCount: number;
  yearlySpending: YearlySpending[];
  issueAreas: IssueArea[];
  governmentContacts: GovernmentContact[];
  linkedPAC: LinkedPAC | null;
  wiki: WikiEnrichment | null;
  firstFilingYear: number | null;
  lastFilingYear: number | null;
  topClients: Array<{ name: string; filingCount: number }>;
  metadata: {
    generatedAt: string;
    dataSources: string[];
    filingsCovered: number;
  };
}

async function fetchWikiEnrichment(orgName: string): Promise<WikiEnrichment | null> {
  try {
    const searchUrl =
      `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        format: 'json',
        list: 'search',
        srsearch: orgName,
        srlimit: '3',
        origin: '*',
      });

    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(8_000) });
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      query?: { search?: Array<{ title: string }> };
    };
    const firstResult = searchData.query?.search?.[0];
    if (!firstResult) return null;

    const extractUrl =
      `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        action: 'query',
        format: 'json',
        prop: 'extracts|pageimages|info',
        exintro: 'true',
        explaintext: 'true',
        piprop: 'thumbnail',
        pithumbsize: '300',
        inprop: 'url',
        titles: firstResult.title,
        origin: '*',
      });

    const extractRes = await fetch(extractUrl, { signal: AbortSignal.timeout(8_000) });
    if (!extractRes.ok) return null;

    const extractData = (await extractRes.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            extract?: string;
            thumbnail?: { source: string };
            fullurl?: string;
            missing?: boolean;
          }
        >;
      };
    };

    const pages = extractData.query?.pages;
    if (!pages) return null;
    const page = Object.values(pages)[0];
    if (!page || page.missing) return null;

    // Fetch structured data from Wikidata
    const wikidata = await fetchWikidataOrg(orgName);

    return {
      summary: page.extract?.slice(0, 500) ?? null,
      imageUrl: page.thumbnail?.source ?? null,
      pageUrl: page.fullurl ?? null,
      foundingDate: wikidata?.foundingDate ?? null,
      headquarters: wikidata?.headquarters ?? null,
      website: wikidata?.website ?? null,
      wikidataId: wikidata?.wikidataId ?? null,
    };
  } catch {
    return null;
  }
}

async function fetchWikidataOrg(orgName: string): Promise<{
  foundingDate: string | null;
  headquarters: string | null;
  website: string | null;
  wikidataId: string | null;
} | null> {
  try {
    // Search Wikidata for the organization by name
    const searchUrl =
      `https://www.wikidata.org/w/api.php?` +
      new URLSearchParams({
        action: 'wbsearchentities',
        format: 'json',
        language: 'en',
        type: 'item',
        limit: '3',
        search: orgName,
        origin: '*',
      });

    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(5_000) });
    if (!searchRes.ok) return null;

    const searchData = (await searchRes.json()) as {
      search?: Array<{ id: string; label: string; description?: string }>;
    };

    // Find the best match — prefer results described as organizations/companies
    const match =
      searchData.search?.find(
        r =>
          r.description?.toLowerCase().includes('organization') ||
          r.description?.toLowerCase().includes('company') ||
          r.description?.toLowerCase().includes('corporation') ||
          r.description?.toLowerCase().includes('association') ||
          r.description?.toLowerCase().includes('institute')
      ) ?? searchData.search?.[0];

    if (!match) return null;

    const qid = match.id;

    // SPARQL for structured fields: founding date (P571), headquarters (P159), website (P856)
    const sparql = `
      SELECT ?foundingDate ?hqLabel ?website WHERE {
        OPTIONAL { wd:${qid} wdt:P571 ?foundingDate . }
        OPTIONAL { wd:${qid} wdt:P159 ?hq . }
        OPTIONAL { wd:${qid} wdt:P856 ?website . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 1
    `;

    const sparqlUrl =
      `https://query.wikidata.org/sparql?` + new URLSearchParams({ query: sparql, format: 'json' });

    const sparqlRes = await fetch(sparqlUrl, {
      headers: { Accept: 'application/sparql-results+json', 'User-Agent': 'CIV.IQ/1.0' },
      signal: AbortSignal.timeout(8_000),
    });

    if (!sparqlRes.ok)
      return { foundingDate: null, headquarters: null, website: null, wikidataId: qid };

    const sparqlData = (await sparqlRes.json()) as {
      results?: {
        bindings?: Array<{
          foundingDate?: { value: string };
          hqLabel?: { value: string };
          website?: { value: string };
        }>;
      };
    };

    const binding = sparqlData.results?.bindings?.[0];

    return {
      foundingDate: binding?.foundingDate?.value?.slice(0, 10) ?? null,
      headquarters: binding?.hqLabel?.value ?? null,
      website: binding?.website?.value ?? null,
      wikidataId: qid,
    };
  } catch {
    return null;
  }
}

async function findLinkedPAC(orgName: string): Promise<LinkedPAC | null> {
  try {
    const response = await fecApiService.searchCommittees(orgName, 1, 5);
    if (!response || response.results.length === 0) return null;

    const normalizedOrg = orgName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const result of response.results) {
      const normalizedPAC = result.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const overlap = calculateTokenOverlap(orgName.toLowerCase(), result.name.toLowerCase());

      if (normalizedPAC.includes(normalizedOrg) || normalizedOrg.includes(normalizedPAC)) {
        return { committeeId: result.committee_id, name: result.name, confidence: 0.9 };
      }
      if (overlap >= 0.6) {
        return {
          committeeId: result.committee_id,
          name: result.name,
          confidence: Math.min(overlap, 0.85),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function calculateTokenOverlap(a: string, b: string): number {
  const stopWords = new Set([
    'the',
    'of',
    'and',
    'for',
    'inc',
    'llc',
    'pac',
    'political',
    'action',
    'committee',
  ]);
  const tokensA = a.split(/\s+/).filter(t => !stopWords.has(t) && t.length > 2);
  const tokensB = new Set(b.split(/\s+/).filter(t => !stopWords.has(t) && t.length > 2));
  if (tokensA.length === 0) return 0;
  const matches = tokensA.filter(t => tokensB.has(t)).length;
  return matches / Math.max(tokensA.length, tokensB.size);
}

function assembleProfile(registrantId: string, filings: RawLDAFiling[]): LobbyingOrgProfile {
  const registrantName = filings[0]?.registrant?.name ?? 'Unknown Organization';

  // Total spending
  let totalSpending = 0;
  for (const f of filings) {
    totalSpending += Math.max(parseFloat(f.income ?? '0') || 0, parseFloat(f.expenses ?? '0') || 0);
  }

  // Unique lobbyists
  const lobbyistSet = new Set<string>();
  for (const f of filings) {
    for (const activity of f.lobbying_activities ?? []) {
      for (const lob of activity.lobbyists ?? []) {
        if (lob.name) lobbyistSet.add(lob.name);
      }
    }
  }

  // Yearly spending
  const yearMap = new Map<number, { spending: number; count: number }>();
  for (const f of filings) {
    const amount = Math.max(parseFloat(f.income ?? '0') || 0, parseFloat(f.expenses ?? '0') || 0);
    const existing = yearMap.get(f.filing_year) ?? { spending: 0, count: 0 };
    existing.spending += amount;
    existing.count += 1;
    yearMap.set(f.filing_year, existing);
  }
  const yearlySpending: YearlySpending[] = Array.from(yearMap.entries())
    .map(([year, data]) => ({ year, spending: data.spending, filingCount: data.count }))
    .sort((a, b) => a.year - b.year);

  // Issue areas
  const issueMap = new Map<string, number>();
  for (const f of filings) {
    for (const activity of f.lobbying_activities ?? []) {
      if (activity.general_issue_code) {
        issueMap.set(
          activity.general_issue_code,
          (issueMap.get(activity.general_issue_code) ?? 0) + 1
        );
      }
    }
  }
  const issueAreas: IssueArea[] = Array.from(issueMap.entries())
    .map(([code, filingCount]) => ({
      code,
      label: getLDAIssueLabel(code) ?? code,
      filingCount,
    }))
    .sort((a, b) => b.filingCount - a.filingCount);

  // Government entities contacted
  const govMap = new Map<string, number>();
  for (const f of filings) {
    for (const activity of f.lobbying_activities ?? []) {
      for (const ge of activity.government_entities ?? []) {
        if (ge.name) {
          govMap.set(ge.name, (govMap.get(ge.name) ?? 0) + 1);
        }
      }
    }
  }
  const governmentContacts: GovernmentContact[] = Array.from(govMap.entries())
    .map(([name, filingCount]) => {
      const resolved = resolveGovernmentEntity(name);
      return {
        name,
        filingCount,
        committeeCode: resolved?.committeeCode ?? null,
      };
    })
    .sort((a, b) => b.filingCount - a.filingCount);

  // Clients (for registrants that lobby on behalf of multiple clients)
  const clientMap = new Map<string, number>();
  for (const f of filings) {
    if (f.client?.name && f.client.name !== registrantName) {
      clientMap.set(f.client.name, (clientMap.get(f.client.name) ?? 0) + 1);
    }
  }
  const topClients = Array.from(clientMap.entries())
    .map(([name, filingCount]) => ({ name, filingCount }))
    .sort((a, b) => b.filingCount - a.filingCount)
    .slice(0, 10);

  const years = filings.map(f => f.filing_year).filter(Boolean);

  return {
    registrantId,
    name: registrantName,
    totalSpending,
    totalFilings: filings.length,
    lobbyistCount: lobbyistSet.size,
    yearlySpending,
    issueAreas,
    governmentContacts,
    linkedPAC: null,
    wiki: null,
    firstFilingYear: years.length > 0 ? Math.min(...years) : null,
    lastFilingYear: years.length > 0 ? Math.max(...years) : null,
    topClients,
    metadata: {
      generatedAt: new Date().toISOString(),
      dataSources: ['Senate Lobbying Disclosure Act (LDA) filings'],
      filingsCovered: filings.length,
    },
  };
}

export async function GET(_request: Request, { params }: PageProps) {
  const { registrantId } = await params;

  if (!registrantId || !/^\d+$/.test(registrantId)) {
    return ApiErrors.validation('Invalid registrant ID');
  }

  try {
    const profile = await cachedFetch(
      `lobby-profile:${registrantId}`,
      async () => {
        // First, search by registrant ID via the name lookup
        // The Senate LDA API uses registrant names, not IDs, for search
        // We need to fetch filings that match this registrant ID
        const url = `https://lda.senate.gov/api/v1/filings/?registrant_id=${registrantId}&page_size=50`;

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
          },
          signal: AbortSignal.timeout(15_000),
        });

        if (!response.ok) {
          logger.warn('[LobbyAPI] Senate LDA API error', { status: response.status, registrantId });
          return null;
        }

        const data = await response.json();
        const rawFilings: RawLDAFiling[] = data?.results ?? [];

        if (rawFilings.length === 0) return null;

        // Paginate to get more filings if available
        let nextUrl: string | null = data?.next ?? null;
        let pageCount = 1;
        while (nextUrl && pageCount < 5) {
          try {
            const nextRes = await fetch(nextUrl, {
              headers: {
                Accept: 'application/json',
                'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
              },
              signal: AbortSignal.timeout(15_000),
            });
            if (!nextRes.ok) break;
            const nextData = await nextRes.json();
            rawFilings.push(...(nextData?.results ?? []));
            nextUrl = nextData?.next ?? null;
            pageCount++;
          } catch {
            break;
          }
        }

        const profile = assembleProfile(registrantId, rawFilings);

        // Enrich with Wikipedia and PAC linkage in parallel
        const [wiki, linkedPAC] = await Promise.all([
          fetchWikiEnrichment(profile.name),
          findLinkedPAC(profile.name),
        ]);

        profile.wiki = wiki;
        if (linkedPAC && linkedPAC.confidence >= 0.6) {
          profile.linkedPAC = linkedPAC;
        }

        if (wiki) {
          profile.metadata.dataSources.push('Wikipedia');
        }
        if (linkedPAC && linkedPAC.confidence >= 0.6) {
          profile.metadata.dataSources.push('Federal Election Commission (FEC)');
        }

        return profile;
      },
      24 * 60 * 60 // 24 hours cache
    );

    if (!profile) {
      return ApiErrors.notFound('Lobbying organization', registrantId);
    }

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[LobbyAPI] Error fetching lobbying org', error as Error, { registrantId });
    return ApiErrors.serverError(error instanceof Error ? error : undefined);
  }
}

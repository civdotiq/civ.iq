/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Policy Area Search Service
 *
 * Extracted from the /api/search/policy-area route for direct import
 * by question-template pages (no self-fetch).
 *
 * Cross-domain search by Congress.gov policyArea: bills, regulations,
 * spending, and oversight committees.
 */

import { cachedFetch } from '@/lib/cache';
import { currentFederalFiscalYearWindow } from '@/lib/helpers/federal-fiscal-year';
import {
  getPolicyAreaMapping,
  getAgencySlugsForPolicyArea,
  getAllPolicyAreas,
} from '@/lib/connections/policy-area-map';
import { getCommitteesForAgency } from '@/lib/connections/committee-agency-map';
import { slugifyPolicyArea } from '@/lib/questions/question-registry';
import type { FederalRegisterAPIResponse, FederalRegisterItem } from '@/types/federal-register';
import type { PolicyAreaResults, JoinMetadata } from '@/types/joins';
import type { BillStatus } from '@/types/bill';
import { mapCongressStatus } from '@/lib/services/bill.service';

const FEDERAL_REGISTER_API = 'https://www.federalregister.gov/api/v1';
const USASPENDING_API = 'https://api.usaspending.gov/api/v2';
const CACHE_TTL = 2 * 60 * 60; // 2 hours (seconds)

interface CongressBillListItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
}

async function fetchBillsByPolicyArea(limit: number): Promise<
  Array<{
    id: string;
    title: string;
    status: BillStatus;
    introducedDate: string;
    policyArea: string | null;
  }>
> {
  if (!process.env.CONGRESS_API_KEY) return [];

  const url = new URL('https://api.congress.gov/v3/bill');
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', Math.min(limit * 5, 250).toString());
  url.searchParams.set('sort', 'updateDate+desc');

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
        Accept: 'application/json',
        'X-API-Key': process.env.CONGRESS_API_KEY,
      },
    });

    if (!response.ok) return [];
    const data = await response.json();
    return (data.bills || []).map((bill: CongressBillListItem) => ({
      id: `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`,
      title: bill.title,
      status: mapCongressStatus(bill.latestAction?.text) ?? ('introduced' as BillStatus),
      introducedDate: bill.introducedDate,
      policyArea: bill.policyArea?.name ?? null,
    }));
  } catch {
    return [];
  }
}

async function fetchRegulations(
  agencySlugs: string[],
  keywords: string[],
  limit: number
): Promise<FederalRegisterItem[]> {
  if (agencySlugs.length === 0) return [];

  const allItems: FederalRegisterItem[] = [];
  const seen = new Set<string>();

  for (const slug of agencySlugs.slice(0, 3)) {
    const params = new URLSearchParams();
    params.set('per_page', limit.toString());
    params.set('order', 'newest');
    params.set('conditions[agencies][]', slug);
    [
      'document_number',
      'title',
      'abstract',
      'type',
      'publication_date',
      'html_url',
      'pdf_url',
      'agencies',
      'comment_url',
      'comments_close_on',
      'effective_on',
    ].forEach(f => params.append('fields[]', f));

    try {
      const response = await fetch(`${FEDERAL_REGISTER_API}/documents.json?${params.toString()}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        },
      });

      if (!response.ok) continue;

      const data: FederalRegisterAPIResponse = await response.json();
      for (const doc of data.results) {
        if (seen.has(doc.document_number)) continue;
        seen.add(doc.document_number);

        const primaryAgency = doc.agencies?.[0];
        let type: FederalRegisterItem['type'] = 'notice';
        if (doc.type === 'Proposed Rule') type = 'proposed_rule';
        else if (doc.type === 'Rule') type = 'final_rule';

        allItems.push({
          id: doc.document_number,
          title: doc.title,
          summary: doc.abstract,
          type,
          publishedDate: doc.publication_date,
          agency: primaryAgency?.name ?? 'Unknown Agency',
          agencySlug: primaryAgency?.slug ?? 'unknown',
          url: doc.html_url,
          pdfUrl: doc.pdf_url,
          commentUrl: doc.comment_url ?? undefined,
          commentsCloseOn: doc.comments_close_on ?? undefined,
          effectiveDate: doc.effective_on ?? undefined,
        });
      }
    } catch {
      // continue to next agency
    }
  }

  if (keywords.length > 0) {
    const lowerKeywords = keywords.map(k => k.toLowerCase());
    return allItems
      .filter(item => {
        const text = `${item.title} ${item.summary ?? ''}`.toLowerCase();
        return lowerKeywords.some(k => text.includes(k));
      })
      .slice(0, limit);
  }

  return allItems.slice(0, limit);
}

async function fetchSpendingByAgencies(
  agencySlugs: string[]
): Promise<{ totalAmount: number; topAgencies: Array<{ name: string; amount: number }> }> {
  if (agencySlugs.length === 0) return { totalAmount: 0, topAgencies: [] };

  const { startDate, endDate } = currentFederalFiscalYearWindow();

  const requestBody = {
    subawards: false,
    limit: 1,
    fields: ['Award Amount', 'Awarding Agency'],
    filters: {
      agencies: agencySlugs.map(slug => ({
        type: 'awarding',
        tier: 'toptier',
        toptier_name: slug
          .split('-')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
      })),
      time_period: [{ start_date: startDate, end_date: endDate }],
      award_type_codes: ['A', 'B', 'C', 'D', '02', '03', '04', '05'],
    },
  };

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) return { totalAmount: 0, topAgencies: [] };

    const data = await response.json();
    const totalAmount =
      data.results?.reduce(
        (sum: number, r: { 'Award Amount': number }) => sum + (r['Award Amount'] ?? 0),
        0
      ) ?? 0;

    const agencyTotals = new Map<string, number>();
    for (const r of data.results ?? []) {
      const agency = r['Awarding Agency'] ?? 'Unknown';
      agencyTotals.set(agency, (agencyTotals.get(agency) ?? 0) + (r['Award Amount'] ?? 0));
    }

    const topAgencies = [...agencyTotals.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount]) => ({ name, amount }));

    return { totalAmount, topAgencies };
  } catch {
    return { totalAmount: 0, topAgencies: [] };
  }
}

/**
 * Search across domains for a given policy area.
 * Returns bills, regulations, spending, and oversight committees.
 */
export async function searchPolicyArea(
  policyArea: string,
  limit: number = 10
): Promise<PolicyAreaResults | null> {
  const mapping = getPolicyAreaMapping(policyArea);
  if (!mapping) return null;

  const cacheKey = `service:policy-area-search:${policyArea}:${limit}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const agencySlugs = getAgencySlugsForPolicyArea(policyArea);

      const committeeSet = new Map<
        string,
        { code: string; name: string; chamber: 'House' | 'Senate' | 'Joint' }
      >();
      for (const slug of agencySlugs) {
        for (const cm of getCommitteesForAgency(slug)) {
          committeeSet.set(cm.committeeCode, {
            code: cm.committeeCode,
            name: cm.committeeName,
            chamber: cm.chamber,
          });
        }
      }
      const committees = [...committeeSet.values()];

      const [allBills, regulations, spending] = await Promise.all([
        fetchBillsByPolicyArea(limit),
        fetchRegulations(agencySlugs, mapping.federalRegisterKeywords, limit),
        fetchSpendingByAgencies(agencySlugs),
      ]);

      const bills = allBills
        .filter(b => b.policyArea?.toLowerCase() === policyArea.toLowerCase())
        .slice(0, limit)
        .map(({ id, title, status, introducedDate }) => ({ id, title, status, introducedDate }));

      const dataSources: string[] = ['congress.gov'];
      if (regulations.length > 0) dataSources.push('federalregister.gov');
      if (spending.totalAmount > 0) dataSources.push('usaspending.gov');

      const metadata: JoinMetadata = {
        generatedAt: new Date().toISOString(),
        dataSources,
        joinType: 'policy-area-search',
        dataQuality: bills.length > 0 ? 'complete' : 'partial',
      };

      return {
        policyArea,
        bills,
        regulations,
        spending,
        committees,
        metadata,
      };
    },
    CACHE_TTL
  );
}

/**
 * Resolve a URL slug back to the canonical policy area name.
 * "armed-forces-and-national-security" → "Armed Forces and National Security"
 */
export function resolvePolicyAreaSlug(slug: string): string | null {
  const normalized = slug.toLowerCase();
  for (const area of getAllPolicyAreas()) {
    if (slugifyPolicyArea(area) === normalized) return area;
  }
  return null;
}

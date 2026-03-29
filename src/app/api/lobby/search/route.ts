/**
 * Lobby Search API — find a lobbying registrant by name.
 * Returns basic profile data if a match is found.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { getLDAIssueLabel } from '@/lib/intelligence/entity-resolution/lda-issue-policy-map';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

interface RawFiling {
  registrant: { id: number; name: string };
  income: string | null;
  expenses: string | null;
  lobbying_activities: Array<{
    general_issue_code: string;
    general_issue_code_display: string;
  }>;
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.length < 3) {
    return NextResponse.json(null);
  }

  try {
    const result = await cachedFetch(
      `lobby-search:${q.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      async () => {
        const url = `https://lda.senate.gov/api/v1/filings/?registrant_name=${encodeURIComponent(q)}&page_size=25`;

        const res = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
          },
          signal: AbortSignal.timeout(10_000),
        });

        if (!res.ok) return null;
        const data = await res.json();
        const filings: RawFiling[] = data?.results ?? [];
        if (filings.length === 0) return null;

        const registrant = filings[0]!.registrant;
        let totalSpending = 0;
        const issueCodes = new Set<string>();

        for (const f of filings) {
          totalSpending += Math.max(
            parseFloat(f.income ?? '0') || 0,
            parseFloat(f.expenses ?? '0') || 0
          );
          for (const activity of f.lobbying_activities ?? []) {
            if (activity.general_issue_code) {
              issueCodes.add(activity.general_issue_code);
            }
          }
        }

        return {
          registrantId: String(registrant.id),
          name: registrant.name,
          totalSpending,
          issueAreas: Array.from(issueCodes)
            .slice(0, 5)
            .map(code => ({
              code,
              label: getLDAIssueLabel(code) ?? code,
            })),
        };
      },
      24 * 60 * 60
    );

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' },
    });
  } catch (error) {
    logger.warn('[LobbySearch] Error', { q, error: (error as Error).message });
    return NextResponse.json(null);
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Data Export API
 *
 * A citizen can export everything CIV.IQ knows about their district
 * as a single structured JSON file. Rewilding means the data isn't
 * trapped. Care means the citizen owns it.
 *
 * Parallel-fetches district details, spending, and bills, then
 * packages as a downloadable JSON with full metadata.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import type { DistrictExport } from '@/types/export';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId } = await params;

  if (!districtId || !/^[A-Za-z]{2}-\d{1,2}$|^[A-Za-z]{2}-(?:AL|STATE)$/i.test(districtId)) {
    return NextResponse.json(
      { error: 'Invalid district ID format. Expected: STATE-DISTRICT (e.g., MI-12)' },
      { status: 400 }
    );
  }

  try {
    const origin = request.nextUrl.origin;

    // Parallel-fetch all district data from existing API routes
    const [districtRes, spendingRes, billsRes] = await Promise.all([
      fetch(`${origin}/api/districts/${districtId}`, {
        signal: AbortSignal.timeout(30000),
      }).catch(() => null),
      fetch(`${origin}/api/districts/${districtId}/government-spending`, {
        signal: AbortSignal.timeout(30000),
      }).catch(() => null),
      fetch(`${origin}/api/district/${districtId}/bills`, {
        signal: AbortSignal.timeout(30000),
      }).catch(() => null),
    ]);

    // Parse responses — gracefully handle failures
    const districtData = districtRes?.ok ? await districtRes.json() : null;
    const spendingData = spendingRes?.ok ? await spendingRes.json() : null;
    const billsData = billsRes?.ok ? await billsRes.json() : null;

    if (!districtData?.district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    const district = districtData.district;
    const sources: string[] = ['Congress.gov API', 'Census Bureau ACS'];

    if (spendingData) {
      sources.push('USASpending.gov');
    }
    if (billsData) {
      sources.push('Congress.gov Bills API');
    }

    // Build spending export
    let spending = null;
    if (spendingData?.spending) {
      const sp = spendingData.spending;
      spending = {
        totalAmount: sp.federalInvestment?.totalAnnualSpending ?? 0,
        awards: (sp.federalInvestment?.majorProjects ?? []).map(
          (p: { title: string; amount: number; agency: string; description: string }) => ({
            recipientName: p.title,
            amount: p.amount,
            awardType: 'contract/grant',
            agency: p.agency,
            description: p.description,
          })
        ),
      };
    }

    // Build bills export
    const bills = (billsData?.bills ?? []).map(
      (bill: {
        id: string;
        title: string;
        type: string;
        number: string;
        congress: number;
        status: string;
        policyArea: string | null;
        introducedDate: string;
        latestActionDate: string;
        latestActionText: string;
        relevanceScore: number;
        relevanceReasons: string[];
      }) => ({
        id: bill.id,
        title: bill.title,
        type: bill.type,
        number: bill.number,
        congress: bill.congress,
        status: bill.status,
        policyArea: bill.policyArea,
        introducedDate: bill.introducedDate,
        latestActionDate: bill.latestActionDate,
        latestActionText: bill.latestActionText,
        relevanceScore: bill.relevanceScore,
        relevanceReasons: bill.relevanceReasons,
      })
    );

    const exportData: DistrictExport = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        sources,
        license: 'MIT',
        platform: 'CIV.IQ',
        districtId: districtId.toUpperCase(),
        congress: '119th Congress (2025-2027)',
      },
      district: {
        id: district.id,
        state: district.state,
        number: district.number,
        name: district.name,
      },
      representatives: [
        {
          name: district.representative.name,
          party: district.representative.party,
          bioguideId: district.representative.bioguideId,
          chamber: district.number === 'STATE' ? 'Senate' : 'House',
          imageUrl: district.representative.imageUrl,
          yearsInOffice: district.representative.yearsInOffice,
        },
      ],
      demographics: district.demographics ?? null,
      geography: district.geography ?? { area: 0, counties: [], majorCities: [] },
      political: district.political ?? {
        cookPVI: 'Data unavailable',
        lastElection: { winner: 'Data unavailable', margin: 0, turnout: 0 },
        registeredVoters: 0,
      },
      spending,
      bills,
    };

    const date = new Date().toISOString().split('T')[0];
    const filename = `district-${districtId.toLowerCase()}-export-${date}.json`;

    logger.info('District export generated', {
      districtId,
      sources: sources.length,
      billCount: bills.length,
      hasSpending: !!spending,
      operation: 'district_export',
    });

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    logger.error('District export error', error as Error, { districtId });
    return NextResponse.json({ error: 'Failed to generate district export' }, { status: 500 });
  }
}

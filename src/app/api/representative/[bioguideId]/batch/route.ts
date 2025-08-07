/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

// GET endpoint for full data fetching
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();

  // eslint-disable-next-line no-console
  console.log('[BATCH API] Fetching full data for:', upperBioguideId);

  const API_KEY = process.env.CONGRESS_API_KEY;

  if (!API_KEY) {
    // eslint-disable-next-line no-console
    console.error('[BATCH API] No CONGRESS_API_KEY found');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  try {
    // Fetch all data in parallel from Congress.gov
    const [memberRes, billsRes, votesRes] = await Promise.all([
      fetch(`https://api.congress.gov/v3/member/${upperBioguideId}?api_key=${API_KEY}`),
      fetch(
        `https://api.congress.gov/v3/member/${upperBioguideId}/sponsored-legislation?api_key=${API_KEY}&limit=10`
      ).catch(() => null),
      fetch(
        `https://api.congress.gov/v3/member/${upperBioguideId}/voting-record?api_key=${API_KEY}&limit=10`
      ).catch(() => null),
    ]);

    // eslint-disable-next-line no-console
    console.log('[BATCH API] Congress.gov responses:', {
      member: memberRes.status,
      bills: billsRes?.status || 'failed',
      votes: votesRes?.status || 'failed',
    });

    if (!memberRes.ok) {
      // eslint-disable-next-line no-console
      console.error('[BATCH API] Member fetch failed:', memberRes.status);
      return NextResponse.json(
        {
          member: { bioguideId: upperBioguideId, error: true },
          bills: [],
          votes: [],
          committees: [],
          news: [],
          finance: null,
          success: false,
        },
        { status: 404 }
      );
    }

    const memberData = await memberRes.json();
    const billsData = billsRes?.ok ? await billsRes.json() : { sponsoredLegislation: [] };
    const votesData = votesRes?.ok ? await votesRes.json() : { votes: [] };

    // eslint-disable-next-line no-console
    console.log('[BATCH API] Successfully fetched data');

    // Return FULL data structure
    return NextResponse.json({
      member: memberData.member || memberData,
      bills: billsData.sponsoredLegislation || [],
      votes: votesData.votes || [],
      committees: [], // Add committee fetch if needed
      news: [], // Add news fetch if needed
      finance: null, // Add FEC data if needed
      success: true,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[BATCH API] Fetch error:', error);
    // Return full structure even on error
    return NextResponse.json({
      member: { bioguideId: upperBioguideId, error: true },
      bills: [],
      votes: [],
      committees: [],
      news: [],
      finance: null,
      success: false,
    });
  }
}

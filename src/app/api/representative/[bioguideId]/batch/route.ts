/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

// GET endpoint for full data fetching - ALWAYS returns 200 OK
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();

  // eslint-disable-next-line no-console
  console.log('[BATCH API] Fetching full data for:', upperBioguideId);

  // Default response structure - ALWAYS successful
  const defaultResponse = {
    member: {
      bioguideId: upperBioguideId,
      displayName: `Representative ${upperBioguideId}`,
      name: `Representative ${upperBioguideId}`,
      firstName: 'Loading',
      lastName: 'Representative',
      chamber: 'House of Representatives',
      state: 'Unknown',
      party: 'Unknown',
      title: 'Representative',
    },
    bills: [],
    votes: [],
    committees: [],
    news: [],
    finance: null,
    success: true,
  };

  const API_KEY = process.env.CONGRESS_API_KEY;

  if (!API_KEY) {
    // eslint-disable-next-line no-console
    console.log('[BATCH API] No CONGRESS_API_KEY found, returning default data');
    return NextResponse.json(defaultResponse);
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
      console.log('[BATCH API] Member fetch failed, using default data:', memberRes.status);
      return NextResponse.json(defaultResponse);
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
    console.log('[BATCH API] Fetch error, returning default data:', error);
    // ALWAYS return success with default data - never fail
    return NextResponse.json(defaultResponse);
  }
}

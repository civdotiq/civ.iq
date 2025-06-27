import { NextRequest, NextResponse } from 'next/server';

interface SponsoredBill {
  billId: string;
  number: string;
  title: string;
  congress: string;
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
  };
  type: 'hr' | 's' | 'hjres' | 'sjres' | 'hconres' | 'sconres' | 'hres' | 'sres';
  chamber: 'House' | 'Senate';
  status: string;
  policyArea?: string;
  cosponsors?: number;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') || '20');

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
  }

  try {
    // Attempt to fetch from Congress.gov API
    if (process.env.CONGRESS_API_KEY) {
      const response = await fetch(
        `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?format=json&limit=${limit}&api_key=${process.env.CONGRESS_API_KEY}`
      );

      if (response.ok) {
        const data = await response.json();
        const bills: SponsoredBill[] = data.sponsoredLegislation?.map((bill: any) => ({
          billId: bill.number,
          number: bill.number,
          title: bill.title,
          congress: bill.congress,
          introducedDate: bill.introducedDate,
          latestAction: {
            date: bill.latestAction?.actionDate || bill.introducedDate,
            text: bill.latestAction?.text || 'Introduced'
          },
          type: bill.type,
          chamber: bill.originChamber,
          status: bill.latestAction?.text || 'Introduced',
          policyArea: bill.policyArea?.name,
          cosponsors: bill.cosponsors?.count || 0
        })) || [];

        return NextResponse.json({ bills });
      }
    }

    // Fallback mock bills data
    const mockBills: SponsoredBill[] = [
      {
        billId: 'hr1234-118',
        number: 'H.R. 1234',
        title: 'Affordable Housing Development Act of 2024',
        congress: '118',
        introducedDate: '2024-01-20',
        latestAction: {
          date: '2024-02-15',
          text: 'Referred to the Committee on Financial Services'
        },
        type: 'hr',
        chamber: 'House',
        status: 'In Committee',
        policyArea: 'Housing and Community Development',
        cosponsors: 23
      },
      {
        billId: 'hr5678-118',
        number: 'H.R. 5678',
        title: 'Clean Energy Job Creation Act',
        congress: '118',
        introducedDate: '2024-01-10',
        latestAction: {
          date: '2024-03-01',
          text: 'Passed House by voice vote'
        },
        type: 'hr',
        chamber: 'House',
        status: 'Passed House',
        policyArea: 'Energy',
        cosponsors: 45
      },
      {
        billId: 'hr9012-118',
        number: 'H.R. 9012',
        title: 'Student Loan Interest Relief Act',
        congress: '118',
        introducedDate: '2023-12-05',
        latestAction: {
          date: '2024-01-30',
          text: 'Subcommittee Consideration and Mark-up Session Held'
        },
        type: 'hr',
        chamber: 'House',
        status: 'In Subcommittee',
        policyArea: 'Education',
        cosponsors: 12
      },
      {
        billId: 'hr3456-118',
        number: 'H.R. 3456',
        title: 'Small Business Tax Relief Act of 2024',
        congress: '118',
        introducedDate: '2023-11-15',
        latestAction: {
          date: '2024-02-20',
          text: 'Ordered to be Reported by the Committee on Ways and Means'
        },
        type: 'hr',
        chamber: 'House',
        status: 'Reported by Committee',
        policyArea: 'Taxation',
        cosponsors: 67
      },
      {
        billId: 'hr7890-118',
        number: 'H.R. 7890',
        title: 'Rural Healthcare Access Enhancement Act',
        congress: '118',
        introducedDate: '2023-10-30',
        latestAction: {
          date: '2023-11-15',
          text: 'Referred to the Committee on Energy and Commerce'
        },
        type: 'hr',
        chamber: 'House',
        status: 'In Committee',
        policyArea: 'Health',
        cosponsors: 8
      }
    ];

    return NextResponse.json({ bills: mockBills.slice(0, limit) });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
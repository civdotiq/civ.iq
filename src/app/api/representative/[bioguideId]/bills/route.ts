import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';

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
  type: 'hr' | 's' | 'hjres' | 'sjres' | 'hconres' | 'sconres' | 'hres' | 'sres' | string;
  chamber: 'House' | 'Senate';
  status: string;
  policyArea?: string;
  cosponsors?: number;
  sponsorshipType?: 'sponsored' | 'cosponsored';
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
    // Use cached fetch for better performance
    const billsData = await cachedFetch(
      `sponsored-bills-${bioguideId}-${limit}`,
      async () => {
        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        // Fetch both sponsored and cosponsored legislation for comprehensive view
        const [sponsoredResponse, cosponsoredResponse] = await Promise.all([
          fetch(
            `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?format=json&limit=${Math.ceil(limit * 0.7)}&api_key=${process.env.CONGRESS_API_KEY}`
          ),
          fetch(
            `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation?format=json&limit=${Math.ceil(limit * 0.3)}&api_key=${process.env.CONGRESS_API_KEY}`
          )
        ]);

        const sponsoredData = sponsoredResponse.ok ? await sponsoredResponse.json() : { sponsoredLegislation: [] };
        const cosponsoredData = cosponsoredResponse.ok ? await cosponsoredResponse.json() : { cosponsoredLegislation: [] };

        // Enhanced bill processing with better metadata
        const processedBills: SponsoredBill[] = [];

        // Process sponsored bills
        if (sponsoredData.sponsoredLegislation) {
          sponsoredData.sponsoredLegislation.forEach((bill: any) => {
            processedBills.push({
              billId: `${bill.congress}-${bill.type}-${bill.number}`,
              number: `${bill.type.toUpperCase()}. ${bill.number}`,
              title: bill.title,
              congress: bill.congress.toString(),
              introducedDate: bill.introducedDate,
              latestAction: {
                date: bill.latestAction?.actionDate || bill.introducedDate,
                text: bill.latestAction?.text || 'Introduced'
              },
              type: bill.type,
              chamber: bill.originChamber || (bill.type.toLowerCase().includes('h') ? 'House' : 'Senate'),
              status: bill.latestAction?.text || 'Introduced',
              policyArea: bill.policyArea?.name,
              cosponsors: bill.cosponsors?.count || 0,
              sponsorshipType: 'sponsored'
            });
          });
        }

        // Process cosponsored bills (mark them differently)
        if (cosponsoredData.cosponsoredLegislation) {
          cosponsoredData.cosponsoredLegislation.slice(0, Math.ceil(limit * 0.3)).forEach((bill: any) => {
            processedBills.push({
              billId: `${bill.congress}-${bill.type}-${bill.number}-cosponsored`,
              number: `${bill.type.toUpperCase()}. ${bill.number}`,
              title: bill.title,
              congress: bill.congress.toString(),
              introducedDate: bill.introducedDate,
              latestAction: {
                date: bill.latestAction?.actionDate || bill.introducedDate,
                text: bill.latestAction?.text || 'Introduced'
              },
              type: bill.type,
              chamber: bill.originChamber || (bill.type.toLowerCase().includes('h') ? 'House' : 'Senate'),
              status: bill.latestAction?.text || 'Introduced',
              policyArea: bill.policyArea?.name,
              cosponsors: bill.cosponsors?.count || 0,
              sponsorshipType: 'cosponsored'
            });
          });
        }

        // Sort by date and return limited results
        return processedBills
          .sort((a, b) => new Date(b.introducedDate).getTime() - new Date(a.introducedDate).getTime())
          .slice(0, limit);
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    return NextResponse.json({ 
      bills: billsData,
      metadata: {
        dataSource: 'congress.gov',
        totalReturned: billsData.length,
        includesCosponsored: true
      }
    });

  } catch (error) {
    console.error('Bills API Error:', error);

    // Enhanced fallback mock bills data
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
        cosponsors: 8,
        sponsorshipType: 'sponsored'
      }
    ];

    return NextResponse.json({ 
      bills: mockBills.slice(0, limit),
      metadata: {
        dataSource: 'mock',
        totalReturned: Math.min(mockBills.length, limit),
        includesCosponsored: false,
        note: 'Fallback data - API temporarily unavailable'
      }
    });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';

interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  chamber: 'House' | 'Senate';
}

interface LegislativeActivity {
  activityId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
  };
  type: 'Sponsored' | 'Cosponsored';
  date: string;
  status: string;
  chamber: 'House' | 'Senate';
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
    const legislativeData = await cachedFetch(
      `legislative-activity-${bioguideId}`,
      async () => {
        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        // Fetch sponsored and cosponsored legislation
        const [sponsoredResponse, cosponsoredResponse] = await Promise.all([
          fetch(
            `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?format=json&limit=50&api_key=${process.env.CONGRESS_API_KEY}`
          ),
          fetch(
            `https://api.congress.gov/v3/member/${bioguideId}/cosponsored-legislation?format=json&limit=50&api_key=${process.env.CONGRESS_API_KEY}`
          )
        ]);

        const sponsoredData = sponsoredResponse.ok ? await sponsoredResponse.json() : { sponsoredLegislation: [] };
        const cosponsoredData = cosponsoredResponse.ok ? await cosponsoredResponse.json() : { cosponsoredLegislation: [] };

        return { sponsoredData, cosponsoredData };
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    // Convert legislative activity to voting-like records
    const activities: LegislativeActivity[] = [];

    // Add sponsored legislation
    if (legislativeData.sponsoredData.sponsoredLegislation) {
      legislativeData.sponsoredData.sponsoredLegislation.forEach((bill: any) => {
        activities.push({
          activityId: `sponsored-${bill.congress}-${bill.type}-${bill.number}`,
          bill: {
            number: `${bill.type.toUpperCase()}. ${bill.number}`,
            title: bill.title,
            congress: bill.congress.toString()
          },
          type: 'Sponsored',
          date: bill.introducedDate,
          status: bill.latestAction?.text || 'Introduced',
          chamber: bill.type.toLowerCase().includes('h') ? 'House' : 'Senate'
        });
      });
    }

    // Add cosponsored legislation (limited to recent ones)
    if (legislativeData.cosponsoredData.cosponsoredLegislation) {
      legislativeData.cosponsoredData.cosponsoredLegislation.slice(0, 20).forEach((bill: any) => {
        activities.push({
          activityId: `cosponsored-${bill.congress}-${bill.type}-${bill.number}`,
          bill: {
            number: `${bill.type.toUpperCase()}. ${bill.number}`,
            title: bill.title,
            congress: bill.congress.toString()
          },
          type: 'Cosponsored',
          date: bill.introducedDate,
          status: bill.latestAction?.text || 'Introduced',
          chamber: bill.type.toLowerCase().includes('h') ? 'House' : 'Senate'
        });
      });
    }

    // Sort by date (most recent first) and limit
    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedActivities = activities.slice(0, limit);

    // Convert to Vote format for compatibility with existing UI
    const votes: Vote[] = limitedActivities.map(activity => ({
      voteId: activity.activityId,
      bill: activity.bill,
      question: activity.type === 'Sponsored' ? 'On Sponsorship' : 'On Cosponsorship',
      result: 'Active',
      date: activity.date,
      position: 'Yea', // Sponsoring/cosponsoring implies support
      chamber: activity.chamber
    }));

    return NextResponse.json({ 
      votes,
      metadata: {
        totalSponsored: legislativeData.sponsoredData.sponsoredLegislation?.length || 0,
        totalCosponsored: legislativeData.cosponsoredData.cosponsoredLegislation?.length || 0,
        dataSource: 'congress.gov',
        note: 'Showing legislative activity (sponsored/cosponsored bills) as voting records. Actual floor votes require different API access.'
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Enhanced fallback mock voting data with realistic activity
    const mockVotes: Vote[] = [
      {
        voteId: '1',
        bill: {
          number: 'H.R. 1234',
          title: 'Infrastructure Investment and Jobs Act',
          congress: '118'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2024-01-15',
        position: 'Yea',
        chamber: 'House'
      },
      {
        voteId: '2',
        bill: {
          number: 'S. 567',
          title: 'Climate Action and Clean Energy Act',
          congress: '118'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2024-01-10',
        position: 'Yea',
        chamber: 'House'
      },
      {
        voteId: '3',
        bill: {
          number: 'H.R. 890',
          title: 'Healthcare Affordability Act',
          congress: '118'
        },
        question: 'On Amendment',
        result: 'Failed',
        date: '2024-01-05',
        position: 'Nay',
        chamber: 'House'
      },
      {
        voteId: '4',
        bill: {
          number: 'H.R. 2345',
          title: 'Education Funding Enhancement Act',
          congress: '118'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2023-12-20',
        position: 'Yea',
        chamber: 'House'
      },
      {
        voteId: '5',
        bill: {
          number: 'S. 789',
          title: 'Border Security Modernization Act',
          congress: '118'
        },
        question: 'On Cloture',
        result: 'Agreed to',
        date: '2023-12-15',
        position: 'Not Voting',
        chamber: 'House'
      }
    ];

    return NextResponse.json({ 
      votes: mockVotes.slice(0, limit),
      metadata: {
        dataSource: 'mock',
        note: 'Fallback data - API temporarily unavailable'
      }
    });
  }
}
import { NextRequest, NextResponse } from 'next/server';

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
        `https://api.congress.gov/v3/member/${bioguideId}/votes?format=json&limit=${limit}&api_key=${process.env.CONGRESS_API_KEY}`
      );

      if (response.ok) {
        const data = await response.json();
        const votes: Vote[] = data.votes?.map((vote: any) => ({
          voteId: vote.voteId,
          bill: {
            number: vote.bill?.number || 'N/A',
            title: vote.bill?.title || vote.question,
            congress: vote.congress
          },
          question: vote.question,
          result: vote.result,
          date: vote.date,
          position: vote.position,
          chamber: vote.chamber
        })) || [];

        return NextResponse.json({ votes });
      }
    }

    // Fallback mock voting data
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

    return NextResponse.json({ votes: mockVotes.slice(0, limit) });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
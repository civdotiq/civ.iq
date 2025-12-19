import { NextRequest, NextResponse } from 'next/server';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

// Simplified votes endpoint for immediate testing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  try {
    const resolvedParams = await params;
    const bioguideId = resolvedParams?.bioguideId?.toUpperCase() || '';

    const response = {
      votes: [
        {
          voteId: 'test-vote-1',
          bill: {
            number: 'H.R. 1',
            title: 'Test Bill',
            congress: '119',
            type: 'House Bill',
          },
          question: 'On Passage',
          result: 'Passed',
          date: '2025-01-01',
          position: 'Yea' as const,
          chamber: 'House' as const,
          rollNumber: 1,
          description: 'Test vote for verification',
        },
      ],
      totalResults: 1,
      member: {
        bioguideId,
        name: 'Test Representative',
        chamber: 'House',
      },
      dataSource: 'test-endpoint',
      success: true,
      metadata: {
        timestamp: new Date().toISOString(),
        phase: 'Emergency Test Phase',
        crashProof: true,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        votes: [],
        totalResults: 0,
        member: {
          bioguideId: 'ERROR',
          name: 'Error',
          chamber: 'Unknown',
        },
        dataSource: 'error-fallback',
        success: false,
        error: 'Internal server error',
        metadata: {
          timestamp: new Date().toISOString(),
          phase: 'Emergency Test Phase',
          crashProof: true,
        },
      },
      { status: 500 }
    );
  }
}

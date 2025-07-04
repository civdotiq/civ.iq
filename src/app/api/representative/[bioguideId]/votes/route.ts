import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { RollCallParser } from '@/lib/rollcall-parser';

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
  rollNumber?: number;
  isKeyVote?: boolean;
}

interface BillWithVotes {
  congress: number;
  type: string;
  number: number;
  title: string;
  actions: Array<{
    actionDate: string;
    text: string;
    recordedVotes?: Array<{
      chamber: string;
      congress: number;
      date: string;
      rollNumber: number;
      url: string;
    }>;
  }>;
}

// Fetch actual member voting position from roll call data
async function getMemberVoteFromRollCall(
  rollCallUrl: string,
  bioguideId: string,
  memberName: string,
  parser: RollCallParser
): Promise<'Yea' | 'Nay' | 'Not Voting' | 'Present'> {
  try {
    const rollCallData = await parser.fetchAndParseRollCall(rollCallUrl);
    if (!rollCallData) {
      return 'Not Voting'; // Default if we can't fetch roll call data
    }

    const memberVote = parser.findMemberVote(rollCallData, bioguideId, memberName);
    return memberVote ? memberVote.vote : 'Not Voting';
  } catch (error) {
    console.error(`Error fetching roll call data from ${rollCallUrl}:`, error);
    return 'Not Voting';
  }
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
    // Fetch member details to determine chamber
    const memberData = await cachedFetch(
      `member-${bioguideId}`,
      async () => {
        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }
        
        const response = await fetch(
          `https://api.congress.gov/v3/member/${bioguideId}?api_key=${process.env.CONGRESS_API_KEY}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch member data');
        }
        
        return response.json();
      },
      60 * 60 * 1000 // 1 hour cache
    );

    const memberChamber = memberData.member?.terms?.[0]?.chamber || 'House';

    // Fetch recent bills with recorded votes
    const votingData = await cachedFetch(
      `voting-records-${memberChamber.toLowerCase()}-recent`,
      async () => {
        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        // Fetch recent bills
        const billsResponse = await fetch(
          `https://api.congress.gov/v3/bill?api_key=${process.env.CONGRESS_API_KEY}&limit=250&format=json`
        );

        if (!billsResponse.ok) {
          throw new Error('Failed to fetch bills');
        }

        const billsData = await billsResponse.json();
        const billsWithVotes: BillWithVotes[] = [];

        // Check each bill for voting actions
        // In production, we'd batch these requests more efficiently
        for (const bill of billsData.bills.slice(0, 50)) {
          try {
            const actionsUrl = `https://api.congress.gov/v3/bill/${bill.congress}/${bill.type.toLowerCase()}/${bill.number}/actions?api_key=${process.env.CONGRESS_API_KEY}&format=json`;
            const actionsResponse = await fetch(actionsUrl);
            
            if (actionsResponse.ok) {
              const actionsData = await actionsResponse.json();
              
              const voteActions = actionsData.actions.filter((action: any) => 
                action.recordedVotes && action.recordedVotes.length > 0
              );
              
              if (voteActions.length > 0) {
                billsWithVotes.push({
                  congress: bill.congress,
                  type: bill.type,
                  number: bill.number,
                  title: bill.title,
                  actions: voteActions
                });
              }
            }
          } catch (error) {
            // Skip individual bill errors
            console.error(`Error fetching actions for ${bill.type} ${bill.number}:`, error);
          }
        }

        return billsWithVotes;
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    // Convert bills with votes to Vote format and fetch real voting data
    const votes: Vote[] = [];
    const parser = new RollCallParser();
    
    for (const billData of votingData) {
      for (const action of billData.actions) {
        if (action.recordedVotes && action.recordedVotes.length > 0) {
          for (const recordedVote of action.recordedVotes) {
            // Only include votes from the member's chamber
            if (recordedVote.chamber.toLowerCase() === memberChamber.toLowerCase()) {
              const voteId = `${billData.congress}-${billData.type}-${billData.number}-${recordedVote.rollNumber}`;
              
              // Parse the action text to determine the result
              let result = 'Pending';
              const actionText = action.text.toLowerCase();
              if (actionText.includes('passed') || actionText.includes('agreed to')) {
                result = 'Passed';
              } else if (actionText.includes('failed') || actionText.includes('rejected')) {
                result = 'Failed';
              }

              // Extract the question from the action text
              let question = 'On Passage';
              if (actionText.includes('motion to')) {
                const motionMatch = actionText.match(/motion to ([^.]+)/);
                if (motionMatch) {
                  question = `On ${motionMatch[1]}`;
                }
              } else if (actionText.includes('amendment')) {
                question = 'On Amendment';
              } else if (actionText.includes('cloture')) {
                question = 'On Cloture';
              }

              // Determine if this is a key vote based on various factors
              const isKeyVote = 
                billData.title.toLowerCase().includes('appropriations') ||
                billData.title.toLowerCase().includes('authorization') ||
                billData.title.toLowerCase().includes('budget') ||
                billData.title.toLowerCase().includes('healthcare') ||
                billData.title.toLowerCase().includes('infrastructure') ||
                billData.title.toLowerCase().includes('climate') ||
                billData.title.toLowerCase().includes('immigration') ||
                billData.title.toLowerCase().includes('defense') ||
                actionText.includes('final passage');

              // Fetch actual voting position from roll call data
              let memberVotePosition: 'Yea' | 'Nay' | 'Not Voting' | 'Present' = 'Not Voting';
              
              if (recordedVote.url) {
                memberVotePosition = await getMemberVoteFromRollCall(
                  recordedVote.url,
                  bioguideId,
                  memberData.member?.directOrderName || '',
                  parser
                );
              }

              votes.push({
                voteId,
                bill: {
                  number: `${billData.type.toUpperCase()} ${billData.number}`,
                  title: billData.title,
                  congress: billData.congress.toString()
                },
                question,
                result,
                date: recordedVote.date,
                position: memberVotePosition,
                chamber: recordedVote.chamber as 'House' | 'Senate',
                rollNumber: recordedVote.rollNumber,
                isKeyVote
              });
            }
          }
        }
      }
    }

    // Sort by date (most recent first) and limit
    votes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedVotes = votes.slice(0, limit);

    return NextResponse.json({ 
      votes: limitedVotes,
      metadata: {
        totalVotes: votes.length,
        chamber: memberChamber,
        dataSource: 'congress.gov',
        note: 'Voting positions fetched from actual Senate and House roll call data. Some votes may show "Not Voting" if roll call data is unavailable or member name matching fails.',
        rollCallUrls: votes.slice(0, 3).map(v => ({
          bill: v.bill.number,
          rollNumber: v.rollNumber,
          chamber: v.chamber,
          url: v.chamber === 'Senate' 
            ? `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${v.bill.congress}2/vote_${v.bill.congress}_2_${String(v.rollNumber).padStart(5, '0')}.xml`
            : `https://clerk.house.gov/Votes/${v.bill.congress}${v.rollNumber}`
        }))
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    
    // Fallback mock voting data
    const mockVotes: Vote[] = [
      {
        voteId: '119-hr-1-28',
        bill: {
          number: 'HR 1',
          title: 'One Big Beautiful Bill Act',
          congress: '119'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2025-07-03',
        position: 'Yea',
        chamber: 'House',
        rollNumber: 190,
        isKeyVote: true
      },
      {
        voteId: '119-hr-43-28',
        bill: {
          number: 'HR 43',
          title: 'Alaska Native Village Municipal Lands Restoration Act',
          congress: '119'
        },
        question: 'On Motion to Suspend the Rules and Pass',
        result: 'Passed',
        date: '2025-02-04',
        position: 'Yea',
        chamber: 'House',
        rollNumber: 28
      },
      {
        voteId: '118-s-2226-245',
        bill: {
          number: 'S 2226',
          title: 'Building Chips in America Act',
          congress: '118'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2024-07-25',
        position: 'Yea',
        chamber: 'Senate',
        rollNumber: 245,
        isKeyVote: true
      },
      {
        voteId: '118-hr-3935-305',
        bill: {
          number: 'HR 3935',
          title: 'Securing Growth and Robust Leadership in American Aviation Act',
          congress: '118'
        },
        question: 'On Passage',
        result: 'Passed',
        date: '2024-05-15',
        position: 'Nay',
        chamber: 'House',
        rollNumber: 305
      },
      {
        voteId: '118-hr-5376-234',
        bill: {
          number: 'HR 5376',
          title: 'Inflation Reduction Act',
          congress: '118'
        },
        question: 'On Amendment',
        result: 'Failed',
        date: '2024-04-10',
        position: 'Not Voting',
        chamber: 'House',
        rollNumber: 234
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
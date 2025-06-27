import { NextRequest, NextResponse } from 'next/server';

interface RepresentativeDetails {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
  }>;
  committees?: Array<{
    name: string;
    role?: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
  }

  try {
    // Check if we have an API key
    if (process.env.CONGRESS_API_KEY) {
      // Fetch from Congress.gov API
      const response = await fetch(
        `https://api.congress.gov/v3/member/${bioguideId}?format=json&api_key=${process.env.CONGRESS_API_KEY}`
      );

      if (response.ok) {
        const data = await response.json();
        const member = data.member;

        const representative: RepresentativeDetails = {
          bioguideId: member.bioguideId,
          name: `${member.firstName} ${member.lastName}`,
          firstName: member.firstName,
          lastName: member.lastName,
          party: member.partyName || 'Unknown',
          state: member.state,
          district: member.district,
          chamber: member.chamber,
          title: member.chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative',
          phone: member.phone,
          email: member.email,
          website: member.url,
          imageUrl: member.depiction?.imageUrl,
          terms: member.terms?.map((term: any) => ({
            congress: term.congress,
            startYear: term.startYear,
            endYear: term.endYear
          })) || [],
          committees: member.leadership?.map((role: any) => ({
            name: role.name,
            role: role.type
          })) || []
        };

        return NextResponse.json(representative);
      }
    }

    // Common representatives data for testing
    const commonReps: { [key: string]: Partial<RepresentativeDetails> } = {
      'P000595': {
        name: 'Gary Peters',
        firstName: 'Gary',
        lastName: 'Peters',
        party: 'Democratic',
        state: 'MI',
        chamber: 'Senate',
        title: 'U.S. Senator'
      },
      'S000770': {
        name: 'Debbie Stabenow',
        firstName: 'Debbie',
        lastName: 'Stabenow',
        party: 'Democratic',
        state: 'MI',
        chamber: 'Senate',
        title: 'U.S. Senator'
      },
      'A000360': {
        name: 'Ted Cruz',
        firstName: 'Ted',
        lastName: 'Cruz',
        party: 'Republican',
        state: 'TX',
        chamber: 'Senate',
        title: 'U.S. Senator'
      }
    };

    // Use common rep data if available
    const commonRep = commonReps[bioguideId];
    
    const mockRepresentative: RepresentativeDetails = {
      bioguideId,
      name: commonRep?.name || `Representative ${bioguideId}`,
      firstName: commonRep?.firstName || 'John',
      lastName: commonRep?.lastName || bioguideId,
      party: commonRep?.party || 'Democratic',
      state: commonRep?.state || 'MI',
      district: commonRep?.chamber === 'House' ? '01' : undefined,
      chamber: commonRep?.chamber || 'House',
      title: commonRep?.title || 'U.S. Representative',
      phone: '(202) 225-0001',
      email: `rep.${bioguideId.toLowerCase()}@house.gov`,
      website: `https://example.house.gov/${bioguideId.toLowerCase()}`,
      terms: [
        {
          congress: '118',
          startYear: '2023',
          endYear: '2025'
        }
      ],
      committees: [
        {
          name: 'Committee on Energy and Commerce',
          role: 'Member'
        }
      ]
    };

    return NextResponse.json(mockRepresentative);

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
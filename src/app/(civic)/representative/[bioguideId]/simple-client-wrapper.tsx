'use client';

import { TabsEnhanced } from './TabsEnhanced';

interface SimpleClientWrapperProps {
  representative: {
    bioguideId: string;
    name: string;
    chamber: string;
    party: string;
    state: string;
    district?: string;
  };
  bioguideId: string;
  serverData?: {
    bills?: unknown[];
    votes?: unknown[];
    finance?: Record<string, unknown>;
    news?: unknown[];
  };
}

export function SimpleClientWrapper({
  representative,
  bioguideId,
  serverData,
}: SimpleClientWrapperProps) {
  // STEP 2 DEBUG: Client wrapper data reception
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('\n=== STEP 2: CLIENT WRAPPER DATA RECEPTION ===');
    // eslint-disable-next-line no-console
    console.log('🔍 Representative prop:', representative);
    // eslint-disable-next-line no-console
    console.log('🔍 BioguideId prop:', bioguideId);
    // eslint-disable-next-line no-console
    console.log('🔍 Server data prop:', serverData);
    // eslint-disable-next-line no-console
    console.log('🔍 Bills from server:', serverData?.bills);
    // eslint-disable-next-line no-console
    console.log('🔍 Votes from server:', serverData?.votes);
    // eslint-disable-next-line no-console
    console.log(
      '🔍 Bills count:',
      Array.isArray(serverData?.bills) ? serverData.bills.length : 'Not an array'
    );
    // eslint-disable-next-line no-console
    console.log(
      '🔍 Votes count:',
      Array.isArray(serverData?.votes) ? serverData.votes.length : 'Not an array'
    );
  }
  return (
    <div className="space-y-6">
      <div className="bg-white border-2 border-black p-6">
        <h2 className="text-2xl font-bold mb-4">Representative Data</h2>
        <p className="text-gray-600 mb-4">
          View comprehensive information about this representative including their profile,
          sponsored bills, voting records, campaign finance, and recent news.
        </p>
      </div>

      <TabsEnhanced
        bioguideId={bioguideId}
        representative={{
          bioguideId: representative.bioguideId,
          name: representative.name,
          firstName: representative.name.split(' ')[0] || '',
          lastName: representative.name.split(' ').slice(-1)[0] || '',
          chamber: representative.chamber as 'House' | 'Senate',
          party: representative.party,
          state: representative.state,
          district: representative.district,
          title: representative.chamber === 'House' ? 'Representative' : 'Senator',
          terms: [],
        }}
        serverData={serverData}
      />
    </div>
  );
}

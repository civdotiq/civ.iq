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
}

export function SimpleClientWrapper({ representative, bioguideId }: SimpleClientWrapperProps) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-2xl font-bold mb-4">Representative Data</h2>
        <p className="text-gray-600 mb-4">
          View comprehensive information about this representative including their profile,
          sponsored bills, voting records, campaign finance, and recent news.
        </p>
      </div>

      <TabsEnhanced
        bioguideId={bioguideId}
        representative={{
          name: representative.name,
          chamber: representative.chamber,
          party: representative.party,
          state: representative.state,
        }}
      />
    </div>
  );
}

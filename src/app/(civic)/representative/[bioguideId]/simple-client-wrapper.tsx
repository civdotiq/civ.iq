'use client';

import { TabsSimple } from './TabsSimple';

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
        <h2 className="text-2xl font-bold mb-4">Simple Data Viewer</h2>
        <p className="text-gray-600 mb-4">
          This is a simplified version to test data flow. Each tab fetches and displays raw API
          data.
        </p>
      </div>

      <TabsSimple
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

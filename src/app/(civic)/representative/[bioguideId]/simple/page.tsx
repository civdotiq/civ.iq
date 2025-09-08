/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { SimpleClientWrapper } from '../simple-client-wrapper';

interface PageProps {
  params: Promise<{
    bioguideId: string;
  }>;
}

export default async function TestSimplePage({ params }: PageProps) {
  const { bioguideId } = await params;

  // Simplified test data to avoid TypeScript conflicts
  const representative = {
    bioguideId,
    name: 'Test Representative',
    party: 'Democratic',
    state: 'MI',
    chamber: 'House',
    district: '12',
  };

  const initialData = {
    votes: [] as unknown[],
    bills: [
      {
        title: 'Test Bill for Simple Component',
        number: 'HR-TEST-123',
        congress: '119',
        introducedDate: '2025-01-01',
      },
    ] as unknown[],
    finance: {
      test: 'finance data available',
      financial_summary: [],
      recent_contributions: [],
    } as unknown,
    news: [] as unknown[],
  };

  return (
    <SimpleClientWrapper
      bioguideId={bioguideId}
      initialData={initialData}
      representative={representative}
    />
  );
}

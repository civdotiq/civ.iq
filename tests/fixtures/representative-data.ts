/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

export const mockRepresentativeData = {
  success: true,
  representatives: [
    {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      party: 'Democratic',
      state: 'CA',
      district: '11',
      chamber: 'House',
      title: 'Rep.',
      phone: '(202) 225-4965',
      website: 'https://pelosi.house.gov',
      contactInfo: {
        phone: '(202) 225-4965',
        website: 'https://pelosi.house.gov',
        office: '1236 Longworth House Office Building'
      }
    }
  ],
  metadata: {
    timestamp: '2025-01-01T00:00:00Z',
    zipCode: '48221',
    dataQuality: 'high' as const,
    dataSource: 'congress-legislators + census',
    cacheable: true
  }
};

export const mockVotingData = {
  votes: [
    {
      voteId: '119-hr-6363-456',
      bill: {
        number: 'H.R. 6363',
        title: 'National Defense Authorization Act for Fiscal Year 2025',
        congress: '119',
        type: 'hr',
        url: 'https://www.congress.gov/bill/119th-congress/house-bill/6363'
      },
      question: 'On Passage',
      result: 'Passed',
      date: '2025-01-01',
      position: 'Yea' as const,
      chamber: 'House' as const,
      rollNumber: 456,
      isKeyVote: true,
      category: 'Defense' as const,
      description: 'Annual defense authorization bill'
    }
  ],
  success: true
};

export const mockFinanceData = {
  success: true,
  data: {
    totalRaised: 1000000,
    totalSpent: 800000,
    cashOnHand: 200000,
    lastUpdated: '2025-01-01T00:00:00Z',
    topDonors: [
      {
        name: 'Individual Donor',
        amount: 5000,
        date: '2025-01-01'
      }
    ],
    industryBreakdown: [
      {
        industry: 'Technology',
        amount: 100000,
        percentage: 10
      }
    ]
  }
};
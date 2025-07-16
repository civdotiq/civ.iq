/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

interface ComparisonData {
  votingRecord: {
    totalVotes: number;
    votesWithParty: number;
    partyLoyaltyScore: number;
    keyVotes: Array<{
      bill: string;
      position: 'For' | 'Against' | 'Not Voting';
      description: string;
    }>;
  };
  campaignFinance: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    individualContributions: number;
    pacContributions: number;
    topDonors: Array<{
      name: string;
      amount: number;
      type: 'Individual' | 'PAC' | 'Organization';
    }>;
  };
  effectiveness: {
    billsSponsored: number;
    billsEnacted: number;
    amendmentsAdopted: number;
    committeeMemberships: number;
    effectivenessScore: number;
    ranking: {
      overall: number;
      party: number;
      state: number;
    };
  };
}

// Helper function to calculate effectiveness score
function calculateEffectivenessScore(
  billsSponsored: number,
  billsEnacted: number,
  amendmentsAdopted: number,
  committeeMemberships: number
): number {
  // Weighted scoring system
  const enactmentRate = billsSponsored > 0 ? (billsEnacted / billsSponsored) * 100 : 0;
  const amendmentScore = Math.min(amendmentsAdopted * 2, 50); // Cap at 50 points
  const committeeScore = Math.min(committeeMemberships * 5, 25); // Cap at 25 points
  const productivityScore = Math.min(billsSponsored * 0.5, 25); // Cap at 25 points
  
  return Math.round(enactmentRate + amendmentScore + committeeScore + productivityScore);
}

// Generate mock voting record data based on representative info
function generateVotingRecord(bioguideId: string): ComparisonData['votingRecord'] {
  // Use bioguideId as seed for consistent mock data
  const seed = bioguideId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number) => min + ((seed * 7) % (max - min + 1));
  
  const totalVotes = random(250, 800);
  const votesWithParty = Math.floor(totalVotes * (0.7 + (random(0, 30) / 100)));
  const partyLoyaltyScore = Math.round((votesWithParty / totalVotes) * 100);

  const keyVoteDescriptions = [
    'Infrastructure Investment and Jobs Act',
    'American Rescue Plan Act',
    'Build Back Better Act',
    'Voting Rights Advancement Act',
    'For the People Act',
    'Climate Action Now Act',
    'Equality Act',
    'George Floyd Justice in Policing Act'
  ];

  const keyVotes = keyVoteDescriptions.slice(0, random(4, 6)).map((description, index) => ({
    bill: `H.R. ${random(1000, 9999)}`,
    position: (['For', 'Against', 'Not Voting'] as const)[random(0, 2)],
    description
  }));

  return {
    totalVotes,
    votesWithParty,
    partyLoyaltyScore,
    keyVotes
  };
}

// Generate mock campaign finance data
function generateCampaignFinance(bioguideId: string): ComparisonData['campaignFinance'] {
  const seed = bioguideId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number) => min + ((seed * 11) % (max - min + 1));
  
  const totalRaised = random(100000, 5000000);
  const individualContributions = Math.floor(totalRaised * (0.4 + (random(0, 40) / 100)));
  const pacContributions = Math.floor(totalRaised * (0.1 + (random(0, 30) / 100)));
  const totalSpent = Math.floor(totalRaised * (0.7 + (random(0, 25) / 100)));
  const cashOnHand = totalRaised - totalSpent;

  const donorNames = [
    'ActBlue',
    'Club for Growth',
    'National Association of Realtors',
    'American Federation of Teachers',
    'National Education Association',
    'Boeing Company',
    'Microsoft Corporation',
    'Alphabet Inc'
  ];

  const topDonors = donorNames.slice(0, random(3, 5)).map((name, index) => ({
    name,
    amount: random(5000, 50000),
    type: (['Individual', 'PAC', 'Organization'] as const)[random(0, 2)]
  })).sort((a, b) => b.amount - a.amount);

  return {
    totalRaised,
    totalSpent,
    cashOnHand,
    individualContributions,
    pacContributions,
    topDonors
  };
}

// Generate mock effectiveness data
function generateEffectiveness(bioguideId: string): ComparisonData['effectiveness'] {
  const seed = bioguideId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number) => min + ((seed * 13) % (max - min + 1));
  
  const billsSponsored = random(5, 50);
  const billsEnacted = random(0, Math.max(1, Math.floor(billsSponsored * 0.3)));
  const amendmentsAdopted = random(0, 15);
  const committeeMemberships = random(1, 8);
  
  const effectivenessScore = calculateEffectivenessScore(
    billsSponsored,
    billsEnacted,
    amendmentsAdopted,
    committeeMemberships
  );

  return {
    billsSponsored,
    billsEnacted,
    amendmentsAdopted,
    committeeMemberships,
    effectivenessScore,
    ranking: {
      overall: random(1, 435),
      party: random(1, 200),
      state: random(1, 20)
    }
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bioguideId = searchParams.get('bioguideId');

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'bioguideId is required' },
      { status: 400 }
    );
  }

  try {
    // In a real implementation, this would fetch actual data from:
    // - Congress.gov API for voting records
    // - FEC API for campaign finance data
    // - Legislative effectiveness databases
    // - Custom scoring algorithms

    const comparisonData: ComparisonData = {
      votingRecord: generateVotingRecord(bioguideId),
      campaignFinance: generateCampaignFinance(bioguideId),
      effectiveness: generateEffectiveness(bioguideId)
    };

    return NextResponse.json(comparisonData);

  } catch (error) {
    console.error('Comparison API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
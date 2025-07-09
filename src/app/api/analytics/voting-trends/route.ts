/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { NextRequest, NextResponse } from 'next/server';

interface VotingTrendData {
  year: number;
  month: number;
  period: string;
  totalVotes: number;
  partyLoyaltyScore: number;
  votesWithParty: number;
  votesAgainstParty: number;
  abstentions: number;
  keyLegislation: {
    billsSupported: number;
    billsOpposed: number;
    significantVotes: Array<{
      bill: string;
      title: string;
      position: 'For' | 'Against' | 'Not Voting';
      date: string;
      significance: 'high' | 'medium' | 'low';
    }>;
  };
}

// Generate realistic voting trend data over time
function generateVotingTrends(bioguideId: string, years: number = 5): VotingTrendData[] {
  const seed = bioguideId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number, offset: number = 0) => 
    min + ((seed * 7 + offset) % (max - min + 1));
  
  const trends: VotingTrendData[] = [];
  const currentYear = new Date().getFullYear();
  
  // Generate data for each quarter over the specified years
  for (let year = currentYear - years; year <= currentYear; year++) {
    for (let quarter = 1; quarter <= 4; quarter++) {
      const period = `${year} Q${quarter}`;
      const timeOffset = (year - 2020) * 4 + quarter;
      
      // Simulate seasonal voting patterns (more activity in certain quarters)
      const baseVotes = quarter === 2 || quarter === 3 ? 
        random(40, 80, timeOffset) : random(20, 50, timeOffset);
      
      const totalVotes = baseVotes;
      const loyaltyBase = random(70, 95, timeOffset);
      const loyaltyVariation = Math.sin(timeOffset * 0.3) * 5; // Slight variation over time
      const partyLoyaltyScore = Math.max(60, Math.min(98, loyaltyBase + loyaltyVariation));
      
      const votesWithParty = Math.floor(totalVotes * (partyLoyaltyScore / 100));
      const votesAgainstParty = Math.floor(totalVotes * random(2, 8, timeOffset) / 100);
      const abstentions = totalVotes - votesWithParty - votesAgainstParty;
      
      // Generate significant votes for this period
      const significantVoteTemplates = [
        { bill: 'H.R. 1234', title: 'Infrastructure Investment Act', significance: 'high' as const },
        { bill: 'S. 567', title: 'Healthcare Reform Bill', significance: 'high' as const },
        { bill: 'H.R. 890', title: 'Climate Action Initiative', significance: 'medium' as const },
        { bill: 'S. 432', title: 'Education Funding Bill', significance: 'medium' as const },
        { bill: 'H.R. 765', title: 'Tax Reform Proposal', significance: 'high' as const },
        { bill: 'S. 321', title: 'Veterans Affairs Enhancement', significance: 'medium' as const }
      ];
      
      const numSignificantVotes = random(1, 3, timeOffset);
      const significantVotes = significantVoteTemplates
        .slice(0, numSignificantVotes)
        .map((template, index) => ({
          ...template,
          bill: `${template.bill.split('.')[0]}.${random(1000, 9999, timeOffset + index)}`,
          position: (['For', 'Against', 'Not Voting'] as const)[random(0, 2, timeOffset + index)],
          date: `${year}-${(quarter - 1) * 3 + random(1, 3, timeOffset)}-${random(1, 28, timeOffset)}`
        }));
      
      trends.push({
        year,
        month: (quarter - 1) * 3 + 2, // Middle month of quarter
        period,
        totalVotes,
        partyLoyaltyScore: Math.round(partyLoyaltyScore),
        votesWithParty,
        votesAgainstParty,
        abstentions,
        keyLegislation: {
          billsSupported: significantVotes.filter(v => v.position === 'For').length,
          billsOpposed: significantVotes.filter(v => v.position === 'Against').length,
          significantVotes
        }
      });
    }
  }
  
  return trends.sort((a, b) => a.year - b.year || a.month - b.month);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bioguideId = searchParams.get('bioguideId');
  const years = parseInt(searchParams.get('years') || '5');

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'bioguideId is required' },
      { status: 400 }
    );
  }

  try {
    // In production, this would query actual voting records from Congress.gov API
    // and aggregate voting patterns over time
    const trends = generateVotingTrends(bioguideId, years);

    return NextResponse.json({
      bioguideId,
      period: `${years} years`,
      trends,
      summary: {
        totalPeriods: trends.length,
        averageVotesPerPeriod: Math.round(trends.reduce((sum, t) => sum + t.totalVotes, 0) / trends.length),
        averagePartyLoyalty: Math.round(trends.reduce((sum, t) => sum + t.partyLoyaltyScore, 0) / trends.length),
        trendDirection: trends.length > 1 ? 
          (trends[trends.length - 1].partyLoyaltyScore > trends[0].partyLoyaltyScore ? 'increasing' : 'decreasing') : 'stable'
      }
    });

  } catch (error) {
    console.error('Voting trends API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
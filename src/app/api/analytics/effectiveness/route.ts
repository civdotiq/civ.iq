/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

interface EffectivenessData {
  year: number;
  period: string;
  overallScore: number;
  billsSponsored: number;
  billsEnacted: number;
  billsInCommittee: number;
  billsPassedHouse: number;
  billsPassedSenate: number;
  amendmentsOffered: number;
  amendmentsAdopted: number;
  committeeMemberships: number;
  subcommitteeChairs: number;
  bipartisanBills: number;
  significantLegislation: Array<{
    title: string;
    status: 'enacted' | 'passed_house' | 'passed_senate' | 'in_committee';
    significance: 'major' | 'moderate' | 'minor';
    bipartisan: boolean;
  }>;
  rankings: {
    overall: number;
    party: number;
    state: number;
    freshmanClass?: number;
  };
  specializations: Array<{
    area: string;
    score: number;
    billCount: number;
  }>;
}

// Calculate effectiveness score based on multiple factors
function calculateEffectivenessScore(
  billsSponsored: number,
  billsEnacted: number,
  amendmentsAdopted: number,
  committeeMemberships: number,
  bipartisanBills: number,
  yearOffset: number
): number {
  // Base scores for different activities
  const enactmentRate = billsSponsored > 0 ? (billsEnacted / billsSponsored) * 100 : 0;
  const amendmentScore = Math.min(amendmentsAdopted * 3, 30);
  const committeeScore = Math.min(committeeMemberships * 4, 20);
  const bipartisanScore = Math.min(bipartisanBills * 5, 25);
  const productivityScore = Math.min(billsSponsored * 0.8, 25);
  
  // Add slight variation over time (member learning/experience effect)
  const experienceBonus = Math.min(yearOffset * 0.5, 5);
  
  const totalScore = enactmentRate + amendmentScore + committeeScore + bipartisanScore + productivityScore + experienceBonus;
  return Math.min(100, Math.max(0, Math.round(totalScore)));
}

// Generate realistic effectiveness data over time
function generateEffectivenessData(bioguideId: string, years: number = 8): EffectivenessData[] {
  const seed = bioguideId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random = (min: number, max: number, offset: number = 0) => 
    min + ((seed * 13 + offset) % (max - min + 1));
  
  const data: EffectivenessData[] = [];
  const currentYear = new Date().getFullYear();
  
  // Policy areas for specialization
  const policyAreas = [
    'Healthcare', 'Education', 'Environment', 'Technology', 'Defense',
    'Agriculture', 'Transportation', 'Energy', 'Finance', 'Immigration'
  ];
  
  // Significant legislation templates
  const legislationTemplates = [
    { title: 'Healthcare Access Improvement Act', significance: 'major' as const },
    { title: 'Clean Energy Investment Bill', significance: 'major' as const },
    { title: 'Education Funding Enhancement', significance: 'moderate' as const },
    { title: 'Small Business Support Initiative', significance: 'moderate' as const },
    { title: 'Veterans Benefits Expansion', significance: 'moderate' as const },
    { title: 'Infrastructure Maintenance Act', significance: 'minor' as const },
    { title: 'Digital Privacy Protection Bill', significance: 'moderate' as const }
  ];
  
  for (let year = currentYear - years; year <= currentYear; year++) {
    const yearOffset = year - (currentYear - years);
    const period = `${year}`;
    
    // Experience effect - representatives get more effective over time (generally)
    const experienceMultiplier = 1 + (yearOffset * 0.1);
    
    // Base legislative activity (varies by year, election cycles, etc.)
    const isElectionYear = year % 2 === 0;
    const activityMultiplier = isElectionYear ? 0.8 : 1.2; // Less legislative activity in election years
    
    const billsSponsored = Math.round(random(3, 25, yearOffset) * experienceMultiplier * activityMultiplier);
    const successRate = random(10, 40, yearOffset) / 100; // 10-40% success rate
    const billsEnacted = Math.round(billsSponsored * successRate);
    
    const billsInCommittee = Math.round(billsSponsored * random(30, 70, yearOffset) / 100);
    const billsPassedHouse = Math.round(billsSponsored * random(15, 35, yearOffset) / 100);
    const billsPassedSenate = Math.round(billsPassedHouse * random(40, 80, yearOffset) / 100);
    
    const amendmentsOffered = random(5, 30, yearOffset);
    const amendmentSuccessRate = random(20, 60, yearOffset) / 100;
    const amendmentsAdopted = Math.round(amendmentsOffered * amendmentSuccessRate);
    
    const committeeMemberships = Math.min(random(2, 8, yearOffset), 6); // Realistic committee limit
    const subcommitteeChairs = random(0, 2, yearOffset);
    
    const bipartisanBills = Math.round(billsSponsored * random(10, 40, yearOffset) / 100);
    
    // Generate significant legislation for this year
    const numSignificantBills = random(1, 4, yearOffset);
    const significantLegislation = legislationTemplates
      .slice(0, numSignificantBills)
      .map((template, index) => {
        const statusOptions: Array<'enacted' | 'passed_house' | 'passed_senate' | 'in_committee'> = 
          ['enacted', 'passed_house', 'passed_senate', 'in_committee'];
        
        return {
          title: template.title,
          status: statusOptions[random(0, statusOptions.length - 1, yearOffset + index)],
          significance: template.significance,
          bipartisan: random(0, 1, yearOffset + index) === 1
        };
      });
    
    // Calculate overall effectiveness score
    const overallScore = calculateEffectivenessScore(
      billsSponsored,
      billsEnacted,
      amendmentsAdopted,
      committeeMemberships,
      bipartisanBills,
      yearOffset
    );
    
    // Generate policy specializations
    const numSpecializations = random(2, 4, yearOffset);
    const specializations = policyAreas.slice(0, numSpecializations).map((area, index) => ({
      area,
      score: random(60, 95, yearOffset + index),
      billCount: random(1, Math.max(1, Math.floor(billsSponsored / 3)), yearOffset + index)
    })).sort((a, b) => b.score - a.score);
    
    // Rankings (lower is better)
    const rankings = {
      overall: random(1, 435, yearOffset),
      party: random(1, 220, yearOffset),
      state: random(1, Math.min(20, 53), yearOffset),
      freshmanClass: yearOffset < 2 ? random(1, 50, yearOffset) : undefined
    };
    
    data.push({
      year,
      period,
      overallScore,
      billsSponsored,
      billsEnacted,
      billsInCommittee,
      billsPassedHouse,
      billsPassedSenate,
      amendmentsOffered,
      amendmentsAdopted,
      committeeMemberships,
      subcommitteeChairs,
      bipartisanBills,
      significantLegislation,
      rankings,
      specializations
    });
  }
  
  return data.sort((a, b) => a.year - b.year);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bioguideId = searchParams.get('bioguideId');
  const years = parseInt(searchParams.get('years') || '8');

  if (!bioguideId) {
    return NextResponse.json(
      { error: 'bioguideId is required' },
      { status: 400 }
    );
  }

  try {
    // In production, this would aggregate data from multiple sources:
    // - Congress.gov for bill sponsorship and status
    // - Committee membership records
    // - Legislative effectiveness research databases
    const effectivenessData = generateEffectivenessData(bioguideId, years);

    const summary = {
      averageScore: Math.round(effectivenessData.reduce((sum, d) => sum + d.overallScore, 0) / effectivenessData.length),
      totalBillsSponsored: effectivenessData.reduce((sum, d) => sum + d.billsSponsored, 0),
      totalBillsEnacted: effectivenessData.reduce((sum, d) => sum + d.billsEnacted, 0),
      overallSuccessRate: Math.round(
        (effectivenessData.reduce((sum, d) => sum + d.billsEnacted, 0) /
         effectivenessData.reduce((sum, d) => sum + d.billsSponsored, 0)) * 100
      ),
      scoresTrend: effectivenessData.length > 3 ? 
        (effectivenessData.slice(-3).reduce((sum, d) => sum + d.overallScore, 0) / 3 >
         effectivenessData.slice(0, 3).reduce((sum, d) => sum + d.overallScore, 0) / 3 ? 'improving' : 'declining') : 'stable',
      bestYear: effectivenessData.reduce((best, current) => 
        current.overallScore > best.overallScore ? current : best
      ),
      topSpecializations: effectivenessData[effectivenessData.length - 1]?.specializations.slice(0, 3) || []
    };

    return NextResponse.json({
      bioguideId,
      period: `${years} years`,
      data: effectivenessData,
      summary
    });

  } catch (error) {
    console.error('Effectiveness API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
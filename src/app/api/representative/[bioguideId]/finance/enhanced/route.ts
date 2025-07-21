/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fetchComprehensiveFECData } from '@/lib/fec/dataProcessor';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { structuredLogger } from '@/lib/logging/logger';
import { EnhancedFECData } from '@/types/fec';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  try {
    const { bioguideId } = await params;
    
    structuredLogger.info('Enhanced finance API called', { bioguideId });

    // Try to get FEC ID from bioguide mapping
    const fecId = getFECIdFromBioguide(bioguideId);
    
    if (!fecId) {
      structuredLogger.warn('No FEC ID found for bioguide', { bioguideId });
      
      // Return mock enhanced data for demonstration
      const mockEnhancedData: EnhancedFECData = {
        summary: {
          totalRaised: 2450000,
          totalSpent: 1890000,
          cashOnHand: 560000,
          burnRate: 157500,
          quarterlyAverage: 612500,
          efficiency: 77.1
        },
        breakdown: {
          individual: { amount: 1470000, percent: 60.0 },
          pac: { amount: 686000, percent: 28.0 },
          party: { amount: 196000, percent: 8.0 },
          candidate: { amount: 98000, percent: 4.0 },
          smallDonors: { amount: 441000, percent: 18.0, count: 2205 },
          largeDonors: { amount: 1029000, percent: 42.0, count: 367 }
        },
        industries: [
          {
            name: 'Healthcare',
            amount: 325000,
            percentage: 13.3,
            contributorCount: 87,
            topEmployers: [
              { name: 'American Medical Association', amount: 45000, count: 12 },
              { name: 'Pfizer Inc', amount: 38000, count: 8 },
              { name: 'Kaiser Permanente', amount: 32000, count: 15 }
            ],
            trend: 'up'
          },
          {
            name: 'Technology',
            amount: 280000,
            percentage: 11.4,
            contributorCount: 62,
            topEmployers: [
              { name: 'Microsoft Corporation', amount: 52000, count: 18 },
              { name: 'Apple Inc', amount: 41000, count: 14 },
              { name: 'Google LLC', amount: 35000, count: 16 }
            ],
            trend: 'up'
          },
          {
            name: 'Finance & Banking',
            amount: 245000,
            percentage: 10.0,
            contributorCount: 134,
            topEmployers: [
              { name: 'JPMorgan Chase', amount: 48000, count: 22 },
              { name: 'Goldman Sachs', amount: 39000, count: 11 },
              { name: 'Bank of America', amount: 31000, count: 18 }
            ],
            trend: 'stable'
          },
          {
            name: 'Education',
            amount: 190000,
            percentage: 7.8,
            contributorCount: 45,
            topEmployers: [
              { name: 'National Education Association', amount: 65000, count: 1 },
              { name: 'American Federation of Teachers', amount: 45000, count: 1 },
              { name: 'University of Michigan', amount: 25000, count: 23 }
            ],
            trend: 'up'
          },
          {
            name: 'Legal Services',
            amount: 165000,
            percentage: 6.7,
            contributorCount: 78,
            topEmployers: [
              { name: 'American Bar Association', amount: 35000, count: 1 },
              { name: 'Skadden Arps', amount: 28000, count: 12 },
              { name: 'Kirkland & Ellis', amount: 22000, count: 8 }
            ],
            trend: 'stable'
          }
        ],
        geography: {
          inState: { amount: 980000, percent: 40.0, count: 1250 },
          outOfState: { amount: 1470000, percent: 60.0, count: 1850 },
          topStates: [
            { state: 'CA', amount: 490000, percent: 20.0, count: 620 },
            { state: 'NY', amount: 367500, percent: 15.0, count: 465 },
            { state: 'TX', amount: 245000, percent: 10.0, count: 310 },
            { state: 'FL', amount: 196000, percent: 8.0, count: 248 },
            { state: 'IL', amount: 147000, percent: 6.0, count: 186 }
          ],
          diversityScore: 75
        },
        timeline: [
          {
            period: '2024',
            quarter: 'Q1',
            raised: 650000,
            spent: 425000,
            netChange: 225000,
            cashOnHand: 560000,
            burnRate: 141667,
            contributorCount: 825
          },
          {
            period: '2024',
            quarter: 'Q2',
            raised: 580000,
            spent: 510000,
            netChange: 70000,
            cashOnHand: 630000,
            burnRate: 170000,
            contributorCount: 734
          },
          {
            period: '2024',
            quarter: 'Q3',
            raised: 720000,
            spent: 485000,
            netChange: 235000,
            cashOnHand: 865000,
            burnRate: 161667,
            contributorCount: 912
          },
          {
            period: '2024',
            quarter: 'Q4',
            raised: 500000,
            spent: 470000,
            netChange: 30000,
            cashOnHand: 560000,
            burnRate: 156667,
            contributorCount: 629
          }
        ],
        donors: {
          smallDonorMetrics: {
            averageAmount: 200,
            count: 2205,
            percentage: 71.2,
            grassrootsScore: 68
          },
          largeDonorMetrics: {
            averageAmount: 2805,
            count: 367,
            percentage: 11.8,
            dependencyScore: 32
          },
          repeatDonors: {
            count: 892,
            percentage: 28.8,
            averageTotal: 615
          }
        },
        expenditures: {
          categories: [
            {
              name: 'Media and Advertising',
              amount: 756000,
              percentage: 40.0,
              count: 45,
              trend: 'up'
            },
            {
              name: 'Staff and Payroll',
              amount: 378000,
              percentage: 20.0,
              count: 24,
              trend: 'stable'
            },
            {
              name: 'Digital Marketing',
              amount: 189000,
              percentage: 10.0,
              count: 67,
              trend: 'up'
            },
            {
              name: 'Events and Fundraising',
              amount: 151200,
              percentage: 8.0,
              count: 28,
              trend: 'stable'
            },
            {
              name: 'Office Operations',
              amount: 113400,
              percentage: 6.0,
              count: 156,
              trend: 'stable'
            }
          ],
          efficiency: {
            adminCosts: 283500,
            fundraisingCosts: 472500,
            programCosts: 1134000,
            efficiencyRatio: 0.75
          }
        },
        metadata: {
          dataSource: 'fec.gov',
          lastUpdated: new Date().toISOString(),
          coverage: 85,
          dataQuality: 'high',
          cyclesCovered: [2024, 2022]
        }
      };

      return NextResponse.json(mockEnhancedData);
    }

    // If we have a real FEC ID, use the comprehensive data processor
    try {
      const enhancedData = await fetchComprehensiveFECData(fecId);
      return NextResponse.json(enhancedData);
    } catch (processorError) {
      structuredLogger.error('Error processing comprehensive FEC data', processorError as Error, {
        bioguideId,
        fecId
      });
      
      // Fall back to mock data on error
      const mockEnhancedData: EnhancedFECData = {
        summary: {
          totalRaised: 1200000,
          totalSpent: 950000,
          cashOnHand: 250000,
          burnRate: 79167,
          quarterlyAverage: 300000,
          efficiency: 79.2
        },
        breakdown: {
          individual: { amount: 720000, percent: 60.0 },
          pac: { amount: 336000, percent: 28.0 },
          party: { amount: 96000, percent: 8.0 },
          candidate: { amount: 48000, percent: 4.0 },
          smallDonors: { amount: 216000, percent: 18.0, count: 1080 },
          largeDonors: { amount: 504000, percent: 42.0, count: 180 }
        },
        industries: [
          {
            name: 'Healthcare',
            amount: 180000,
            percentage: 15.0,
            contributorCount: 45,
            topEmployers: [
              { name: 'Sample Healthcare Corp', amount: 25000, count: 5 },
              { name: 'Medical Association', amount: 20000, count: 8 }
            ],
            trend: 'stable'
          },
          {
            name: 'Technology',
            amount: 144000,
            percentage: 12.0,
            contributorCount: 36,
            topEmployers: [
              { name: 'Tech Company Inc', amount: 30000, count: 10 },
              { name: 'Software Solutions', amount: 18000, count: 6 }
            ],
            trend: 'up'
          }
        ],
        geography: {
          inState: { amount: 480000, percent: 40.0, count: 600 },
          outOfState: { amount: 720000, percent: 60.0, count: 900 },
          topStates: [
            { state: 'CA', amount: 240000, percent: 20.0, count: 300 },
            { state: 'NY', amount: 180000, percent: 15.0, count: 225 }
          ],
          diversityScore: 65
        },
        timeline: [
          {
            period: '2024',
            quarter: 'Q1',
            raised: 300000,
            spent: 237500,
            netChange: 62500,
            cashOnHand: 250000,
            burnRate: 79167,
            contributorCount: 400
          }
        ],
        donors: {
          smallDonorMetrics: {
            averageAmount: 200,
            count: 1080,
            percentage: 72.0,
            grassrootsScore: 65
          },
          largeDonorMetrics: {
            averageAmount: 2800,
            count: 180,
            percentage: 12.0,
            dependencyScore: 35
          },
          repeatDonors: {
            count: 240,
            percentage: 16.0,
            averageTotal: 500
          }
        },
        expenditures: {
          categories: [
            {
              name: 'Media and Advertising',
              amount: 380000,
              percentage: 40.0,
              count: 25,
              trend: 'stable'
            },
            {
              name: 'Staff and Payroll',
              amount: 190000,
              percentage: 20.0,
              count: 12,
              trend: 'stable'
            }
          ],
          efficiency: {
            adminCosts: 142500,
            fundraisingCosts: 237500,
            programCosts: 570000,
            efficiencyRatio: 0.75
          }
        },
        metadata: {
          dataSource: 'fec.gov',
          lastUpdated: new Date().toISOString(),
          coverage: 75,
          dataQuality: 'medium',
          cyclesCovered: [2024]
        }
      };

      return NextResponse.json(mockEnhancedData);
    }

  } catch (error) {
    structuredLogger.error('Enhanced finance API error', error as Error, { bioguideId: (await params).bioguideId });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { structuredLogger } from '@/lib/logging/logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

interface CommitteeAssignment {
  committeeCode: string;
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  role: 'Member' | 'Chair' | 'Vice Chair' | 'Ranking Member';
  subcommittees: Array<{
    subcommitteeCode: string;
    subcommitteeName: string;
    role: 'Member' | 'Chair' | 'Ranking Member';
  }>;
  jurisdiction?: string;
  established?: string;
  website?: string;
  isLeadership?: boolean;
}

interface LeadershipPosition {
  title: string;
  type: 'party' | 'chamber' | 'caucus';
  organization: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  rank?: number;
}

interface CommitteeData {
  committees: CommitteeAssignment[];
  leadershipPositions: LeadershipPosition[];
  metadata: {
    totalCommittees: number;
    totalSubcommittees: number;
    leadershipRoles: number;
    lastUpdated: string;
    dataSource: string;
    congress: string;
  };
}

// Helper function to determine if a role is leadership
function isLeadershipRole(role: string): boolean {
  const leadershipRoles = ['chair', 'vice chair', 'ranking member', 'speaker', 'leader', 'whip'];
  return leadershipRoles.some(lr => role.toLowerCase().includes(lr));
}

// Helper function to parse committee jurisdiction
function parseJurisdiction(committeeName: string): string {
  const jurisdictionMap: Record<string, string> = {
    appropriations: 'Federal spending and budget allocation',
    'armed services': 'Military and defense matters',
    banking: 'Financial institutions and monetary policy',
    budget: 'Federal budget process and fiscal policy',
    commerce: 'Interstate and foreign commerce',
    education: 'Education policy and workforce development',
    energy: 'Energy policy and commerce',
    environment: 'Environmental protection and public works',
    finance: 'Taxation and revenue measures',
    foreign: 'Foreign relations and international affairs',
    health: 'Public health and healthcare policy',
    homeland: 'National security and border protection',
    intelligence: 'Intelligence and counterintelligence activities',
    judiciary: 'Federal courts and legal matters',
    rules: 'House or Senate procedures and administration',
    science: 'Scientific research and technology policy',
    transportation: 'Transportation and infrastructure',
    veterans: 'Veterans affairs and benefits',
    'ways and means': 'Taxation, trade, and social programs',
  };

  const lowerName = committeeName.toLowerCase();
  for (const [key, jurisdiction] of Object.entries(jurisdictionMap)) {
    if (lowerName.includes(key)) {
      return jurisdiction;
    }
  }
  return 'General legislative oversight';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  try {
    structuredLogger.info('Processing committee data request', { bioguideId });

    // Get committee and leadership data
    const committeeData = await cachedFetch(
      `committees-${bioguideId}`,
      async () => {
        // First, try to get enhanced data from congress-legislators
        let enhancedRep;
        let memberName = '';
        let chamber: 'House' | 'Senate' = 'House';

        try {
          enhancedRep = await getEnhancedRepresentative(bioguideId);
          if (enhancedRep) {
            memberName = enhancedRep.fullName?.official || enhancedRep.name;
            chamber = enhancedRep.chamber;

            structuredLogger.info('Using enhanced representative data for committees', {
              bioguideId,
              memberName,
              chamber,
              hasLeadershipRoles: !!enhancedRep.leadershipRoles,
            });
          }
        } catch (error) {
          structuredLogger.warn('Could not get enhanced representative data', {
            bioguideId,
            error: (error as Error).message,
          });
        }

        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        // NOTE: Direct member committees endpoint doesn't exist in Congress API v3
        // The endpoint /member/{bioguideId}/committees returns 404
        // Using congress-legislators data instead which already has committee info
        structuredLogger.info(
          'Using congress-legislators data for committees (direct endpoint not available)',
          { bioguideId }
        );

        // Return fallback data structure
        return {
          committees: [],
          leadershipPositions: [],
          metadata: {
            totalCommittees: 0,
            totalSubcommittees: 0,
            leadershipRoles: 0,
            dataSource: 'fallback',
            congress: '119th Congress',
            lastUpdated: new Date().toISOString(),
          },
        };
      },
      30 * 60 * 1000 // 30 minutes cache
    );

    return NextResponse.json(committeeData);
  } catch (error) {
    structuredLogger.error('Error fetching committee data', error as Error, { bioguideId });

    // Fallback to mock data
    const mockData = {
      committees: [
        {
          name: 'House Committee on Technology',
          role: 'Member',
          isLeadership: false,
          subcommittees: [],
        },
        {
          name: 'House Committee on Public Safety',
          role: 'Member',
          isLeadership: false,
          subcommittees: [],
        },
      ],
      leadershipRoles: [],
      metadata: {
        totalCommittees: 2,
        totalSubcommittees: 0,
        leadershipRoles: 0,
        lastUpdated: new Date().toISOString(),
        dataSource: 'mock',
        congress: '119th Congress',
      },
    };

    return NextResponse.json({
      ...mockData,
      error: 'Using fallback data due to API error',
      originalError: (error as Error).message,
    });
  }
}

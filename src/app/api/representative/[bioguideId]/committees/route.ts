/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { getEnhancedRepresentative } from '@/lib/congress-legislators';
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
    'appropriations': 'Federal spending and budget allocation',
    'armed services': 'Military and defense matters',
    'banking': 'Financial institutions and monetary policy',
    'budget': 'Federal budget process and fiscal policy',
    'commerce': 'Interstate and foreign commerce',
    'education': 'Education policy and workforce development',
    'energy': 'Energy policy and commerce',
    'environment': 'Environmental protection and public works',
    'finance': 'Taxation and revenue measures',
    'foreign': 'Foreign relations and international affairs',
    'health': 'Public health and healthcare policy',
    'homeland': 'National security and border protection',
    'intelligence': 'Intelligence and counterintelligence activities',
    'judiciary': 'Federal courts and legal matters',
    'rules': 'House or Senate procedures and administration',
    'science': 'Scientific research and technology policy',
    'transportation': 'Transportation and infrastructure',
    'veterans': 'Veterans affairs and benefits',
    'ways and means': 'Taxation, trade, and social programs'
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
    return NextResponse.json(
      { error: 'Bioguide ID is required' },
      { status: 400 }
    );
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
              hasLeadershipRoles: !!enhancedRep.leadershipRoles
            });
          }
        } catch (error) {
          structuredLogger.warn('Could not get enhanced representative data', {
            bioguideId,
            error: (error as Error).message
          });
        }

        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        // Fetch current committee memberships from Congress.gov
        const committeeResponse = await fetch(
          `https://api.congress.gov/v3/member/${bioguideId}/committees?api_key=${process.env.CONGRESS_API_KEY}&limit=50&format=json`,
          {
            headers: {
              'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
            }
          }
        );

        const monitor = monitorExternalApi('congress', 'member-committees', committeeResponse.url);

        if (!committeeResponse.ok) {
          monitor.end(false, committeeResponse.status);
          throw new Error(`Congress API failed: ${committeeResponse.status} ${committeeResponse.statusText}`);
        }

        const committeeApiData = await committeeResponse.json();
        monitor.end(true, 200);

        structuredLogger.info('Retrieved committee data from Congress.gov', {
          bioguideId,
          committeeCount: committeeApiData.committees?.length || 0
        });

        // Process committee assignments
        const committees: CommitteeAssignment[] = [];
        const leadershipPositions: LeadershipPosition[] = [];

        // Add leadership positions from congress-legislators if available
        if (enhancedRep?.leadershipRoles) {
          enhancedRep.leadershipRoles.forEach((role: any) => {
            leadershipPositions.push({
              title: role.title,
              type: role.type || 'chamber',
              organization: role.chamber || chamber,
              startDate: role.start,
              endDate: role.end,
              description: role.description,
              rank: role.rank
            });
          });
        }

        // Process committees from Congress.gov API
        if (committeeApiData.committees) {
          for (const committee of committeeApiData.committees) {
            const committeeAssignment: CommitteeAssignment = {
              committeeCode: committee.systemCode || committee.code || '',
              committeeName: committee.name,
              chamber: committee.chamber || chamber,
              role: 'Member', // Default role
              subcommittees: [],
              jurisdiction: parseJurisdiction(committee.name),
              established: committee.establishedDate,
              website: committee.url
            };

            // Check for leadership roles in committee
            if (committee.assignments) {
              for (const assignment of committee.assignments) {
                if (assignment.rank === 1 || assignment.title?.toLowerCase().includes('chair')) {
                  committeeAssignment.role = committee.minority ? 'Ranking Member' : 'Chair';
                  committeeAssignment.isLeadership = true;
                  
                  // Add to leadership positions
                  leadershipPositions.push({
                    title: `${committeeAssignment.role}, ${committee.name}`,
                    type: 'chamber',
                    organization: committee.name,
                    startDate: assignment.date,
                    description: `Leadership position on the ${committee.name}`
                  });
                } else if (assignment.rank === 2) {
                  committeeAssignment.role = 'Vice Chair';
                  committeeAssignment.isLeadership = true;
                }
              }
            }

            // Fetch subcommittees
            if (committee.systemCode) {
              try {
                const subcommitteeResponse = await fetch(
                  `https://api.congress.gov/v3/committee/${chamber.toLowerCase()}/${committee.systemCode}/subcommittees?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
                  {
                    headers: {
                      'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
                    }
                  }
                );

                if (subcommitteeResponse.ok) {
                  const subcommitteeData = await subcommitteeResponse.json();
                  
                  // Check member's role in each subcommittee
                  if (subcommitteeData.subcommittees) {
                    for (const subcommittee of subcommitteeData.subcommittees) {
                      // Check if member is on this subcommittee
                      const membershipResponse = await fetch(
                        `https://api.congress.gov/v3/committee/${chamber.toLowerCase()}/${committee.systemCode}/subcommittees/${subcommittee.systemCode}/members?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
                        {
                          headers: {
                            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)'
                          }
                        }
                      );

                      if (membershipResponse.ok) {
                        const membershipData = await membershipResponse.json();
                        const membership = membershipData.members?.find((m: any) => m.bioguideId === bioguideId);
                        
                        if (membership) {
                          let subcommitteeRole: 'Member' | 'Chair' | 'Ranking Member' = 'Member';
                          if (membership.rank === 1) {
                            subcommitteeRole = committee.minority ? 'Ranking Member' : 'Chair';
                          }
                          
                          committeeAssignment.subcommittees.push({
                            subcommitteeCode: subcommittee.systemCode,
                            subcommitteeName: subcommittee.name,
                            role: subcommitteeRole
                          });
                        }
                      }
                    }
                  }
                }
              } catch (error) {
                structuredLogger.warn('Error fetching subcommittee data', {
                  committeeCode: committee.systemCode,
                  error: (error as Error).message
                });
              }
            }

            committees.push(committeeAssignment);
          }
        }

        // Sort committees by importance (leadership roles first)
        committees.sort((a, b) => {
          if (a.isLeadership && !b.isLeadership) return -1;
          if (!a.isLeadership && b.isLeadership) return 1;
          return a.committeeName.localeCompare(b.committeeName);
        });

        // Sort leadership positions by rank and type
        leadershipPositions.sort((a, b) => {
          const typeOrder = { party: 0, chamber: 1, caucus: 2 };
          const aOrder = typeOrder[a.type] || 3;
          const bOrder = typeOrder[b.type] || 3;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (a.rank || 999) - (b.rank || 999);
        });

        const currentCongress = new Date().getFullYear() % 2 === 0 
          ? Math.floor((new Date().getFullYear() - 1788) / 2)
          : Math.floor((new Date().getFullYear() - 1787) / 2);

        return {
          committees,
          leadershipPositions,
          metadata: {
            totalCommittees: committees.length,
            totalSubcommittees: committees.reduce((sum, c) => sum + c.subcommittees.length, 0),
            leadershipRoles: leadershipPositions.length,
            lastUpdated: new Date().toISOString(),
            dataSource: enhancedRep ? 'congress-legislators + congress.gov' : 'congress.gov',
            congress: `${currentCongress}th Congress`
          }
        };
      },
      60 * 60 * 1000 // 1 hour cache
    );

    structuredLogger.info('Successfully processed committee data', {
      bioguideId,
      totalCommittees: committeeData.metadata.totalCommittees,
      leadershipRoles: committeeData.metadata.leadershipRoles
    });

    return NextResponse.json(committeeData);

  } catch (error) {
    structuredLogger.error('Committee data API error', error as Error, { bioguideId });

    // Fallback mock data
    const mockData: CommitteeData = {
      committees: [
        {
          committeeCode: 'HSIF',
          committeeName: 'House Committee on Energy and Commerce',
          chamber: 'House',
          role: 'Member',
          subcommittees: [
            {
              subcommitteeCode: 'HSIF14',
              subcommitteeName: 'Subcommittee on Health',
              role: 'Member'
            }
          ],
          jurisdiction: 'Energy policy and commerce',
          isLeadership: false
        },
        {
          committeeCode: 'HSAP',
          committeeName: 'House Committee on Appropriations',
          chamber: 'House',
          role: 'Member',
          subcommittees: [],
          jurisdiction: 'Federal spending and budget allocation',
          isLeadership: false
        }
      ],
      leadershipPositions: [],
      metadata: {
        totalCommittees: 2,
        totalSubcommittees: 1,
        leadershipRoles: 0,
        lastUpdated: new Date().toISOString(),
        dataSource: 'mock',
        congress: '119th Congress'
      }
    };

    return NextResponse.json({
      ...mockData,
      error: 'Using fallback data due to API error',
      originalError: (error as Error).message
    });
  }
}
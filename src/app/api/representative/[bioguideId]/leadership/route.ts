/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { getEnhancedRepresentative, getAllEnhancedRepresentatives } from '@/lib/congress-legislators';
import { structuredLogger } from '@/lib/logging/logger';

interface LeadershipRole {
  title: string;
  type: 'constitutional' | 'party' | 'committee' | 'caucus' | 'administrative';
  organization: string;
  chamber: 'House' | 'Senate' | 'Joint';
  rank?: number;
  startDate?: string;
  endDate?: string;
  description?: string;
  responsibilities?: string[];
  isActive: boolean;
  historicalSignificance?: boolean;
}

interface LeadershipAnalytics {
  currentRoles: number;
  historicalRoles: number;
  highestRank: number;
  committees: {
    chair: number;
    rankingMember: number;
    subcommitteeChair: number;
  };
  influence: {
    score: number; // 0-100
    factors: string[];
  };
}

interface LeadershipData {
  currentRoles: LeadershipRole[];
  historicalRoles: LeadershipRole[];
  analytics: LeadershipAnalytics;
  metadata: {
    lastUpdated: string;
    dataSource: string;
    congress: string;
  };
}

// Leadership hierarchy rankings
const LEADERSHIP_RANKS: Record<string, number> = {
  'president': 1,
  'vice president': 2,
  'speaker': 3,
  'president pro tempore': 4,
  'majority leader': 5,
  'minority leader': 6,
  'majority whip': 7,
  'minority whip': 8,
  'conference chair': 9,
  'conference vice chair': 10,
  'policy committee chair': 11,
  'caucus chair': 12,
  'committee chair': 15,
  'ranking member': 16,
  'subcommittee chair': 20,
  'subcommittee ranking member': 21
};

// Helper function to calculate influence score
function calculateInfluenceScore(roles: LeadershipRole[]): { score: number; factors: string[] } {
  let score = 0;
  const factors: string[] = [];

  // Base score from current roles
  const currentRoles = roles.filter(r => r.isActive);
  score += currentRoles.length * 10;

  // Bonus for high-ranking positions
  currentRoles.forEach(role => {
    const rank = role.rank || 100;
    if (rank <= 5) {
      score += 30;
      factors.push(`${role.title} (Top 5 leadership)`);
    } else if (rank <= 10) {
      score += 20;
      factors.push(`${role.title} (Top 10 leadership)`);
    } else if (rank <= 20) {
      score += 10;
      factors.push(`${role.title} (Committee leadership)`);
    }
  });

  // Historical significance bonus
  const historicalLeadership = roles.filter(r => !r.isActive && r.historicalSignificance);
  score += historicalLeadership.length * 5;
  if (historicalLeadership.length > 0) {
    factors.push(`${historicalLeadership.length} historically significant roles`);
  }

  // Committee leadership bonus
  const committeeChairs = currentRoles.filter(r => 
    r.type === 'committee' && (r.title.includes('Chair') || r.title.includes('Ranking'))
  );
  score += committeeChairs.length * 15;

  // Cap at 100
  score = Math.min(score, 100);

  return { score, factors };
}

// Helper function to parse leadership role from title
function parseLeadershipRole(
  title: string, 
  chamber: string
): { type: LeadershipRole['type']; rank?: number } {
  const lowerTitle = title.toLowerCase();
  
  // Determine type
  let type: LeadershipRole['type'] = 'administrative';
  if (lowerTitle.includes('speaker') || lowerTitle.includes('leader') || 
      lowerTitle.includes('whip') || lowerTitle.includes('president pro tempore')) {
    type = 'constitutional';
  } else if (lowerTitle.includes('conference') || lowerTitle.includes('caucus') ||
             lowerTitle.includes('policy')) {
    type = 'party';
  } else if (lowerTitle.includes('committee')) {
    type = 'committee';
  } else if (lowerTitle.includes('caucus')) {
    type = 'caucus';
  }

  // Determine rank
  let rank = 100;
  for (const [key, value] of Object.entries(LEADERSHIP_RANKS)) {
    if (lowerTitle.includes(key)) {
      rank = value;
      break;
    }
  }

  return { type, rank };
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
    structuredLogger.info('Processing leadership data request', { bioguideId });

    const leadershipData = await cachedFetch(
      `leadership-${bioguideId}`,
      async () => {
        // Get enhanced representative data
        const enhancedRep = await getEnhancedRepresentative(bioguideId);
        if (!enhancedRep) {
          throw new Error('Representative not found');
        }

        const currentRoles: LeadershipRole[] = [];
        const historicalRoles: LeadershipRole[] = [];

        // Process leadership roles from congress-legislators
        if (enhancedRep.leadershipRoles) {
          enhancedRep.leadershipRoles.forEach((role: unknown) => {
            const { type, rank } = parseLeadershipRole(role.title, role.chamber || enhancedRep.chamber);
            
            const leadershipRole: LeadershipRole = {
              title: role.title,
              type,
              organization: role.chamber || enhancedRep.chamber,
              chamber: role.chamber || enhancedRep.chamber,
              rank: rank || role.rank,
              startDate: role.start,
              endDate: role.end,
              description: role.description,
              isActive: !role.end || new Date(role.end) > new Date(),
              historicalSignificance: role.title.toLowerCase().includes('speaker') ||
                                    role.title.toLowerCase().includes('majority leader') ||
                                    role.title.toLowerCase().includes('minority leader')
            };

            // Add responsibilities based on role
            if (role.title.toLowerCase().includes('speaker')) {
              leadershipRole.responsibilities = [
                'Presides over House sessions',
                'Sets legislative agenda',
                'Appoints committee members',
                'Third in line of presidential succession'
              ];
            } else if (role.title.toLowerCase().includes('majority leader')) {
              leadershipRole.responsibilities = [
                'Schedules legislation for floor consideration',
                'Coordinates party strategy',
                'Serves as party spokesperson',
                'Manages floor debate'
              ];
            } else if (role.title.toLowerCase().includes('whip')) {
              leadershipRole.responsibilities = [
                'Counts votes',
                'Enforces party discipline',
                'Assists party leader',
                'Mobilizes party members for votes'
              ];
            }

            if (leadershipRole.isActive) {
              currentRoles.push(leadershipRole);
            } else {
              historicalRoles.push(leadershipRole);
            }
          });
        }

        // Process committee leadership from current term
        if (enhancedRep.committees) {
          enhancedRep.committees.forEach((committee: unknown) => {
            if (committee.role && committee.role !== 'Member') {
              const isActive = true; // Assume current committees are active
              const { type, rank } = parseLeadershipRole(
                `${committee.role}, ${committee.name}`,
                enhancedRep.chamber
              );

              const committeeLeadership: LeadershipRole = {
                title: `${committee.role}, ${committee.name}`,
                type: 'committee',
                organization: committee.name,
                chamber: enhancedRep.chamber,
                rank: rank || (committee.role.includes('Chair') ? 15 : 16),
                description: `Leadership position on ${committee.name}`,
                isActive,
                responsibilities: committee.role.includes('Chair') ? [
                  'Sets committee agenda',
                  'Manages committee staff',
                  'Leads committee hearings',
                  'Negotiates legislation'
                ] : [
                  'Leads minority party on committee',
                  'Offers alternative proposals',
                  'Manages minority staff',
                  'Represents opposition views'
                ]
              };

              currentRoles.push(committeeLeadership);
            }
          });
        }

        // Sort roles by rank
        currentRoles.sort((a, b) => (a.rank || 999) - (b.rank || 999));
        historicalRoles.sort((a, b) => {
          // Sort by end date (most recent first)
          if (a.endDate && b.endDate) {
            return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
          }
          return (a.rank || 999) - (b.rank || 999);
        });

        // Calculate analytics
        const committeeStats = {
          chair: currentRoles.filter(r => 
            r.type === 'committee' && r.title.includes('Chair') && !r.title.includes('Vice')
          ).length,
          rankingMember: currentRoles.filter(r => 
            r.type === 'committee' && r.title.includes('Ranking Member')
          ).length,
          subcommitteeChair: currentRoles.filter(r => 
            r.type === 'committee' && r.title.includes('Subcommittee') && r.title.includes('Chair')
          ).length
        };

        const { score, factors } = calculateInfluenceScore([...currentRoles, ...historicalRoles]);

        const analytics: LeadershipAnalytics = {
          currentRoles: currentRoles.length,
          historicalRoles: historicalRoles.length,
          highestRank: Math.min(...[...currentRoles, ...historicalRoles].map(r => r.rank || 999)),
          committees: committeeStats,
          influence: { score, factors }
        };

        const currentCongress = new Date().getFullYear() % 2 === 0 
          ? Math.floor((new Date().getFullYear() - 1788) / 2)
          : Math.floor((new Date().getFullYear() - 1787) / 2);

        return {
          currentRoles,
          historicalRoles,
          analytics,
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSource: 'congress-legislators',
            congress: `${currentCongress}th Congress`
          }
        };
      },
      2 * 60 * 60 * 1000 // 2 hour cache
    );

    structuredLogger.info('Successfully processed leadership data', {
      bioguideId,
      currentRoles: leadershipData.analytics.currentRoles,
      influenceScore: leadershipData.analytics.influence.score
    });

    return NextResponse.json(leadershipData);

  } catch (error) {
    structuredLogger.error('Leadership data API error', error as Error, { bioguideId });

    // Fallback mock data
    const mockData: LeadershipData = {
      currentRoles: [],
      historicalRoles: [],
      analytics: {
        currentRoles: 0,
        historicalRoles: 0,
        highestRank: 999,
        committees: {
          chair: 0,
          rankingMember: 0,
          subcommitteeChair: 0
        },
        influence: {
          score: 0,
          factors: []
        }
      },
      metadata: {
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
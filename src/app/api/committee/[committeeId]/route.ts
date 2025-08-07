/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { Committee, CommitteeAPIResponse, CommitteeMember } from '@/types/committee';
import { COMMITTEE_ID_MAP } from '@/types/committee';
import type { EnhancedRepresentative } from '@/types/representative';
import { getCommitteeData } from '@/lib/data/committees';
import {
  fetchCommittees,
  fetchCommitteeMemberships,
  getAllEnhancedRepresentatives,
} from '@/features/representatives/services/congress.service';

// Helper function to get committee metadata
function getCommitteeMetadata(committeeId: string) {
  const upperCommitteeId = committeeId.toUpperCase();

  // Check if it's a known committee ID (including numbered variants)
  if (COMMITTEE_ID_MAP[upperCommitteeId]) {
    return {
      id: upperCommitteeId,
      name: COMMITTEE_ID_MAP[upperCommitteeId].name,
      chamber: COMMITTEE_ID_MAP[upperCommitteeId].chamber as 'House' | 'Senate',
    };
  }

  // Try to find base committee ID by removing trailing numbers
  const baseCommitteeId = upperCommitteeId.replace(/\d+$/, '');
  if (COMMITTEE_ID_MAP[baseCommitteeId]) {
    return {
      id: upperCommitteeId,
      name: COMMITTEE_ID_MAP[baseCommitteeId].name,
      chamber: COMMITTEE_ID_MAP[baseCommitteeId].chamber as 'House' | 'Senate',
    };
  }

  // Fallback for unknown committee IDs
  const isHouse = upperCommitteeId.startsWith('H');
  const isSenate = upperCommitteeId.startsWith('S');

  return {
    id: upperCommitteeId,
    name: `${isHouse ? 'House' : isSenate ? 'Senate' : 'Joint'} Committee ${upperCommitteeId}`,
    chamber: (isHouse ? 'House' : isSenate ? 'Senate' : 'Joint') as 'House' | 'Senate' | 'Joint',
  };
}

// Helper function to fetch committee data from congress-legislators
async function fetchCommitteeFromCongressLegislators(
  committeeId: string
): Promise<Committee | null> {
  const cacheKey = `committee-real-${committeeId}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        logger.info('Fetching committee data from congress-legislators', { committeeId });

        // Get committees and memberships data from congress-legislators
        const [committees, memberships, allRepresentatives] = await Promise.all([
          fetchCommittees(),
          fetchCommitteeMemberships(),
          getAllEnhancedRepresentatives(),
        ]);

        // Find the committee by ID (try both exact match and variations)
        const committee = committees.find(
          c =>
            c.thomas_id === committeeId ||
            c.thomas_id === committeeId.toUpperCase() ||
            c.house_committee_id === committeeId ||
            c.senate_committee_id === committeeId
        );

        if (!committee) {
          logger.warn('Committee not found in congress-legislators data', {
            committeeId,
          });
          return null;
        }

        // Find committee memberships for this committee
        const committeeMembers: CommitteeMember[] = [];
        const leadership = {
          chair: undefined as CommitteeMember | undefined,
          rankingMember: undefined as CommitteeMember | undefined,
        };

        for (const membership of memberships) {
          // Find committee membership for this specific committee
          const memberCommittee = membership.committees.find(
            c => c.thomas_id === committee.thomas_id
          );

          if (memberCommittee) {
            // Find the representative data
            const representative = allRepresentatives.find(
              rep => rep.bioguideId === membership.bioguide
            );

            if (representative) {
              const role = memberCommittee.title || 'Member';
              const normalizedRole =
                role.includes('Chair') && !role.includes('Ranking')
                  ? ('Chair' as const)
                  : role.includes('Ranking')
                    ? ('Ranking Member' as const)
                    : role.includes('Vice')
                      ? ('Vice Chair' as const)
                      : ('Member' as const);

              const member: CommitteeMember = {
                representative,
                role: normalizedRole,
                joinedDate: '2023-01-03', // Default date for 119th Congress
                rank: memberCommittee.rank || committeeMembers.length + 1,
                subcommittees: [],
              };

              committeeMembers.push(member);

              // Assign leadership roles based on title
              const title = (memberCommittee.title || '').toLowerCase();
              if (title.includes('chair') && !title.includes('ranking')) {
                leadership.chair = { ...member, role: 'Chair' };
              } else if (title.includes('ranking')) {
                leadership.rankingMember = { ...member, role: 'Ranking Member' };
              }
            }
          }
        }

        // If no chair/ranking member found, assign based on party (common pattern)
        if (!leadership.chair || !leadership.rankingMember) {
          const republicans = committeeMembers.filter(m => m.representative.party === 'Republican');
          const democrats = committeeMembers.filter(m => m.representative.party === 'Democratic');

          if (!leadership.chair && republicans.length > 0) {
            leadership.chair = { ...republicans[0]!, role: 'Chair' };
          }
          if (!leadership.rankingMember && democrats.length > 0) {
            leadership.rankingMember = { ...democrats[0]!, role: 'Ranking Member' };
          }
        }

        const result: Committee = {
          id: committee.thomas_id,
          thomas_id: committee.thomas_id,
          name: committee.name,
          chamber:
            committee.type === 'house' ? 'House' : committee.type === 'senate' ? 'Senate' : 'Joint',
          jurisdiction: committee.jurisdiction || `${committee.name} jurisdiction`,
          type: 'Standing',
          leadership: {
            chair: leadership.chair,
            rankingMember: leadership.rankingMember,
          },
          members: committeeMembers,
          subcommittees:
            committee.subcommittees?.map(sub => ({
              id: sub.thomas_id,
              name: sub.name,
              chair: committeeMembers[0]?.representative, // Simplified
              focus: `${sub.name} subcommittee`,
              members: committeeMembers[0]
                ? [
                    {
                      representative: committeeMembers[0].representative,
                      role: 'Chair',
                      joinedDate: '2023-01-03',
                    },
                  ]
                : [],
            })) || [],
          url: `https://www.congress.gov/committee/${committee.thomas_id.toLowerCase()}`,
          lastUpdated: new Date().toISOString(),
        };

        logger.info('Successfully built committee from congress-legislators data', {
          committeeId,
          committeeName: result.name,
          memberCount: result.members.length,
          hasChair: !!result.leadership.chair,
          hasRankingMember: !!result.leadership.rankingMember,
          subcommitteeCount: result.subcommittees.length,
        });

        return result;
      } catch (error) {
        logger.error('Error fetching committee from Congress.gov', error as Error, {
          committeeId,
        });
        return null;
      }
    },
    24 * 60 * 60 * 1000 // 24 hour cache for committee data
  );
}

// Generate enhanced mock members based on committee type and chamber
function generateCommitteeMockMembers(
  committeeId: string,
  chamber: string
): EnhancedRepresentative[] {
  // Committee-specific mock members based on real committee structures
  const baseMembers: Partial<EnhancedRepresentative>[] = [
    {
      bioguideId: `${committeeId}_001`,
      name: 'Committee Chair',
      firstName: 'Chair',
      lastName: 'Person',
      party: chamber === 'House' ? 'D' : 'R',
      state: 'CA',
      district: chamber === 'House' ? '1' : undefined,
      chamber: chamber as 'House' | 'Senate',
    },
    {
      bioguideId: `${committeeId}_002`,
      name: 'Ranking Member',
      firstName: 'Ranking',
      lastName: 'Member',
      party: chamber === 'House' ? 'R' : 'D',
      state: 'TX',
      district: chamber === 'House' ? '2' : undefined,
      chamber: chamber as 'House' | 'Senate',
    },
    {
      bioguideId: `${committeeId}_003`,
      name: 'Committee Member 1',
      firstName: 'Member',
      lastName: 'One',
      party: 'D',
      state: 'NY',
      district: chamber === 'House' ? '3' : undefined,
      chamber: chamber as 'House' | 'Senate',
    },
    {
      bioguideId: `${committeeId}_004`,
      name: 'Committee Member 2',
      firstName: 'Member',
      lastName: 'Two',
      party: 'R',
      state: 'FL',
      district: chamber === 'House' ? '4' : undefined,
      chamber: chamber as 'House' | 'Senate',
    },
  ];

  return baseMembers.map(member => ({
    ...member,
    middleName: undefined,
    suffix: undefined,
    nickname: undefined,
    directOrderName: member.name,
    invertedOrderName: `${member.lastName}, ${member.firstName}`,
    dateOfBirth: undefined,
    dateOfDeath: undefined,
    addressComplete: undefined,
    phoneNumber: undefined,
    twitterId: undefined,
    facebookId: undefined,
    youtubeName: undefined,
    govtrackId: undefined,
    opensecretsId: undefined,
    lisId: undefined,
    cspanId: undefined,
    wikipediaId: undefined,
    ballotpediaId: undefined,
    washingtonPostId: undefined,
    icpsrId: undefined,
    photoUrl: undefined,
    biography: undefined,
    website: undefined,
    contactForm: undefined,
    rssUrl: undefined,
    termStart: '2023-01-03',
    termEnd: '2025-01-03',
    leadership: [],
    committees: [],
    subcommittees: [],
    caucuses: [],
    socialMedia: {
      twitter: undefined,
      facebook: undefined,
      youtube: undefined,
      instagram: undefined,
    },
    officeLocations: [],
    currentCommittees: [],
    currentSubcommittees: [],
    currentCaucuses: [],
    endorsements: [],
    votingRecord: {
      totalVotes: 0,
      votesWithParty: 0,
      votesAgainstParty: 0,
      partyUnityScore: 0,
      abstentions: 0,
      lastUpdated: new Date().toISOString(),
    },
    billsSponsored: 0,
    billsCosponsored: 0,
    lastUpdated: new Date().toISOString(),
  })) as EnhancedRepresentative[];
}

// Generate mock committee data for development/fallback
function generateMockCommitteeData(committeeId: string): Committee {
  const metadata = getCommitteeMetadata(committeeId);

  // Use enhanced mock member system
  const mockRepresentatives = generateCommitteeMockMembers(committeeId, metadata.chamber);

  // Ensure we have at least basic representatives for leadership roles
  if (mockRepresentatives.length < 2) {
    // Add fallback representatives if generation failed or insufficient
    const fallbackRep: Partial<EnhancedRepresentative> = {
      bioguideId: 'X000000',
      name: 'Committee Chair',
      party: 'Unknown',
      state: 'XX',
      district: '00',
      chamber: metadata.chamber === 'Joint' ? 'House' : metadata.chamber,
      title: metadata.chamber === 'House' ? 'Representative' : 'Senator',
    };

    if (mockRepresentatives.length === 0) {
      mockRepresentatives.push(fallbackRep as EnhancedRepresentative);
      mockRepresentatives.push({
        ...fallbackRep,
        name: 'Ranking Member',
        bioguideId: 'X000001',
      } as EnhancedRepresentative);
    } else if (mockRepresentatives.length === 1) {
      mockRepresentatives.push({
        ...fallbackRep,
        name: 'Ranking Member',
        bioguideId: 'X000001',
      } as EnhancedRepresentative);
    }
  }

  return {
    id: metadata.id,
    thomas_id: committeeId,
    name: metadata.name,
    chamber: metadata.chamber,
    jurisdiction: 'Sample committee jurisdiction covering relevant policy areas',
    type: 'Standing',

    leadership: {
      chair: {
        representative: mockRepresentatives[0]!,
        role: 'Chair',
        joinedDate: '2023-01-03',
        rank: 1,
        subcommittees: [],
      },
      rankingMember: {
        representative: mockRepresentatives[1]!,
        role: 'Ranking Member',
        joinedDate: '2023-01-03',
        rank: 2,
        subcommittees: [],
      },
    },

    members: mockRepresentatives.map((rep, index) => ({
      representative: rep,
      role: index === 0 ? 'Chair' : index === 1 ? 'Ranking Member' : 'Member',
      joinedDate: '2023-01-03',
      rank: index + 1,
      subcommittees: index === 0 ? ['Nutrition, Foreign Agriculture'] : [],
    })),

    subcommittees: [
      {
        id: `${committeeId}_sub1`,
        name: 'Nutrition, Foreign Agriculture',
        chair: mockRepresentatives[0]!,
        focus: 'Nutrition programs and foreign agricultural trade',
        members: [
          {
            representative: mockRepresentatives[0]!,
            role: 'Chair',
            joinedDate: '2023-01-03',
          },
        ],
      },
    ],

    url: `https://www.congress.gov/committee/${committeeId.toLowerCase()}`,
    lastUpdated: new Date().toISOString(),
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<CommitteeAPIResponse>> {
  try {
    const { committeeId } = await params;

    if (!committeeId) {
      return NextResponse.json(
        {
          committee: {} as Committee,
          metadata: {
            dataSource: 'mock',
            lastUpdated: new Date().toISOString(),
            memberCount: 0,
            subcommitteeCount: 0,
            cacheable: false,
          },
          errors: [{ code: 'MISSING_COMMITTEE_ID', message: 'Committee ID is required' }],
        },
        { status: 400 }
      );
    }

    logger.info('Committee API request', { committeeId });

    let committee: Committee | null = null;

    // First try to get hardcoded committee data
    committee = await getCommitteeData(committeeId);

    // If not found, try to get real data from congress-legislators
    if (!committee) {
      committee = await fetchCommitteeFromCongressLegislators(committeeId);
    }

    // Fallback to mock data if real data unavailable
    if (!committee) {
      logger.info('Using mock committee data', { committeeId });
      committee = generateMockCommitteeData(committeeId);
    }

    const response: CommitteeAPIResponse = {
      committee,
      metadata: {
        dataSource:
          committee.url && !committee.url.includes('mock') ? 'congress-legislators' : 'mock',
        lastUpdated: committee.lastUpdated,
        memberCount: committee.members.length,
        subcommitteeCount: committee.subcommittees.length,
        cacheable: true,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // 1 hour cache
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';

    logger.error('Committee API error', error as Error, {
      committeeId: (await params).committeeId,
    });

    return NextResponse.json(
      {
        committee: {} as Committee,
        metadata: {
          dataSource: 'mock',
          lastUpdated: new Date().toISOString(),
          memberCount: 0,
          subcommitteeCount: 0,
          cacheable: false,
        },
        errors: [
          {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          },
        ],
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { Committee, CommitteeAPIResponse, CommitteeMember } from '@/types/committee';
import { COMMITTEE_ID_MAP } from '@/types/committee';
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

        logger.info('Fetched data counts', {
          committeesCount: committees.length,
          membershipsCount: memberships.length,
          representativesCount: allRepresentatives.length,
        });

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
        const subcommitteeMembersMap = new Map<string, CommitteeMember[]>();
        const leadership = {
          chair: undefined as CommitteeMember | undefined,
          rankingMember: undefined as CommitteeMember | undefined,
        };

        // Log a sample to understand the data structure
        if (memberships.length > 0) {
          const sampleMember = memberships[0];
          const ssevMember = memberships.find(m =>
            m.committees.some(c => c.thomas_id.startsWith('SSEV'))
          );
          logger.info('Membership data analysis', {
            sampleBioguide: sampleMember?.bioguide,
            sampleCommitteeIds: sampleMember?.committees.map(c => c.thomas_id),
            ssevMemberBioguide: ssevMember?.bioguide,
            ssevCommitteeIds: ssevMember?.committees
              .filter(c => c.thomas_id.startsWith('SSEV'))
              .map(c => c.thomas_id),
            totalMemberships: memberships.length,
          });
        }

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

              // Use committee-specific party designation (majority/minority)
              // For current Senate (2025): majority = Republican, minority = preserve original (Democrat/Independent)
              const committeeParty = memberCommittee.party;
              const actualParty =
                committee.type === 'senate'
                  ? committeeParty === 'majority'
                    ? 'Republican'
                    : representative.party // Preserve original party for minority (Democrat/Independent)
                  : committeeParty === 'majority'
                    ? 'Republican'
                    : representative.party; // House logic same for now

              // Create representative with corrected party
              const correctedRepresentative = {
                ...representative,
                party: actualParty,
              };

              const member: CommitteeMember = {
                representative: correctedRepresentative,
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

          // Also check for subcommittee memberships
          if (committee.subcommittees) {
            for (const subcommittee of committee.subcommittees) {
              // Subcommittee IDs in membership data are prefixed with parent committee ID
              const subcommitteeFullId = `${committee.thomas_id}${subcommittee.thomas_id}`;
              const memberSubcommittee = membership.committees.find(c => {
                // Subcommittee thomas_ids in committees data are just the numeric part (e.g., "10")
                // but in membership data they're prefixed (e.g., "SSEV10")
                const isMatch = c.thomas_id === subcommitteeFullId;
                if (isMatch) {
                  logger.info('Found subcommittee membership match', {
                    memberBioguide: membership.bioguide,
                    subcommitteeId: subcommittee.thomas_id,
                    subcommitteeFullId,
                    matchedId: c.thomas_id,
                  });
                }
                return isMatch;
              });

              if (memberSubcommittee) {
                const representative = allRepresentatives.find(
                  rep => rep.bioguideId === membership.bioguide
                );

                if (representative) {
                  const role = memberSubcommittee.title || 'Member';
                  const normalizedRole =
                    role.includes('Chair') && !role.includes('Ranking')
                      ? ('Chair' as const)
                      : role.includes('Ranking')
                        ? ('Ranking Member' as const)
                        : ('Member' as const);

                  // Use committee-specific party designation for subcommittees too
                  const subCommitteeParty = memberSubcommittee.party;
                  const subActualParty =
                    committee.type === 'senate'
                      ? subCommitteeParty === 'majority'
                        ? 'Republican'
                        : representative.party // Preserve original party for minority
                      : subCommitteeParty === 'majority'
                        ? 'Republican'
                        : representative.party;

                  const correctedSubRepresentative = {
                    ...representative,
                    party: subActualParty,
                  };

                  const subMember: CommitteeMember = {
                    representative: correctedSubRepresentative,
                    role: normalizedRole,
                    joinedDate: '2023-01-03',
                    rank: memberSubcommittee.rank || 999,
                    subcommittees: [],
                  };

                  if (!subcommitteeMembersMap.has(subcommitteeFullId)) {
                    subcommitteeMembersMap.set(subcommitteeFullId, []);
                  }
                  subcommitteeMembersMap.get(subcommitteeFullId)!.push(subMember);
                }
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

        // Clean up verbose jurisdiction text for better UI display
        let cleanJurisdiction = committee.jurisdiction || `${committee.name} jurisdiction`;

        // Special case: Senate Appropriations has very verbose description - make it concise
        if (
          committee.thomas_id === 'SSAP' &&
          cleanJurisdiction.includes('responsible for legislation allocating federal funds')
        ) {
          cleanJurisdiction =
            'Responsible for federal spending bills and discretionary budget allocations.';
        }

        const result: Committee = {
          id: committee.thomas_id,
          thomas_id: committee.thomas_id,
          name: committee.name,
          chamber:
            committee.type === 'house' ? 'House' : committee.type === 'senate' ? 'Senate' : 'Joint',
          jurisdiction: cleanJurisdiction,
          type: 'Standing',
          leadership: {
            chair: leadership.chair,
            rankingMember: leadership.rankingMember,
          },
          members: committeeMembers,
          subcommittees:
            committee.subcommittees?.map(sub => {
              const subcommitteeFullId = `${committee.thomas_id}${sub.thomas_id}`;
              const subMembers = subcommitteeMembersMap.get(subcommitteeFullId) || [];

              // Find the chair of the subcommittee
              const subChair = subMembers.find(m => m.role === 'Chair');

              // Only show subcommittee members if we found specific ones
              // Don't fallback to all committee members - show empty if no specific data
              const finalMembers = subMembers.length > 0 ? subMembers : [];

              return {
                id: sub.thomas_id,
                name: sub.name,
                chair: subChair?.representative || leadership.chair?.representative,
                focus: `${sub.name} subcommittee`,
                members: finalMembers,
              };
            }) || [],
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

// EMERGENCY FIX: Removed all mock member generation
// Never generate fake bioguideIds or names

// Generate empty committee data when real data is unavailable
// EMERGENCY FIX: Never return fake bioguideIds or names
function generateEmptyCommitteeData(committeeId: string): Committee {
  const metadata = getCommitteeMetadata(committeeId);

  logger.warn('Committee data unavailable - returning empty structure', {
    committeeId,
    reason: 'Real committee data not found in congress-legislators API',
  });

  return {
    id: metadata.id,
    thomas_id: committeeId,
    name: metadata.name,
    chamber: metadata.chamber,
    jurisdiction: 'Committee data loading from Congress.gov...',
    type: 'Standing',

    leadership: {
      chair: undefined,
      rankingMember: undefined,
    },

    members: [], // NEVER return fake members with fake bioguideIds

    subcommittees: [], // Empty until real data available

    url: `https://www.congress.gov/committee/${committeeId.toLowerCase()}`,
    lastUpdated: new Date().toISOString(),
  };
}

// Helper function to resolve committee ID from various formats
function resolveCommitteeId(inputId: string): string {
  const upperInputId = inputId.toUpperCase();

  // Special case mappings where the URL ID differs from the actual thomas_id
  const redirectMappings: Record<string, string> = {
    HSHL: 'HSHM', // House Homeland Security: HSHL (legacy URL) -> HSHM (actual committee ID)
  };

  if (redirectMappings[upperInputId]) {
    return redirectMappings[upperInputId];
  }

  // Try exact match first (thomas_id format like 'HSAG', 'SSJU')
  if (COMMITTEE_ID_MAP[upperInputId]) {
    return upperInputId;
  }

  // Try base ID without numbers
  const baseId = upperInputId.replace(/\d+$/, '');
  if (COMMITTEE_ID_MAP[baseId]) {
    return baseId;
  }

  // Try to find by name matching (for name-based slugs)
  const matchingEntry = Object.entries(COMMITTEE_ID_MAP).find(([_, info]) => {
    const slugifiedName = info.name
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    return slugifiedName === inputId.toLowerCase();
  });

  if (matchingEntry) {
    return matchingEntry[0];
  }

  // Return original if no match found
  return inputId;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<CommitteeAPIResponse>> {
  try {
    const { committeeId: rawCommitteeId } = await params;

    if (!rawCommitteeId) {
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

    // Resolve the committee ID to thomas_id format
    const committeeId = resolveCommitteeId(rawCommitteeId);

    logger.info('Committee API request', {
      rawCommitteeId,
      resolvedCommitteeId: committeeId,
      wasResolved: rawCommitteeId !== committeeId,
    });

    let committee: Committee | null = null;

    // First try to get hardcoded committee data (for clean jurisdiction text)
    const hardcodedCommittee = await getCommitteeData(committeeId);

    // Always try to get real member data from congress-legislators
    const realCommittee = await fetchCommitteeFromCongressLegislators(committeeId);

    // Merge hardcoded data (jurisdiction) with real data (members, leadership)
    if (hardcodedCommittee && realCommittee) {
      committee = {
        ...realCommittee,
        jurisdiction: hardcodedCommittee.jurisdiction, // Use clean jurisdiction from hardcoded data
      };
    } else if (realCommittee) {
      committee = realCommittee;
    } else if (hardcodedCommittee) {
      committee = hardcodedCommittee;
    }

    // EMERGENCY FIX: Return empty data instead of fake members
    if (!committee) {
      logger.warn('Committee data unavailable from all sources', { committeeId });
      committee = generateEmptyCommitteeData(committeeId);
    }

    const response: CommitteeAPIResponse = {
      committee,
      metadata: {
        dataSource: committee.members.length > 0 ? 'congress-legislators' : 'mock',
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

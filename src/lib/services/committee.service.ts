/**
 * Committee Service - Shared data fetching for committees
 * Used by both API routes and server components
 */

import { cachedFetch, cache } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { Committee, CommitteeMember } from '@/types/committee';
import { COMMITTEE_ID_MAP } from '@/types/committee';
import { getCommitteeData as getHardcodedCommitteeData } from '@/lib/data/committees';
import {
  fetchCommittees,
  fetchCommitteeMemberships,
  getAllEnhancedRepresentatives,
} from '@/features/representatives/services/congress.service';

// Helper function to parse subcommittee IDs (e.g., "SSGA20" -> { parentId: "SSGA", subcommitteeNum: "20" })
function parseSubcommitteeId(committeeId: string): {
  isSubcommittee: boolean;
  parentId: string;
  subcommitteeNum: string;
} {
  const upperCommitteeId = committeeId.toUpperCase();

  // Pattern: 4 letters (parent) + 2 digits (subcommittee number)
  // Examples: SSGA20, HSAG14, SSEV10
  const match = upperCommitteeId.match(/^([A-Z]{4})(\d{2})$/);

  if (match && match[1] && match[2]) {
    return {
      isSubcommittee: true,
      parentId: match[1],
      subcommitteeNum: match[2],
    };
  }

  return {
    isSubcommittee: false,
    parentId: upperCommitteeId,
    subcommitteeNum: '',
  };
}

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

// Fetch committee data from congress-legislators
async function fetchCommitteeFromCongressLegislators(
  committeeId: string
): Promise<Committee | null> {
  const cacheKey = `committee-real-${committeeId}`;

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        logger.info('Fetching committee data from congress-legislators', { committeeId });

        // Check if this is a subcommittee ID (e.g., "SSGA20")
        const subcommitteeInfo = parseSubcommitteeId(committeeId);

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
          isSubcommittee: subcommitteeInfo.isSubcommittee,
          parentId: subcommitteeInfo.parentId,
          subcommitteeNum: subcommitteeInfo.subcommitteeNum,
        });

        // Find the committee by ID (try both exact match and variations)
        // For subcommittees, look up the parent committee first
        const searchId = subcommitteeInfo.isSubcommittee ? subcommitteeInfo.parentId : committeeId;

        const committee = committees.find(
          c =>
            c.thomas_id === searchId ||
            c.thomas_id === searchId.toUpperCase() ||
            c.house_committee_id === searchId ||
            c.senate_committee_id === searchId
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
              const committeeParty = memberCommittee.party;
              const actualParty =
                committee.type === 'senate'
                  ? committeeParty === 'majority'
                    ? 'Republican'
                    : representative.party
                  : committeeParty === 'majority'
                    ? 'Republican'
                    : representative.party;

              const correctedRepresentative = {
                ...representative,
                party: actualParty,
              };

              const member: CommitteeMember = {
                representative: correctedRepresentative,
                role: normalizedRole,
                joinedDate: '2023-01-03',
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
              const subcommitteeFullId = `${committee.thomas_id}${subcommittee.thomas_id}`;
              const memberSubcommittee = membership.committees.find(
                c => c.thomas_id === subcommitteeFullId
              );

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

                  const subCommitteeParty = memberSubcommittee.party;
                  const subActualParty =
                    committee.type === 'senate'
                      ? subCommitteeParty === 'majority'
                        ? 'Republican'
                        : representative.party
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

        // If no chair/ranking member found, assign based on party
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

        // Clean up verbose jurisdiction text
        let cleanJurisdiction = committee.jurisdiction || `${committee.name} jurisdiction`;
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
              const subChair = subMembers.find(m => m.role === 'Chair');
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

        // If this was a subcommittee request, return subcommittee-focused response
        if (subcommitteeInfo.isSubcommittee && committee.subcommittees) {
          const targetSubcommittee = committee.subcommittees.find(
            sub => sub.thomas_id === subcommitteeInfo.subcommitteeNum
          );

          if (targetSubcommittee) {
            const subcommitteeFullId = `${committee.thomas_id}${targetSubcommittee.thomas_id}`;
            const subMembers = subcommitteeMembersMap.get(subcommitteeFullId) || [];
            const subChair = subMembers.find(m => m.role === 'Chair');
            const subRankingMember = subMembers.find(m => m.role === 'Ranking Member');

            logger.info('Returning subcommittee-focused response', {
              requestedId: committeeId,
              parentCommittee: committee.thomas_id,
              subcommitteeName: targetSubcommittee.name,
              subcommitteeMemberCount: subMembers.length,
            });

            const subcommitteeResult: Committee = {
              id: subcommitteeFullId,
              thomas_id: subcommitteeFullId,
              name: targetSubcommittee.name,
              chamber: result.chamber,
              jurisdiction: `Subcommittee of ${committee.name}. Parent committee: ${committee.thomas_id}`,
              type: 'Select',
              leadership: {
                chair: subChair,
                rankingMember: subRankingMember,
              },
              members: subMembers,
              subcommittees: [],
              url: `https://www.congress.gov/committee/${committee.thomas_id.toLowerCase()}`,
              lastUpdated: new Date().toISOString(),
            };

            return subcommitteeResult;
          }
        }

        return result;
      } catch (error) {
        logger.error('Error fetching committee from Congress.gov', error as Error, {
          committeeId,
        });
        return null;
      }
    },
    24 * 60 * 60 * 1000 // 24 hour cache
  );
}

// Generate empty committee data when real data is unavailable
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
    members: [],
    subcommittees: [],
    url: `https://www.congress.gov/committee/${committeeId.toLowerCase()}`,
    lastUpdated: new Date().toISOString(),
  };
}

// Helper function to resolve committee ID from various formats
export function resolveCommitteeId(inputId: string): string {
  const upperInputId = inputId.toUpperCase();

  // Special case mappings
  const redirectMappings: Record<string, string> = {
    HSHL: 'HSHM',
  };

  if (redirectMappings[upperInputId]) {
    return redirectMappings[upperInputId];
  }

  // Check if this is a subcommittee ID pattern (4 letters + 2 digits)
  const subcommitteePattern = /^[A-Z]{4}\d{2}$/;
  if (subcommitteePattern.test(upperInputId)) {
    return upperInputId;
  }

  // Try exact match first
  if (COMMITTEE_ID_MAP[upperInputId]) {
    return upperInputId;
  }

  // Try base ID without numbers
  const baseId = upperInputId.replace(/\d+$/, '');
  if (COMMITTEE_ID_MAP[baseId]) {
    return baseId;
  }

  // Try to find by name matching
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

  return inputId;
}

/**
 * Get committee data - main entry point
 * Used by both API routes and server components
 */
export async function getCommitteeDataService(
  rawCommitteeId: string,
  bypassCache = false
): Promise<Committee | null> {
  const committeeId = resolveCommitteeId(rawCommitteeId);

  logger.info('Committee service request', {
    rawCommitteeId,
    resolvedCommitteeId: committeeId,
    wasResolved: rawCommitteeId !== committeeId,
    bypassCache,
  });

  // If cache bypass requested, delete cached entry first
  if (bypassCache) {
    const cacheKey = `committee-real-${committeeId}`;
    await cache.delete(cacheKey);
    logger.info('Cache bypassed - deleted cached entry', { cacheKey });
  }

  let committee: Committee | null = null;

  // First try to get hardcoded committee data (for clean jurisdiction text)
  const hardcodedCommittee = await getHardcodedCommitteeData(committeeId);

  // Always try to get real member data from congress-legislators
  const realCommittee = await fetchCommitteeFromCongressLegislators(committeeId);

  // Merge hardcoded data (jurisdiction) with real data (members, leadership)
  if (hardcodedCommittee && realCommittee) {
    committee = {
      ...realCommittee,
      jurisdiction: hardcodedCommittee.jurisdiction,
    };
  } else if (realCommittee) {
    committee = realCommittee;
  } else if (hardcodedCommittee) {
    committee = hardcodedCommittee;
  }

  // Return empty data instead of null if nothing found
  if (!committee) {
    logger.warn('Committee data unavailable from all sources', { committeeId });
    committee = generateEmptyCommitteeData(committeeId);
  }

  return committee;
}

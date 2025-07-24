/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

interface CommitteeMember {
  name: string;
  bioguideId: string;
  party: string;
  state: string;
  rank: number;
}

interface Committee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
  type: 'standing' | 'select' | 'special' | 'joint';
  jurisdiction: string;
  establishedDate?: string;
  parentCommittee?: string;
  website?: string;
  isSubcommittee: boolean;
  chair?: {
    name: string;
    bioguideId?: string;
    party: string;
    state: string;
  };
  rankingMember?: {
    name: string;
    bioguideId?: string;
    party: string;
    state: string;
  };
  memberCount?: {
    total: number;
    majority: number;
    minority: number;
  };
  subcommittees?: Array<{
    code: string;
    name: string;
    chair?: {
      name: string;
      bioguideId?: string;
      party: string;
    };
  }>;
}

interface _CommitteeDirectory {
  houseCommittees: Committee[];
  senateCommittees: Committee[];
  jointCommittees: Committee[];
  statistics: {
    totalCommittees: number;
    totalSubcommittees: number;
    houseCount: number;
    senateCount: number;
    jointCount: number;
  };
  metadata: {
    lastUpdated: string;
    dataSource: string;
    congress: string;
  };
}

// Helper function to determine committee jurisdiction
function getJurisdiction(committeeName: string): string {
  const jurisdictions: Record<string, string> = {
    agriculture: 'Agriculture, nutrition, and forestry policy',
    appropriations: 'Federal government spending and budget allocation',
    'armed services': 'Military affairs, defense policy, and national security',
    banking: 'Banking, housing, and urban affairs',
    budget: 'Federal budget process and fiscal policy',
    commerce: 'Interstate and foreign commerce regulation',
    education: 'Education policy and workforce development',
    energy: 'Energy policy, production, and commerce',
    environment: 'Environmental protection and public works',
    ethics: 'Congressional ethics and conduct',
    finance: 'Taxation, customs, and revenue measures',
    foreign: 'Foreign relations and international affairs',
    health: 'Public health policy and healthcare systems',
    homeland: 'Homeland security and government affairs',
    'house administration': 'House operations and administration',
    intelligence: 'Intelligence activities and oversight',
    judiciary: 'Federal courts, civil rights, and immigration',
    'natural resources': 'Public lands and natural resources',
    oversight: 'Government operations and oversight',
    rules: 'Congressional procedures and rules',
    science: 'Science, space, and technology policy',
    'small business': 'Small business development and support',
    transportation: 'Transportation and infrastructure policy',
    veterans: 'Veterans affairs and benefits',
    'ways and means': 'Taxation, trade, and social security',
  };

  const lowerName = committeeName.toLowerCase();
  for (const [key, jurisdiction] of Object.entries(jurisdictions)) {
    if (lowerName.includes(key)) {
      return jurisdiction;
    }
  }
  return 'General legislative oversight and policy development';
}

// Helper function to categorize committee type
function getCommitteeType(committeeName: string): Committee['type'] {
  const lowerName = committeeName.toLowerCase();

  if (lowerName.includes('joint')) {
    return 'joint';
  } else if (lowerName.includes('select') || lowerName.includes('special')) {
    return 'select';
  }
  return 'standing';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const chamber = searchParams.get('chamber') as 'house' | 'senate' | 'joint' | null;
  const includeSubcommittees = searchParams.get('includeSubcommittees') !== 'false';
  const includeMembers = searchParams.get('includeMembers') === 'true';

  try {
    structuredLogger.info('Fetching committee directory', {
      chamber,
      includeSubcommittees,
      includeMembers,
    });

    const committeeData = await cachedFetch(
      `committees-directory-${chamber || 'all'}-${includeSubcommittees}-${includeMembers}`,
      async () => {
        if (!process.env.CONGRESS_API_KEY) {
          throw new Error('Congress API key not configured');
        }

        const committees: Committee[] = [];
        const chambersToFetch = chamber ? [chamber] : ['house', 'senate'];

        // Fetch committees for each chamber
        for (const chamberName of chambersToFetch) {
          try {
            const response = await fetch(
              `https://api.congress.gov/v3/committee/${chamberName}?api_key=${process.env.CONGRESS_API_KEY}&limit=100&format=json`,
              {
                headers: {
                  'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
                },
              }
            );

            const monitor = monitorExternalApi(
              'congress',
              `${chamberName}-committees`,
              response.url
            );

            if (!response.ok) {
              monitor.end(false, response.status);
              structuredLogger.warn(`Failed to fetch ${chamberName} committees`, {
                status: response.status,
                statusText: response.statusText,
              });
              continue;
            }

            const data = await response.json();
            monitor.end(true, 200);

            structuredLogger.info(`Retrieved ${chamberName} committees`, {
              count: data.committees?.length || 0,
            });

            // Process each committee
            if (data.committees) {
              for (const committee of data.committees) {
                const committeeInfo: Committee = {
                  code: committee.systemCode || committee.code || '',
                  name: committee.name,
                  chamber:
                    chamberName === 'house'
                      ? 'House'
                      : chamberName === 'senate'
                        ? 'Senate'
                        : 'Joint',
                  type: getCommitteeType(committee.name),
                  jurisdiction: getJurisdiction(committee.name),
                  establishedDate: committee.establishedDate,
                  website: committee.url,
                  isSubcommittee: false,
                  subcommittees: [],
                };

                // Fetch committee membership if requested
                if (includeMembers && committee.systemCode) {
                  try {
                    const membersResponse = await fetch(
                      `https://api.congress.gov/v3/committee/${chamberName}/${committee.systemCode}/members?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
                      {
                        headers: {
                          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
                        },
                      }
                    );

                    if (membersResponse.ok) {
                      const membersData = await membersResponse.json();
                      const members = membersData.members || [];

                      // Find chair and ranking member
                      const chair = members.find((m: CommitteeMember) => m.rank === 1);
                      const rankingMember =
                        members.find(
                          (m: CommitteeMember) => m.rank === 1 && m.party !== chair?.party
                        ) || members.find((m: CommitteeMember) => m.rank === 2);

                      if (chair) {
                        committeeInfo.chair = {
                          name: chair.name,
                          bioguideId: chair.bioguideId,
                          party: chair.party,
                          state: chair.state,
                        };
                      }

                      if (rankingMember) {
                        committeeInfo.rankingMember = {
                          name: rankingMember.name,
                          bioguideId: rankingMember.bioguideId,
                          party: rankingMember.party,
                          state: rankingMember.state,
                        };
                      }

                      // Calculate member counts
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const partyBreakdown = members.reduce((acc: any, member: any) => {
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                        acc[member.party] = (acc[member.party] || 0) + 1;
                        return acc;
                      }, {});

                      const partyCounts = Object.values(partyBreakdown) as number[];
                      committeeInfo.memberCount = {
                        total: members.length,
                        majority: partyCounts.length > 0 ? Math.max(...partyCounts) : 0,
                        minority: partyCounts.length > 0 ? Math.min(...partyCounts) : 0,
                      };
                    }
                  } catch (error) {
                    structuredLogger.warn('Failed to fetch committee members', {
                      committee: committee.systemCode,
                      error: (error as Error).message,
                    });
                  }
                }

                // Fetch subcommittees if requested
                if (includeSubcommittees && committee.systemCode) {
                  try {
                    const subcommitteeResponse = await fetch(
                      `https://api.congress.gov/v3/committee/${chamberName}/${committee.systemCode}/subcommittees?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
                      {
                        headers: {
                          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
                        },
                      }
                    );

                    if (subcommitteeResponse.ok) {
                      const subcommitteeData = await subcommitteeResponse.json();

                      if (subcommitteeData.subcommittees) {
                        for (const subcommittee of subcommitteeData.subcommittees) {
                          const subcommitteeInfo: {
                            code: string;
                            name: string;
                            chair?: {
                              name: string;
                              bioguideId?: string;
                              party: string;
                            };
                          } = {
                            code: subcommittee.systemCode,
                            name: subcommittee.name,
                          };

                          // Fetch subcommittee chair if including members
                          if (includeMembers && subcommittee.systemCode) {
                            try {
                              const subMembersResponse = await fetch(
                                `https://api.congress.gov/v3/committee/${chamberName}/${committee.systemCode}/subcommittees/${subcommittee.systemCode}/members?api_key=${process.env.CONGRESS_API_KEY}&format=json`,
                                {
                                  headers: {
                                    'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
                                  },
                                }
                              );

                              if (subMembersResponse.ok) {
                                const subMembersData = await subMembersResponse.json();
                                const subChair = subMembersData.members?.find(
                                  (m: CommitteeMember) => m.rank === 1
                                );

                                if (subChair) {
                                  subcommitteeInfo.chair = {
                                    name: subChair.name,
                                    bioguideId: subChair.bioguideId,
                                    party: subChair.party,
                                  };
                                }
                              }
                            } catch {
                              // Silently continue if subcommittee member fetch fails
                            }
                          }

                          committeeInfo.subcommittees!.push(subcommitteeInfo);
                        }
                      }
                    }
                  } catch (error) {
                    structuredLogger.warn('Failed to fetch subcommittees', {
                      committee: committee.systemCode,
                      error: (error as Error).message,
                    });
                  }
                }

                committees.push(committeeInfo);
              }
            }
          } catch (error) {
            structuredLogger.error(`Error fetching ${chamberName} committees`, error as Error);
          }
        }

        // Fetch joint committees
        if (!chamber || chamber === 'joint') {
          try {
            const jointResponse = await fetch(
              `https://api.congress.gov/v3/committee/joint?api_key=${process.env.CONGRESS_API_KEY}&limit=50&format=json`,
              {
                headers: {
                  'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
                },
              }
            );

            if (jointResponse.ok) {
              const jointData = await jointResponse.json();

              if (jointData.committees) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                jointData.committees.forEach((committee: any) => {
                  committees.push({
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    code: committee.systemCode || committee.code || '',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    name: committee.name,
                    chamber: 'Joint',
                    type: 'joint',
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    jurisdiction: getJurisdiction(committee.name),
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    establishedDate: committee.establishedDate,
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    website: committee.url,
                    isSubcommittee: false,
                    subcommittees: [],
                  });
                });
              }
            }
          } catch (error) {
            structuredLogger.warn('Failed to fetch joint committees', {
              error: (error as Error).message,
            });
          }
        }

        // Sort committees by chamber and name
        committees.sort((a, b) => {
          if (a.chamber !== b.chamber) {
            const order = { House: 0, Senate: 1, Joint: 2 };
            return order[a.chamber] - order[b.chamber];
          }
          return a.name.localeCompare(b.name);
        });

        // Separate by chamber
        const houseCommittees = committees.filter(c => c.chamber === 'House');
        const senateCommittees = committees.filter(c => c.chamber === 'Senate');
        const jointCommittees = committees.filter(c => c.chamber === 'Joint');

        // Calculate statistics
        const totalSubcommittees = committees.reduce(
          (sum, c) => sum + (c.subcommittees?.length || 0),
          0
        );

        const currentCongress =
          new Date().getFullYear() % 2 === 0
            ? Math.floor((new Date().getFullYear() - 1788) / 2)
            : Math.floor((new Date().getFullYear() - 1787) / 2);

        return {
          houseCommittees,
          senateCommittees,
          jointCommittees,
          statistics: {
            totalCommittees: committees.length,
            totalSubcommittees,
            houseCount: houseCommittees.length,
            senateCount: senateCommittees.length,
            jointCount: jointCommittees.length,
          },
          metadata: {
            lastUpdated: new Date().toISOString(),
            dataSource: 'congress.gov',
            congress: `${currentCongress}th Congress`,
          },
        };
      },
      2 * 60 * 60 * 1000 // 2 hour cache
    );

    structuredLogger.info('Successfully processed committee directory', {
      totalCommittees: committeeData.statistics.totalCommittees,
      chamber,
      includeSubcommittees,
      includeMembers,
    });

    return NextResponse.json(committeeData);
  } catch (error) {
    structuredLogger.error('Committee directory API error', error as Error, {
      chamber,
      includeSubcommittees,
      includeMembers,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch committee directory',
        message: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

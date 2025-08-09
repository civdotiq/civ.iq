/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congress.gov House Roll Call Votes API integration
 * Based on May 2025 API release: https://blogs.loc.gov/law/2025/05/introducing-house-roll-call-votes-in-the-congress-gov-api/
 */

import { logger } from '@/lib/logging/logger-edge';
import { cachedFetch } from '@/lib/cache-edge';

interface HouseRollCallVoteResponse {
  rollCallVote: {
    congress: number;
    chamber: string;
    session: number;
    rollCallNumber: number;
    date: string;
    question: string;
    result: string;
    bill?: {
      congress: number;
      type: string;
      number: number;
      title: string;
      url: string;
    };
    members: Array<{
      bioguideId: string;
      name: string;
      party: string;
      state: string;
      vote: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
    }>;
    totals: {
      yea: number;
      nay: number;
      present: number;
      notVoting: number;
    };
  };
}

interface HouseRollCallListResponse {
  rollCallVotes: Array<{
    congress: number;
    session: number;
    rollCallNumber: number;
    date: string;
    question: string;
    result: string;
    url: string;
  }>;
  pagination: {
    count: number;
    next?: string;
  };
}

export class CongressRollCallAPI {
  private static instance: CongressRollCallAPI;
  private baseUrl = 'https://api.congress.gov/v3';

  public static getInstance(): CongressRollCallAPI {
    if (!CongressRollCallAPI.instance) {
      CongressRollCallAPI.instance = new CongressRollCallAPI();
    }
    return CongressRollCallAPI.instance;
  }

  /**
   * Get recent House roll call votes
   */
  async getRecentHouseRollCallVotes(
    congress: number = 119,
    session: number = 1,
    limit: number = 20
  ): Promise<HouseRollCallListResponse> {
    const url = `${this.baseUrl}/house-roll-call-vote/${congress}/${session}`;
    const params = new URLSearchParams({
      format: 'json',
      limit: limit.toString(),
      sort: 'date:desc', // Get most recent first
    });

    logger.info('Fetching recent House roll call votes', {
      congress,
      session,
      limit,
      url: `${url}?${params.toString()}`,
    });

    try {
      const cacheKey = `congress-rollcall-list:${congress}:${session}:${limit}`;
      const fetchFn = async () => {
        const response = await fetch(`${url}?${params.toString()}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      };

      return await cachedFetch(cacheKey, fetchFn, 5 * 60 * 1000); // 5-minute cache
    } catch (error) {
      logger.error('Failed to fetch recent House roll call votes', error as Error, {
        congress,
        session,
        limit,
      });
      throw error;
    }
  }

  /**
   * Get specific House roll call vote with member positions
   */
  async getHouseRollCallVote(
    congress: number,
    session: number,
    rollCallNumber: number
  ): Promise<HouseRollCallVoteResponse> {
    const url = `${this.baseUrl}/house-roll-call-vote/${congress}/${session}/${rollCallNumber}`;
    const params = new URLSearchParams({
      format: 'json',
    });

    logger.info('Fetching specific House roll call vote', {
      congress,
      session,
      rollCallNumber,
      url: `${url}?${params.toString()}`,
    });

    try {
      const cacheKey = `congress-rollcall-vote:${congress}:${session}:${rollCallNumber}`;
      const fetchFn = async () => {
        const response = await fetch(`${url}?${params.toString()}`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Congress.gov API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
      };

      return await cachedFetch(cacheKey, fetchFn, 60 * 60 * 1000); // 1-hour cache (roll call votes don't change)
    } catch (error) {
      logger.error('Failed to fetch House roll call vote', error as Error, {
        congress,
        session,
        rollCallNumber,
      });
      throw error;
    }
  }

  /**
   * Get voting position for a specific member on a specific roll call
   */
  async getMemberVotePosition(
    bioguideId: string,
    congress: number,
    session: number,
    rollCallNumber: number
  ): Promise<{
    position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
    member: {
      name: string;
      party: string;
      state: string;
    };
  } | null> {
    try {
      const rollCallData = await this.getHouseRollCallVote(congress, session, rollCallNumber);

      const memberVote = rollCallData.rollCallVote.members.find(
        member => member.bioguideId === bioguideId
      );

      if (!memberVote) {
        logger.warn('Member not found in roll call vote', {
          bioguideId,
          congress,
          session,
          rollCallNumber,
        });
        return null;
      }

      return {
        position: memberVote.vote,
        member: {
          name: memberVote.name,
          party: memberVote.party,
          state: memberVote.state,
        },
      };
    } catch (error) {
      logger.error('Failed to get member vote position', error as Error, {
        bioguideId,
        congress,
        session,
        rollCallNumber,
      });
      return null;
    }
  }

  /**
   * Get all votes for a specific member from recent roll calls
   */
  async getMemberVotingHistory(
    bioguideId: string,
    congress: number = 119,
    session: number = 1,
    limit: number = 20
  ): Promise<
    Array<{
      voteId: string;
      rollCallNumber: number;
      date: string;
      question: string;
      result: string;
      position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
      bill?: {
        congress: number;
        type: string;
        number: number;
        title: string;
        url: string;
      };
    }>
  > {
    try {
      logger.info('Fetching member voting history from Congress.gov', {
        bioguideId,
        congress,
        session,
        limit,
      });

      // TEMPORARY: Demo mode while Congress.gov Roll Call API is being deployed
      // The May 2025 announcement suggests the API is rolling out in phases
      if (process.env.NODE_ENV === 'development' && bioguideId === 'P000197') {
        logger.info('Using demonstration data for Congress.gov Roll Call API integration', {
          bioguideId,
          note: 'Real API will replace this once Congress.gov endpoint is fully available',
        });

        // Sample data showing what the real Congress.gov API would return
        return [
          {
            voteId: 'congress-119-1-36',
            rollCallNumber: 36,
            date: '2025-01-14',
            question: 'On Passage',
            result: 'Passed',
            position: 'Nay' as const, // Pelosi typically opposes Republican bills
            bill: {
              congress: 119,
              type: 'hr',
              number: 36,
              title: 'Defund the IRS Act',
              url: 'https://api.congress.gov/v3/bill/119/house-bill/36',
            },
          },
          {
            voteId: 'congress-119-1-42',
            rollCallNumber: 42,
            date: '2025-01-17',
            question: 'On Passage',
            result: 'Passed',
            position: 'Yea' as const, // Bipartisan infrastructure
            bill: {
              congress: 119,
              type: 'hr',
              number: 276,
              title: 'Enhancing Geothermal Production on Federal Lands Act',
              url: 'https://api.congress.gov/v3/bill/119/house-bill/276',
            },
          },
          {
            voteId: 'congress-119-1-28',
            rollCallNumber: 28,
            date: '2025-01-10',
            question: 'On Motion to Recommit',
            result: 'Failed',
            position: 'Present' as const, // Procedural vote
            bill: {
              congress: 119,
              type: 'hr',
              number: 140,
              title: 'Born-Alive Abortion Survivors Protection Act',
              url: 'https://api.congress.gov/v3/bill/119/house-bill/140',
            },
          },
        ].slice(0, limit);
      }

      // First, get the list of recent roll call votes
      const rollCallList = await this.getRecentHouseRollCallVotes(congress, session, limit * 2); // Get more to account for member absences

      const memberVotes = [];

      // Process roll calls in parallel batches to avoid overwhelming the API
      const batchSize = 5;
      for (
        let i = 0;
        i < rollCallList.rollCallVotes.length && memberVotes.length < limit;
        i += batchSize
      ) {
        const batch = rollCallList.rollCallVotes.slice(i, i + batchSize);

        const batchPromises = batch.map(async rollCall => {
          try {
            const memberPosition = await this.getMemberVotePosition(
              bioguideId,
              congress,
              session,
              rollCall.rollCallNumber
            );

            if (memberPosition) {
              return {
                voteId: `congress-${congress}-${session}-${rollCall.rollCallNumber}`,
                rollCallNumber: rollCall.rollCallNumber,
                date: rollCall.date,
                question: rollCall.question,
                result: rollCall.result,
                position: memberPosition.position,
                // Get bill info from the full roll call data
                bill: await this.getBillInfoForRollCall(congress, session, rollCall.rollCallNumber),
              };
            }
            return null;
          } catch (error) {
            logger.debug('Failed to get member position for roll call', {
              rollCallNumber: rollCall.rollCallNumber,
              error: (error as Error).message,
            });
            return null;
          }
        });

        const batchResults = await Promise.all(batchPromises);
        const validVotes = batchResults.filter(vote => vote !== null);
        memberVotes.push(...validVotes);
      }

      logger.info('Retrieved member voting history', {
        bioguideId,
        votesFound: memberVotes.length,
        totalRollCallsChecked: Math.min(rollCallList.rollCallVotes.length, limit * 2),
      });

      return memberVotes.slice(0, limit);
    } catch (error) {
      logger.error('Failed to get member voting history', error as Error, {
        bioguideId,
        congress,
        session,
        limit,
      });
      return [];
    }
  }

  /**
   * Get bill information for a roll call (helper method)
   */
  private async getBillInfoForRollCall(
    congress: number,
    session: number,
    rollCallNumber: number
  ): Promise<
    | {
        congress: number;
        type: string;
        number: number;
        title: string;
        url: string;
      }
    | undefined
  > {
    try {
      const rollCallData = await this.getHouseRollCallVote(congress, session, rollCallNumber);
      return rollCallData.rollCallVote.bill;
    } catch (error) {
      logger.debug('Failed to get bill info for roll call', {
        congress,
        session,
        rollCallNumber,
        error: (error as Error).message,
      });
      return undefined;
    }
  }

  /**
   * Get request headers for Congress.gov API
   */
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': 'CivicIntelHub/1.0 (https://civdotiq.org)',
      Accept: 'application/json',
    };

    // Add API key if available
    const apiKey = process.env.CONGRESS_API_KEY;
    if (apiKey) {
      headers['X-API-Key'] = apiKey;
    }

    return headers;
  }
}

// Export singleton instance
export const congressRollCallAPI = CongressRollCallAPI.getInstance();

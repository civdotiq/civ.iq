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
  houseRollCallVote: {
    congress: number;
    sessionNumber: number;
    rollCallNumber: number;
    startDate: string;
    voteQuestion: string;
    result: string;
    legislationType?: string;
    legislationNumber?: string;
    legislationUrl?: string;
    votePartyTotal: Array<{
      party: {
        name: string;
        type: string;
      };
      yeaTotal: number;
      nayTotal: number;
      presentTotal: number;
      notVotingTotal: number;
    }>;
    // Members data not included in basic response - would need separate endpoint
  };
}

interface HouseRollCallListResponse {
  houseRollCallVotes: Array<{
    congress: number;
    sessionNumber: number;
    rollCallNumber: number;
    startDate: string;
    voteQuestion?: string;
    result: string;
    url: string;
    legislationType?: string;
    legislationNumber?: string;
    legislationUrl?: string;
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
    // CORRECTED: Using actual working Congress.gov API endpoint
    const url = `${this.baseUrl}/house-vote/${congress}/${session}`;
    const params = new URLSearchParams({
      format: 'json',
      limit: limit.toString(),
      // Note: sort parameter may not be supported, will test without it first
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
    // CORRECTED: Using actual working Congress.gov API endpoint
    const url = `${this.baseUrl}/house-vote/${congress}/${session}/${rollCallNumber}`;
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
      // NOTE: Congress.gov House Roll Call API doesn't include individual member votes in JSON response
      // Would need to parse XML from sourceDataURL for individual member positions
      logger.warn('Individual member votes not available in Congress.gov JSON API', {
        bioguideId,
        congress,
        session,
        rollCallNumber,
        note: 'Would need XML parsing from houseRollCallVote.sourceDataURL',
      });
      return null;

      // NOTE: XML parsing from Congress.gov sourceDataURL would be needed
      // const rollCallData = await this.getHouseRollCallVote(congress, session, rollCallNumber);
      // Parse XML from rollCallData.houseRollCallVote.sourceDataURL
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

      // NOTE: Congress.gov House Roll Call API JSON response doesn't include individual member votes
      // Individual votes would require XML parsing from sourceDataURL

      logger.info('House Roll Call individual member votes require XML parsing implementation', {
        bioguideId,
        congress,
        session,
        limit,
        note: 'JSON API only provides vote summaries, not individual member positions',
      });

      // Return empty array for now - individual House member votes need XML parsing
      // This maintains API compatibility while indicating the limitation
      return [];
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

      // Transform Congress.gov response to expected bill format
      if (
        rollCallData.houseRollCallVote.legislationType &&
        rollCallData.houseRollCallVote.legislationNumber
      ) {
        return {
          congress,
          type: rollCallData.houseRollCallVote.legislationType,
          number: parseInt(rollCallData.houseRollCallVote.legislationNumber),
          title: `${rollCallData.houseRollCallVote.legislationType} ${rollCallData.houseRollCallVote.legislationNumber}`,
          url: rollCallData.houseRollCallVote.legislationUrl || '',
        };
      }

      return undefined;
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

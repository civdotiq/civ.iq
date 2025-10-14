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
    sourceDataURL?: string; // XML URL for individual member votes
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

      // First, get the list of recent roll call votes to get sourceDataURLs
      const rollCallList = await this.getRecentHouseRollCallVotes(congress, session, limit);

      if (!rollCallList.houseRollCallVotes || rollCallList.houseRollCallVotes.length === 0) {
        logger.warn('No House roll call votes found', { congress, session });
        return [];
      }

      const memberVotes: Array<{
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
      }> = [];

      // Process votes in batches to avoid overwhelming the XML parsing
      const maxVotes = Math.min(limit, rollCallList.houseRollCallVotes.length);

      for (let i = 0; i < maxVotes; i++) {
        const rollCallVote = rollCallList.houseRollCallVotes[i];
        if (!rollCallVote) continue;

        try {
          // Get detailed vote info including sourceDataURL
          const voteDetails = await this.getHouseRollCallVote(
            congress,
            session,
            rollCallVote.rollCallNumber
          );

          // Parse XML from sourceDataURL to get individual member votes
          if (voteDetails.houseRollCallVote.sourceDataURL) {
            const memberVote = await this.parseHouseRollCallXML(
              voteDetails.houseRollCallVote.sourceDataURL,
              bioguideId
            );

            if (memberVote) {
              memberVotes.push({
                voteId: `congress-${congress}-${session}-${rollCallVote.rollCallNumber}`,
                rollCallNumber: rollCallVote.rollCallNumber,
                date: rollCallVote.startDate?.split('T')[0] || 'Unknown',
                question: voteDetails.houseRollCallVote.voteQuestion || 'House Vote',
                result: rollCallVote.result,
                position: memberVote.position,
                bill:
                  voteDetails.houseRollCallVote.legislationType &&
                  voteDetails.houseRollCallVote.legislationNumber
                    ? {
                        congress,
                        type: voteDetails.houseRollCallVote.legislationType,
                        number: parseInt(voteDetails.houseRollCallVote.legislationNumber),
                        title: `${voteDetails.houseRollCallVote.legislationType} ${voteDetails.houseRollCallVote.legislationNumber}`,
                        url: voteDetails.houseRollCallVote.legislationUrl || '',
                      }
                    : undefined,
              });
            }
          }
        } catch (error) {
          logger.debug('Failed to process House roll call vote', {
            rollCallNumber: rollCallVote.rollCallNumber,
            error: (error as Error).message,
          });
        }
      }

      logger.info('House Roll Call votes processed', {
        bioguideId,
        totalVotes: rollCallList.houseRollCallVotes.length,
        memberVotesFound: memberVotes.length,
      });

      return memberVotes;
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
   * Parse House Roll Call XML to extract individual member vote
   */
  private async parseHouseRollCallXML(
    sourceDataURL: string,
    bioguideId: string
  ): Promise<{ position: 'Yea' | 'Nay' | 'Not Voting' | 'Present' } | null> {
    try {
      logger.debug('Parsing House Roll Call XML', { sourceDataURL, bioguideId });

      const response = await fetch(sourceDataURL);
      if (!response.ok) {
        throw new Error(`Failed to fetch XML: ${response.status}`);
      }

      const xmlText = await response.text();

      // Parse XML to find the specific member's vote
      // Actual structure: <recorded-vote><legislator name-id="A000370"...>Adams</legislator><vote>Present</vote></recorded-vote>
      const memberPattern = new RegExp(
        `<recorded-vote><legislator name-id="${bioguideId}"[^>]*>.*?</legislator><vote>([^<]+)</vote></recorded-vote>`,
        'i'
      );

      const match = xmlText.match(memberPattern);

      if (match && match[1]) {
        const votePosition = match[1].trim();

        // Map XML vote values to our standard format
        let position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
        switch (votePosition) {
          case 'Yea':
            position = 'Yea';
            break;
          case 'Nay':
            position = 'Nay';
            break;
          case 'Present':
            position = 'Present';
            break;
          case 'Not Voting':
          default:
            position = 'Not Voting';
            break;
        }

        logger.debug('Found member vote in XML', { bioguideId, position });
        return { position };
      }

      logger.debug('Member not found in XML', { bioguideId, sourceDataURL });
      return null;
    } catch (error) {
      logger.error('Failed to parse House Roll Call XML', error as Error, {
        sourceDataURL,
        bioguideId,
      });
      return null;
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

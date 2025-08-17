/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Real voting data service using Congress.gov bills and roll call parsing
 * Aggregates voting records from multiple sources to provide comprehensive data
 */

import { congressApi } from './congress-api';
import { parseRollCallXML } from '../../legislation/services/rollcall-parser';
import { logger } from '@/lib/logging/logger-edge';
import { cachedFetch } from '@/lib/cache-edge';

interface BillSummary {
  congress?: string;
  type?: string;
  number?: string;
  title?: string;
  url?: string;
}

interface BillDetails {
  congress?: number;
  type?: string;
  number?: number;
  title?: string;
  url?: string;
  actions?: Array<{
    actionDate?: string;
    text?: string;
    recordedVotes?: Array<{
      chamber?: string;
      congress?: number;
      date?: string;
      rollNumber?: number;
      url?: string;
      result?: string;
    }>;
  }>;
}

export interface VotingRecord {
  voteId: string;
  bill: {
    number: string;
    title: string;
    congress: string;
    type: string;
    url?: string;
  };
  question: string;
  result: string;
  date: string;
  position: 'Yea' | 'Nay' | 'Not Voting' | 'Present';
  chamber: 'House' | 'Senate';
  rollNumber?: number;
  isKeyVote?: boolean;
  description?: string;
  category?:
    | 'Budget'
    | 'Healthcare'
    | 'Defense'
    | 'Infrastructure'
    | 'Immigration'
    | 'Environment'
    | 'Education'
    | 'Other';
  partyBreakdown?: {
    democratic: { yea: number; nay: number; present: number; notVoting: number };
    republican: { yea: number; nay: number; present: number; notVoting: number };
    independent: { yea: number; nay: number; present: number; notVoting: number };
  };
  metadata?: {
    sourceUrl?: string;
    lastUpdated?: string;
    confidence?: 'high' | 'medium' | 'low';
  };
}

export interface VotingDataResult {
  votes: VotingRecord[];
  source: 'congress-api' | 'roll-call' | 'mixed' | 'fallback';
  totalFound: number;
  cacheStatus: string;
}

export class VotingDataService {
  private static instance: VotingDataService;

  public static getInstance(): VotingDataService {
    if (!VotingDataService.instance) {
      VotingDataService.instance = new VotingDataService();
    }
    return VotingDataService.instance;
  }

  /**
   * Get voting records for a member using multiple strategies
   */
  async getVotingRecords(
    bioguideId: string,
    chamber: 'House' | 'Senate',
    limit: number = 20
  ): Promise<VotingDataResult> {
    logger.info('Starting comprehensive voting data fetch', {
      bioguideId,
      chamber,
      limit,
    });

    try {
      // Strategy 1: Bill-based approach (get recent bills with recorded votes)
      const billBasedVotes = await this.getBillBasedVotes(bioguideId, chamber, limit);

      if (billBasedVotes.length >= 5) {
        logger.info('Bill-based approach successful', {
          bioguideId,
          votesFound: billBasedVotes.length,
        });

        return {
          votes: billBasedVotes.slice(0, limit),
          source: 'congress-api',
          totalFound: billBasedVotes.length,
          cacheStatus: 'Live voting data from Congress.gov bills',
        };
      }

      // Strategy 2: Recent roll call parsing (fallback)
      const rollCallVotes = await this.getRecentRollCallVotes(bioguideId, chamber, limit);

      if (rollCallVotes.length > 0) {
        logger.info('Roll call parsing successful', {
          bioguideId,
          votesFound: rollCallVotes.length,
        });

        return {
          votes: rollCallVotes.slice(0, limit),
          source: 'roll-call',
          totalFound: rollCallVotes.length,
          cacheStatus: 'Recent roll call data',
        };
      }

      // Strategy 3: Mixed approach (combine what we have)
      const combinedVotes = [...billBasedVotes, ...rollCallVotes]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      if (combinedVotes.length > 0) {
        return {
          votes: combinedVotes,
          source: 'mixed',
          totalFound: combinedVotes.length,
          cacheStatus: 'Mixed Congress.gov and roll call data',
        };
      }

      throw new Error('No voting data available from any source');
    } catch (error) {
      logger.warn('All voting data strategies failed', {
        bioguideId,
        error: (error as Error).message,
      });

      // Return empty result to trigger fallback
      return {
        votes: [],
        source: 'fallback',
        totalFound: 0,
        cacheStatus: 'No real data available',
      };
    }
  }

  /**
   * Strategy 1: Get votes from bill records with recorded votes
   */
  private async getBillBasedVotes(
    bioguideId: string,
    chamber: 'House' | 'Senate',
    limit: number
  ): Promise<VotingRecord[]> {
    try {
      // Get recent bills that passed through Congress - REDUCED for performance
      const billsToFetch = Math.min(limit, 10); // Limit to 10 bills max
      const bills = (await congressApi.getRecentBills(billsToFetch)) as BillSummary[];

      // Process bills in parallel batches of 3 to avoid overwhelming the API
      const batchSize = 3;
      const votes: VotingRecord[] = [];

      for (let i = 0; i < bills.length; i += batchSize) {
        if (votes.length >= limit) break;

        const batch = bills.slice(i, i + batchSize);
        const batchPromises = batch.map(async bill => {
          try {
            // Get detailed bill information including actions
            const billDetails = await congressApi.getBillDetails(
              bill.congress || '119',
              bill.type || 'hr',
              bill.number || ''
            );

            // Look for recorded votes in bill actions
            return await this.extractRecordedVotes(billDetails, bioguideId, chamber);
          } catch (billError) {
            logger.debug('Failed to get bill details', {
              billNumber: bill.number,
              error: (billError as Error).message,
            });
            return [];
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.all(batchPromises);
        for (const recordedVotes of batchResults) {
          votes.push(...recordedVotes);
          if (votes.length >= limit) break;
        }
      }

      return votes.slice(0, limit);
    } catch (error) {
      logger.warn('Bill-based vote extraction failed', {
        bioguideId,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Extract recorded votes from bill actions
   */
  private async extractRecordedVotes(
    billDetails: unknown,
    bioguideId: string,
    chamber: 'House' | 'Senate'
  ): Promise<VotingRecord[]> {
    const votes: VotingRecord[] = [];
    const details = billDetails as BillDetails;

    if (!details.actions?.length) return votes;

    // Look for actions with recorded votes
    for (const action of details.actions) {
      if (action.recordedVotes && action.recordedVotes.length > 0) {
        for (const recordedVote of action.recordedVotes) {
          // Check if this vote is for the right chamber
          if (recordedVote.chamber?.toLowerCase() !== chamber.toLowerCase()) continue;

          const vote: VotingRecord = {
            voteId: `${details.congress}-${details.type}-${details.number}-${recordedVote.rollNumber}`,
            bill: {
              number: `${(details.type || 'hr').toUpperCase()}. ${details.number || ''}`,
              title:
                details.title || `${(details.type || 'hr').toUpperCase()}. ${details.number || ''}`,
              congress: details.congress?.toString() || '119',
              type: details.type || 'hr',
              url: details.url,
            },
            question: action.text || 'On Passage',
            result: recordedVote.result || 'Unknown',
            date: (action.actionDate ?? new Date().toISOString().split('T')[0]) as string,
            position: await this.determineVotePosition(bioguideId, recordedVote),
            chamber: chamber,
            rollNumber: recordedVote.rollNumber,
            isKeyVote: this.isKeyVote(details),
            description: details.title || action.text,
            category: this.categorizeVote(details),
            metadata: {
              sourceUrl: recordedVote.url,
              lastUpdated: new Date().toISOString(),
              confidence: 'high',
            },
          };

          votes.push(vote);
        }
      }
    }

    return votes;
  }

  /**
   * Strategy 2: Get votes from recent roll call XML data
   */
  private async getRecentRollCallVotes(
    bioguideId: string,
    chamber: 'House' | 'Senate',
    limit: number
  ): Promise<VotingRecord[]> {
    const votes: VotingRecord[] = [];

    try {
      // Get recent roll call numbers for the chamber
      const rollCallNumbers = await this.getRecentRollCallNumbers(chamber);

      for (const rollNumber of rollCallNumbers.slice(0, Math.min(10, limit * 2))) {
        try {
          const rollCallUrl = this.buildRollCallUrl(chamber, rollNumber);
          const parsedVote = await parseRollCallXML(rollCallUrl);

          if (parsedVote) {
            // Find the member's vote in the votes array
            const memberVote = parsedVote.votes.find(v => v.memberId === bioguideId);

            if (memberVote) {
              const vote: VotingRecord = {
                voteId: `rollcall-${chamber.toLowerCase()}-${rollNumber}`,
                bill: {
                  number: parsedVote.bill?.number || `Roll Call ${rollNumber}`,
                  title: parsedVote.bill?.title || parsedVote.question || 'Congressional Vote',
                  congress: '119',
                  type: 'rollcall',
                },
                question: parsedVote.question || 'On Passage',
                result: parsedVote.result || 'Unknown',
                date: (parsedVote.date ?? new Date().toISOString().split('T')[0]) as string,
                position: memberVote.vote as 'Yea' | 'Nay' | 'Not Voting' | 'Present',
                chamber: chamber,
                rollNumber: rollNumber,
                isKeyVote: false,
                category: 'Other',
                // Party breakdown would need to be calculated from the votes array
                metadata: {
                  sourceUrl: rollCallUrl,
                  lastUpdated: new Date().toISOString(),
                  confidence: 'medium',
                },
              };

              votes.push(vote);
            }
          }
        } catch (rollError) {
          logger.debug('Failed to parse roll call', {
            rollNumber,
            error: (rollError as Error).message,
          });
          continue;
        }
      }
    } catch (error) {
      logger.warn('Roll call vote extraction failed', {
        bioguideId,
        error: (error as Error).message,
      });
    }

    return votes.slice(0, limit);
  }

  /**
   * Helper methods
   */
  private normalizeVotePosition(position: string): 'Yea' | 'Nay' | 'Not Voting' | 'Present' {
    if (!position) return 'Not Voting';

    const normalized = position.toLowerCase().trim();

    if (
      normalized === 'yea' ||
      normalized === 'aye' ||
      normalized === 'yes' ||
      normalized === 'y'
    ) {
      return 'Yea';
    } else if (normalized === 'nay' || normalized === 'no' || normalized === 'n') {
      return 'Nay';
    } else if (normalized === 'present' || normalized === 'p') {
      return 'Present';
    } else {
      return 'Not Voting';
    }
  }

  private async fetchAndParseRollCallData(
    url: string,
    bioguideId: string
  ): Promise<{ memberVote: string } | null> {
    try {
      const rollCallData = await parseRollCallXML(url);
      if (!rollCallData) return null;

      // Find the specific member's vote in the roll call data
      const memberVote = rollCallData.votes.find(vote => vote.memberId === bioguideId);

      return memberVote ? { memberVote: memberVote.vote } : null;
    } catch (error) {
      logger.debug('Failed to fetch roll call data', {
        url,
        bioguideId,
        error: (error as Error).message,
      });
      return null;
    }
  }

  private async determineVotePosition(
    bioguideId: string,
    recordedVote: unknown
  ): Promise<'Yea' | 'Nay' | 'Not Voting' | 'Present'> {
    try {
      const vote = recordedVote as {
        url?: string;
        votes?: Array<{ memberId?: string; position?: string }>;
      };

      // If we have a direct roll call URL, fetch and parse the actual vote data
      if (vote.url) {
        const rollCallData = await this.fetchAndParseRollCallData(vote.url, bioguideId);
        if (rollCallData?.memberVote) {
          return rollCallData.memberVote as 'Yea' | 'Nay' | 'Not Voting' | 'Present';
        }
      }

      // Fallback: try to extract vote information from the recorded vote object
      if (vote.votes && Array.isArray(vote.votes)) {
        const memberVote = vote.votes.find(v => v.memberId === bioguideId);

        if (memberVote?.position) {
          return this.normalizeVotePosition(memberVote.position);
        }
      }

      // If no specific vote data found, return Not Voting as safe default
      logger.warn('Could not determine vote position for member', {
        bioguideId,
        recordedVoteUrl: vote.url,
      });

      return 'Not Voting';
    } catch (error) {
      logger.error(
        'Error determining vote position',
        error instanceof Error ? error : new Error(String(error))
      );
      return 'Not Voting';
    }
  }

  private isKeyVote(billDetails: unknown): boolean {
    const details = billDetails as { title?: string };
    const keywordIndicators = [
      'appropriation',
      'budget',
      'defense authorization',
      'infrastructure',
    ];
    const title = (details.title || '').toLowerCase();
    return keywordIndicators.some(keyword => title.includes(keyword));
  }

  private categorizeVote(billDetails: unknown): VotingRecord['category'] {
    const details = billDetails as { title?: string };
    const title = (details.title || '').toLowerCase();

    if (title.includes('budget') || title.includes('appropriation')) return 'Budget';
    if (title.includes('health') || title.includes('medicare')) return 'Healthcare';
    if (title.includes('defense') || title.includes('military')) return 'Defense';
    if (title.includes('infrastructure') || title.includes('transportation'))
      return 'Infrastructure';
    if (title.includes('immigration') || title.includes('border')) return 'Immigration';
    if (title.includes('environment') || title.includes('climate')) return 'Environment';
    if (title.includes('education') || title.includes('student')) return 'Education';

    return 'Other';
  }

  private async getRecentRollCallNumbers(chamber: 'House' | 'Senate'): Promise<number[]> {
    // This would parse the roll call listing pages to get recent numbers
    // For now, return some recent roll call numbers
    const baseNumbers = chamber === 'House' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];
    return baseNumbers;
  }

  private buildRollCallUrl(chamber: 'House' | 'Senate', rollNumber: number): string {
    const year = new Date().getFullYear();

    if (chamber === 'House') {
      return `https://clerk.house.gov/evs/${year}/roll${rollNumber.toString().padStart(3, '0')}.xml`;
    } else {
      return `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${119}${1}/vote_${119}_${1}_${rollNumber.toString().padStart(5, '0')}.xml`;
    }
  }

  private async fetchRollCallXML(url: string): Promise<string | null> {
    try {
      const cacheKey = `rollcall:${url}`;
      const fetchFn = async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'CivicIntelHub/1.0 (https://civicintelhub.com)',
          },
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.text();
      };

      return await cachedFetch(cacheKey, fetchFn, 24 * 60 * 60); // 24 hour cache
    } catch (error) {
      logger.debug('Failed to fetch roll call XML', {
        url,
        error: (error as Error).message,
      });
      return null;
    }
  }
}

// Export singleton instance
export const votingDataService = VotingDataService.getInstance();

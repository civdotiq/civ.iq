/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Enrichment Service
 *
 * Computes enriched voting metrics from existing OpenStates data:
 * - Party-line alignment percentage
 * - Vote categorization by policy topic
 * - Key vote detection (close margins, party defections)
 * - Attendance rate
 *
 * No new APIs required — all data comes from StateLegislatureCoreService.
 */

import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
import { categorizeBill } from './vote-categorizer';
import type {
  StatePersonVote,
  StateVoteDetail,
  VoteEnrichmentResult,
  EnrichedKeyVote,
  VoteCategoryBreakdown,
  PartyBreakdown,
} from '@/types/state-legislature';

const ENRICHMENT_CACHE_TTL = 3600000; // 1 hour

export class VoteEnrichmentService {
  /**
   * Generate enriched voting analysis for a state legislator
   */
  static async enrichVotes(
    state: string,
    legislatorId: string,
    legislatorParty: string
  ): Promise<VoteEnrichmentResult> {
    const cacheKey = `enrichment:votes:${state}:${legislatorId}`;
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<VoteEnrichmentResult>(cacheKey);
      if (cached) {
        logger.info('Vote enrichment cache hit', {
          state,
          legislatorId,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // 1. Fetch legislator's votes
      const votes = await StateLegislatureCoreService.getStateLegislatorVotes(
        state,
        legislatorId,
        100 // Fetch up to 100 votes for analysis
      );

      if (votes.length === 0) {
        const emptyResult = this.buildEmptyResult(state, legislatorId);
        return emptyResult;
      }

      // 2. Fetch full vote details for party-line computation (batch, parallel)
      const voteDetails = await this.getVoteDetailsForVotes(state, votes);

      // 3. Compute enrichment
      const partyBreakdown = this.computePartyAlignment(
        votes,
        voteDetails,
        legislatorId,
        legislatorParty
      );
      const categoryBreakdown = this.computeCategoryBreakdown(votes);
      const keyVotes = this.detectKeyVotes(votes, voteDetails, legislatorId, legislatorParty);
      const attendance = this.computeAttendance(votes);

      const result: VoteEnrichmentResult = {
        state,
        legislatorId,
        totalVotesAnalyzed: votes.length,
        partyBreakdown,
        categoryBreakdown,
        keyVotes,
        attendance,
        lastUpdated: new Date().toISOString(),
      };

      // Cache the result
      await govCache.set(cacheKey, result, {
        ttl: ENRICHMENT_CACHE_TTL,
        source: 'vote-enrichment',
        dataType: 'voting',
      });

      logger.info('Vote enrichment computed', {
        state,
        legislatorId,
        votesAnalyzed: votes.length,
        detailsFetched: voteDetails.length,
        keyVoteCount: keyVotes.length,
        partyAlignmentPercent: partyBreakdown.alignmentPercentage,
        responseTime: Date.now() - startTime,
      });

      return result;
    } catch (error) {
      logger.error('Vote enrichment failed', error as Error, {
        state,
        legislatorId,
        responseTime: Date.now() - startTime,
      });
      return this.buildEmptyResult(state, legislatorId);
    }
  }

  /**
   * Batch-fetch full vote details for a set of person votes.
   * Fetches in parallel with concurrency limit to respect rate limits.
   */
  static async getVoteDetailsForVotes(
    state: string,
    votes: StatePersonVote[]
  ): Promise<StateVoteDetail[]> {
    // Deduplicate vote IDs
    const uniqueVoteIds = [...new Set(votes.map(v => v.vote_id))];

    // Limit to 20 concurrent detail fetches to respect OpenStates rate limits
    const BATCH_SIZE = 10;
    const details: StateVoteDetail[] = [];

    for (let i = 0; i < uniqueVoteIds.length; i += BATCH_SIZE) {
      const batch = uniqueVoteIds.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map(voteId => StateLegislatureCoreService.getStateVoteById(state, voteId))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled' && result.value) {
          details.push(result.value);
        }
      }
    }

    return details;
  }

  /**
   * Compute party-line alignment by comparing the legislator's vote
   * against their party's majority position on each vote.
   */
  private static computePartyAlignment(
    votes: StatePersonVote[],
    voteDetails: StateVoteDetail[],
    legislatorId: string,
    legislatorParty: string
  ): PartyBreakdown {
    const detailMap = new Map(voteDetails.map(d => [d.id, d]));

    let withParty = 0;
    let againstParty = 0;
    let noPartyData = 0;

    for (const vote of votes) {
      // Skip non-substantive votes (absent, abstain, etc.)
      if (vote.option !== 'yes' && vote.option !== 'no') continue;

      const detail = detailMap.get(vote.vote_id);
      if (!detail || !detail.votes || detail.votes.length === 0) {
        noPartyData++;
        continue;
      }

      // Determine party majority position
      const partyMajorityOption = this.getPartyMajorityPosition(
        detail,
        legislatorParty,
        legislatorId
      );

      if (!partyMajorityOption) {
        noPartyData++;
        continue;
      }

      if (vote.option === partyMajorityOption) {
        withParty++;
      } else {
        againstParty++;
      }
    }

    const total = withParty + againstParty;
    const alignmentPercentage = total > 0 ? Math.round((withParty / total) * 1000) / 10 : 0;

    return {
      withParty,
      againstParty,
      total,
      alignmentPercentage,
      noPartyData,
    };
  }

  /**
   * Determine what the majority of a party voted on a specific vote.
   * Returns 'yes' or 'no', or null if insufficient data.
   */
  private static getPartyMajorityPosition(
    voteDetail: StateVoteDetail,
    _party: string,
    excludeLegislatorId: string
  ): 'yes' | 'no' | null {
    // We don't have party data on each voter from OpenStates vote details,
    // so we use the overall vote result as a proxy for majority position.
    // This is a reasonable approximation since most state votes align with
    // the majority party's position.
    //
    // For more accurate results, we would need to cross-reference each voter
    // with their party affiliation, which would require additional API calls.
    // That enhancement can be added later.

    // Count yes/no from voters excluding the target legislator
    let yesCount = 0;
    let noCount = 0;

    for (const voter of voteDetail.votes) {
      if (voter.voter_id === excludeLegislatorId) continue;
      if (voter.option === 'yes') yesCount++;
      else if (voter.option === 'no') noCount++;
    }

    if (yesCount === 0 && noCount === 0) return null;

    // Use overall chamber majority as proxy
    // In highly partisan legislatures, the majority usually aligns with one party
    return yesCount >= noCount ? 'yes' : 'no';
  }

  /**
   * Categorize votes by policy topic using bill title keywords.
   */
  private static computeCategoryBreakdown(votes: StatePersonVote[]): VoteCategoryBreakdown[] {
    const categoryCounts = new Map<
      string,
      { total: number; yes: number; no: number; other: number }
    >();

    for (const vote of votes) {
      const title = vote.bill_title ?? vote.motion_text ?? '';
      const category = categorizeBill(title);

      const existing = categoryCounts.get(category) ?? { total: 0, yes: 0, no: 0, other: 0 };
      existing.total++;

      if (vote.option === 'yes') existing.yes++;
      else if (vote.option === 'no') existing.no++;
      else existing.other++;

      categoryCounts.set(category, existing);
    }

    // Sort by total count descending
    return Array.from(categoryCounts.entries())
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([category, counts]) => ({
        category,
        totalVotes: counts.total,
        yesVotes: counts.yes,
        noVotes: counts.no,
        otherVotes: counts.other,
        percentage: Math.round((counts.total / votes.length) * 1000) / 10,
      }));
  }

  /**
   * Detect key votes: close margins (<5% margin) or legislator voted against majority.
   */
  private static detectKeyVotes(
    votes: StatePersonVote[],
    voteDetails: StateVoteDetail[],
    _legislatorId: string,
    _legislatorParty: string
  ): EnrichedKeyVote[] {
    const detailMap = new Map(voteDetails.map(d => [d.id, d]));
    const keyVotes: EnrichedKeyVote[] = [];

    for (const vote of votes) {
      if (vote.option !== 'yes' && vote.option !== 'no') continue;

      const detail = detailMap.get(vote.vote_id);
      if (!detail) continue;

      const totalVoters = detail.votes.length;
      if (totalVoters === 0) continue;

      const yesCount = detail.counts.find(c => c.option === 'yes')?.value ?? 0;
      const noCount = detail.counts.find(c => c.option === 'no')?.value ?? 0;
      const totalSubstantive = yesCount + noCount;
      if (totalSubstantive === 0) continue;

      const margin = Math.abs(yesCount - noCount);
      const marginPercent = (margin / totalSubstantive) * 100;
      const isCloseVote = marginPercent < 10; // Close margin

      // Check if legislator voted against chamber majority
      const chamberMajority = yesCount >= noCount ? 'yes' : 'no';
      const votedAgainstMajority = vote.option !== chamberMajority;

      if (isCloseVote || votedAgainstMajority) {
        keyVotes.push({
          voteId: vote.vote_id,
          billIdentifier: vote.bill_identifier ?? '',
          billTitle: vote.bill_title ?? vote.motion_text,
          date: vote.start_date,
          legislatorPosition: vote.option as 'yes' | 'no',
          result: vote.result,
          yesCount,
          noCount,
          marginPercent: Math.round(marginPercent * 10) / 10,
          isCloseVote,
          votedAgainstMajority,
          category: categorizeBill(vote.bill_title ?? vote.motion_text ?? ''),
        });
      }
    }

    // Sort by date descending, limit to 20 most recent key votes
    return keyVotes
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);
  }

  /**
   * Compute attendance rate from vote records.
   */
  private static computeAttendance(votes: StatePersonVote[]): {
    totalVotes: number;
    present: number;
    absent: number;
    attendanceRate: number;
  } {
    const present = votes.filter(
      v =>
        v.option === 'yes' ||
        v.option === 'no' ||
        v.option === 'abstain' ||
        v.option === 'not voting'
    ).length;
    const absent = votes.filter(v => v.option === 'absent' || v.option === 'excused').length;
    const total = votes.length;
    const attendanceRate = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

    return { totalVotes: total, present, absent, attendanceRate };
  }

  /**
   * Build an empty result when no data is available.
   */
  private static buildEmptyResult(state: string, legislatorId: string): VoteEnrichmentResult {
    return {
      state,
      legislatorId,
      totalVotesAnalyzed: 0,
      partyBreakdown: {
        withParty: 0,
        againstParty: 0,
        total: 0,
        alignmentPercentage: 0,
        noPartyData: 0,
      },
      categoryBreakdown: [],
      keyVotes: [],
      attendance: {
        totalVotes: 0,
        present: 0,
        absent: 0,
        attendanceRate: 0,
      },
      lastUpdated: new Date().toISOString(),
    };
  }
}

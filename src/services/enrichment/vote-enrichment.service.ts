/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Enrichment Service
 *
 * Computes enriched voting metrics for a state legislator from the roll-call
 * corpus (src/lib/data-sources/openstates-votes):
 * - Party-line alignment: the member's yes/no against the yes/no majority of
 *   their own party on the same roll call, from the corpus's per-party tallies
 * - Vote categorization by policy topic
 * - Key vote detection (close margins, votes against the chamber majority)
 * - Attendance rate
 *
 * Nothing here calls OpenStates. The previous version fetched every roll call
 * through the bills API — up to 100 requests per legislator against a
 * 1,000/day cap — and had no party data on the voters, so "party alignment"
 * was really chamber-majority alignment.
 */

import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
import { categorizeBill } from './vote-categorizer';
import {
  getMemberVotes,
  getVotesCorpusStatus,
} from '@/lib/data-sources/openstates-votes/load-votes';
import type { CorpusMemberVote } from '@/lib/data-sources/openstates-votes/votes-corpus';
import type {
  VoteEnrichmentResult,
  EnrichedKeyVote,
  VoteCategoryBreakdown,
  PartyBreakdown,
} from '@/types/state-legislature';

const ENRICHMENT_CACHE_TTL = 3600000; // 1 hour
/** Bumped when the computation changed source (API fan-out → corpus). */
const CACHE_VERSION = 'v2';
const CLOSE_VOTE_MARGIN_PERCENT = 10;
const KEY_VOTE_LIMIT = 20;

export class VoteEnrichmentService {
  /**
   * Generate enriched voting analysis for a state legislator. An empty result
   * (totalVotesAnalyzed 0) means the corpus has no record for them — the
   * state is not covered, or the member cast no recorded votes.
   */
  static async enrichVotes(
    state: string,
    legislatorId: string,
    legislatorParty: string
  ): Promise<VoteEnrichmentResult> {
    const cacheKey = `enrichment:votes:${CACHE_VERSION}:${state}:${legislatorId}`;
    const startTime = Date.now();

    try {
      const cached = await govCache.get<VoteEnrichmentResult>(cacheKey);
      if (cached) {
        logger.info('Vote enrichment cache hit', {
          state,
          legislatorId,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      const votes = await getMemberVotes(state, legislatorId);
      if (!votes || votes.length === 0) {
        return this.buildEmptyResult(state, legislatorId);
      }

      const floorVotes = votes.filter(v => v.rollCall.floor);
      const result: VoteEnrichmentResult = {
        state,
        legislatorId,
        totalVotesAnalyzed: votes.length,
        floorVotesAnalyzed: floorVotes.length,
        partyBreakdown: this.computePartyAlignment(votes, legislatorParty),
        categoryBreakdown: this.computeCategoryBreakdown(votes),
        // Key votes come from floor roll calls when the state records them as
        // such; a committee vote against the room is not a key vote.
        keyVotes: this.detectKeyVotes(floorVotes.length > 0 ? floorVotes : votes),
        attendance: this.computeAttendance(votes),
        dataAsOf: (await getVotesCorpusStatus())?.jurisdictions[state.toUpperCase()]?.generatedAt,
        lastUpdated: new Date().toISOString(),
      };

      await govCache.set(cacheKey, result, {
        ttl: ENRICHMENT_CACHE_TTL,
        source: 'vote-enrichment',
        dataType: 'voting',
      });

      logger.info('Vote enrichment computed', {
        state,
        legislatorId,
        votesAnalyzed: votes.length,
        floorVotes: floorVotes.length,
        keyVoteCount: result.keyVotes.length,
        partyAlignmentPercent: result.partyBreakdown.alignmentPercentage,
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
   * Party-line alignment: on each roll call where the member voted yes or no,
   * compare with how the rest of their party split. The corpus tallies each
   * party from the roster, so the member's own vote is subtracted before the
   * majority is read. A tie, or a party with no other yes/no votes, is "no
   * party data" rather than a guess.
   */
  private static computePartyAlignment(
    votes: CorpusMemberVote[],
    legislatorParty: string
  ): PartyBreakdown {
    let withParty = 0;
    let againstParty = 0;
    let noPartyData = 0;

    for (const vote of votes) {
      if (vote.option !== 'yes' && vote.option !== 'no') continue;

      const tally = vote.rollCall.partyTally.get(legislatorParty);
      if (!tally) {
        noPartyData++;
        continue;
      }
      const yes = tally.yes - (vote.option === 'yes' ? 1 : 0);
      const no = tally.no - (vote.option === 'no' ? 1 : 0);
      if (yes === no) {
        noPartyData++;
        continue;
      }
      const majority = yes > no ? 'yes' : 'no';
      if (vote.option === majority) withParty++;
      else againstParty++;
    }

    const total = withParty + againstParty;
    return {
      withParty,
      againstParty,
      total,
      alignmentPercentage: total > 0 ? Math.round((withParty / total) * 1000) / 10 : 0,
      noPartyData,
    };
  }

  /**
   * Categorize votes by policy topic using bill title keywords.
   */
  private static computeCategoryBreakdown(votes: CorpusMemberVote[]): VoteCategoryBreakdown[] {
    const categoryCounts = new Map<
      string,
      { total: number; yes: number; no: number; other: number }
    >();

    for (const vote of votes) {
      const category = categorizeBill(vote.rollCall.billTitle ?? vote.rollCall.motion);
      const existing = categoryCounts.get(category) ?? { total: 0, yes: 0, no: 0, other: 0 };
      existing.total++;
      if (vote.option === 'yes') existing.yes++;
      else if (vote.option === 'no') existing.no++;
      else existing.other++;
      categoryCounts.set(category, existing);
    }

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
   * Key votes: a close margin, or the member voted against the chamber
   * majority. Newest first, capped.
   */
  private static detectKeyVotes(votes: CorpusMemberVote[]): EnrichedKeyVote[] {
    const keyVotes: EnrichedKeyVote[] = [];

    for (const vote of votes) {
      if (vote.option !== 'yes' && vote.option !== 'no') continue;
      const { rollCall } = vote;
      const substantive = rollCall.yes + rollCall.no;
      if (substantive === 0) continue;

      const marginPercent = (Math.abs(rollCall.yes - rollCall.no) / substantive) * 100;
      const isCloseVote = marginPercent < CLOSE_VOTE_MARGIN_PERCENT;
      const chamberMajority = rollCall.yes >= rollCall.no ? 'yes' : 'no';
      const votedAgainstMajority = vote.option !== chamberMajority;
      if (!isCloseVote && !votedAgainstMajority) continue;

      keyVotes.push({
        voteId: rollCall.id,
        billIdentifier: rollCall.billIdentifier ?? '',
        billTitle: rollCall.billTitle ?? rollCall.motion,
        date: rollCall.date,
        legislatorPosition: vote.option,
        result: rollCall.result === 'pass' ? 'passed' : 'failed',
        yesCount: rollCall.yes,
        noCount: rollCall.no,
        marginPercent: Math.round(marginPercent * 10) / 10,
        isCloseVote,
        votedAgainstMajority,
        category: categorizeBill(rollCall.billTitle ?? rollCall.motion),
      });
    }

    // Already newest first from the corpus; the slice keeps the most recent.
    return keyVotes.slice(0, KEY_VOTE_LIMIT);
  }

  /**
   * Attendance: present when the member cast any named position, absent when
   * the chamber marked them absent or excused. 'other' — a position the
   * chamber did not name — counts in neither, so it does not read as absence.
   */
  private static computeAttendance(votes: CorpusMemberVote[]): VoteEnrichmentResult['attendance'] {
    let present = 0;
    let absent = 0;
    for (const vote of votes) {
      if (vote.option === 'absent' || vote.option === 'excused') absent++;
      else if (vote.option !== 'other') present++;
    }
    const total = present + absent;
    return {
      totalVotes: votes.length,
      present,
      absent,
      attendanceRate: total > 0 ? Math.round((present / total) * 1000) / 10 : 0,
    };
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

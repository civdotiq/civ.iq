/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Vote Pattern Analyzer
 *
 * Generates AI-powered plain language analysis of a state legislator's voting patterns.
 * Uses vote enrichment data from Phase 1 to build contextual analysis.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import {
  PLAIN_LANGUAGE_SYSTEM_PROMPT,
  PLAIN_LANGUAGE_RULES,
  PLAIN_LANGUAGE_ATTRIBUTION,
} from '@/lib/ai/plain-language';
import type { VoteEnrichmentResult, StateVotePatternSummary } from '@/types/state-legislature';

export class StateVotePatternAnalyzer {
  private static readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  /**
   * Analyze voting patterns for a state legislator using enrichment data.
   */
  static async analyze(
    enrichment: VoteEnrichmentResult,
    legislatorName: string,
    legislatorParty: string,
    state: string
  ): Promise<StateVotePatternSummary> {
    const cacheKey = `state-vote-patterns:${state}:${enrichment.legislatorId}`;

    try {
      // Check cache first
      const cached = await getRedisCache().get<StateVotePatternSummary>(cacheKey);
      if (cached) {
        logger.info('State vote pattern cache hit', {
          state,
          legislatorId: enrichment.legislatorId,
        });
        return cached;
      }

      // Generate AI analysis
      const analysis = await this.generateAIAnalysis(
        enrichment,
        legislatorName,
        legislatorParty,
        state
      );

      // Cache the result
      await getRedisCache().set(cacheKey, analysis, this.CACHE_TTL);

      logger.info('State vote pattern analysis generated', {
        state,
        legislatorId: enrichment.legislatorId,
        confidence: analysis.confidence,
        source: analysis.source,
      });

      return analysis;
    } catch (error) {
      logger.error('State vote pattern analysis failed, using fallback', error as Error, {
        state,
        legislatorId: enrichment.legislatorId,
      });

      return this.generateFallbackAnalysis(enrichment, legislatorName, legislatorParty, state);
    }
  }

  /**
   * Generate AI-powered vote pattern analysis
   */
  private static async generateAIAnalysis(
    enrichment: VoteEnrichmentResult,
    legislatorName: string,
    legislatorParty: string,
    state: string
  ): Promise<StateVotePatternSummary> {
    const systemPrompt = `You summarize state legislator voting records for CIV.IQ. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;

    const categoryList = enrichment.categoryBreakdown
      .slice(0, 8)
      .map(c => `${c.category}: ${c.totalVotes} votes (${c.yesVotes} yes, ${c.noVotes} no)`)
      .join('\n');

    const keyVoteList = enrichment.keyVotes
      .slice(0, 5)
      .map(
        v =>
          `- ${v.billIdentifier}: "${v.billTitle}" | Voted ${v.legislatorPosition} | ${v.isCloseVote ? 'Close vote' : 'Against majority'}`
      )
      .join('\n');

    const userPrompt = `Summarize the voting record for ${legislatorName} (${legislatorParty}, ${state}):

STATISTICS:
- Total votes analyzed: ${enrichment.totalVotesAnalyzed}
- Attendance rate: ${enrichment.attendance.attendanceRate}% (${enrichment.attendance.present} present, ${enrichment.attendance.absent} absent)
- Party alignment: ${enrichment.partyBreakdown.alignmentPercentage}% (${enrichment.partyBreakdown.withParty} with party, ${enrichment.partyBreakdown.againstParty} against)

VOTES BY TOPIC:
${categoryList || 'No category data available'}

KEY VOTES:
${keyVoteList || 'No key votes identified'}

${PLAIN_LANGUAGE_RULES}
- State vote counts factually. Do not characterize votes as liberal, conservative, or any ideology.
- Do not judge whether votes are good or bad.

Return JSON:
{
  "summary": "2-3 sentence factual summary of voting activity",
  "topIssueAreas": ["area1", "area2", "area3"],
  "partyAlignmentSummary": "One sentence about party alignment",
  "keyVoteSummary": "One sentence about notable votes",
  "attendanceSummary": "One sentence about attendance",
  "confidence": 0.0-1.0
}`;

    const response = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 600,
    });

    return this.parseAIResponse(response, enrichment, state);
  }

  /**
   * Parse AI response
   */
  private static parseAIResponse(
    response: string,
    enrichment: VoteEnrichmentResult,
    state: string
  ): StateVotePatternSummary {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      legislatorId: enrichment.legislatorId,
      state,
      summary: parsed.summary || '',
      topIssueAreas: parsed.topIssueAreas || [],
      partyAlignmentSummary: parsed.partyAlignmentSummary || '',
      keyVoteSummary: parsed.keyVoteSummary || '',
      attendanceSummary: parsed.attendanceSummary || '',
      confidence: parsed.confidence || 0.7,
      lastUpdated: new Date().toISOString(),
      source: 'ai-generated',
      plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
    };
  }

  /**
   * Template-based fallback when AI is unavailable
   */
  private static generateFallbackAnalysis(
    enrichment: VoteEnrichmentResult,
    legislatorName: string,
    legislatorParty: string,
    state: string
  ): StateVotePatternSummary {
    const topCategories = enrichment.categoryBreakdown
      .slice(0, 3)
      .map(c => c.category.toLowerCase());

    const topAreas = enrichment.categoryBreakdown.slice(0, 5).map(c => c.category);

    const summary =
      `${legislatorName} (${legislatorParty}) voted on ${enrichment.totalVotesAnalyzed} bills.` +
      (topCategories.length > 0 ? ` Most votes were on ${topCategories.join(', ')} bills.` : '') +
      ` Attendance rate: ${enrichment.attendance.attendanceRate}%.`;

    const partyAlignmentSummary =
      enrichment.partyBreakdown.total > 0
        ? `Voted with party majority ${enrichment.partyBreakdown.alignmentPercentage}% of the time (${enrichment.partyBreakdown.withParty} of ${enrichment.partyBreakdown.total} votes).`
        : 'Party alignment data not available.';

    const keyVoteSummary =
      enrichment.keyVotes.length > 0
        ? `${enrichment.keyVotes.length} key votes identified, including close-margin and cross-party votes.`
        : 'No key votes identified in the analyzed period.';

    const attendanceSummary = `Present for ${enrichment.attendance.present} of ${enrichment.attendance.totalVotes} votes (${enrichment.attendance.attendanceRate}% attendance).`;

    return {
      legislatorId: enrichment.legislatorId,
      state,
      summary,
      topIssueAreas: topAreas,
      partyAlignmentSummary,
      keyVoteSummary,
      attendanceSummary,
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
      plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
    };
  }
}

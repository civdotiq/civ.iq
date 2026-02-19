/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Pattern Analyzer
 *
 * Summarizes legislator voting records across issue areas.
 * Counts and categorizes votes without interpreting ideology.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT, PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import type { VoteRecord, VotePatternSummary } from '@/types/ai';

export class VotePatternAnalyzer {
  private static readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  /**
   * Analyze voting patterns for a legislator
   */
  static async analyzePatterns(voteRecord: VoteRecord): Promise<VotePatternSummary> {
    const cacheKey = `vote-patterns:${voteRecord.legislatorId}`;

    try {
      // Check cache first
      const cached = await getRedisCache().get<VotePatternSummary>(cacheKey);
      if (cached) {
        logger.info('Vote pattern cache hit', {
          legislatorId: voteRecord.legislatorId,
          operation: 'vote_pattern_analysis',
        });
        return cached;
      }

      // Generate AI analysis
      const analysis = await this.generateAIAnalysis(voteRecord);

      // Cache the result
      await getRedisCache().set(cacheKey, analysis, this.CACHE_TTL);

      logger.info('Vote pattern analysis generated', {
        legislatorId: voteRecord.legislatorId,
        totalVotes: analysis.totalVotes,
        confidence: analysis.confidence,
        operation: 'vote_pattern_analysis',
      });

      return analysis;
    } catch (error) {
      logger.error('Vote pattern analysis failed, using fallback', error as Error, {
        legislatorId: voteRecord.legislatorId,
        operation: 'vote_pattern_analysis',
      });

      return this.generateFallbackAnalysis(voteRecord);
    }
  }

  /**
   * Generate AI-powered vote pattern analysis
   */
  private static async generateAIAnalysis(voteRecord: VoteRecord): Promise<VotePatternSummary> {
    const systemPrompt = `You summarize legislative voting records for CIV.IQ. You count and categorize votes without interpreting ideology. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;

    const userPrompt = this.buildUserPrompt(voteRecord);

    const response = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    return this.parseAIResponse(response, voteRecord);
  }

  /**
   * Build the user prompt with vote data
   */
  private static buildUserPrompt(voteRecord: VoteRecord): string {
    const votesList = voteRecord.votes
      .slice(0, 100) // Limit to most recent 100 votes for token budget
      .map(
        v =>
          `- ${v.billNumber}: "${v.title}" | Vote: ${v.vote} | ${v.date} | Subjects: ${v.subjects.join(', ') || 'None'}`
      )
      .join('\n');

    return `
LEGISLATOR: ${voteRecord.legislatorId}
TOTAL VOTES IN RECORD: ${voteRecord.votes.length}

VOTE RECORD (most recent):
${votesList}

Categorize and summarize this voting record. Respond in JSON:
{
  "totalVotes": ${voteRecord.votes.length},
  "categoryCounts": {
    "Category Name": { "count": 0, "percentage": 0.0 }
  },
  "summary": "Plain-language summary of vote counts by category",
  "topIssueAreas": ["Top category 1", "Top category 2", "Top category 3"],
  "confidence": 0.0-1.0
}

${PLAIN_LANGUAGE_RULES}
- Group votes by subject area (Healthcare, Defense, Infrastructure, Education, etc.).
- Use the bill subjects provided. If subjects are missing, categorize by bill title keywords.
- The summary should state vote counts factually (e.g., "Voted on 156 bills. 23 healthcare, 18 defense").
- Do not characterize voting patterns as liberal, conservative, or any other ideology.
- Do not judge whether votes are good or bad.
`;
  }

  /**
   * Parse AI response into VotePatternSummary format
   */
  private static parseAIResponse(response: string, voteRecord: VoteRecord): VotePatternSummary {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        totalVotes: voteRecord.votes.length,
        categoryCounts: parsed.categoryCounts || {},
        summary: parsed.summary || '',
        topIssueAreas: parsed.topIssueAreas || [],
        confidence: parsed.confidence || 0.7,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Template-based fallback with simple category counts
   */
  private static generateFallbackAnalysis(voteRecord: VoteRecord): VotePatternSummary {
    const categoryCounts: { [category: string]: { count: number; percentage: number } } = {};

    // Count subjects across all votes
    for (const vote of voteRecord.votes) {
      for (const subject of vote.subjects) {
        const normalized = this.normalizeCategory(subject);
        if (!categoryCounts[normalized]) {
          categoryCounts[normalized] = { count: 0, percentage: 0 };
        }
        categoryCounts[normalized].count++;
      }
    }

    // Calculate percentages
    const totalCategorized = Object.values(categoryCounts).reduce((sum, c) => sum + c.count, 0);
    if (totalCategorized > 0) {
      for (const [category, data] of Object.entries(categoryCounts)) {
        data.percentage = Math.round((data.count / totalCategorized) * 1000) / 10;
        categoryCounts[category] = data;
      }
    }

    // Sort by count and get top areas
    const sorted = Object.entries(categoryCounts).sort(([, a], [, b]) => b.count - a.count);
    const topIssueAreas = sorted.slice(0, 5).map(([category]) => category);

    // Build summary from top categories
    const topSummary = sorted
      .slice(0, 5)
      .map(([category, data]) => `${data.count} ${category.toLowerCase()}`)
      .join(', ');

    return {
      totalVotes: voteRecord.votes.length,
      categoryCounts,
      summary: `Voted on ${voteRecord.votes.length} bills. ${topSummary || 'Category data unavailable'}.`,
      topIssueAreas,
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    };
  }

  /**
   * Normalize subject strings into consistent category names
   */
  private static normalizeCategory(subject: string): string {
    const lower = subject.toLowerCase();
    const categoryMap: Array<[string[], string]> = [
      [['health', 'medical', 'medicare', 'medicaid', 'drug'], 'Healthcare'],
      [['defense', 'military', 'armed forces', 'veteran'], 'Defense'],
      [['education', 'school', 'student', 'university'], 'Education'],
      [['infrastructure', 'transport', 'highway', 'bridge', 'road'], 'Infrastructure'],
      [['tax', 'revenue', 'irs'], 'Taxation'],
      [['environment', 'climate', 'energy', 'epa'], 'Environment & Energy'],
      [['immigration', 'border', 'visa'], 'Immigration'],
      [['agriculture', 'farm', 'food'], 'Agriculture'],
      [['trade', 'tariff', 'commerce'], 'Trade & Commerce'],
      [['housing', 'hud', 'mortgage'], 'Housing'],
    ];

    for (const [keywords, category] of categoryMap) {
      if (keywords.some(k => lower.includes(k))) {
        return category;
      }
    }

    return subject.length > 30 ? subject.substring(0, 30) : subject;
  }
}

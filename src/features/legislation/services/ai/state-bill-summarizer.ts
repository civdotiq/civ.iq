/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Bill Summarizer
 *
 * Generates plain language summaries for state bills using OpenStates bill data.
 * Mirrors the federal bill-summarizer pattern with state-specific adaptations.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import {
  PLAIN_LANGUAGE_SYSTEM_PROMPT,
  PLAIN_LANGUAGE_RULES,
  PLAIN_LANGUAGE_ATTRIBUTION,
} from '@/lib/ai/plain-language';
import type { StateBill, StateBillAISummary } from '@/types/state-legislature';

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
};

export class StateBillSummarizer {
  private static readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  /**
   * Generate a plain language summary for a state bill.
   */
  static async summarize(bill: StateBill, state: string): Promise<StateBillAISummary> {
    const cacheKey = `state-bill-summary:${state}:${bill.id}`;

    try {
      // Check cache first
      const cached = await getRedisCache().get<StateBillAISummary>(cacheKey);
      if (cached) {
        logger.info('State bill summary cache hit', {
          state,
          billId: bill.id,
          identifier: bill.identifier,
        });
        return cached;
      }

      // Generate AI summary
      const summary = await this.generateAISummary(bill, state);

      // Cache the result
      await getRedisCache().set(cacheKey, summary, this.CACHE_TTL);

      logger.info('State bill summary generated', {
        state,
        billId: bill.id,
        identifier: bill.identifier,
        confidence: summary.confidence,
        source: summary.source,
      });

      return summary;
    } catch (error) {
      logger.error('State bill summary failed, using fallback', error as Error, {
        state,
        billId: bill.id,
      });

      return this.generateFallbackSummary(bill, state);
    }
  }

  /**
   * Generate AI-powered bill summary
   */
  private static async generateAISummary(
    bill: StateBill,
    state: string
  ): Promise<StateBillAISummary> {
    const stateName = STATE_NAMES[state.toUpperCase()] ?? state;
    const systemPrompt = `You summarize state legislation for CIV.IQ. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;

    const primarySponsors =
      bill.sponsorships
        .filter(s => s.primary)
        .map(s => s.name)
        .join(', ') || 'None listed';

    const recentActions = bill.actions
      .slice(-5)
      .map(a => `${a.date}: ${a.description}`)
      .join('\n');

    const latestAction = bill.actions.length > 0 ? bill.actions[bill.actions.length - 1] : null;

    const userPrompt = `Summarize this ${stateName} bill:
- Bill: ${bill.identifier} - ${bill.title}
- Abstract: ${bill.abstract ?? 'Not available'}
- Chamber: ${bill.chamber === 'upper' ? 'Senate' : 'House'}
- Status: ${latestAction ? `Latest action on ${latestAction.date}: ${latestAction.description}` : 'No actions recorded'}
- Sponsors: ${primarySponsors}
- Recent Actions:
${recentActions || 'None'}

${PLAIN_LANGUAGE_RULES}
- Reference the state by name ("${stateName}"), not abbreviation.
- Explain state-specific legislative terms if needed.

Return JSON:
{
  "summary": "2-3 sentence plain language overview",
  "keyPoints": ["point 1", "point 2", "point 3"],
  "whoItAffects": "Who this bill affects",
  "whatItDoes": "What the bill does in one sentence",
  "currentStatus": "Where the bill is in the process",
  "confidence": 0.0-1.0
}`;

    const response = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 800,
    });

    return this.parseAIResponse(response, bill, state);
  }

  /**
   * Parse AI response into StateBillAISummary format
   */
  private static parseAIResponse(
    response: string,
    bill: StateBill,
    state: string
  ): StateBillAISummary {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      billId: bill.id,
      state,
      identifier: bill.identifier,
      summary: parsed.summary || '',
      keyPoints: parsed.keyPoints || [],
      whoItAffects: parsed.whoItAffects || '',
      whatItDoes: parsed.whatItDoes || '',
      currentStatus: parsed.currentStatus || '',
      confidence: parsed.confidence || 0.7,
      lastUpdated: new Date().toISOString(),
      source: 'ai-generated',
      plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
    };
  }

  /**
   * Template-based fallback when AI is unavailable
   */
  private static generateFallbackSummary(bill: StateBill, state: string): StateBillAISummary {
    const stateName = STATE_NAMES[state.toUpperCase()] ?? state;
    const primarySponsor = bill.sponsorships.find(s => s.primary)?.name ?? 'Unknown';
    const latestAction = bill.actions.length > 0 ? bill.actions[bill.actions.length - 1] : null;

    const summary =
      `${bill.identifier} is a ${stateName} bill titled "${bill.title}."` +
      (primarySponsor !== 'Unknown' ? ` It was introduced by ${primarySponsor}.` : '') +
      (latestAction
        ? ` The latest action was on ${latestAction.date}: ${latestAction.description}.`
        : '');

    return {
      billId: bill.id,
      state,
      identifier: bill.identifier,
      summary,
      keyPoints: [],
      whoItAffects: 'Information not available without AI analysis.',
      whatItDoes: bill.abstract ?? bill.title,
      currentStatus: latestAction
        ? `${latestAction.date}: ${latestAction.description}`
        : 'Status unavailable',
      confidence: 0.2,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
      plainLanguage: PLAIN_LANGUAGE_ATTRIBUTION,
    };
  }
}

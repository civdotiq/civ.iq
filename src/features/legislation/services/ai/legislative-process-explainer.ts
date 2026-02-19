/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Legislative Process Explainer
 *
 * Translates bill procedural status into plain English.
 * Uses AI to explain where a bill is in the legislative process,
 * what happened, and what comes next.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT, PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import type { BillStatus, ProcessExplanation } from '@/types/ai';

export class LegislativeProcessExplainer {
  private static readonly CACHE_TTL = 24 * 60 * 60; // 24 hours

  /**
   * Explain the current legislative process status for a bill
   */
  static async explainProcess(
    billId: string,
    billTitle: string,
    status: BillStatus
  ): Promise<ProcessExplanation> {
    const cacheKey = `legislative-process:${billId}`;

    try {
      // Check cache first
      const cached = await getRedisCache().get<ProcessExplanation>(cacheKey);
      if (cached) {
        logger.info('Legislative process cache hit', {
          billId,
          operation: 'legislative_process_explanation',
        });
        return cached;
      }

      // Generate AI explanation
      const explanation = await this.generateAIExplanation(billId, billTitle, status);

      // Cache the result
      await getRedisCache().set(cacheKey, explanation, this.CACHE_TTL);

      logger.info('Legislative process explanation generated', {
        billId,
        currentStage: status.currentStage,
        confidence: explanation.confidence,
        operation: 'legislative_process_explanation',
      });

      return explanation;
    } catch (error) {
      logger.error('Legislative process explanation failed, using fallback', error as Error, {
        billId,
        operation: 'legislative_process_explanation',
      });

      return this.generateFallbackExplanation(billId, status);
    }
  }

  /**
   * Generate AI-powered process explanation
   */
  private static async generateAIExplanation(
    billId: string,
    billTitle: string,
    status: BillStatus
  ): Promise<ProcessExplanation> {
    const systemPrompt = `You explain the US legislative process for CIV.IQ. You never speculate on political outcomes. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;

    const userPrompt = this.buildUserPrompt(billId, billTitle, status);

    const response = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    return this.parseAIResponse(response);
  }

  /**
   * Build the user prompt with bill status data
   */
  private static buildUserPrompt(billId: string, billTitle: string, status: BillStatus): string {
    const committeeList = status.committees.map(c => `${c.name} (${c.chamber})`).join(', ');

    return `
BILL: ${billId} - ${billTitle}

CURRENT STATUS DATA:
- Current Stage: ${status.currentStage}
- Latest Action: ${status.latestAction.text} (${status.latestAction.actionDate})
- Committees: ${committeeList || 'None assigned'}

Explain where this bill is in the legislative process. Respond in JSON:
{
  "currentStatus": "Plain English sentence about where the bill is now",
  "whatHappened": "Brief timeline of what has happened so far",
  "nextSteps": ["Next procedural step 1", "Next procedural step 2", "Next procedural step 3"],
  "estimatedTimeline": "Typical time at this stage based on congressional averages",
  "confidence": 0.0-1.0
}

${PLAIN_LANGUAGE_RULES}
- Base next steps on standard congressional procedure for the current stage.
- For estimated timeline, use historical averages (e.g., "Most bills at this stage take 2-6 months").
- Do not speculate on political outcomes or likelihood of passage.
`;
  }

  /**
   * Parse AI response into ProcessExplanation format
   */
  private static parseAIResponse(response: string): ProcessExplanation {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        currentStatus: parsed.currentStatus || '',
        whatHappened: parsed.whatHappened || '',
        nextSteps: parsed.nextSteps || [],
        estimatedTimeline: parsed.estimatedTimeline || '',
        confidence: parsed.confidence || 0.7,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Template-based fallback when AI is unavailable
   */
  private static generateFallbackExplanation(
    billId: string,
    status: BillStatus
  ): ProcessExplanation {
    const stageDescriptions: Record<string, string> = {
      introduced: `Bill ${billId} has been introduced in Congress.`,
      committee: `Bill ${billId} is being reviewed by a congressional committee.`,
      floor: `Bill ${billId} is being debated on the chamber floor.`,
      passed: `Bill ${billId} has passed one chamber of Congress.`,
      enacted: `Bill ${billId} has been signed into law.`,
    };

    const stageNextSteps: Record<string, string[]> = {
      introduced: ['Committee referral', 'Committee hearings', 'Committee markup'],
      committee: ['Committee vote', 'Floor debate', 'Floor vote'],
      floor: ['Floor vote', 'Referral to other chamber', 'Conference committee'],
      passed: ['Other chamber consideration', 'Conference committee', 'Presidential action'],
      enacted: ['Implementation by relevant agencies'],
    };

    const stageTimelines: Record<string, string> = {
      introduced: 'Typical time at this stage: 1-3 months before committee action',
      committee: 'Typical time at this stage: 2-6 months',
      floor: 'Typical time at this stage: 1-4 weeks',
      passed: 'Typical time at this stage: 1-6 months for other chamber action',
      enacted: 'This bill has completed the legislative process',
    };

    return {
      currentStatus:
        stageDescriptions[status.currentStage] || `Bill status: ${status.latestAction.text}`,
      whatHappened: `Latest action on ${status.latestAction.actionDate}: ${status.latestAction.text}`,
      nextSteps: stageNextSteps[status.currentStage] || ['Further congressional action'],
      estimatedTimeline:
        stageTimelines[status.currentStage] || 'Timeline depends on congressional schedule',
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    };
  }
}

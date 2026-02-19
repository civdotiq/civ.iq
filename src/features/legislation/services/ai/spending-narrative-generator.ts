/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Spending Narrative Generator
 *
 * Translates USASpending.gov data into plain-language community context.
 * Connects government spending to local impact in a specific district.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT, PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import type { DistrictSpending, SpendingNarrative } from '@/types/ai';

export class SpendingNarrativeGenerator {
  private static readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  /**
   * Generate a spending narrative for a district
   */
  static async generateNarrative(
    districtId: string,
    spending: DistrictSpending
  ): Promise<SpendingNarrative> {
    const cacheKey = `spending-narrative:${districtId}`;

    try {
      // Check cache first
      const cached = await getRedisCache().get<SpendingNarrative>(cacheKey);
      if (cached) {
        logger.info('Spending narrative cache hit', {
          districtId,
          operation: 'spending_narrative',
        });
        return cached;
      }

      // Generate AI narrative
      const narrative = await this.generateAINarrative(districtId, spending);

      // Cache the result
      await getRedisCache().set(cacheKey, narrative, this.CACHE_TTL);

      logger.info('Spending narrative generated', {
        districtId,
        totalAmount: spending.totalAmount,
        confidence: narrative.confidence,
        operation: 'spending_narrative',
      });

      return narrative;
    } catch (error) {
      logger.error('Spending narrative generation failed, using fallback', error as Error, {
        districtId,
        operation: 'spending_narrative',
      });

      return this.generateFallbackNarrative(districtId, spending);
    }
  }

  /**
   * Generate AI-powered spending narrative
   */
  private static async generateAINarrative(
    districtId: string,
    spending: DistrictSpending
  ): Promise<SpendingNarrative> {
    const systemPrompt = `You translate federal spending data into plain language for CIV.IQ. You never editorialize on spending priorities. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;

    const userPrompt = this.buildUserPrompt(districtId, spending);

    const response = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    return this.parseAIResponse(response);
  }

  /**
   * Build the user prompt with spending data
   */
  private static buildUserPrompt(districtId: string, spending: DistrictSpending): string {
    const categoriesList = spending.categories
      .map(c => `- ${c.name}: $${c.amount.toLocaleString()} (${c.percentage}%)`)
      .join('\n');

    const contractsList = spending.topContracts
      .map(c => `- ${c.recipient}: $${c.amount.toLocaleString()} - ${c.description}`)
      .join('\n');

    return `
DISTRICT: ${districtId}

FEDERAL SPENDING DATA:
Total Amount: $${spending.totalAmount.toLocaleString()}

SPENDING CATEGORIES:
${categoriesList || 'No category data available'}

TOP CONTRACTS:
${contractsList || 'No contract data available'}

Translate this spending data into a plain-language narrative. Respond in JSON:
{
  "summary": "One sentence: Your district received $X in federal spending last year",
  "topCategories": "Readable breakdown of the top spending categories with dollar amounts",
  "localImpact": "What this spending level means for the district in factual terms",
  "notableContracts": ["Plain-language description of each notable contract"],
  "confidence": 0.0-1.0
}

${PLAIN_LANGUAGE_RULES}
- Round large numbers for readability (e.g., "$2.3 billion" not "$2,314,567,890").
- For notable contracts, describe the recipient and purpose in plain language.
- Do not editorialize on spending priorities or judge whether amounts are too high or too low.
`;
  }

  /**
   * Parse AI response into SpendingNarrative format
   */
  private static parseAIResponse(response: string): SpendingNarrative {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        summary: parsed.summary || '',
        topCategories: parsed.topCategories || '',
        localImpact: parsed.localImpact || '',
        notableContracts: parsed.notableContracts || [],
        confidence: parsed.confidence || 0.7,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Template-based fallback displaying raw spending categories
   */
  private static generateFallbackNarrative(
    districtId: string,
    spending: DistrictSpending
  ): SpendingNarrative {
    const formattedTotal = this.formatCurrency(spending.totalAmount);

    const topCategories = spending.categories
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map(c => `${c.name}: ${this.formatCurrency(c.amount)} (${c.percentage}%)`)
      .join(', ');

    const notableContracts = spending.topContracts
      .slice(0, 5)
      .map(c => `${c.recipient} received ${this.formatCurrency(c.amount)} for ${c.description}`);

    return {
      summary: `District ${districtId} received ${formattedTotal} in federal spending.`,
      topCategories: topCategories || 'Spending category data unavailable',
      localImpact: `Total federal spending in the district: ${formattedTotal}.`,
      notableContracts:
        notableContracts.length > 0 ? notableContracts : ['Contract data unavailable'],
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    };
  }

  /**
   * Format dollar amounts for readability
   */
  private static formatCurrency(amount: number): string {
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(1)} billion`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)} million`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount.toLocaleString()}`;
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * AI-Powered Bill Summarization Service
 *
 * Provides automatic summarization of complex legislation at an 8th grade reading level.
 * Uses multiple AI providers with fallback mechanisms for reliability.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { trackReadingLevel } from '@/lib/analytics/reading-level-tracker';
import { PLAIN_LANGUAGE_RULES, PLAIN_LANGUAGE_SYSTEM_PROMPT } from '@/lib/ai/plain-language';
import { BillSummaryFallbacks } from './bill-summary-fallbacks';

export interface BillSummary {
  billId: string;
  title: string;
  summary: string;
  keyPoints: string[];
  whoItAffects: string[];
  whatItDoes: string;
  whyItMatters: string;
  readingLevel: number;
  confidence: number;
  lastUpdated: string;
  source: 'ai-generated' | 'congressional-summary' | 'manual';
}

export interface BillSummarizationOptions {
  maxLength?: number;
  includeKeyPoints?: boolean;
  targetReadingLevel?: number;
  useCache?: boolean;
}

export class BillSummarizer {
  private static readonly DEFAULT_OPTIONS: Required<BillSummarizationOptions> = {
    maxLength: 300,
    includeKeyPoints: true,
    targetReadingLevel: 8,
    useCache: true,
  };

  private static readonly READING_LEVEL_PROMPTS: Record<number, string> = {
    8: PLAIN_LANGUAGE_RULES,
  };

  /**
   * Summarize a bill with AI-generated content at 8th grade reading level
   */
  static async summarizeBill(
    billText: string,
    billMetadata: {
      number: string;
      title: string;
      congress: number;
      chamber: string;
    },
    options: BillSummarizationOptions = {}
  ): Promise<BillSummary> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const cacheKey = `bill-summary:${billMetadata.number}:${billMetadata.congress}`;

    try {
      // Check cache first
      if (opts.useCache) {
        const cached = await getRedisCache().get<BillSummary>(cacheKey);
        if (cached) {
          logger.info('Bill summary cache hit', {
            billNumber: billMetadata.number,
            operation: 'bill_summarization',
          });
          return cached;
        }
      }

      // Process bill text into manageable chunks
      const processedText = this.preprocessBillText(billText);

      // Generate AI summary
      const summary = await this.generateAISummary(processedText, billMetadata, opts);

      // Validate reading level
      const readingLevel = await this.calculateReadingLevel(summary.summary);

      // If reading level exceeds target, regenerate with simpler language
      // Per PlainLanguage.gov: target grade 8 maximum, no tolerance
      if (readingLevel > opts.targetReadingLevel) {
        logger.warn('Summary reading level too high, regenerating', {
          billNumber: billMetadata.number,
          readingLevel,
          target: opts.targetReadingLevel,
        });

        const simplifiedSummary = await this.generateSimplifiedSummary(
          processedText,
          billMetadata,
          opts,
          readingLevel
        );

        summary.summary = simplifiedSummary.summary;
        summary.keyPoints = simplifiedSummary.keyPoints;
        summary.readingLevel = await this.calculateReadingLevel(summary.summary);
      } else {
        summary.readingLevel = readingLevel;
      }

      // Track reading level for transparency dashboard (fire-and-forget)
      const metrics = this.calculateReadingMetrics(summary.summary);
      trackReadingLevel(
        summary.readingLevel,
        `${billMetadata.congress}-${billMetadata.number}`,
        metrics.fleschReadingEase
      );

      // Cache the result
      if (opts.useCache) {
        await getRedisCache().set(cacheKey, summary, 24 * 60 * 60); // Cache for 24 hours
      }

      logger.info('Bill summary generated successfully', {
        billNumber: billMetadata.number,
        readingLevel: summary.readingLevel,
        confidence: summary.confidence,
        operation: 'bill_summarization',
      });

      return summary;
    } catch (error) {
      logger.error('Bill summarization failed, attempting fallbacks', error as Error, {
        billNumber: billMetadata.number,
        operation: 'bill_summarization',
      });

      // Execute comprehensive fallback chain
      const fallbackResult = await BillSummaryFallbacks.executeFallbackChain(
        billText,
        billMetadata,
        error instanceof Error ? error : new Error('Unknown error'),
        {
          useCongressionalSummary: true,
          useKeywordExtraction: true,
          useSimpleExtraction: true,
        }
      );

      // Log fallback result
      logger.info('Fallback summary generated', {
        billNumber: billMetadata.number,
        fallbackMethod: fallbackResult.fallbackMethod,
        success: fallbackResult.success,
        confidence: fallbackResult.summary.confidence,
        operation: 'bill_summarization',
      });

      return fallbackResult.summary;
    }
  }

  /**
   * Preprocess bill text to remove formatting and focus on key content
   */
  private static preprocessBillText(billText: string): string {
    // Remove common bill formatting artifacts
    let processed = billText
      // Remove line numbers and page numbers
      .replace(/^\s*\d+\s+/gm, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove common legislative boilerplate
      .replace(/Be it enacted by the Senate and House of Representatives[^.]*\./gi, '')
      // Remove section numbers and subsection markers
      .replace(/\b(SEC|SECTION)\s+\d+\./gi, '')
      // Remove "(a)" "(b)" etc. subsection markers at start of lines
      .replace(/^\s*\([a-z0-9]+\)\s*/gm, '')
      // Clean up quotes and formatting
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();

    // Limit to first 10,000 characters to avoid token limits
    if (processed.length > 10000) {
      processed = processed.substring(0, 10000) + '...';
    }

    return processed;
  }

  /**
   * Generate AI summary using OpenAI or fallback providers
   */
  private static async generateAISummary(
    billText: string,
    billMetadata: {
      number: string;
      title: string;
      congress: number;
      chamber: string;
    },
    options: Required<BillSummarizationOptions>
  ): Promise<BillSummary> {
    const prompt = this.buildSummarizationPrompt(billText, billMetadata, options);

    try {
      const response = await this.callAIProvider(prompt);
      return this.parseSummaryResponse(response, billMetadata);
    } catch (error) {
      logger.warn('AI summarization failed, trying fallback', {
        billNumber: billMetadata.number,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Fallback to simpler rule-based summarization
      return this.generateRuleBasedSummary(billText, billMetadata, options);
    }
  }

  /**
   * Build the prompt for AI summarization
   */
  private static buildSummarizationPrompt(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string },
    options: Required<BillSummarizationOptions>
  ): string {
    const readingLevelInstructions =
      this.READING_LEVEL_PROMPTS[options.targetReadingLevel] || this.READING_LEVEL_PROMPTS[8];

    return `
You are an expert at explaining complex government legislation in simple terms.

BILL: ${billMetadata.number} - ${billMetadata.title}

BILL TEXT:
${billText}

INSTRUCTIONS:
${readingLevelInstructions}

Please provide a summary in the following JSON format:
{
  "summary": "A clear, simple explanation of what this bill does (${options.maxLength} words max)",
  "keyPoints": ["3-5 key points in simple language"],
  "whoItAffects": ["Who this bill affects - regular people, businesses, students, etc."],
  "whatItDoes": "One sentence explaining the main action",
  "whyItMatters": "Why regular people should care about this bill",
  "confidence": 0.95
}

${PLAIN_LANGUAGE_RULES}
`;
  }

  /**
   * Build a plain-text streaming summary prompt (no JSON output).
   * Used by the streaming route to produce token-by-token text.
   */
  static buildStreamingSummaryPrompt(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string }
  ): { system: string; user: string } {
    return {
      system: `You summarize U.S. legislation for CIV.IQ. ${PLAIN_LANGUAGE_SYSTEM_PROMPT.replace('Output valid JSON only.', 'Output plain text only. Do not output JSON.')}`,
      user: `BILL: ${billMetadata.number} - ${billMetadata.title}

BILL TEXT:
${billText}

Write a clear, simple summary of this bill in 2-4 paragraphs (300 words max). Explain what the bill does and why it matters.

${PLAIN_LANGUAGE_RULES}`,
    };
  }

  /**
   * Build a structured extraction prompt that returns JSON fields.
   * Used in parallel with streaming to get keyPoints, whoItAffects, etc.
   */
  static buildStructuredExtractionPrompt(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string }
  ): { system: string; user: string } {
    return {
      system: `You summarize U.S. legislation for CIV.IQ. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`,
      user: `BILL: ${billMetadata.number} - ${billMetadata.title}

BILL TEXT:
${billText}

Extract structured data about this bill. Respond with ONLY this JSON (no markdown, no extra text):
{
  "keyPoints": ["3-5 key points in simple language"],
  "whoItAffects": ["Who this bill affects - regular people, businesses, students, etc."],
  "whatItDoes": "One sentence explaining the main action",
  "whyItMatters": "Why regular people should care about this bill",
  "confidence": 0.95
}

${PLAIN_LANGUAGE_RULES}`,
    };
  }

  /**
   * Call AI provider for summarization (Google Gemini via Vercel AI SDK)
   */
  private static async callAIProvider(prompt: string): Promise<string> {
    return generateAIText(
      `You summarize U.S. legislation for CIV.IQ. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`,
      prompt,
      { temperature: 0.3, maxTokens: 1000 }
    );
  }

  /**
   * Parse AI response into BillSummary format
   */
  private static parseSummaryResponse(
    response: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string }
  ): BillSummary {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        billId: `${billMetadata.number}-${billMetadata.congress}`,
        title: billMetadata.title,
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
        whoItAffects: parsed.whoItAffects || [],
        whatItDoes: parsed.whatItDoes || '',
        whyItMatters: parsed.whyItMatters || '',
        readingLevel: 8, // Will be calculated separately
        confidence: parsed.confidence || 0.8,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Generate simplified summary if reading level is too high
   */
  private static async generateSimplifiedSummary(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string },
    options: Required<BillSummarizationOptions>,
    currentReadingLevel: number
  ): Promise<{ summary: string; keyPoints: string[] }> {
    const simplificationPrompt = `
The following summary is too complex (reading level ${currentReadingLevel}). 
Please rewrite it to be at an 8th grade reading level:

ORIGINAL BILL TEXT: ${billText.substring(0, 2000)}

Please provide a much simpler version using:
- Very short sentences (10-15 words max)
- Common, everyday words
- No jargon or technical terms
- Simple examples people can relate to

Format as JSON:
{
  "summary": "Very simple explanation",
  "keyPoints": ["Simple point 1", "Simple point 2", "Simple point 3"]
}
`;

    try {
      const response = await this.callAIProvider(simplificationPrompt);
      const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] || '{}');
      return {
        summary: parsed.summary || '',
        keyPoints: parsed.keyPoints || [],
      };
    } catch {
      // Ultimate fallback - super simple rule-based summary
      return {
        summary: `This bill, ${billMetadata.title}, makes changes to current laws. It affects how things work in our government or society.`,
        keyPoints: [
          'This is a new law being considered',
          'It would change how things currently work',
          'Congress is voting on whether to pass it',
        ],
      };
    }
  }

  /**
   * Calculate both Flesch-Kincaid Grade Level and Flesch Reading Ease
   */
  static calculateReadingMetrics(text: string): {
    gradeLevel: number;
    fleschReadingEase: number;
  } {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const syllables = this.countSyllables(text);

    if (sentences === 0 || words === 0) {
      return { gradeLevel: 13, fleschReadingEase: 0 };
    }

    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    const gradeLevel = Math.max(
      1,
      Math.round((0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59) * 10) / 10
    );

    const fleschReadingEase = Math.max(
      0,
      Math.min(
        100,
        Math.round((206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord) * 10) / 10
      )
    );

    return { gradeLevel, fleschReadingEase };
  }

  /**
   * Calculate reading level using Flesch-Kincaid formula
   */
  private static async calculateReadingLevel(text: string): Promise<number> {
    return this.calculateReadingMetrics(text).gradeLevel;
  }

  /**
   * Count syllables in text (simple heuristic)
   */
  private static countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;

    for (const word of words) {
      // Remove punctuation
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (cleanWord.length === 0) continue;

      // Count vowel groups
      const vowelGroups = cleanWord.match(/[aeiouy]+/g);
      let syllables = vowelGroups ? vowelGroups.length : 1;

      // Adjust for silent 'e'
      if (cleanWord.endsWith('e') && syllables > 1) {
        syllables--;
      }

      // Minimum 1 syllable per word
      totalSyllables += Math.max(1, syllables);
    }

    return totalSyllables;
  }

  /**
   * Generate rule-based summary as fallback
   */
  private static async generateRuleBasedSummary(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string },
    _options: Required<BillSummarizationOptions>
  ): Promise<BillSummary> {
    // Extract key phrases and create simple summary
    const keyPhrases = this.extractKeyPhrases(billText);
    const summaryText = `This bill, called ${billMetadata.title}, makes changes to current laws. ${keyPhrases.slice(0, 2).join(' ')}`;
    const readingLevel = await this.calculateReadingLevel(summaryText);

    return {
      billId: `${billMetadata.number}-${billMetadata.congress}`,
      title: billMetadata.title,
      summary: summaryText,
      keyPoints: [
        'This is new legislation being considered by Congress',
        'It would change current laws or create new ones',
        'The full text contains detailed legal language',
      ],
      whoItAffects: ['American citizens', 'Government agencies'],
      whatItDoes: 'Changes or creates laws',
      whyItMatters: 'Laws affect how our government and society work',
      readingLevel,
      confidence: 0.6,
      lastUpdated: new Date().toISOString(),
      source: 'ai-generated',
    };
  }

  /**
   * Extract key phrases from bill text
   */
  private static extractKeyPhrases(text: string): string[] {
    const phrases: string[] = [];

    // Look for common bill patterns
    const patterns = [
      /to amend .{1,100}/gi,
      /to establish .{1,100}/gi,
      /to require .{1,100}/gi,
      /to provide .{1,100}/gi,
      /shall .{1,50}/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        phrases.push(...matches.slice(0, 2));
      }
    }

    return phrases.map(phrase => phrase.trim().replace(/\s+/g, ' ')).slice(0, 5);
  }

  /**
   * Generate fallback summary when all else fails
   */
  private static async generateFallbackSummary(billMetadata: {
    number: string;
    title: string;
    congress: number;
    chamber: string;
  }): Promise<BillSummary> {
    const summaryText = `This is ${billMetadata.number}, titled "${billMetadata.title}". This bill is being considered by Congress. You can read the full text to learn more about what it does.`;
    const readingLevel = await this.calculateReadingLevel(summaryText);

    return {
      billId: `${billMetadata.number}-${billMetadata.congress}`,
      title: billMetadata.title,
      summary: summaryText,
      keyPoints: [
        'This bill is being considered by Congress',
        'The title gives you an idea of what it covers',
        'Read the full text for complete details',
      ],
      whoItAffects: ['To be determined'],
      whatItDoes: 'Changes or creates laws',
      whyItMatters: 'All laws can affect citizens',
      readingLevel,
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'ai-generated',
    };
  }

  /**
   * Get multiple summary formats for different use cases
   */
  static async getMultiFormatSummary(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string }
  ): Promise<{
    brief: string;
    detailed: BillSummary;
    keyPoints: string[];
    plainEnglish: string;
  }> {
    const detailed = await this.summarizeBill(billText, billMetadata);

    return {
      brief: detailed.whatItDoes,
      detailed,
      keyPoints: detailed.keyPoints,
      plainEnglish: detailed.summary,
    };
  }
}

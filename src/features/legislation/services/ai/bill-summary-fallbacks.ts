/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Summary Fallback and Error Handling System
 *
 * Provides robust fallback mechanisms for AI bill summarization
 * to ensure users always get some form of summary even when AI fails.
 */

import logger from '@/lib/logging/simple-logger';
import type { BillSummary } from './bill-summarizer';

export interface FallbackOptions {
  useCongressionalSummary?: boolean;
  useKeywordExtraction?: boolean;
  useSimpleExtraction?: boolean;
  maxFallbackAttempts?: number;
}

export interface FallbackResult {
  summary: BillSummary;
  fallbackMethod: 'congressional' | 'keyword-extraction' | 'simple-extraction' | 'basic-fallback';
  success: boolean;
  errors: string[];
}

export class BillSummaryFallbacks {
  private static readonly DEFAULT_OPTIONS: Required<FallbackOptions> = {
    useCongressionalSummary: true,
    useKeywordExtraction: true,
    useSimpleExtraction: true,
    maxFallbackAttempts: 3,
  };

  /**
   * Execute fallback chain when AI summarization fails
   */
  static async executeFallbackChain(
    billText: string,
    billMetadata: {
      number: string;
      title: string;
      congress: number;
      chamber: string;
    },
    originalError: Error,
    options: FallbackOptions = {}
  ): Promise<FallbackResult> {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    const errors: string[] = [originalError.message];

    logger.info('Starting bill summary fallback chain', {
      billNumber: billMetadata.number,
      originalError: originalError.message,
      fallbackOptions: opts,
      operation: 'bill_summary_fallback',
    });

    // Attempt 1: Congressional summary extraction
    if (opts.useCongressionalSummary) {
      try {
        const congressionalSummary = await this.extractCongressionalSummary(billText, billMetadata);
        if (congressionalSummary) {
          logger.info('Congressional summary fallback successful', {
            billNumber: billMetadata.number,
            operation: 'bill_summary_fallback',
          });

          return {
            summary: congressionalSummary,
            fallbackMethod: 'congressional',
            success: true,
            errors,
          };
        }
      } catch (error) {
        errors.push(
          `Congressional summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Attempt 2: Keyword-based extraction
    if (opts.useKeywordExtraction) {
      try {
        const keywordSummary = await this.createKeywordBasedSummary(billText, billMetadata);
        if (keywordSummary) {
          logger.info('Keyword extraction fallback successful', {
            billNumber: billMetadata.number,
            operation: 'bill_summary_fallback',
          });

          return {
            summary: keywordSummary,
            fallbackMethod: 'keyword-extraction',
            success: true,
            errors,
          };
        }
      } catch (error) {
        errors.push(
          `Keyword extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Attempt 3: Simple text extraction
    if (opts.useSimpleExtraction) {
      try {
        const simpleSummary = await this.createSimpleExtractionSummary(billText, billMetadata);
        if (simpleSummary) {
          logger.info('Simple extraction fallback successful', {
            billNumber: billMetadata.number,
            operation: 'bill_summary_fallback',
          });

          return {
            summary: simpleSummary,
            fallbackMethod: 'simple-extraction',
            success: true,
            errors,
          };
        }
      } catch (error) {
        errors.push(
          `Simple extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }

    // Final fallback: Basic template-based summary
    const basicSummary = this.createBasicFallbackSummary(billMetadata);

    logger.warn('All fallback methods failed, using basic template', {
      billNumber: billMetadata.number,
      errors,
      operation: 'bill_summary_fallback',
    });

    return {
      summary: basicSummary,
      fallbackMethod: 'basic-fallback',
      success: false,
      errors,
    };
  }

  /**
   * Extract congressional summary from bill text
   */
  private static async extractCongressionalSummary(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string }
  ): Promise<BillSummary | null> {
    try {
      // Look for official congressional summary sections
      const summaryPatterns = [
        /SUMMARY[:\s]+(.*?)(?=\n\s*[A-Z][A-Z\s]+:|\n\s*SEC\.|$)/gi,
        /CONGRESSIONAL SUMMARY[:\s]+(.*?)(?=\n\s*[A-Z][A-Z\s]+:|\n\s*SEC\.|$)/gi,
        /BILL SUMMARY[:\s]+(.*?)(?=\n\s*[A-Z][A-Z\s]+:|\n\s*SEC\.|$)/gi,
      ];

      let extractedSummary = '';
      for (const pattern of summaryPatterns) {
        const match = billText.match(pattern);
        if (match && match[1]) {
          extractedSummary = match[1].trim();
          break;
        }
      }

      if (!extractedSummary) {
        return null;
      }

      // Clean and simplify the extracted summary
      const cleanSummary = this.simplifySummaryText(extractedSummary);

      return {
        billId: `${billMetadata.number}-${billMetadata.congress}`,
        title: billMetadata.title,
        summary: cleanSummary,
        keyPoints: this.extractKeyPointsFromText(cleanSummary),
        whoItAffects: ['American citizens', 'Government agencies'],
        whatItDoes: this.extractMainAction(cleanSummary),
        whyItMatters: 'This legislation could affect current laws and policies',
        readingLevel: 8,
        confidence: 0.7,
        lastUpdated: new Date().toISOString(),
        source: 'congressional-summary',
      };
    } catch (error) {
      logger.error('Congressional summary extraction failed', error as Error, {
        billNumber: billMetadata.number,
        operation: 'bill_summary_fallback',
      });
      return null;
    }
  }

  /**
   * Create keyword-based summary using pattern matching
   */
  private static async createKeywordBasedSummary(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string }
  ): Promise<BillSummary | null> {
    try {
      // Extract key action phrases
      const actionPatterns = [
        /to (amend|establish|require|provide|authorize|direct|prohibit|create|modify|repeal) ([^.]{10,100})/gi,
        /shall (establish|require|provide|authorize|direct|prohibit|create|modify) ([^.]{10,100})/gi,
        /(establishes?|requires?|provides?|authorizes?|directs?|prohibits?|creates?|modifies?) ([^.]{10,100})/gi,
      ];

      const keyActions: string[] = [];
      for (const pattern of actionPatterns) {
        const matches = Array.from(billText.matchAll(pattern));
        matches.slice(0, 3).forEach(match => {
          if (match[1] && match[2]) {
            keyActions.push(`${match[1]} ${match[2]}`.trim());
          }
        });
      }

      if (keyActions.length === 0) {
        return null;
      }

      // Generate summary from key actions
      const mainAction = keyActions[0];
      const summary = `This bill ${mainAction.toLowerCase()}. ${keyActions
        .slice(1, 3)
        .map(action => `It also ${action.toLowerCase()}`)
        .join('. ')}.`;

      const simplifiedSummary = this.simplifySummaryText(summary);

      return {
        billId: `${billMetadata.number}-${billMetadata.congress}`,
        title: billMetadata.title,
        summary: simplifiedSummary,
        keyPoints: keyActions.slice(0, 5).map(action => `The bill ${action.toLowerCase()}`),
        whoItAffects: this.identifyAffectedGroups(billText),
        whatItDoes: mainAction,
        whyItMatters: 'This legislation could change current laws and affect various groups',
        readingLevel: 8,
        confidence: 0.6,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      logger.error('Keyword-based summary creation failed', error as Error, {
        billNumber: billMetadata.number,
        operation: 'bill_summary_fallback',
      });
      return null;
    }
  }

  /**
   * Create simple extraction summary from first paragraphs
   */
  private static async createSimpleExtractionSummary(
    billText: string,
    billMetadata: { number: string; title: string; congress: number; chamber: string }
  ): Promise<BillSummary | null> {
    try {
      // Extract first meaningful paragraphs after boilerplate
      const cleanText = billText
        .replace(/Be it enacted by the Senate and House of Representatives[^.]*\./gi, '')
        .replace(/^\s*\d+\s+/gm, '') // Remove line numbers
        .trim();

      const paragraphs = cleanText.split('\n\n').filter(p => p.trim().length > 50);

      if (paragraphs.length === 0) {
        return null;
      }

      // Take first 2-3 paragraphs and simplify
      const extractedText = paragraphs.slice(0, 3).join(' ').substring(0, 500);
      const simplifiedSummary = this.simplifySummaryText(extractedText);

      return {
        billId: `${billMetadata.number}-${billMetadata.congress}`,
        title: billMetadata.title,
        summary: simplifiedSummary,
        keyPoints: [
          'This bill makes changes to current laws',
          'The changes are detailed in the full bill text',
          'Congress is considering whether to pass this legislation',
        ],
        whoItAffects: ['American citizens'],
        whatItDoes: 'Changes or creates laws',
        whyItMatters: 'Laws affect how our government and society work',
        readingLevel: 8,
        confidence: 0.5,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      logger.error('Simple extraction summary creation failed', error as Error, {
        billNumber: billMetadata.number,
        operation: 'bill_summary_fallback',
      });
      return null;
    }
  }

  /**
   * Create basic fallback summary when all else fails
   */
  private static createBasicFallbackSummary(billMetadata: {
    number: string;
    title: string;
    congress: number;
    chamber: string;
  }): BillSummary {
    const chamber = billMetadata.chamber.toLowerCase();

    return {
      billId: `${billMetadata.number}-${billMetadata.congress}`,
      title: billMetadata.title,
      summary: `This is ${billMetadata.number}, titled "${billMetadata.title}". This bill is being considered by the ${chamber}. You can read the full text to learn more about what it does.`,
      keyPoints: [
        `This bill is being considered by the ${chamber}`,
        'The title gives you an idea of what it covers',
        'Read the full text for complete details',
      ],
      whoItAffects: ['To be determined'],
      whatItDoes: 'Changes or creates laws',
      whyItMatters: 'All laws can affect citizens',
      readingLevel: 8,
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'ai-generated',
    };
  }

  /**
   * Simplify complex legislative text for 8th grade reading level
   */
  private static simplifySummaryText(text: string): string {
    const complexWordReplacements: Record<string, string> = {
      legislation: 'law',
      appropriation: 'money set aside',
      authorization: 'permission',
      implementation: 'putting into action',
      establishment: 'creation',
      modification: 'change',
      prohibition: 'ban',
      requirement: 'need',
      administration: 'management',
      jurisdiction: 'area of control',
      compliance: 'following rules',
      regulation: 'rule',
    };

    let simplified = text;

    // Replace complex words
    Object.entries(complexWordReplacements).forEach(([complex, simple]) => {
      const regex = new RegExp(`\\b${complex}\\b`, 'gi');
      simplified = simplified.replace(regex, simple);
    });

    // Simplify sentence structure
    simplified = simplified
      .replace(/;\s+/g, '. ') // Replace semicolons with periods
      .replace(/,\s+which\s+/gi, '. This ') // Simplify relative clauses
      .replace(/\s+shall\s+/gi, ' will ') // Replace "shall" with "will"
      .replace(/\s+may\s+/gi, ' can ') // Replace "may" with "can"
      .replace(/pursuant to/gi, 'according to') // Simplify legal phrases
      .replace(/in accordance with/gi, 'following');

    // Clean up extra whitespace
    simplified = simplified.replace(/\s+/g, ' ').trim();

    // Limit length and ensure it ends properly
    if (simplified.length > 300) {
      simplified = simplified.substring(0, 297) + '...';
    }

    return simplified;
  }

  /**
   * Extract key points from text using pattern matching
   */
  private static extractKeyPointsFromText(text: string): string[] {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

    // Take first 3-5 sentences as key points
    return sentences
      .slice(0, 5)
      .map(sentence =>
        sentence
          .trim()
          .replace(/^(this|the|a|an)\s+/i, '')
          .trim()
      )
      .filter(point => point.length > 5);
  }

  /**
   * Extract main action from text
   */
  private static extractMainAction(text: string): string {
    const actionPatterns = [
      /this bill (establishes?|creates?|requires?|provides?|authorizes?|directs?|prohibits?|modifies?) ([^.]{10,80})/gi,
      /(establishes?|creates?|requires?|provides?|authorizes?|directs?|prohibits?|modifies?) ([^.]{10,80})/gi,
    ];

    for (const pattern of actionPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    // Fallback to first sentence
    const firstSentence = text.split(/[.!?]/)[0];
    return firstSentence.length > 100 ? firstSentence.substring(0, 97) + '...' : firstSentence;
  }

  /**
   * Identify affected groups from bill text
   */
  private static identifyAffectedGroups(text: string): string[] {
    const groupPatterns = [
      /\b(students?|teachers?|schools?)\b/gi,
      /\b(workers?|employees?|employers?|businesses?)\b/gi,
      /\b(veterans?|military|armed forces)\b/gi,
      /\b(seniors?|elderly|older adults?)\b/gi,
      /\b(families?|children|parents?)\b/gi,
      /\b(farmers?|agriculture|rural)\b/gi,
      /\b(healthcare|patients?|doctors?|hospitals?)\b/gi,
      /\b(taxpayers?|citizens?|residents?)\b/gi,
    ];

    const foundGroups = new Set<string>();

    groupPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const normalized = match.toLowerCase();
          if (
            normalized.includes('student') ||
            normalized.includes('school') ||
            normalized.includes('teacher')
          ) {
            foundGroups.add('Students and educators');
          } else if (
            normalized.includes('worker') ||
            normalized.includes('business') ||
            normalized.includes('employ')
          ) {
            foundGroups.add('Workers and businesses');
          } else if (normalized.includes('veteran') || normalized.includes('military')) {
            foundGroups.add('Veterans and military');
          } else if (normalized.includes('senior') || normalized.includes('elderly')) {
            foundGroups.add('Seniors');
          } else if (
            normalized.includes('famil') ||
            normalized.includes('children') ||
            normalized.includes('parent')
          ) {
            foundGroups.add('Families and children');
          } else if (
            normalized.includes('farm') ||
            normalized.includes('agriculture') ||
            normalized.includes('rural')
          ) {
            foundGroups.add('Farmers and rural communities');
          } else if (
            normalized.includes('health') ||
            normalized.includes('patient') ||
            normalized.includes('doctor') ||
            normalized.includes('hospital')
          ) {
            foundGroups.add('Healthcare providers and patients');
          } else if (
            normalized.includes('taxpayer') ||
            normalized.includes('citizen') ||
            normalized.includes('resident')
          ) {
            foundGroups.add('American citizens');
          }
        });
      }
    });

    // Default if no specific groups found
    if (foundGroups.size === 0) {
      foundGroups.add('American citizens');
    }

    return Array.from(foundGroups).slice(0, 4);
  }

  /**
   * Validate fallback summary quality
   */
  static validateFallbackSummary(summary: BillSummary): {
    isValid: boolean;
    issues: string[];
    score: number;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check minimum content requirements
    if (!summary.summary || summary.summary.length < 20) {
      issues.push('Summary too short');
      score -= 30;
    }

    if (!summary.whatItDoes || summary.whatItDoes.length < 10) {
      issues.push('Missing or insufficient "what it does" description');
      score -= 20;
    }

    if (!summary.keyPoints || summary.keyPoints.length === 0) {
      issues.push('No key points provided');
      score -= 15;
    }

    if (summary.confidence < 0.3) {
      issues.push('Very low confidence score');
      score -= 15;
    }

    if (summary.readingLevel > 10) {
      issues.push('Reading level too high');
      score -= 10;
    }

    // Check for placeholder text
    const placeholderPhrases = ['to be determined', 'not available', 'unknown', 'placeholder'];
    const hasPlaceholders = placeholderPhrases.some(
      phrase =>
        summary.summary.toLowerCase().includes(phrase) ||
        summary.whatItDoes.toLowerCase().includes(phrase)
    );

    if (hasPlaceholders) {
      issues.push('Contains placeholder text');
      score -= 10;
    }

    return {
      isValid: score >= 50,
      issues,
      score: Math.max(0, score),
    };
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Reading Level Validation Utilities
 * 
 * Provides comprehensive reading level analysis and validation
 * for AI-generated bill summaries to ensure 8th grade accessibility.
 */

import { structuredLogger } from '@/lib/logging/logger';

export interface ReadingLevelAnalysis {
  gradeLevel: number;
  fleschKincaidScore: number;
  fleschReadingEase: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  complexWords: string[];
  complexWordCount: number;
  suggestions: string[];
  passesTarget: boolean;
  confidence: number;
}

export interface ReadingLevelOptions {
  targetGrade: number;
  toleranceGrade?: number;
  strictMode?: boolean;
  provideSuggestions?: boolean;
}

export class ReadingLevelValidator {
  private static readonly DEFAULT_TARGET_GRADE = 8;
  private static readonly DEFAULT_TOLERANCE = 1;
  
  // Common complex words that should be simplified for 8th grade
  private static readonly COMPLEX_WORDS_8TH_GRADE = [
    'legislation', 'implementation', 'appropriation', 'authorization', 'administration',
    'consideration', 'establishment', 'determination', 'recommendation', 'modification',
    'jurisdiction', 'compliance', 'regulation', 'prohibition', 'requirement',
    'procurement', 'disposition', 'acquisition', 'expenditure', 'reimbursement',
    'consultation', 'coordination', 'collaboration', 'negotiation', 'arbitration',
    'interpretation', 'documentation', 'certification', 'verification', 'validation'
  ];

  // Simple alternatives for complex words
  private static readonly WORD_SIMPLIFICATIONS: Record<string, string> = {
    'legislation': 'law',
    'implementation': 'putting into action',
    'appropriation': 'money set aside',
    'authorization': 'permission',
    'administration': 'management',
    'consideration': 'thinking about',
    'establishment': 'creation',
    'determination': 'decision',
    'recommendation': 'suggestion',
    'modification': 'change',
    'jurisdiction': 'area of control',
    'compliance': 'following rules',
    'regulation': 'rule',
    'prohibition': 'ban',
    'requirement': 'need',
    'procurement': 'buying',
    'disposition': 'arrangement',
    'acquisition': 'getting',
    'expenditure': 'spending',
    'reimbursement': 'paying back',
    'consultation': 'asking for advice',
    'coordination': 'working together',
    'collaboration': 'partnership',
    'negotiation': 'discussion',
    'arbitration': 'dispute resolution',
    'interpretation': 'explanation',
    'documentation': 'paperwork',
    'certification': 'official approval',
    'verification': 'checking',
    'validation': 'confirmation'
  };

  /**
   * Analyze the reading level of text comprehensively
   */
  static analyzeReadingLevel(
    text: string, 
    options: ReadingLevelOptions = { targetGrade: 8 }
  ): ReadingLevelAnalysis {
    const {
      targetGrade = this.DEFAULT_TARGET_GRADE,
      toleranceGrade = this.DEFAULT_TOLERANCE,
      strictMode = false,
      provideSuggestions = true
    } = options;

    try {
      // Basic text statistics
      const stats = this.calculateTextStatistics(text);
      
      // Calculate various reading level metrics
      const fleschKincaidScore = this.calculateFleschKincaid(stats);
      const fleschReadingEase = this.calculateFleschReadingEase(stats);
      
      // Identify complex words
      const complexWords = this.identifyComplexWords(text, targetGrade);
      
      // Generate suggestions if requested
      const suggestions = provideSuggestions ? this.generateSuggestions(text, stats, complexWords) : [];
      
      // Determine if text passes target
      const maxAllowedGrade = strictMode ? targetGrade : targetGrade + toleranceGrade;
      const passesTarget = fleschKincaidScore <= maxAllowedGrade && complexWords.length <= 5;
      
      // Calculate confidence based on multiple factors
      const confidence = this.calculateConfidence(fleschKincaidScore, targetGrade, complexWords.length);

      const analysis: ReadingLevelAnalysis = {
        gradeLevel: Math.round(fleschKincaidScore * 10) / 10,
        fleschKincaidScore,
        fleschReadingEase,
        avgWordsPerSentence: stats.avgWordsPerSentence,
        avgSyllablesPerWord: stats.avgSyllablesPerWord,
        complexWords,
        complexWordCount: complexWords.length,
        suggestions,
        passesTarget,
        confidence
      };

      structuredLogger.debug('Reading level analysis completed', {
        gradeLevel: analysis.gradeLevel,
        passesTarget: analysis.passesTarget,
        complexWordCount: analysis.complexWordCount,
        targetGrade,
        operation: 'reading_level_validation'
      });

      return analysis;

    } catch (error) {
      structuredLogger.error('Reading level analysis failed', error as Error, {
        targetGrade,
        textLength: text.length,
        operation: 'reading_level_validation'
      });

      return this.generateFallbackAnalysis(text, targetGrade);
    }
  }

  /**
   * Calculate basic text statistics
   */
  private static calculateTextStatistics(text: string): {
    sentences: number;
    words: number;
    syllables: number;
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  } {
    // Count sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    // Count words
    const words = text.split(/\s+/).filter(w => w.trim().length > 0).length;
    
    // Count syllables
    const syllables = this.countSyllablesInText(text);
    
    return {
      sentences: Math.max(1, sentences),
      words: Math.max(1, words),
      syllables: Math.max(1, syllables),
      avgWordsPerSentence: words / Math.max(1, sentences),
      avgSyllablesPerWord: syllables / Math.max(1, words)
    };
  }

  /**
   * Calculate Flesch-Kincaid Grade Level
   */
  private static calculateFleschKincaid(stats: {
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  }): number {
    const gradeLevel = 0.39 * stats.avgWordsPerSentence + 11.8 * stats.avgSyllablesPerWord - 15.59;
    return Math.max(1, gradeLevel);
  }

  /**
   * Calculate Flesch Reading Ease Score
   */
  private static calculateFleschReadingEase(stats: {
    avgWordsPerSentence: number;
    avgSyllablesPerWord: number;
  }): number {
    const score = 206.835 - (1.015 * stats.avgWordsPerSentence) - (84.6 * stats.avgSyllablesPerWord);
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in entire text
   */
  private static countSyllablesInText(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;

    for (const word of words) {
      totalSyllables += this.countSyllablesInWord(word);
    }

    return totalSyllables;
  }

  /**
   * Count syllables in a single word using improved heuristics
   */
  private static countSyllablesInWord(word: string): number {
    // Remove punctuation and convert to lowercase
    const cleanWord = word.replace(/[^a-z]/gi, '').toLowerCase();
    
    if (cleanWord.length === 0) return 0;
    if (cleanWord.length <= 3) return 1;

    // Count vowel groups
    const vowelGroups = cleanWord.match(/[aeiouy]+/g);
    let syllables = vowelGroups ? vowelGroups.length : 1;

    // Adjustments for more accurate counting
    // Silent 'e' at the end
    if (cleanWord.endsWith('e') && syllables > 1) {
      syllables--;
    }

    // 'le' at the end often forms a syllable
    if (cleanWord.endsWith('le') && cleanWord.length > 2) {
      const beforeLe = cleanWord[cleanWord.length - 3];
      if (beforeLe && !/[aeiouy]/.test(beforeLe)) {
        syllables++;
      }
    }

    // Common patterns that reduce syllables
    if (cleanWord.includes('tion') || cleanWord.includes('sion')) {
      // These typically count as one syllable
    }

    return Math.max(1, syllables);
  }

  /**
   * Identify complex words that might be difficult for target grade level
   */
  private static identifyComplexWords(text: string, targetGrade: number): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .map(word => word.replace(/[^a-z]/gi, ''))
      .filter(word => word.length > 0);
    
    const complexWords = new Set<string>();

    for (const word of words) {
      // Check against known complex words for 8th grade
      if (this.COMPLEX_WORDS_8TH_GRADE.includes(word)) {
        complexWords.add(word);
        continue;
      }

      // Words with many syllables are typically complex
      const syllables = this.countSyllablesInWord(word);
      if (syllables >= 4) {
        complexWords.add(word);
        continue;
      }

      // Very long words are typically complex
      if (word.length >= 12) {
        complexWords.add(word);
        continue;
      }

      // Words with complex suffixes
      const complexSuffixes = ['-tion', '-sion', '-ment', '-ness', '-ious', '-eous', '-ance', '-ence'];
      if (complexSuffixes.some(suffix => word.endsWith(suffix.slice(1)))) {
        complexWords.add(word);
      }
    }

    return Array.from(complexWords);
  }

  /**
   * Generate suggestions for improving reading level
   */
  private static generateSuggestions(
    text: string,
    stats: { avgWordsPerSentence: number; avgSyllablesPerWord: number },
    complexWords: string[]
  ): string[] {
    const suggestions: string[] = [];

    // Sentence length suggestions
    if (stats.avgWordsPerSentence > 20) {
      suggestions.push('Break up long sentences. Try to keep sentences under 15-20 words.');
    } else if (stats.avgWordsPerSentence > 15) {
      suggestions.push('Consider shortening some sentences for easier reading.');
    }

    // Syllable complexity suggestions
    if (stats.avgSyllablesPerWord > 1.7) {
      suggestions.push('Use simpler words with fewer syllables when possible.');
    }

    // Complex word suggestions
    if (complexWords.length > 10) {
      suggestions.push('Too many complex words. Replace difficult terms with simpler alternatives.');
    } else if (complexWords.length > 5) {
      suggestions.push('Consider simplifying some complex words.');
    }

    // Specific word replacement suggestions
    const wordsWithReplacements = complexWords.filter(word => 
      this.WORD_SIMPLIFICATIONS[word]
    );

    if (wordsWithReplacements.length > 0) {
      const examples = wordsWithReplacements.slice(0, 3).map(word => 
        `"${word}" → "${this.WORD_SIMPLIFICATIONS[word]}"`
      );
      suggestions.push(`Try replacing: ${examples.join(', ')}`);
    }

    // General suggestions
    if (suggestions.length === 0) {
      suggestions.push('Text is at an appropriate reading level for 8th grade.');
    }

    return suggestions;
  }

  /**
   * Calculate confidence score for reading level analysis
   */
  private static calculateConfidence(
    gradeLevel: number,
    targetGrade: number,
    complexWordCount: number
  ): number {
    let confidence = 1.0;

    // Reduce confidence based on distance from target
    const gradeDifference = Math.abs(gradeLevel - targetGrade);
    confidence -= gradeDifference * 0.1;

    // Reduce confidence based on complex words
    confidence -= complexWordCount * 0.05;

    // Ensure confidence is between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate fallback analysis when main analysis fails
   */
  private static generateFallbackAnalysis(text: string, targetGrade: number): ReadingLevelAnalysis {
    const wordCount = text.split(/\s+/).length;
    const sentenceCount = text.split(/[.!?]+/).length;
    
    return {
      gradeLevel: targetGrade + 2, // Assume slightly above target
      fleschKincaidScore: targetGrade + 2,
      fleschReadingEase: 60, // Neutral score
      avgWordsPerSentence: wordCount / Math.max(1, sentenceCount),
      avgSyllablesPerWord: 1.5, // Reasonable estimate
      complexWords: [],
      complexWordCount: 0,
      suggestions: ['Unable to analyze reading level. Please review manually.'],
      passesTarget: false,
      confidence: 0.3
    };
  }

  /**
   * Validate multiple texts in batch
   */
  static validateBatch(
    texts: { id: string; content: string }[],
    options: ReadingLevelOptions = { targetGrade: 8 }
  ): Map<string, ReadingLevelAnalysis> {
    const results = new Map<string, ReadingLevelAnalysis>();

    for (const { id, content } of texts) {
      try {
        const analysis = this.analyzeReadingLevel(content, options);
        results.set(id, analysis);
      } catch (error) {
        structuredLogger.error('Batch reading level validation failed for item', error as Error, {
          itemId: id,
          operation: 'reading_level_validation'
        });
        results.set(id, this.generateFallbackAnalysis(content, options.targetGrade || this.DEFAULT_TARGET_GRADE));
      }
    }

    return results;
  }

  /**
   * Get suggested simplifications for complex words
   */
  static getSuggestedSimplifications(complexWords: string[]): Record<string, string> {
    const suggestions: Record<string, string> = {};
    
    for (const word of complexWords) {
      if (this.WORD_SIMPLIFICATIONS[word.toLowerCase()]) {
        suggestions[word] = this.WORD_SIMPLIFICATIONS[word.toLowerCase()];
      }
    }
    
    return suggestions;
  }

  /**
   * Check if text meets target reading level
   */
  static meetsTarget(text: string, targetGrade: number = 8, tolerance: number = 1): boolean {
    const analysis = this.analyzeReadingLevel(text, { targetGrade, toleranceGrade: tolerance });
    return analysis.passesTarget;
  }

  /**
   * Get reading level category label
   */
  static getReadingLevelLabel(gradeLevel: number): {
    label: string;
    description: string;
    color: 'green' | 'yellow' | 'red';
  } {
    if (gradeLevel <= 8) {
      return {
        label: 'Easy to Read',
        description: 'Suitable for 8th grade and below',
        color: 'green'
      };
    } else if (gradeLevel <= 10) {
      return {
        label: 'Moderate',
        description: 'High school level',
        color: 'yellow'
      };
    } else {
      return {
        label: 'Complex',
        description: 'College level or above',
        color: 'red'
      };
    }
  }
}
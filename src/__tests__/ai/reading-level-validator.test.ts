/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

/**
 * Tests for Reading Level Validator
 * 
 * Validates that AI-generated summaries meet 8th grade reading level requirements
 */

import { ReadingLevelValidator } from '@/lib/ai/reading-level-validator';

describe('ReadingLevelValidator', () => {
  describe('analyzeReadingLevel', () => {
    it('should correctly identify 8th grade level text', () => {
      const eighthGradeText = `
        This bill helps students pay for college. It gives money to schools. 
        The money comes from taxes. Students can get loans easier. 
        Schools must use the money for classes and books.
      `;
      
      const analysis = ReadingLevelValidator.analyzeReadingLevel(eighthGradeText, {
        targetGrade: 8
      });

      expect(analysis.gradeLevel).toBeLessThanOrEqual(9);
      expect(analysis.passesTarget).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    it('should identify complex text as above 8th grade', () => {
      const complexText = `
        This legislation establishes comprehensive appropriations for the implementation 
        of regulatory compliance mechanisms within educational institutions. The 
        administrative authorities shall coordinate with jurisdictional entities to 
        ensure proper documentation and certification procedures are maintained.
      `;
      
      const analysis = ReadingLevelValidator.analyzeReadingLevel(complexText, {
        targetGrade: 8
      });

      expect(analysis.gradeLevel).toBeGreaterThan(10);
      expect(analysis.passesTarget).toBe(false);
      expect(analysis.complexWords.length).toBeGreaterThan(5);
    });

    it('should provide helpful simplification suggestions', () => {
      const complexText = `
        The legislation requires implementation of comprehensive regulatory compliance 
        mechanisms for educational institutions and administrative coordination.
      `;
      
      const analysis = ReadingLevelValidator.analyzeReadingLevel(complexText, {
        targetGrade: 8,
        provideSuggestions: true
      });

      expect(analysis.suggestions).toHaveLength(expect.any(Number));
      expect(analysis.suggestions.length).toBeGreaterThan(0);
      expect(analysis.complexWords).toContain('legislation');
      expect(analysis.complexWords).toContain('implementation');
    });

    it('should calculate syllables correctly', () => {
      // Test the syllable counting indirectly through reading level
      const singleSyllableText = 'The cat sat on the mat. It was a big cat. The mat was red.';
      const multiSyllableText = 'The feline situated itself upon the material. It was a magnificent creature.';
      
      const simple = ReadingLevelValidator.analyzeReadingLevel(singleSyllableText);
      const complex = ReadingLevelValidator.analyzeReadingLevel(multiSyllableText);
      
      expect(simple.gradeLevel).toBeLessThan(complex.gradeLevel);
      expect(simple.avgSyllablesPerWord).toBeLessThan(complex.avgSyllablesPerWord);
    });

    it('should handle edge cases gracefully', () => {
      // Empty text
      const emptyAnalysis = ReadingLevelValidator.analyzeReadingLevel('');
      expect(emptyAnalysis.gradeLevel).toBeGreaterThan(0);
      
      // Very short text
      const shortAnalysis = ReadingLevelValidator.analyzeReadingLevel('Hello.');
      expect(shortAnalysis.gradeLevel).toBeGreaterThan(0);
      
      // Text with numbers and punctuation
      const mixedText = 'H.R. 1234 costs $50,000 (fifty thousand dollars) in 2024.';
      const mixedAnalysis = ReadingLevelValidator.analyzeReadingLevel(mixedText);
      expect(mixedAnalysis.gradeLevel).toBeGreaterThan(0);
    });
  });

  describe('meetsTarget', () => {
    it('should correctly identify if text meets 8th grade target', () => {
      const simpleText = 'This law helps people. It gives money to schools. Students can learn better.';
      const complexText = 'This comprehensive legislation facilitates educational enhancement through financial appropriations.';
      
      expect(ReadingLevelValidator.meetsTarget(simpleText, 8)).toBe(true);
      expect(ReadingLevelValidator.meetsTarget(complexText, 8)).toBe(false);
    });
  });

  describe('getReadingLevelLabel', () => {
    it('should provide correct labels for different grade levels', () => {
      const easy = ReadingLevelValidator.getReadingLevelLabel(6);
      const moderate = ReadingLevelValidator.getReadingLevelLabel(9);
      const complex = ReadingLevelValidator.getReadingLevelLabel(14);
      
      expect(easy.label).toBe('Easy to Read');
      expect(easy.color).toBe('green');
      
      expect(moderate.label).toBe('Moderate');
      expect(moderate.color).toBe('yellow');
      
      expect(complex.label).toBe('Complex');
      expect(complex.color).toBe('red');
    });
  });

  describe('getSuggestedSimplifications', () => {
    it('should provide word simplifications', () => {
      const complexWords = ['legislation', 'implementation', 'authorization', 'unknown-word'];
      const suggestions = ReadingLevelValidator.getSuggestedSimplifications(complexWords);
      
      expect(suggestions).toHaveProperty('legislation', 'law');
      expect(suggestions).toHaveProperty('implementation', 'putting into action');
      expect(suggestions).toHaveProperty('authorization', 'permission');
      expect(suggestions).not.toHaveProperty('unknown-word');
    });
  });

  describe('validateBatch', () => {
    it('should validate multiple texts efficiently', () => {
      const texts = [
        { id: 'simple', content: 'This is easy text. Short words. Simple ideas.' },
        { id: 'complex', content: 'This demonstrates sophisticated linguistic complexity with multisyllabic terminology.' }
      ];
      
      const results = ReadingLevelValidator.validateBatch(texts, { targetGrade: 8 });
      
      expect(results.size).toBe(2);
      expect(results.get('simple')?.passesTarget).toBe(true);
      expect(results.get('complex')?.passesTarget).toBe(false);
    });
  });
});

describe('Bill Summary Reading Level Integration', () => {
  it('should validate that sample bill summaries meet 8th grade requirements', () => {
    const goodSummary = `
      This bill helps veterans get better healthcare. It gives more money to VA hospitals. 
      Veterans can see doctors faster. The bill also helps pay for mental health care. 
      This will make life better for people who served in the military.
    `;
    
    const badSummary = `
      This legislation establishes comprehensive appropriations for the enhancement of 
      medical services infrastructure within the Department of Veterans Affairs healthcare 
      system, facilitating expedited accessibility to clinical practitioners and 
      comprehensive psychological intervention services.
    `;
    
    const goodAnalysis = ReadingLevelValidator.analyzeReadingLevel(goodSummary, { targetGrade: 8 });
    const badAnalysis = ReadingLevelValidator.analyzeReadingLevel(badSummary, { targetGrade: 8 });
    
    expect(goodAnalysis.passesTarget).toBe(true);
    expect(goodAnalysis.gradeLevel).toBeLessThanOrEqual(9);
    expect(goodAnalysis.complexWords.length).toBeLessThan(3);
    
    expect(badAnalysis.passesTarget).toBe(false);
    expect(badAnalysis.gradeLevel).toBeGreaterThan(10);
    expect(badAnalysis.complexWords.length).toBeGreaterThan(5);
    expect(badAnalysis.suggestions.length).toBeGreaterThan(0);
  });

  it('should identify key characteristics of 8th grade appropriate text', () => {
    const idealSummary = `
      This bill changes how we vote. It makes voting easier and safer. 
      People can vote by mail in all states. They can also vote early. 
      The bill stops tricks that make voting hard. Every vote will count fairly.
    `;
    
    const analysis = ReadingLevelValidator.analyzeReadingLevel(idealSummary, { targetGrade: 8 });
    
    // Should meet all 8th grade criteria
    expect(analysis.gradeLevel).toBeLessThanOrEqual(9);
    expect(analysis.avgWordsPerSentence).toBeLessThan(20);
    expect(analysis.avgSyllablesPerWord).toBeLessThan(1.6);
    expect(analysis.complexWords.length).toBeLessThan(2);
    expect(analysis.passesTarget).toBe(true);
    expect(analysis.confidence).toBeGreaterThan(0.8);
  });
});
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Text Processing Utilities
 * 
 * Handles extraction, cleaning, and chunking of legislative text
 * for AI summarization and analysis.
 */

import { structuredLogger } from '@/lib/logging/logger';

export interface BillTextChunk {
  id: string;
  text: string;
  type: 'title' | 'section' | 'subsection' | 'amendment' | 'body';
  importance: 'high' | 'medium' | 'low';
  wordCount: number;
  sectionNumber?: string;
}

export interface ProcessedBillText {
  originalLength: number;
  processedLength: number;
  chunks: BillTextChunk[];
  metadata: {
    hasAmendments: boolean;
    sectionCount: number;
    estimatedReadingTime: number;
    complexity: 'low' | 'medium' | 'high';
  };
}

export class BillTextProcessor {
  private static readonly MAX_CHUNK_SIZE = 2000; // characters
  private static readonly MIN_CHUNK_SIZE = 100;
  
  // Common legislative formatting patterns
  private static readonly PATTERNS = {
    sectionHeader: /^(SEC|SECTION)\s+(\d+)\.\s*([^.]+)\.?$/gim,
    subsectionMarker: /^\s*\(([a-z0-9]+)\)\s*/gm,
    amendmentText: /to amend .{1,200}/gi,
    strikethrough: /<<[^>]*>>/g,
    insertText: /\[\[[^\]]*\]\]/g,
    pageNumber: /^\s*\d+\s*$/gm,
    lineNumber: /^\s*\d+\s+/gm,
    boilerplate: /(Be it enacted by the Senate and House of Representatives[^.]*\.)|(\d+th CONGRESS \d+st Session)/gi
  };

  /**
   * Process full bill text into structured, analyzable format
   */
  static async processBillText(rawText: string, billMetadata?: {
    number?: string;
    title?: string;
    congress?: number;
  }): Promise<ProcessedBillText> {
    try {
      structuredLogger.info('Starting bill text processing', {
        originalLength: rawText.length,
        billNumber: billMetadata?.number,
        operation: 'bill_text_processing'
      });

      // Step 1: Clean and normalize the text
      const cleanedText = this.cleanBillText(rawText);
      
      // Step 2: Extract sections and structure
      const chunks = this.extractTextChunks(cleanedText);
      
      // Step 3: Analyze and rank chunks by importance
      const rankedChunks = this.rankChunksByImportance(chunks);
      
      // Step 4: Generate metadata
      const metadata = this.generateTextMetadata(cleanedText, rankedChunks);

      const result: ProcessedBillText = {
        originalLength: rawText.length,
        processedLength: cleanedText.length,
        chunks: rankedChunks,
        metadata
      };

      structuredLogger.info('Bill text processing completed', {
        originalLength: rawText.length,
        processedLength: cleanedText.length,
        chunksGenerated: rankedChunks.length,
        complexity: metadata.complexity,
        operation: 'bill_text_processing'
      });

      return result;

    } catch (error) {
      structuredLogger.error('Bill text processing failed', error as Error, {
        billNumber: billMetadata?.number,
        operation: 'bill_text_processing'
      });
      
      // Return minimal processing on error
      return this.generateFallbackProcessing(rawText);
    }
  }

  /**
   * Clean bill text by removing formatting artifacts and normalizing content
   */
  private static cleanBillText(text: string): string {
    let cleaned = text;

    // Remove common legislative artifacts
    cleaned = cleaned
      // Remove boilerplate
      .replace(this.PATTERNS.boilerplate, '')
      // Remove line numbers
      .replace(this.PATTERNS.lineNumber, '')
      // Remove page numbers on their own lines
      .replace(this.PATTERNS.pageNumber, '')
      // Clean up strikethrough and amendment markup
      .replace(this.PATTERNS.strikethrough, '[removed text]')
      .replace(this.PATTERNS.insertText, (match) => match.replace(/\[\[|\]\]/g, ''))
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n\n')
      // Clean up quotes
      .replace(/[""]/g, '"')
      .replace(/['']/g, "'")
      .trim();

    return cleaned;
  }

  /**
   * Extract and structure text into logical chunks
   */
  private static extractTextChunks(text: string): BillTextChunk[] {
    const chunks: BillTextChunk[] = [];
    
    // First, try to identify sections
    const sections = this.extractSections(text);
    
    if (sections.length > 0) {
      // Process structured sections
      sections.forEach((section, index) => {
        chunks.push(...this.chunkSection(section, index));
      });
    } else {
      // Fallback to paragraph-based chunking
      chunks.push(...this.chunkByParagraphs(text));
    }

    return chunks.filter(chunk => 
      chunk.text.length >= this.MIN_CHUNK_SIZE && 
      chunk.text.length <= this.MAX_CHUNK_SIZE
    );
  }

  /**
   * Extract legislative sections from text
   */
  private static extractSections(text: string): Array<{
    number: string;
    title: string;
    content: string;
  }> {
    const sections: Array<{ number: string; title: string; content: string }> = [];
    const sectionMatches = Array.from(text.matchAll(this.PATTERNS.sectionHeader));
    
    if (sectionMatches.length === 0) {
      return sections;
    }

    for (let i = 0; i < sectionMatches.length; i++) {
      const match = sectionMatches[i];
      const nextMatch = sectionMatches[i + 1];
      
      const sectionStart = match.index || 0;
      const sectionEnd = nextMatch ? (nextMatch.index || text.length) : text.length;
      
      const sectionContent = text.substring(sectionStart, sectionEnd);
      
      sections.push({
        number: match[2],
        title: match[3]?.trim() || '',
        content: sectionContent
      });
    }

    return sections;
  }

  /**
   * Chunk a legislative section into manageable pieces
   */
  private static chunkSection(section: {
    number: string;
    title: string;
    content: string;
  }, index: number): BillTextChunk[] {
    const chunks: BillTextChunk[] = [];
    
    // Add section title as high-importance chunk
    if (section.title) {
      chunks.push({
        id: `section-${section.number}-title`,
        text: `Section ${section.number}: ${section.title}`,
        type: 'title',
        importance: 'high',
        wordCount: section.title.split(/\s+/).length,
        sectionNumber: section.number
      });
    }

    // Process section content
    const paragraphs = section.content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    paragraphs.forEach((paragraph, pIndex) => {
      if (paragraph.length > this.MAX_CHUNK_SIZE) {
        // Split large paragraphs
        const subChunks = this.splitLargeParagraph(paragraph);
        subChunks.forEach((subChunk, sIndex) => {
          chunks.push({
            id: `section-${section.number}-${pIndex}-${sIndex}`,
            text: subChunk,
            type: 'section',
            importance: index < 3 ? 'high' : 'medium', // First 3 sections are high priority
            wordCount: subChunk.split(/\s+/).length,
            sectionNumber: section.number
          });
        });
      } else if (paragraph.length >= this.MIN_CHUNK_SIZE) {
        chunks.push({
          id: `section-${section.number}-${pIndex}`,
          text: paragraph,
          type: 'section',
          importance: index < 3 ? 'high' : 'medium',
          wordCount: paragraph.split(/\s+/).length,
          sectionNumber: section.number
        });
      }
    });

    return chunks;
  }

  /**
   * Chunk text by paragraphs when no clear structure is found
   */
  private static chunkByParagraphs(text: string): BillTextChunk[] {
    const chunks: BillTextChunk[] = [];
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    paragraphs.forEach((paragraph, index) => {
      if (paragraph.length > this.MAX_CHUNK_SIZE) {
        const subChunks = this.splitLargeParagraph(paragraph);
        subChunks.forEach((subChunk, sIndex) => {
          chunks.push({
            id: `paragraph-${index}-${sIndex}`,
            text: subChunk,
            type: 'body',
            importance: index < 5 ? 'high' : 'medium', // First 5 paragraphs are high priority
            wordCount: subChunk.split(/\s+/).length
          });
        });
      } else if (paragraph.length >= this.MIN_CHUNK_SIZE) {
        chunks.push({
          id: `paragraph-${index}`,
          text: paragraph,
          type: 'body',
          importance: index < 5 ? 'high' : 'medium',
          wordCount: paragraph.split(/\s+/).length
        });
      }
    });

    return chunks;
  }

  /**
   * Split paragraphs that are too large
   */
  private static splitLargeParagraph(paragraph: string): string[] {
    const chunks: string[] = [];
    const sentences = paragraph.split(/\. /).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const sentenceWithPeriod = sentence.endsWith('.') ? sentence : sentence + '.';
      
      if ((currentChunk + ' ' + sentenceWithPeriod).length > this.MAX_CHUNK_SIZE) {
        if (currentChunk.length >= this.MIN_CHUNK_SIZE) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentenceWithPeriod;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPeriod;
      }
    }
    
    if (currentChunk.length >= this.MIN_CHUNK_SIZE) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }

  /**
   * Rank chunks by importance for summarization priority
   */
  private static rankChunksByImportance(chunks: BillTextChunk[]): BillTextChunk[] {
    return chunks.map(chunk => {
      // Enhance importance scoring
      let importance = chunk.importance;
      
      // Title chunks are always high importance
      if (chunk.type === 'title') {
        importance = 'high';
      }
      
      // Chunks with amendment language are important
      if (this.PATTERNS.amendmentText.test(chunk.text)) {
        importance = importance === 'low' ? 'medium' : 'high';
      }
      
      // Short chunks in sections might be less important
      if (chunk.wordCount < 20 && chunk.type !== 'title') {
        importance = 'low';
      }
      
      return { ...chunk, importance };
    }).sort((a, b) => {
      // Sort by importance, then by position
      const importanceOrder = { high: 3, medium: 2, low: 1 };
      const importanceDiff = importanceOrder[b.importance] - importanceOrder[a.importance];
      
      if (importanceDiff !== 0) return importanceDiff;
      
      // If same importance, maintain original order
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Generate metadata about the processed text
   */
  private static generateTextMetadata(
    text: string, 
    chunks: BillTextChunk[]
  ): ProcessedBillText['metadata'] {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = sentences > 0 ? words / sentences : 0;
    
    // Estimate complexity based on various factors
    let complexity: 'low' | 'medium' | 'high' = 'medium';
    
    if (avgWordsPerSentence > 25 || words > 10000) {
      complexity = 'high';
    } else if (avgWordsPerSentence < 15 && words < 3000) {
      complexity = 'low';
    }
    
    return {
      hasAmendments: this.PATTERNS.amendmentText.test(text),
      sectionCount: chunks.filter(c => c.type === 'section' || c.type === 'title').length,
      estimatedReadingTime: Math.ceil(words / 200), // Average reading speed
      complexity
    };
  }

  /**
   * Generate fallback processing when main processing fails
   */
  private static generateFallbackProcessing(text: string): ProcessedBillText {
    const cleanedText = text.replace(/\s+/g, ' ').trim();
    const words = cleanedText.split(/\s+/);
    
    // Create simple chunks
    const chunks: BillTextChunk[] = [];
    const chunkSize = 500; // words
    
    for (let i = 0; i < words.length; i += chunkSize) {
      const chunkWords = words.slice(i, i + chunkSize);
      const chunkText = chunkWords.join(' ');
      
      chunks.push({
        id: `fallback-${i / chunkSize}`,
        text: chunkText,
        type: 'body',
        importance: i === 0 ? 'high' : 'medium',
        wordCount: chunkWords.length
      });
    }
    
    return {
      originalLength: text.length,
      processedLength: cleanedText.length,
      chunks,
      metadata: {
        hasAmendments: false,
        sectionCount: 0,
        estimatedReadingTime: Math.ceil(words.length / 200),
        complexity: 'medium'
      }
    };
  }

  /**
   * Extract the most important text for summarization
   */
  static extractKeyContent(processedText: ProcessedBillText, maxWords: number = 1000): string {
    const highImportanceChunks = processedText.chunks.filter(c => c.importance === 'high');
    const mediumImportanceChunks = processedText.chunks.filter(c => c.importance === 'medium');
    
    let content = '';
    let wordCount = 0;
    
    // Add high importance chunks first
    for (const chunk of highImportanceChunks) {
      if (wordCount + chunk.wordCount <= maxWords) {
        content += (content ? '\n\n' : '') + chunk.text;
        wordCount += chunk.wordCount;
      } else {
        break;
      }
    }
    
    // Add medium importance chunks if space allows
    for (const chunk of mediumImportanceChunks) {
      if (wordCount + chunk.wordCount <= maxWords) {
        content += (content ? '\n\n' : '') + chunk.text;
        wordCount += chunk.wordCount;
      } else {
        break;
      }
    }
    
    return content;
  }

  /**
   * Get summary statistics about the processed text
   */
  static getTextStatistics(processedText: ProcessedBillText): {
    totalWords: number;
    totalSentences: number;
    avgWordsPerSentence: number;
    readingTime: number;
    complexity: string;
    sectionsFound: number;
  } {
    const allText = processedText.chunks.map(c => c.text).join(' ');
    const words = allText.split(/\s+/).length;
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    
    return {
      totalWords: words,
      totalSentences: sentences,
      avgWordsPerSentence: sentences > 0 ? Math.round((words / sentences) * 10) / 10 : 0,
      readingTime: processedText.metadata.estimatedReadingTime,
      complexity: processedText.metadata.complexity,
      sectionsFound: processedText.metadata.sectionCount
    };
  }
}
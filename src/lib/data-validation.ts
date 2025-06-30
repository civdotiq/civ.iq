/**
 * Data Validation and Source Attribution System
 * 
 * This module provides utilities for validating data quality,
 * ensuring accuracy, and tracking data sources across all APIs.
 */

interface DataSource {
  name: string;
  url: string;
  type: 'government' | 'api' | 'news' | 'research';
  reliability: 'high' | 'medium' | 'low';
  lastUpdated: string;
  updateFrequency: 'real-time' | 'daily' | 'weekly' | 'monthly';
  coverage: string[];
  limitations?: string[];
}

interface ValidationResult {
  isValid: boolean;
  confidence: number; // 0-100
  errors: string[];
  warnings: string[];
  source: DataSource;
  timestamp: string;
  checks: {
    completeness: number;
    accuracy: number;
    timeliness: number;
    consistency: number;
  };
}

interface DataQualityMetrics {
  totalRecords: number;
  validRecords: number;
  errorRate: number;
  averageConfidence: number;
  sourceReliability: Record<string, number>;
  lastValidation: string;
  commonIssues: Array<{
    type: string;
    count: number;
    examples: string[];
  }>;
}

// Official data sources registry
const DATA_SOURCES: Record<string, DataSource> = {
  'census-api': {
    name: 'U.S. Census Bureau API',
    url: 'https://api.census.gov',
    type: 'government',
    reliability: 'high',
    lastUpdated: '2024-01-01',
    updateFrequency: 'daily',
    coverage: ['demographics', 'congressional-districts', 'geographic-data'],
    limitations: ['Rate limited', 'Some historical data gaps']
  },
  'congress-api': {
    name: 'Congress.gov API',
    url: 'https://api.congress.gov',
    type: 'government',
    reliability: 'high',
    lastUpdated: '2024-01-01',
    updateFrequency: 'real-time',
    coverage: ['members', 'bills', 'votes', 'committees'],
    limitations: ['119th Congress focus', 'Some member details incomplete']
  },
  'fec-api': {
    name: 'Federal Election Commission API',
    url: 'https://api.open.fec.gov',
    type: 'government',
    reliability: 'high',
    lastUpdated: '2024-01-01',
    updateFrequency: 'daily',
    coverage: ['campaign-finance', 'candidates', 'committees', 'contributions'],
    limitations: ['Reporting delays', 'Large contributor focus']
  },
  'gdelt-api': {
    name: 'GDELT Project API',
    url: 'https://api.gdeltproject.org',
    type: 'research',
    reliability: 'medium',
    lastUpdated: '2024-01-01',
    updateFrequency: 'real-time',
    coverage: ['news-articles', 'events', 'trends'],
    limitations: ['English language bias', 'Coverage varies by topic']
  },
  'openstates-api': {
    name: 'OpenStates.org API',
    url: 'https://openstates.org',
    type: 'research',
    reliability: 'high',
    lastUpdated: '2024-01-01',
    updateFrequency: 'daily',
    coverage: ['state-legislature', 'state-bills', 'state-votes'],
    limitations: ['State data completeness varies', 'API key required']
  },
  'government-rss': {
    name: 'Government RSS Feeds',
    url: 'various',
    type: 'government',
    reliability: 'high',
    lastUpdated: '2024-01-01',
    updateFrequency: 'real-time',
    coverage: ['press-releases', 'announcements', 'official-statements'],
    limitations: ['Feed availability varies', 'Update frequency inconsistent']
  }
};

class DataValidator {
  private validationHistory: Map<string, ValidationResult[]> = new Map();
  private qualityMetrics: Map<string, DataQualityMetrics> = new Map();

  /**
   * Validate congressional representative data
   */
  validateRepresentativeData(data: any, source: string): ValidationResult {
    const sourceInfo = DATA_SOURCES[source];
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 100;

    // Required fields validation
    const requiredFields = ['bioguideId', 'name', 'party', 'state', 'chamber'];
    for (const field of requiredFields) {
      if (!data[field]) {
        errors.push(`Missing required field: ${field}`);
        confidence -= 20;
      }
    }

    // Data format validation
    if (data.bioguideId && !/^[A-Z]\d{6}$/.test(data.bioguideId)) {
      warnings.push('Bioguide ID format may be incorrect');
      confidence -= 5;
    }

    if (data.state && data.state.length !== 2) {
      errors.push('State code must be 2 characters');
      confidence -= 10;
    }

    if (data.party && !['Democratic', 'Republican', 'Independent'].includes(data.party)) {
      warnings.push(`Unusual party affiliation: ${data.party}`);
      confidence -= 5;
    }

    if (data.chamber && !['House', 'Senate'].includes(data.chamber)) {
      errors.push(`Invalid chamber: ${data.chamber}`);
      confidence -= 15;
    }

    // Contact information validation
    if (data.phone && !/^\(\d{3}\) \d{3}-\d{4}$/.test(data.phone)) {
      warnings.push('Phone number format may be incorrect');
      confidence -= 3;
    }

    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      warnings.push('Email format may be incorrect');
      confidence -= 3;
    }

    // Data completeness check
    const optionalFields = ['phone', 'email', 'website', 'committees', 'terms'];
    const presentOptionalFields = optionalFields.filter(field => data[field]);
    const completeness = (presentOptionalFields.length / optionalFields.length) * 100;

    if (completeness < 50) {
      warnings.push('Data completeness is low');
      confidence -= 10;
    }

    const checks = {
      completeness: Math.max(0, completeness),
      accuracy: Math.max(0, 100 - errors.length * 10),
      timeliness: this.calculateTimeliness(sourceInfo),
      consistency: Math.max(0, 100 - warnings.length * 5)
    };

    const result: ValidationResult = {
      isValid: errors.length === 0,
      confidence: Math.max(0, confidence),
      errors,
      warnings,
      source: sourceInfo,
      timestamp: new Date().toISOString(),
      checks
    };

    this.recordValidation(source, result);
    return result;
  }

  /**
   * Validate campaign finance data
   */
  validateFinanceData(data: any, source: string): ValidationResult {
    const sourceInfo = DATA_SOURCES[source];
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 100;

    // Required fields for financial data
    if (!data.candidate_id) {
      errors.push('Missing candidate ID');
      confidence -= 25;
    }

    if (typeof data.total_receipts !== 'number' || data.total_receipts < 0) {
      errors.push('Invalid total receipts amount');
      confidence -= 20;
    }

    if (typeof data.total_disbursements !== 'number' || data.total_disbursements < 0) {
      errors.push('Invalid total disbursements amount');
      confidence -= 20;
    }

    // Logical consistency checks
    if (data.total_receipts && data.total_disbursements && data.cash_on_hand) {
      const expectedCash = data.total_receipts - data.total_disbursements;
      const cashDifference = Math.abs(expectedCash - data.cash_on_hand);
      
      // Allow for reasonable variance due to timing differences
      if (cashDifference > data.total_receipts * 0.1) {
        warnings.push('Cash on hand may not match receipts and disbursements');
        confidence -= 10;
      }
    }

    // Date validation
    if (data.coverage_start_date && data.coverage_end_date) {
      const startDate = new Date(data.coverage_start_date);
      const endDate = new Date(data.coverage_end_date);
      
      if (startDate >= endDate) {
        errors.push('Coverage start date must be before end date');
        confidence -= 15;
      }
    }

    const checks = {
      completeness: this.calculateFinanceCompleteness(data),
      accuracy: Math.max(0, 100 - errors.length * 15),
      timeliness: this.calculateTimeliness(sourceInfo),
      consistency: Math.max(0, 100 - warnings.length * 8)
    };

    const result: ValidationResult = {
      isValid: errors.length === 0,
      confidence: Math.max(0, confidence),
      errors,
      warnings,
      source: sourceInfo,
      timestamp: new Date().toISOString(),
      checks
    };

    this.recordValidation(source, result);
    return result;
  }

  /**
   * Validate news article data
   */
  validateNewsData(data: any, source: string): ValidationResult {
    const sourceInfo = DATA_SOURCES[source];
    const errors: string[] = [];
    const warnings: string[] = [];
    let confidence = 100;

    // Required fields
    if (!data.title || data.title.length < 10) {
      errors.push('Title is missing or too short');
      confidence -= 20;
    }

    if (!data.url || !this.isValidURL(data.url)) {
      errors.push('Invalid or missing URL');
      confidence -= 25;
    }

    if (!data.publishedDate) {
      errors.push('Missing publication date');
      confidence -= 15;
    } else {
      const pubDate = new Date(data.publishedDate);
      const now = new Date();
      const daysDiff = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 365) {
        warnings.push('Article is over a year old');
        confidence -= 5;
      }
    }

    // Content quality checks
    if (data.title && this.containsSuspiciousContent(data.title)) {
      warnings.push('Title contains potentially unreliable indicators');
      confidence -= 10;
    }

    if (data.source && this.isKnownUnreliableSource(data.source)) {
      warnings.push('Source has questionable reliability');
      confidence -= 15;
    }

    // Language and content validation
    if (data.language && data.language !== 'English') {
      warnings.push('Non-English content may have translation issues');
      confidence -= 5;
    }

    const checks = {
      completeness: this.calculateNewsCompleteness(data),
      accuracy: Math.max(0, 100 - errors.length * 12),
      timeliness: this.calculateNewsTimeliness(data),
      consistency: Math.max(0, 100 - warnings.length * 6)
    };

    const result: ValidationResult = {
      isValid: errors.length === 0,
      confidence: Math.max(0, confidence),
      errors,
      warnings,
      source: sourceInfo,
      timestamp: new Date().toISOString(),
      checks
    };

    this.recordValidation(source, result);
    return result;
  }

  /**
   * Cross-validate data from multiple sources
   */
  crossValidateData(dataPoints: Array<{ data: any; source: string; type: string }>): {
    consensus: any;
    conflicts: Array<{ field: string; values: Array<{ source: string; value: any }> }>;
    reliability: number;
  } {
    const conflicts: any[] = [];
    const consensus: any = {};
    const fieldValues = new Map<string, Array<{ source: string; value: any }>>();

    // Collect all field values from different sources
    dataPoints.forEach(({ data, source }) => {
      Object.entries(data).forEach(([field, value]) => {
        if (!fieldValues.has(field)) {
          fieldValues.set(field, []);
        }
        fieldValues.get(field)!.push({ source, value });
      });
    });

    // Identify conflicts and build consensus
    fieldValues.forEach((values, field) => {
      const uniqueValues = [...new Set(values.map(v => JSON.stringify(v.value)))];
      
      if (uniqueValues.length > 1) {
        // Conflict detected
        conflicts.push({
          field,
          values: values.map(v => ({ source: v.source, value: v.value }))
        });

        // Use most reliable source for consensus
        const sortedBySources = values.sort((a, b) => 
          DATA_SOURCES[b.source]?.reliability === 'high' ? 1 : -1
        );
        consensus[field] = sortedBySources[0].value;
      } else {
        // No conflict, use common value
        consensus[field] = values[0].value;
      }
    });

    // Calculate overall reliability
    const reliabilityScore = this.calculateCrossValidationReliability(dataPoints, conflicts);

    return {
      consensus,
      conflicts,
      reliability: reliabilityScore
    };
  }

  /**
   * Generate data quality report
   */
  generateQualityReport(sources?: string[]): DataQualityMetrics {
    const targetSources = sources || Object.keys(DATA_SOURCES);
    const aggregatedMetrics: DataQualityMetrics = {
      totalRecords: 0,
      validRecords: 0,
      errorRate: 0,
      averageConfidence: 0,
      sourceReliability: {},
      lastValidation: new Date().toISOString(),
      commonIssues: []
    };

    const allIssues = new Map<string, number>();
    let totalConfidence = 0;
    let confidenceCount = 0;

    targetSources.forEach(source => {
      const validations = this.validationHistory.get(source) || [];
      const validCount = validations.filter(v => v.isValid).length;
      
      aggregatedMetrics.totalRecords += validations.length;
      aggregatedMetrics.validRecords += validCount;
      
      validations.forEach(validation => {
        totalConfidence += validation.confidence;
        confidenceCount++;

        // Collect error types
        validation.errors.forEach(error => {
          const errorType = this.categorizeError(error);
          allIssues.set(errorType, (allIssues.get(errorType) || 0) + 1);
        });

        validation.warnings.forEach(warning => {
          const warningType = this.categorizeError(warning);
          allIssues.set(warningType, (allIssues.get(warningType) || 0) + 1);
        });
      });

      if (validations.length > 0) {
        aggregatedMetrics.sourceReliability[source] = (validCount / validations.length) * 100;
      }
    });

    aggregatedMetrics.errorRate = aggregatedMetrics.totalRecords > 0 
      ? ((aggregatedMetrics.totalRecords - aggregatedMetrics.validRecords) / aggregatedMetrics.totalRecords) * 100
      : 0;

    aggregatedMetrics.averageConfidence = confidenceCount > 0 
      ? totalConfidence / confidenceCount 
      : 0;

    // Sort and format common issues
    aggregatedMetrics.commonIssues = Array.from(allIssues.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({
        type,
        count,
        examples: this.getIssueExamples(type)
      }));

    return aggregatedMetrics;
  }

  /**
   * Private helper methods
   */
  private recordValidation(source: string, result: ValidationResult): void {
    if (!this.validationHistory.has(source)) {
      this.validationHistory.set(source, []);
    }
    
    const history = this.validationHistory.get(source)!;
    history.push(result);
    
    // Keep only last 1000 validations per source
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }
  }

  private calculateTimeliness(source: DataSource): number {
    const now = new Date();
    const lastUpdate = new Date(source.lastUpdated);
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    switch (source.updateFrequency) {
      case 'real-time': return hoursSinceUpdate < 1 ? 100 : Math.max(0, 100 - hoursSinceUpdate * 5);
      case 'daily': return hoursSinceUpdate < 24 ? 100 : Math.max(0, 100 - (hoursSinceUpdate - 24) * 2);
      case 'weekly': return hoursSinceUpdate < 168 ? 100 : Math.max(0, 100 - (hoursSinceUpdate - 168) * 0.5);
      case 'monthly': return hoursSinceUpdate < 720 ? 100 : Math.max(0, 100 - (hoursSinceUpdate - 720) * 0.1);
      default: return 50;
    }
  }

  private calculateFinanceCompleteness(data: any): number {
    const expectedFields = [
      'candidate_id', 'total_receipts', 'total_disbursements', 'cash_on_hand',
      'individual_contributions', 'pac_contributions', 'coverage_start_date', 'coverage_end_date'
    ];
    
    const presentFields = expectedFields.filter(field => data[field] != null);
    return (presentFields.length / expectedFields.length) * 100;
  }

  private calculateNewsCompleteness(data: any): number {
    const expectedFields = ['title', 'url', 'source', 'publishedDate', 'description'];
    const presentFields = expectedFields.filter(field => data[field] != null);
    return (presentFields.length / expectedFields.length) * 100;
  }

  private calculateNewsTimeliness(data: any): number {
    if (!data.publishedDate) return 0;
    
    const pubDate = new Date(data.publishedDate);
    const now = new Date();
    const hoursSincePublish = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
    
    // Newer articles are more timely
    if (hoursSincePublish < 24) return 100;
    if (hoursSincePublish < 168) return 90; // 1 week
    if (hoursSincePublish < 720) return 70; // 1 month
    return Math.max(0, 50 - hoursSincePublish / 720 * 50);
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private containsSuspiciousContent(text: string): boolean {
    const suspiciousPatterns = [
      /click here/i,
      /you won't believe/i,
      /shocking/i,
      /this one weird trick/i,
      /doctors hate/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private isKnownUnreliableSource(source: string): boolean {
    // This would be a curated list of unreliable sources
    const unreliableSources = [
      'example-fake-news.com',
      'unreliable-blog.net'
    ];
    
    return unreliableSources.some(unreliable => 
      source.toLowerCase().includes(unreliable)
    );
  }

  private calculateCrossValidationReliability(
    dataPoints: Array<{ data: any; source: string; type: string }>,
    conflicts: any[]
  ): number {
    const totalFields = new Set();
    dataPoints.forEach(({ data }) => {
      Object.keys(data).forEach(field => totalFields.add(field));
    });

    const conflictRate = conflicts.length / totalFields.size;
    const reliabilityScore = Math.max(0, 100 - conflictRate * 50);

    // Boost score if high-reliability sources agree
    const highReliabilitySources = dataPoints.filter(dp => 
      DATA_SOURCES[dp.source]?.reliability === 'high'
    );
    
    if (highReliabilitySources.length >= 2) {
      return Math.min(100, reliabilityScore + 10);
    }

    return reliabilityScore;
  }

  private categorizeError(error: string): string {
    if (error.toLowerCase().includes('missing')) return 'Missing Data';
    if (error.toLowerCase().includes('format')) return 'Format Error';
    if (error.toLowerCase().includes('invalid')) return 'Invalid Value';
    if (error.toLowerCase().includes('date')) return 'Date Error';
    if (error.toLowerCase().includes('inconsistent')) return 'Data Inconsistency';
    return 'Other';
  }

  private getIssueExamples(issueType: string): string[] {
    const examples: Record<string, string[]> = {
      'Missing Data': ['Missing bioguide ID', 'Missing phone number', 'Missing committee info'],
      'Format Error': ['Invalid phone format', 'Invalid email format', 'Invalid date format'],
      'Invalid Value': ['Invalid state code', 'Invalid chamber', 'Negative amount'],
      'Date Error': ['Future date', 'Invalid date range', 'Missing publication date'],
      'Data Inconsistency': ['Cash on hand mismatch', 'Party affiliation conflict', 'Term date overlap']
    };
    
    return examples[issueType] || ['Various issues'];
  }

  /**
   * Clear validation history
   */
  clearHistory(): void {
    this.validationHistory.clear();
    this.qualityMetrics.clear();
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    sourceBreakdown: Record<string, number>;
    averageConfidence: number;
  } {
    let totalValidations = 0;
    let totalConfidence = 0;
    const sourceBreakdown: Record<string, number> = {};

    this.validationHistory.forEach((validations, source) => {
      sourceBreakdown[source] = validations.length;
      totalValidations += validations.length;
      totalConfidence += validations.reduce((sum, v) => sum + v.confidence, 0);
    });

    return {
      totalValidations,
      sourceBreakdown,
      averageConfidence: totalValidations > 0 ? totalConfidence / totalValidations : 0
    };
  }
}

// Default instance
export const dataValidator = new DataValidator();

// Export types
export type {
  DataSource,
  ValidationResult,
  DataQualityMetrics
};

// Export class and data sources
export { DataValidator, DATA_SOURCES };

/**
 * Utility functions for data validation
 */
export const ValidationUtils = {
  /**
   * Get source attribution text
   */
  getSourceAttribution(sourceKey: string): string {
    const source = DATA_SOURCES[sourceKey];
    if (!source) return 'Unknown source';
    
    return `Data from ${source.name} (${source.type}, ${source.reliability} reliability)`;
  },

  /**
   * Format validation confidence
   */
  formatConfidence(confidence: number): string {
    if (confidence >= 90) return 'High confidence';
    if (confidence >= 70) return 'Medium confidence';
    if (confidence >= 50) return 'Low confidence';
    return 'Very low confidence';
  },

  /**
   * Get data freshness indicator
   */
  getDataFreshness(sourceKey: string): string {
    const source = DATA_SOURCES[sourceKey];
    if (!source) return 'Unknown';

    const now = new Date();
    const lastUpdate = new Date(source.lastUpdated);
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 1) return 'Just updated';
    if (hoursDiff < 24) return `${Math.floor(hoursDiff)} hours ago`;
    const daysDiff = Math.floor(hoursDiff / 24);
    return `${daysDiff} day${daysDiff !== 1 ? 's' : ''} ago`;
  }
};
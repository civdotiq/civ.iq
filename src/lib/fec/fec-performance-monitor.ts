/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC Performance Monitor - Advanced Monitoring and Optimization for Campaign Finance Data
 *
 * Provides comprehensive monitoring, validation, and optimization strategies for:
 * - FEC mapping coverage gaps
 * - API performance bottlenecks
 * - Data quality issues
 * - Cache effectiveness
 * - Automated optimization recommendations
 */

import { enhancedFECService, PerformanceMetrics, DataQualityMetrics } from './enhanced-fec-service';
import { bioguideToFECMapping, getMappingStats } from '@/lib/data/bioguide-fec-mapping';
import logger from '@/lib/logging/simple-logger';

// Monitoring interfaces
interface MappingGapAnalysis {
  totalExpectedMappings: number;
  actualMappings: number;
  coverage: number;
  missingMappings: string[];
  recentlyAddedMappings: string[];
  lastAnalysis: string;
}

interface OptimizationRecommendation {
  type: 'performance' | 'data-quality' | 'coverage' | 'caching';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact: string;
  implementation: string;
  estimatedEffort: 'low' | 'medium' | 'high';
}

interface SystemHealthReport {
  overall: 'excellent' | 'good' | 'needs-attention' | 'critical';
  performance: PerformanceMetrics;
  dataQuality: DataQualityMetrics;
  mappingGaps: MappingGapAnalysis;
  recommendations: OptimizationRecommendation[];
  lastUpdated: string;
}

/**
 * FEC Performance Monitor for comprehensive system optimization
 */
class FECPerformanceMonitor {
  private readonly expectedTotalMembers = 535; // 435 House + 100 Senate

  /**
   * Analyze FEC mapping coverage gaps
   */
  async analyzeMappingGaps(): Promise<MappingGapAnalysis> {
    const mappingStats = getMappingStats();
    const mappingEntries = Object.entries(bioguideToFECMapping);

    // Check for recently added mappings (within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentlyAddedMappings: string[] = [];
    const missingMappings: string[] = [];

    // Analyze mapping freshness
    for (const [bioguideId, mapping] of mappingEntries) {
      const lastUpdated = new Date(mapping.lastUpdated);
      if (lastUpdated > thirtyDaysAgo) {
        recentlyAddedMappings.push(bioguideId);
      }
    }

    // Calculate coverage
    const coverage = (mappingStats.totalMappings / this.expectedTotalMembers) * 100;

    // Identify potential missing mappings
    // Note: In practice, this would require external data source comparison
    const expectedMissing = this.expectedTotalMembers - mappingStats.totalMappings;
    if (expectedMissing > 0) {
      for (let i = 0; i < expectedMissing; i++) {
        missingMappings.push(`UNKNOWN_${i + 1}`);
      }
    }

    return {
      totalExpectedMappings: this.expectedTotalMembers,
      actualMappings: mappingStats.totalMappings,
      coverage,
      missingMappings,
      recentlyAddedMappings,
      lastAnalysis: new Date().toISOString(),
    };
  }

  /**
   * Generate optimization recommendations based on system analysis
   */
  async generateOptimizationRecommendations(
    performance: PerformanceMetrics,
    dataQuality: DataQualityMetrics,
    mappingGaps: MappingGapAnalysis
  ): Promise<OptimizationRecommendation[]> {
    const recommendations: OptimizationRecommendation[] = [];

    // Performance recommendations
    if (performance.averageResponseTime > 2000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Optimize API Response Times',
        description: `Average response time is ${performance.averageResponseTime}ms, exceeding optimal threshold of 2000ms`,
        impact: 'Improved user experience and reduced server load',
        implementation: 'Implement aggressive caching for committee IDs and financial summaries',
        estimatedEffort: 'medium',
      });
    }

    if (performance.cacheHitRate < 0.7) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        title: 'Improve Cache Hit Rate',
        description: `Cache hit rate is ${(performance.cacheHitRate * 100).toFixed(1)}%, below optimal 70%`,
        impact: 'Reduced API calls and faster response times',
        implementation: 'Extend cache TTL and implement pre-warming for popular representatives',
        estimatedEffort: 'low',
      });
    }

    // Data quality recommendations
    if (dataQuality.dataAvailabilityRate < 80) {
      recommendations.push({
        type: 'data-quality',
        priority: 'high',
        title: 'Improve Data Availability',
        description: `Only ${dataQuality.dataAvailabilityRate.toFixed(1)}% of sampled representatives have available FEC data`,
        impact: 'More comprehensive campaign finance coverage',
        implementation: 'Implement multi-cycle fallback and alternative data sources',
        estimatedEffort: 'high',
      });
    }

    // Coverage recommendations
    if (mappingGaps.coverage < 99) {
      recommendations.push({
        type: 'coverage',
        priority: 'medium',
        title: 'Address Mapping Gaps',
        description: `${mappingGaps.missingMappings.length} representatives lack FEC mappings (${mappingGaps.coverage.toFixed(1)}% coverage)`,
        impact: 'Complete campaign finance data for all representatives',
        implementation: 'Update congress-legislators data source and regenerate mappings',
        estimatedEffort: 'low',
      });
    }

    // Error rate recommendations
    if (performance.errorRate > 0.05) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'Reduce Error Rate',
        description: `Error rate of ${(performance.errorRate * 100).toFixed(1)}% exceeds acceptable threshold of 5%`,
        impact: 'Improved reliability and user experience',
        implementation: 'Enhance error handling and implement circuit breaker pattern',
        estimatedEffort: 'medium',
      });
    }

    // Sort by priority
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Calculate overall system health score
   */
  calculateSystemHealth(
    performance: PerformanceMetrics,
    dataQuality: DataQualityMetrics,
    mappingGaps: MappingGapAnalysis,
    recommendations: OptimizationRecommendation[]
  ): 'excellent' | 'good' | 'needs-attention' | 'critical' {
    let score = 100;

    // Performance scoring
    if (performance.averageResponseTime > 3000) score -= 20;
    else if (performance.averageResponseTime > 2000) score -= 10;
    else if (performance.averageResponseTime > 1000) score -= 5;

    if (performance.cacheHitRate < 0.5) score -= 15;
    else if (performance.cacheHitRate < 0.7) score -= 10;
    else if (performance.cacheHitRate < 0.8) score -= 5;

    if (performance.errorRate > 0.1) score -= 25;
    else if (performance.errorRate > 0.05) score -= 15;
    else if (performance.errorRate > 0.02) score -= 5;

    // Data quality scoring
    if (dataQuality.dataAvailabilityRate < 60) score -= 20;
    else if (dataQuality.dataAvailabilityRate < 80) score -= 10;
    else if (dataQuality.dataAvailabilityRate < 90) score -= 5;

    // Coverage scoring
    if (mappingGaps.coverage < 95) score -= 15;
    else if (mappingGaps.coverage < 98) score -= 10;
    else if (mappingGaps.coverage < 99.5) score -= 5;

    // High priority recommendations penalty
    const highPriorityIssues = recommendations.filter(r => r.priority === 'high').length;
    score -= highPriorityIssues * 10;

    // Determine health level
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 50) return 'needs-attention';
    return 'critical';
  }

  /**
   * Generate comprehensive system health report
   */
  async generateSystemHealthReport(): Promise<SystemHealthReport> {
    logger.info('[FEC Monitor] Generating comprehensive system health report');

    const startTime = Date.now();

    try {
      // Gather all metrics
      const [performance, dataQuality, mappingGaps] = await Promise.all([
        Promise.resolve(enhancedFECService.getPerformanceMetrics()),
        enhancedFECService.generateDataQualityReport(25), // Sample 25 for speed
        this.analyzeMappingGaps(),
      ]);

      // Generate recommendations
      const recommendations = await this.generateOptimizationRecommendations(
        performance,
        dataQuality,
        mappingGaps
      );

      // Calculate overall health
      const overall = this.calculateSystemHealth(
        performance,
        dataQuality,
        mappingGaps,
        recommendations
      );

      const report: SystemHealthReport = {
        overall,
        performance,
        dataQuality,
        mappingGaps,
        recommendations,
        lastUpdated: new Date().toISOString(),
      };

      logger.info('[FEC Monitor] System health report generated', {
        overall,
        responseTime: Date.now() - startTime,
        recommendationsCount: recommendations.length,
        highPriorityIssues: recommendations.filter(r => r.priority === 'high').length,
      });

      return report;
    } catch (error) {
      logger.error('[FEC Monitor] Failed to generate system health report', {
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Validate specific bioguide ID and provide detailed diagnostics
   */
  async validateRepresentative(bioguideId: string): Promise<{
    bioguideId: string;
    validation: Awaited<ReturnType<typeof enhancedFECService.validateCandidateData>>;
    diagnostics: {
      mappingExists: boolean;
      fecIdFormat: string | null;
      potentialIssues: string[];
      suggestedActions: string[];
    };
  }> {
    const validation = await enhancedFECService.validateCandidateData(bioguideId, 2024);
    const potentialIssues: string[] = [];
    const suggestedActions: string[] = [];

    // Analyze FEC ID format if available
    let fecIdFormat: string | null = null;
    if (validation.fecId) {
      const fecIdPattern = /^([HSP])(\d)([A-Z]{2})(\d{5})$/;
      const match = validation.fecId.match(fecIdPattern);
      if (match) {
        const [, office, cycle, state, number] = match;
        fecIdFormat = `Office: ${office}, Cycle: ${cycle}, State: ${state}, Number: ${number}`;
      } else {
        potentialIssues.push('FEC ID format appears invalid');
        suggestedActions.push('Verify FEC ID format in mapping data');
      }
    }

    // Analyze data availability issues
    if (!validation.hasFinancialData) {
      potentialIssues.push('No financial summary data available');
      suggestedActions.push('Check if representative is up for re-election in 2024');
      suggestedActions.push('Try alternative election cycles (2022, 2020)');
    }

    if (!validation.hasContributions) {
      potentialIssues.push('No contribution data available');
      suggestedActions.push('Verify committee IDs are correctly mapped');
      suggestedActions.push('Check FEC.gov directly for data availability');
    }

    if (validation.dataQuality === 'low') {
      potentialIssues.push('Low data quality score');
      suggestedActions.push('Consider using sample data instead of full dataset');
    }

    return {
      bioguideId,
      validation,
      diagnostics: {
        mappingExists: validation.hasFecMapping,
        fecIdFormat,
        potentialIssues,
        suggestedActions,
      },
    };
  }
}

// Export singleton instance
export const fecPerformanceMonitor = new FECPerformanceMonitor();
export type { SystemHealthReport, OptimizationRecommendation, MappingGapAnalysis };

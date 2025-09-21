/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Usage Analytics Service
 *
 * Tracks and analyzes GDELT API usage patterns, performance metrics,
 * and provides insights for optimization and monitoring.
 */

import logger from '@/lib/logging/simple-logger';

export interface UsageMetric {
  readonly timestamp: string;
  readonly bioguideId: string;
  readonly memberName: string;
  readonly chamber: 'House' | 'Senate';
  readonly state: string;
  readonly party: string;
  readonly queryType: 'individual' | 'batch';
  readonly timespan: string;
  readonly maxrecords: number;
  readonly articlesFound: number;
  readonly executionTimeMs: number;
  readonly success: boolean;
  readonly errorType?: string;
  readonly cacheHit: boolean;
  readonly queryVariants: number;
  readonly source: 'api' | 'batch-queue' | 'manual';
}

export interface AnalyticsReport {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly totalQueries: number;
  readonly successfulQueries: number;
  readonly failedQueries: number;
  readonly successRate: number;
  readonly averageExecutionTime: number;
  readonly cacheHitRate: number;
  readonly topPerformingMembers: Array<{
    bioguideId: string;
    name: string;
    queries: number;
    averageArticles: number;
  }>;
  readonly chamberBreakdown: {
    house: {
      queries: number;
      averageArticles: number;
    };
    senate: {
      queries: number;
      averageArticles: number;
    };
  };
  readonly partyBreakdown: {
    democratic: {
      queries: number;
      averageArticles: number;
    };
    republican: {
      queries: number;
      averageArticles: number;
    };
    independent: {
      queries: number;
      averageArticles: number;
    };
  };
  readonly errorAnalysis: Array<{
    errorType: string;
    count: number;
    percentage: number;
  }>;
  readonly performanceInsights: {
    slowestQueries: Array<{
      bioguideId: string;
      name: string;
      executionTime: number;
      timestamp: string;
    }>;
    fastestQueries: Array<{
      bioguideId: string;
      name: string;
      executionTime: number;
      timestamp: string;
    }>;
  };
}

export interface TrendAnalysis {
  readonly metric: 'queries' | 'articles' | 'execution_time' | 'success_rate';
  readonly period: 'hourly' | 'daily' | 'weekly' | 'monthly';
  readonly dataPoints: Array<{
    timestamp: string;
    value: number;
  }>;
  readonly trend: 'increasing' | 'decreasing' | 'stable';
  readonly changePercentage: number;
}

export class GDELTAnalyticsService {
  private static instance: GDELTAnalyticsService;
  private readonly metrics: UsageMetric[] = [];
  private readonly maxMetricsHistory = 10000; // Keep last 10k metrics

  private constructor() {}

  public static getInstance(): GDELTAnalyticsService {
    if (!GDELTAnalyticsService.instance) {
      GDELTAnalyticsService.instance = new GDELTAnalyticsService();
    }
    return GDELTAnalyticsService.instance;
  }

  /**
   * Record a GDELT query usage metric
   */
  public recordUsage(metric: UsageMetric): void {
    this.metrics.push(metric);

    // Maintain metrics history limit
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.splice(0, this.metrics.length - this.maxMetricsHistory);
    }

    logger.info('GDELT usage recorded', {
      bioguideId: metric.bioguideId,
      queryType: metric.queryType,
      success: metric.success,
      articlesFound: metric.articlesFound,
      executionTime: metric.executionTimeMs,
      cacheHit: metric.cacheHit,
    });
  }

  /**
   * Generate comprehensive analytics report
   */
  public generateReport(startDate?: Date, endDate?: Date): AnalyticsReport {
    const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    const end = endDate || new Date();

    const filteredMetrics = this.metrics.filter(metric => {
      const timestamp = new Date(metric.timestamp);
      return timestamp >= start && timestamp <= end;
    });

    if (filteredMetrics.length === 0) {
      return this.createEmptyReport(start, end);
    }

    const totalQueries = filteredMetrics.length;
    const successfulQueries = filteredMetrics.filter(m => m.success).length;
    const failedQueries = totalQueries - successfulQueries;
    const successRate = (successfulQueries / totalQueries) * 100;

    const averageExecutionTime =
      filteredMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / totalQueries;

    const cacheHits = filteredMetrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / totalQueries) * 100;

    // Top performing members
    const memberStats = this.calculateMemberStats(filteredMetrics);
    const topPerformingMembers = Object.entries(memberStats)
      .map(([bioguideId, stats]) => ({
        bioguideId,
        name: stats.name,
        queries: stats.queries,
        averageArticles: stats.totalArticles / stats.queries,
      }))
      .sort((a, b) => b.averageArticles - a.averageArticles)
      .slice(0, 10);

    // Chamber breakdown
    const houseMetrics = filteredMetrics.filter(m => m.chamber === 'House');
    const senateMetrics = filteredMetrics.filter(m => m.chamber === 'Senate');

    const chamberBreakdown = {
      house: {
        queries: houseMetrics.length,
        averageArticles: this.calculateAverageArticles(houseMetrics),
      },
      senate: {
        queries: senateMetrics.length,
        averageArticles: this.calculateAverageArticles(senateMetrics),
      },
    };

    // Party breakdown
    const democraticMetrics = filteredMetrics.filter(m => m.party === 'Democratic');
    const republicanMetrics = filteredMetrics.filter(m => m.party === 'Republican');
    const independentMetrics = filteredMetrics.filter(m => m.party === 'Independent');

    const partyBreakdown = {
      democratic: {
        queries: democraticMetrics.length,
        averageArticles: this.calculateAverageArticles(democraticMetrics),
      },
      republican: {
        queries: republicanMetrics.length,
        averageArticles: this.calculateAverageArticles(republicanMetrics),
      },
      independent: {
        queries: independentMetrics.length,
        averageArticles: this.calculateAverageArticles(independentMetrics),
      },
    };

    // Error analysis
    const errorAnalysis = this.calculateErrorAnalysis(filteredMetrics);

    // Performance insights
    const sortedByTime = [...filteredMetrics].sort((a, b) => a.executionTimeMs - b.executionTimeMs);
    const slowestQueries = sortedByTime
      .slice(-5)
      .reverse()
      .map(m => ({
        bioguideId: m.bioguideId,
        name: m.memberName,
        executionTime: m.executionTimeMs,
        timestamp: m.timestamp,
      }));

    const fastestQueries = sortedByTime.slice(0, 5).map(m => ({
      bioguideId: m.bioguideId,
      name: m.memberName,
      executionTime: m.executionTimeMs,
      timestamp: m.timestamp,
    }));

    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalQueries,
      successfulQueries,
      failedQueries,
      successRate,
      averageExecutionTime,
      cacheHitRate,
      topPerformingMembers,
      chamberBreakdown,
      partyBreakdown,
      errorAnalysis,
      performanceInsights: {
        slowestQueries,
        fastestQueries,
      },
    };
  }

  /**
   * Generate trend analysis for specific metrics
   */
  public generateTrendAnalysis(
    metric: 'queries' | 'articles' | 'execution_time' | 'success_rate',
    period: 'hourly' | 'daily' | 'weekly' | 'monthly',
    days = 30
  ): TrendAnalysis {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const filteredMetrics = this.metrics.filter(m => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= startDate && timestamp <= endDate;
    });

    const dataPoints = this.aggregateMetricsByPeriod(filteredMetrics, metric, period);

    // Calculate trend
    if (dataPoints.length < 2) {
      return {
        metric,
        period,
        dataPoints,
        trend: 'stable',
        changePercentage: 0,
      };
    }

    const firstPoint = dataPoints[0];
    const lastPoint = dataPoints[dataPoints.length - 1];

    if (!firstPoint || !lastPoint) {
      return {
        metric,
        period,
        dataPoints,
        trend: 'stable',
        changePercentage: 0,
      };
    }

    const firstValue = firstPoint.value;
    const lastValue = lastPoint.value;

    let trend: 'increasing' | 'decreasing' | 'stable';
    let changePercentage = 0;

    if (firstValue > 0) {
      changePercentage = ((lastValue - firstValue) / firstValue) * 100;
    }

    if (Math.abs(changePercentage) < 5) {
      trend = 'stable';
    } else if (changePercentage > 0) {
      trend = 'increasing';
    } else {
      trend = 'decreasing';
    }

    return {
      metric,
      period,
      dataPoints,
      trend,
      changePercentage,
    };
  }

  /**
   * Get real-time usage statistics
   */
  public getRealTimeStats(): {
    last24Hours: AnalyticsReport;
    lastHour: AnalyticsReport;
    currentLoad: {
      queriesPerMinute: number;
      activeMembers: number;
      averageResponseTime: number;
    };
  } {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const lastMinute = new Date(now.getTime() - 60 * 1000);

    const last24HoursReport = this.generateReport(last24Hours, now);
    const lastHourReport = this.generateReport(lastHour, now);

    // Current load metrics
    const lastMinuteMetrics = this.metrics.filter(m => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= lastMinute;
    });

    const queriesPerMinute = lastMinuteMetrics.length;
    const activeMembers = new Set(lastMinuteMetrics.map(m => m.bioguideId)).size;
    const averageResponseTime =
      lastMinuteMetrics.length > 0
        ? lastMinuteMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) /
          lastMinuteMetrics.length
        : 0;

    return {
      last24Hours: last24HoursReport,
      lastHour: lastHourReport,
      currentLoad: {
        queriesPerMinute,
        activeMembers,
        averageResponseTime,
      },
    };
  }

  /**
   * Export metrics for external analysis
   */
  public exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'timestamp',
        'bioguideId',
        'memberName',
        'chamber',
        'state',
        'party',
        'queryType',
        'timespan',
        'maxrecords',
        'articlesFound',
        'executionTimeMs',
        'success',
        'errorType',
        'cacheHit',
        'queryVariants',
        'source',
      ];

      const csvData = [
        headers.join(','),
        ...this.metrics.map(metric =>
          [
            metric.timestamp,
            metric.bioguideId,
            `"${metric.memberName}"`,
            metric.chamber,
            metric.state,
            metric.party,
            metric.queryType,
            metric.timespan,
            metric.maxrecords,
            metric.articlesFound,
            metric.executionTimeMs,
            metric.success,
            metric.errorType || '',
            metric.cacheHit,
            metric.queryVariants,
            metric.source,
          ].join(',')
        ),
      ];

      return csvData.join('\n');
    }

    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Clear metrics history
   */
  public clearMetrics(): void {
    this.metrics.length = 0;
    logger.info('GDELT analytics metrics cleared');
  }

  /**
   * Private helper methods
   */

  private createEmptyReport(start: Date, end: Date): AnalyticsReport {
    return {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      successRate: 0,
      averageExecutionTime: 0,
      cacheHitRate: 0,
      topPerformingMembers: [],
      chamberBreakdown: {
        house: { queries: 0, averageArticles: 0 },
        senate: { queries: 0, averageArticles: 0 },
      },
      partyBreakdown: {
        democratic: { queries: 0, averageArticles: 0 },
        republican: { queries: 0, averageArticles: 0 },
        independent: { queries: 0, averageArticles: 0 },
      },
      errorAnalysis: [],
      performanceInsights: {
        slowestQueries: [],
        fastestQueries: [],
      },
    };
  }

  private calculateMemberStats(metrics: UsageMetric[]): Record<
    string,
    {
      name: string;
      queries: number;
      totalArticles: number;
    }
  > {
    const stats: Record<string, { name: string; queries: number; totalArticles: number }> = {};

    for (const metric of metrics) {
      if (!stats[metric.bioguideId]) {
        stats[metric.bioguideId] = {
          name: metric.memberName,
          queries: 0,
          totalArticles: 0,
        };
      }

      stats[metric.bioguideId]!.queries++;
      stats[metric.bioguideId]!.totalArticles += metric.articlesFound;
    }

    return stats;
  }

  private calculateAverageArticles(metrics: UsageMetric[]): number {
    if (metrics.length === 0) return 0;
    const totalArticles = metrics.reduce((sum, m) => sum + m.articlesFound, 0);
    return totalArticles / metrics.length;
  }

  private calculateErrorAnalysis(metrics: UsageMetric[]): Array<{
    errorType: string;
    count: number;
    percentage: number;
  }> {
    const failedMetrics = metrics.filter(m => !m.success && m.errorType);
    const errorCounts: Record<string, number> = {};

    for (const metric of failedMetrics) {
      const errorType = metric.errorType!;
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    }

    return Object.entries(errorCounts)
      .map(([errorType, count]) => ({
        errorType,
        count,
        percentage: (count / failedMetrics.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }

  private aggregateMetricsByPeriod(
    metrics: UsageMetric[],
    metric: 'queries' | 'articles' | 'execution_time' | 'success_rate',
    period: 'hourly' | 'daily' | 'weekly' | 'monthly'
  ): Array<{ timestamp: string; value: number }> {
    const aggregated: Record<string, UsageMetric[]> = {};

    // Group metrics by time period
    for (const m of metrics) {
      const date = new Date(m.timestamp);
      let key: string;

      switch (period) {
        case 'hourly':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
          break;
        case 'daily':
          key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          key = `${weekStart.getFullYear()}-${weekStart.getMonth()}-${weekStart.getDate()}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${date.getMonth()}`;
          break;
      }

      if (!aggregated[key]) {
        aggregated[key] = [];
      }
      aggregated[key]!.push(m);
    }

    // Calculate values for each period
    return Object.entries(aggregated)
      .map(([key, periodMetrics]) => {
        let value: number;

        switch (metric) {
          case 'queries':
            value = periodMetrics.length;
            break;
          case 'articles':
            value = periodMetrics.reduce((sum, m) => sum + m.articlesFound, 0);
            break;
          case 'execution_time':
            value =
              periodMetrics.reduce((sum, m) => sum + m.executionTimeMs, 0) / periodMetrics.length;
            break;
          case 'success_rate':
            const successful = periodMetrics.filter(m => m.success).length;
            value = (successful / periodMetrics.length) * 100;
            break;
        }

        return {
          timestamp: key,
          value,
        };
      })
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }
}

// Export singleton instance
export const gdeltAnalyticsService = GDELTAnalyticsService.getInstance();

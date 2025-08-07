/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';

/**
 * Independent Expenditures Analysis (Schedule E)
 * Tracks outside money spent for or against candidates
 * separate from direct contributions
 */

export interface IndependentExpenditure {
  committee_id: string;
  committee_name: string;
  candidate_id: string;
  candidate_name: string;
  expenditure_amount: number;
  expenditure_date: string;
  expenditure_description: string;
  support_oppose_indicator: 'S' | 'O'; // Support or Oppose
  election_type: string;
  expenditure_purpose: string;
  payee_name: string;
  payee_city?: string;
  payee_state?: string;
  filing_form: string;
  report_type: string;
  image_number?: string;
  memo_text?: string;
}

export interface IndependentExpenditureAnalysis {
  candidate_id: string;
  totalSupport: number;
  totalOppose: number;
  netSupport: number;
  supportCount: number;
  opposeCount: number;
  totalExpenditures: number;
  supportExpenditures: IndependentExpenditure[];
  opposeExpenditures: IndependentExpenditure[];
  topSupporters: Array<{
    committee_name: string;
    committee_id: string;
    total_amount: number;
    expenditure_count: number;
    committee_type?: string;
  }>;
  topOpponents: Array<{
    committee_name: string;
    committee_id: string;
    total_amount: number;
    expenditure_count: number;
    committee_type?: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    support: number;
    oppose: number;
    net: number;
  }>;
  purposeBreakdown: Array<{
    purpose: string;
    support: number;
    oppose: number;
    count: number;
  }>;
}

export interface ExpendituresByCommittee {
  committee_id: string;
  committee_name: string;
  committee_type?: string;
  total_support: number;
  total_oppose: number;
  net_expenditure: number;
  expenditure_count: number;
  average_expenditure: number;
  last_activity: string;
  expenditures: IndependentExpenditure[];
}

// Common expenditure purpose categorizations
const EXPENDITURE_PURPOSE_CATEGORIES: Record<string, string> = {
  // Media and Advertising
  MEDIA: 'Media & Advertising',
  TV: 'Media & Advertising',
  RADIO: 'Media & Advertising',
  INTERNET: 'Media & Advertising',
  DIGITAL: 'Media & Advertising',
  ADVERTISING: 'Media & Advertising',
  BROADCAST: 'Media & Advertising',
  CABLE: 'Media & Advertising',
  SOCIAL: 'Media & Advertising',
  FACEBOOK: 'Media & Advertising',
  GOOGLE: 'Media & Advertising',

  // Direct Mail
  MAIL: 'Direct Mail',
  POSTAGE: 'Direct Mail',
  PRINTING: 'Direct Mail',
  DIRECT: 'Direct Mail',

  // Phone Banking
  PHONE: 'Phone Banking',
  CALLS: 'Phone Banking',
  ROBOCALLS: 'Phone Banking',
  TELEMARKETING: 'Phone Banking',

  // Polling and Research
  POLL: 'Polling & Research',
  RESEARCH: 'Polling & Research',
  SURVEY: 'Polling & Research',
  FOCUS: 'Polling & Research',

  // Digital Operations
  WEBSITE: 'Digital Operations',
  EMAIL: 'Digital Operations',
  DATABASE: 'Digital Operations',
  SOFTWARE: 'Digital Operations',
  TECHNOLOGY: 'Digital Operations',

  // Consulting and Strategy
  CONSULTING: 'Consulting & Strategy',
  STRATEGY: 'Consulting & Strategy',
  MANAGEMENT: 'Consulting & Strategy',
  ADVICE: 'Consulting & Strategy',

  // Other
  LEGAL: 'Legal & Compliance',
  ACCOUNTING: 'Legal & Compliance',
  COMPLIANCE: 'Legal & Compliance',
  EVENT: 'Events & Meetings',
  TRAVEL: 'Travel & Logistics',
  OFFICE: 'Administrative',
};

export class IndependentExpendituresAnalyzer {
  private expenditureCache: Map<string, IndependentExpenditure[]> = new Map();
  private analysisCache: Map<string, IndependentExpenditureAnalysis> = new Map();

  /**
   * Categorize expenditure purpose
   */
  private categorizeExpenditurePurpose(description: string): string {
    if (!description) return 'Other';

    const upperDesc = description.toUpperCase();

    for (const [keyword, category] of Object.entries(EXPENDITURE_PURPOSE_CATEGORIES)) {
      if (upperDesc.includes(keyword)) {
        return category;
      }
    }

    return 'Other';
  }

  /**
   * Normalize committee name for better matching
   */
  private normalizeCommitteeName(name: string): string {
    if (!name) return 'Unknown Committee';

    return name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b(PAC|COMMITTEE|INC|LLC|CORP)\b/gi, '')
      .trim();
  }

  /**
   * Analyze independent expenditures for a candidate
   */
  analyzeIndependentExpenditures(
    expenditures: IndependentExpenditure[],
    candidateId: string
  ): IndependentExpenditureAnalysis {
    // Check cache first
    const cacheKey = `${candidateId}-${expenditures.length}`;
    const cached = this.analysisCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Separate support vs oppose expenditures
    const supportExpenditures = expenditures.filter(exp => exp.support_oppose_indicator === 'S');
    const opposeExpenditures = expenditures.filter(exp => exp.support_oppose_indicator === 'O');

    // Calculate totals
    const totalSupport = supportExpenditures.reduce((sum, exp) => sum + exp.expenditure_amount, 0);
    const totalOppose = opposeExpenditures.reduce((sum, exp) => sum + exp.expenditure_amount, 0);
    const netSupport = totalSupport - totalOppose;

    // Analyze committees
    const committeeStats = new Map<
      string,
      {
        committee_name: string;
        committee_id: string;
        support: number;
        oppose: number;
        count: number;
        committee_type?: string;
      }
    >();

    for (const exp of expenditures) {
      const key = exp.committee_id;
      const existing = committeeStats.get(key);

      if (existing) {
        if (exp.support_oppose_indicator === 'S') {
          existing.support += exp.expenditure_amount;
        } else {
          existing.oppose += exp.expenditure_amount;
        }
        existing.count += 1;
      } else {
        committeeStats.set(key, {
          committee_name: exp.committee_name,
          committee_id: exp.committee_id,
          support: exp.support_oppose_indicator === 'S' ? exp.expenditure_amount : 0,
          oppose: exp.support_oppose_indicator === 'O' ? exp.expenditure_amount : 0,
          count: 1,
        });
      }
    }

    // Get top supporters and opponents
    const topSupporters = Array.from(committeeStats.values())
      .filter(stat => stat.support > 0)
      .sort((a, b) => b.support - a.support)
      .slice(0, 10)
      .map(stat => ({
        committee_name: stat.committee_name,
        committee_id: stat.committee_id,
        total_amount: stat.support,
        expenditure_count: stat.count,
      }));

    const topOpponents = Array.from(committeeStats.values())
      .filter(stat => stat.oppose > 0)
      .sort((a, b) => b.oppose - a.oppose)
      .slice(0, 10)
      .map(stat => ({
        committee_name: stat.committee_name,
        committee_id: stat.committee_id,
        total_amount: stat.oppose,
        expenditure_count: stat.count,
      }));

    // Monthly trends analysis
    const monthlyMap = new Map<string, { support: number; oppose: number }>();

    for (const exp of expenditures) {
      const date = new Date(exp.expenditure_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const existing = monthlyMap.get(monthKey) || { support: 0, oppose: 0 };

      if (exp.support_oppose_indicator === 'S') {
        existing.support += exp.expenditure_amount;
      } else {
        existing.oppose += exp.expenditure_amount;
      }

      monthlyMap.set(monthKey, existing);
    }

    const monthlyTrends = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        support: data.support,
        oppose: data.oppose,
        net: data.support - data.oppose,
      }));

    // Purpose breakdown analysis
    const purposeMap = new Map<string, { support: number; oppose: number; count: number }>();

    for (const exp of expenditures) {
      const purpose = this.categorizeExpenditurePurpose(exp.expenditure_description);
      const existing = purposeMap.get(purpose) || { support: 0, oppose: 0, count: 0 };

      if (exp.support_oppose_indicator === 'S') {
        existing.support += exp.expenditure_amount;
      } else {
        existing.oppose += exp.expenditure_amount;
      }
      existing.count += 1;

      purposeMap.set(purpose, existing);
    }

    const purposeBreakdown = Array.from(purposeMap.entries())
      .map(([purpose, data]) => ({
        purpose,
        support: data.support,
        oppose: data.oppose,
        count: data.count,
      }))
      .sort((a, b) => b.support + b.oppose - (a.support + a.oppose));

    const analysis: IndependentExpenditureAnalysis = {
      candidate_id: candidateId,
      totalSupport,
      totalOppose,
      netSupport,
      supportCount: supportExpenditures.length,
      opposeCount: opposeExpenditures.length,
      totalExpenditures: expenditures.length,
      supportExpenditures: supportExpenditures.slice(0, 50), // Limit for API response size
      opposeExpenditures: opposeExpenditures.slice(0, 50),
      topSupporters,
      topOpponents,
      monthlyTrends,
      purposeBreakdown,
    };

    // Cache the result
    this.analysisCache.set(cacheKey, analysis);

    logger.info('Completed independent expenditures analysis', {
      candidateId,
      totalExpenditures: expenditures.length,
      totalSupport,
      totalOppose,
      netSupport,
      topSupportersCount: topSupporters.length,
      topOpponentsCount: topOpponents.length,
      operation: 'independent_expenditures_analysis',
    });

    return analysis;
  }

  /**
   * Group expenditures by committee for detailed analysis
   */
  getExpendituresByCommittee(expenditures: IndependentExpenditure[]): ExpendituresByCommittee[] {
    const committeeMap = new Map<
      string,
      {
        committee_name: string;
        committee_type?: string;
        support: number;
        oppose: number;
        count: number;
        expenditures: IndependentExpenditure[];
        lastActivity: Date;
      }
    >();

    // Group by committee
    for (const exp of expenditures) {
      const key = exp.committee_id;
      const existing = committeeMap.get(key);
      const expDate = new Date(exp.expenditure_date);

      if (existing) {
        if (exp.support_oppose_indicator === 'S') {
          existing.support += exp.expenditure_amount;
        } else {
          existing.oppose += exp.expenditure_amount;
        }
        existing.count += 1;
        existing.expenditures.push(exp);

        if (expDate > existing.lastActivity) {
          existing.lastActivity = expDate;
        }
      } else {
        committeeMap.set(key, {
          committee_name: exp.committee_name,
          support: exp.support_oppose_indicator === 'S' ? exp.expenditure_amount : 0,
          oppose: exp.support_oppose_indicator === 'O' ? exp.expenditure_amount : 0,
          count: 1,
          expenditures: [exp],
          lastActivity: expDate,
        });
      }
    }

    // Convert to array and calculate derived metrics
    const result = Array.from(committeeMap.entries())
      .map(([committee_id, data]) => ({
        committee_id,
        committee_name: data.committee_name,
        total_support: data.support,
        total_oppose: data.oppose,
        net_expenditure: data.support - data.oppose,
        expenditure_count: data.count,
        average_expenditure: data.count > 0 ? (data.support + data.oppose) / data.count : 0,
        last_activity: data.lastActivity.toISOString(),
        expenditures: data.expenditures.sort(
          (a, b) => new Date(b.expenditure_date).getTime() - new Date(a.expenditure_date).getTime()
        ),
      }))
      .sort((a, b) => Math.abs(b.net_expenditure) - Math.abs(a.net_expenditure));

    return result;
  }

  /**
   * Calculate expenditure statistics
   */
  getExpenditureStatistics(expenditures: IndependentExpenditure[]): {
    totalAmount: number;
    averageExpenditure: number;
    medianExpenditure: number;
    largestExpenditure: number;
    uniqueCommittees: number;
    supportRatio: number;
    mostActiveMonth: string;
    topPurpose: string;
  } {
    if (expenditures.length === 0) {
      return {
        totalAmount: 0,
        averageExpenditure: 0,
        medianExpenditure: 0,
        largestExpenditure: 0,
        uniqueCommittees: 0,
        supportRatio: 0,
        mostActiveMonth: 'N/A',
        topPurpose: 'N/A',
      };
    }

    const amounts = expenditures.map(exp => exp.expenditure_amount).sort((a, b) => a - b);
    const totalAmount = amounts.reduce((sum, amount) => sum + amount, 0);
    const averageExpenditure = totalAmount / expenditures.length;
    const medianExpenditure = amounts[Math.floor(amounts.length / 2)];
    const largestExpenditure = Math.max(...amounts);

    const uniqueCommittees = new Set(expenditures.map(exp => exp.committee_id)).size;

    const supportCount = expenditures.filter(exp => exp.support_oppose_indicator === 'S').length;
    const supportRatio = expenditures.length > 0 ? supportCount / expenditures.length : 0;

    // Find most active month
    const monthCounts = new Map<string, number>();
    for (const exp of expenditures) {
      const date = new Date(exp.expenditure_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthCounts.set(monthKey, (monthCounts.get(monthKey) || 0) + 1);
    }

    const mostActiveMonth =
      Array.from(monthCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    // Find top purpose
    const purposeCounts = new Map<string, number>();
    for (const exp of expenditures) {
      const purpose = this.categorizeExpenditurePurpose(exp.expenditure_description);
      purposeCounts.set(purpose, (purposeCounts.get(purpose) || 0) + 1);
    }

    const topPurpose =
      Array.from(purposeCounts.entries()).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

    return {
      totalAmount,
      averageExpenditure,
      medianExpenditure,
      largestExpenditure,
      uniqueCommittees,
      supportRatio,
      mostActiveMonth,
      topPurpose,
    };
  }

  /**
   * Filter expenditures by date range
   */
  filterByDateRange(
    expenditures: IndependentExpenditure[],
    startDate: Date,
    endDate: Date
  ): IndependentExpenditure[] {
    return expenditures.filter(exp => {
      const expDate = new Date(exp.expenditure_date);
      return expDate >= startDate && expDate <= endDate;
    });
  }

  /**
   * Filter expenditures by minimum amount
   */
  filterByMinimumAmount(
    expenditures: IndependentExpenditure[],
    minAmount: number
  ): IndependentExpenditure[] {
    return expenditures.filter(exp => exp.expenditure_amount >= minAmount);
  }

  /**
   * Clear internal caches
   */
  clearCache(): void {
    this.expenditureCache.clear();
    this.analysisCache.clear();
  }
}

// Export singleton instance
export const independentExpendituresAnalyzer = new IndependentExpendituresAnalyzer();

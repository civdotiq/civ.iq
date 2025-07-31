/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';

export interface LobbyingFiling {
  id: string;
  registrant: {
    name: string;
    id: string;
  };
  client: {
    name: string;
    id: string;
  };
  income: number;
  expenses: number;
  filingPeriod: string;
  filingYear: number;
  issues: Array<{
    code: string;
    description: string;
  }>;
  lobbyists: Array<{
    name: string;
    covered_official_position?: string;
  }>;
  government_entities: string[];
  specific_issues: string[];
}

export interface CommitteeLobbyingData {
  committee: string;
  totalSpending: number;
  companyCount: number;
  filings: Array<{
    company: string;
    amount: number;
    issues: string[];
    quarter: string;
    year: number;
  }>;
}

export class SenateLobbyingAPI {
  private baseUrl = 'https://lda.senate.gov/api/v1';

  /**
   * Fetch lobbying filings for a specific quarter
   */
  async fetchFilingsByQuarter(year: number, quarter: number): Promise<LobbyingFiling[]> {
    const cacheKey = `lobbying-filings:${year}Q${quarter}`;
    
    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${this.baseUrl}/filings/?filing_year=${year}&filing_period=Q${quarter}&government_entity=SENATE`;
          
          structuredLogger.info('Fetching Senate lobbying data', {
            year,
            quarter,
            url: url.replace(this.baseUrl, '[REDACTED]'),
          });

          const response = await fetch(url, {
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
            },
          });

          if (!response.ok) {
            throw new Error(`Senate LDA API returned ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          
          if (!data || !Array.isArray(data.results)) {
            structuredLogger.warn('Unexpected Senate LDA API response format', { data });
            return [];
          }

          structuredLogger.info('Successfully fetched Senate lobbying data', {
            year,
            quarter,
            filingCount: data.results.length,
          });

          return data.results as LobbyingFiling[];
        },
        7 * 24 * 60 * 60 * 1000 // 7 days cache - lobbying data is quarterly
      );
    } catch (error) {
      structuredLogger.error('Failed to fetch Senate lobbying data', error as Error, {
        year,
        quarter,
      });
      return [];
    }
  }

  /**
   * Fetch lobbying data for multiple quarters (last 2 years)
   */
  async fetchRecentFilings(): Promise<LobbyingFiling[]> {
    const currentYear = new Date().getFullYear();
    const quarters = [1, 2, 3, 4];
    const years = [currentYear - 1, currentYear]; // Last 2 years
    
    const allFilings: LobbyingFiling[] = [];

    for (const year of years) {
      for (const quarter of quarters) {
        // Skip future quarters
        const currentDate = new Date();
        const currentQuarter = Math.ceil((currentDate.getMonth() + 1) / 3);
        if (year === currentYear && quarter > currentQuarter) {
          continue;
        }

        const filings = await this.fetchFilingsByQuarter(year, quarter);
        allFilings.push(...filings);
      }
    }

    structuredLogger.info('Fetched all recent lobbying filings', {
      totalFilings: allFilings.length,
      yearsCovered: years,
    });

    return allFilings;
  }

  /**
   * Get lobbying data relevant to specific congressional committees
   */
  async getCommitteeLobbyingData(committees: string[]): Promise<CommitteeLobbyingData[]> {
    try {
      const allFilings = await this.fetchRecentFilings();
      
      if (allFilings.length === 0) {
        structuredLogger.warn('No lobbying filings available for committee analysis');
        return [];
      }

      // Committee keywords mapping for matching issues to committees
      const committeeKeywords: Record<string, string[]> = {
        'Agriculture': ['agriculture', 'farm', 'crop', 'livestock', 'food', 'rural', 'usda'],
        'Appropriations': ['budget', 'spending', 'appropriation', 'funding'],
        'Armed Services': ['defense', 'military', 'armed forces', 'pentagon', 'homeland security'],
        'Banking': ['banking', 'financial', 'securities', 'insurance', 'credit', 'mortgage'],
        'Commerce': ['commerce', 'trade', 'business', 'manufacturing', 'retail'],
        'Energy': ['energy', 'oil', 'gas', 'renewable', 'nuclear', 'electric', 'utilities'],
        'Environment': ['environment', 'climate', 'pollution', 'epa', 'clean air', 'water'],
        'Finance': ['tax', 'revenue', 'irs', 'customs', 'trade', 'tariff'],
        'Foreign Affairs': ['foreign', 'international', 'embassy', 'treaty', 'diplomatic'],
        'Healthcare': ['health', 'medical', 'medicare', 'medicaid', 'hospital', 'drug', 'pharma'],
        'Judiciary': ['justice', 'court', 'legal', 'immigration', 'patent', 'antitrust'],
        'Labor': ['labor', 'employment', 'worker', 'union', 'workplace', 'osha'],
        'Transportation': ['transportation', 'highway', 'aviation', 'railroad', 'shipping'],
      };

      const committeeData: CommitteeLobbyingData[] = [];

      for (const committee of committees) {
        const keywords = committeeKeywords[committee] || [committee.toLowerCase()];
        const relevantFilings = allFilings.filter(filing => {
          // Check if any specific issues or general issues match committee keywords
          const allIssues = [
            ...filing.specific_issues,
            ...filing.issues.map(issue => issue.description),
          ].join(' ').toLowerCase();

          return keywords.some(keyword => allIssues.includes(keyword));
        });

        if (relevantFilings.length > 0) {
          const totalSpending = relevantFilings.reduce((sum, filing) => sum + (filing.income || 0), 0);
          const uniqueCompanies = new Set(relevantFilings.map(filing => filing.client.name));

          const filings = relevantFilings.map(filing => ({
            company: filing.client.name,
            amount: filing.income || 0,
            issues: filing.specific_issues.slice(0, 3), // Top 3 issues
            quarter: filing.filingPeriod,
            year: filing.filingYear,
          }));

          committeeData.push({
            committee,
            totalSpending,
            companyCount: uniqueCompanies.size,
            filings: filings.sort((a, b) => b.amount - a.amount).slice(0, 10), // Top 10 by spending
          });
        }
      }

      structuredLogger.info('Generated committee lobbying analysis', {
        committeesAnalyzed: committees.length,
        committeesWithData: committeeData.length,
        totalFilingsProcessed: allFilings.length,
      });

      return committeeData.sort((a, b) => b.totalSpending - a.totalSpending);
    } catch (error) {
      structuredLogger.error('Failed to analyze committee lobbying data', error as Error, {
        committees,
      });
      return [];
    }
  }

  /**
   * Get summary statistics for lobbying data
   */
  async getLobbyingSummary(): Promise<{
    totalSpending: number;
    totalFilings: number;
    topIndustries: Array<{ industry: string; spending: number }>;
    recentQuarter: { year: number; quarter: number; spending: number };
  }> {
    try {
      const currentYear = new Date().getFullYear();
      const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

      // Get most recent quarter data
      const recentFilings = await this.fetchFilingsByQuarter(currentYear, currentQuarter - 1 || 4);
      const allFilings = await this.fetchRecentFilings();

      const totalSpending = allFilings.reduce((sum, filing) => sum + (filing.income || 0), 0);
      const recentSpending = recentFilings.reduce((sum, filing) => sum + (filing.income || 0), 0);

      // Group by industry (simplified - would need better industry classification)
      const industrySpending: Record<string, number> = {};
      allFilings.forEach(filing => {
        const clientName = filing.client.name.toLowerCase();
        let industry = 'Other';
        
        if (clientName.includes('pharma') || clientName.includes('health')) industry = 'Healthcare';
        else if (clientName.includes('tech') || clientName.includes('soft')) industry = 'Technology';
        else if (clientName.includes('oil') || clientName.includes('energy')) industry = 'Energy';
        else if (clientName.includes('bank') || clientName.includes('financial')) industry = 'Finance';
        else if (clientName.includes('defense') || clientName.includes('aerospace')) industry = 'Defense';

        industrySpending[industry] = (industrySpending[industry] || 0) + (filing.income || 0);
      });

      const topIndustries = Object.entries(industrySpending)
        .map(([industry, spending]) => ({ industry, spending }))
        .sort((a, b) => b.spending - a.spending)
        .slice(0, 5);

      return {
        totalSpending,
        totalFilings: allFilings.length,
        topIndustries,
        recentQuarter: {
          year: currentYear,
          quarter: currentQuarter - 1 || 4,
          spending: recentSpending,
        },
      };
    } catch (error) {
      structuredLogger.error('Failed to generate lobbying summary', error as Error);
      return {
        totalSpending: 0,
        totalFilings: 0,
        topIndustries: [],
        recentQuarter: { year: 0, quarter: 0, spending: 0 },
      };
    }
  }
}

export const senateLobbyingAPI = new SenateLobbyingAPI();
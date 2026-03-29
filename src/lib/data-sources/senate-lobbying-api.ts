/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

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

/**
 * Raw filing structure from the Senate LDA API v1.
 *
 * Key difference from LobbyingFiling: `government_entities` lives inside
 * `lobbying_activities[]` as `{id, name}` objects — not at the top level.
 * `lobbying_activities[].general_issue_code` carries the issue sector codes
 * (e.g., "DEF" for defense, "HCR" for healthcare).
 */
export interface RawLDAFiling {
  filing_uuid: string;
  filing_year: number;
  filing_period: string;
  income: string | null;
  expenses: string | null;
  registrant: { id: number; name: string };
  client: { id: number; name: string };
  lobbying_activities: Array<{
    general_issue_code: string;
    general_issue_code_display: string;
    description: string;
    government_entities: Array<{ id: number; name: string }>;
    lobbyists: Array<{ name: string; covered_official_position?: string }>;
  }>;
}

/**
 * Transform a raw Senate LDA API filing into the normalized LobbyingFiling shape.
 *
 * The raw API nests issue codes and descriptions inside `lobbying_activities[]`,
 * but the rest of the codebase expects flat `issues[]` and `specific_issues[]`.
 */
function transformRawFiling(raw: RawLDAFiling): LobbyingFiling {
  const issues: LobbyingFiling['issues'] = [];
  const specificIssues: string[] = [];
  const lobbyists: LobbyingFiling['lobbyists'] = [];
  const govEntities: string[] = [];

  for (const activity of raw.lobbying_activities ?? []) {
    if (activity.general_issue_code) {
      issues.push({
        code: activity.general_issue_code,
        description: activity.general_issue_code_display ?? activity.general_issue_code,
      });
    }
    if (activity.description) {
      specificIssues.push(activity.description);
    }
    for (const lob of activity.lobbyists ?? []) {
      lobbyists.push(lob);
    }
    for (const ge of activity.government_entities ?? []) {
      govEntities.push(ge.name);
    }
  }

  return {
    id: raw.filing_uuid,
    registrant: { name: raw.registrant.name, id: String(raw.registrant.id) },
    client: { name: raw.client.name, id: String(raw.client.id) },
    income: parseFloat(raw.income ?? '0') || 0,
    expenses: parseFloat(raw.expenses ?? '0') || 0,
    filingPeriod: raw.filing_period,
    filingYear: raw.filing_year,
    issues,
    lobbyists,
    government_entities: Array.from(new Set(govEntities)),
    specific_issues: specificIssues,
  };
}

export interface CommitteeLobbyingData {
  committee: string;
  totalSpending: number;
  companyCount: number;
  filings: Array<{
    id: string;
    company: string;
    registrantId: string;
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
   *
   * Bug fix (2025-11-19): Senate LDA API requires full quarter names
   * (e.g., "first_quarter") not abbreviated format (e.g., "Q1")
   */
  async fetchFilingsByQuarter(year: number, quarter: number): Promise<LobbyingFiling[]> {
    const cacheKey = `lobbying-filings:${year}Q${quarter}`;

    // Map quarter numbers to Senate LDA API quarter names
    const quarterNames: Record<number, string> = {
      1: 'first_quarter',
      2: 'second_quarter',
      3: 'third_quarter',
      4: 'fourth_quarter',
    };

    const filingPeriod = quarterNames[quarter];
    if (!filingPeriod) {
      logger.error('Invalid quarter number', { quarter });
      return [];
    }

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${this.baseUrl}/filings/?filing_year=${year}&filing_period=${filingPeriod}&government_entity=SENATE`;

          logger.info('Fetching Senate lobbying data', {
            year,
            quarter,
            filingPeriod,
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
            logger.warn('Unexpected Senate LDA API response format', { data });
            return [];
          }

          logger.info('Successfully fetched Senate lobbying data', {
            year,
            quarter,
            filingCount: data.results.length,
          });

          return (data.results as RawLDAFiling[]).map(transformRawFiling);
        },
        7 * 24 * 60 * 60 // 7 days cache (seconds) - lobbying data is quarterly
      );
    } catch (error) {
      logger.error('Failed to fetch Senate lobbying data', error as Error, {
        year,
        quarter,
        filingPeriod,
      });
      // Re-throw error instead of returning empty array
      // This allows callers to distinguish between "no data" vs "API error"
      throw error;
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

    logger.info('Fetched all recent lobbying filings', {
      totalFilings: allFilings.length,
      yearsCovered: years,
    });

    return allFilings;
  }

  /**
   * Fetch lobbying filings for a specific organization by name.
   *
   * Uses the Senate LDA API's `registrant_name` and `client_name` filters
   * rather than downloading all filings and filtering client-side.
   * Paginates through results (up to maxPages) and returns the raw API
   * structure so callers can access `lobbying_activities[].government_entities`.
   */
  async fetchFilingsForOrganization(
    orgName: string,
    options?: { maxPages?: number }
  ): Promise<RawLDAFiling[]> {
    const maxPages = options?.maxPages ?? 3;
    const cacheKey = `lobbying-org:${orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const allFilings: RawLDAFiling[] = [];
          const seenUuids = new Set<string>();

          // Search registrant first (most orgs file as registrant).
          // Only fall back to client_name if registrant yields nothing.
          const fields = ['registrant_name', 'client_name'] as const;

          for (const field of fields) {
            let page = 1;
            let hasMore = true;

            while (hasMore && page <= maxPages) {
              const url =
                `${this.baseUrl}/filings/?${field}=${encodeURIComponent(orgName)}` +
                `&page=${page}&page_size=50`;

              let response: Response;
              try {
                response = await fetch(url, {
                  headers: {
                    Accept: 'application/json',
                    'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
                  },
                  signal: AbortSignal.timeout(15_000),
                });
              } catch {
                // Timeout or network error — stop paginating this field
                logger.warn('[SenateLDA] Request timeout/network error', { field, orgName, page });
                break;
              }

              // Handle rate limiting with a single retry after the wait period
              if (response.status === 429) {
                const retryBody = await response.text().catch(() => '');
                const waitMatch = retryBody.match(/(\d+)\s*second/);
                const waitSec = waitMatch ? Math.min(parseInt(waitMatch[1]!, 10), 15) : 10;
                logger.info('[SenateLDA] Rate limited, waiting', { waitSec, field, orgName });
                await new Promise(r => setTimeout(r, waitSec * 1000));

                // Single retry
                try {
                  response = await fetch(url, {
                    headers: {
                      Accept: 'application/json',
                      'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)',
                    },
                    signal: AbortSignal.timeout(15_000),
                  });
                } catch {
                  break;
                }
                if (!response.ok) break;
              } else if (!response.ok) {
                logger.warn('[SenateLDA] Org filing search failed', {
                  status: response.status,
                  field,
                  orgName,
                });
                break;
              }

              const data = await response.json();
              if (!data?.results || !Array.isArray(data.results)) break;

              for (const raw of data.results as RawLDAFiling[]) {
                if (!seenUuids.has(raw.filing_uuid)) {
                  seenUuids.add(raw.filing_uuid);
                  allFilings.push(raw);
                }
              }

              hasMore = data.next !== null;
              page++;
            }

            // If registrant search found results, skip client search
            if (allFilings.length > 0) break;
          }

          logger.info('[SenateLDA] Fetched org filings', {
            orgName,
            count: allFilings.length,
          });
          return allFilings;
        },
        24 * 60 * 60 // 24 hours (seconds)
      );
    } catch (error) {
      logger.error('[SenateLDA] fetchFilingsForOrganization failed', error as Error, { orgName });
      return [];
    }
  }

  /**
   * Get lobbying data relevant to specific congressional committees
   */
  async getCommitteeLobbyingData(committees: string[]): Promise<CommitteeLobbyingData[]> {
    try {
      const allFilings = await this.fetchRecentFilings();
      
      if (allFilings.length === 0) {
        logger.warn('No lobbying filings available for committee analysis');
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
        // Match full committee names (e.g. "House Committee on Energy and Commerce")
        // against the short keyword map keys (e.g. "Energy", "Commerce") via substring
        const committeeLower = committee.toLowerCase();
        const matchedKeywords = Object.entries(committeeKeywords)
          .filter(([key]) => committeeLower.includes(key.toLowerCase()))
          .flatMap(([, kws]) => kws);
        const keywords = matchedKeywords.length > 0 ? matchedKeywords : [committeeLower];
        const relevantFilings = allFilings.filter(filing => {
          // Check if any specific issues or general issues match committee keywords
          // Handle null/undefined specific_issues and issues arrays
          const specificIssues = Array.isArray(filing.specific_issues) ? filing.specific_issues : [];
          const generalIssues = Array.isArray(filing.issues) ? filing.issues.map(issue => issue.description || '') : [];
          const allIssues = [...specificIssues, ...generalIssues].join(' ').toLowerCase();

          return keywords.some(keyword => allIssues.includes(keyword));
        });

        if (relevantFilings.length > 0) {
          const totalSpending = relevantFilings.reduce((sum, filing) => sum + (filing.income || 0), 0);
          const uniqueCompanies = new Set(relevantFilings.map(filing => filing.client.name));

          const filings = relevantFilings.map(filing => ({
            id: filing.id,
            company: filing.client.name,
            registrantId: filing.registrant.id,
            amount: filing.income || 0,
            issues: Array.isArray(filing.issues) ? filing.issues.map(i => i.description) : [],
            quarter: filing.filingPeriod,
            year: filing.filingYear,
          }));

          committeeData.push({
            committee,
            totalSpending,
            companyCount: uniqueCompanies.size,
            filings: filings.sort((a, b) => b.amount - a.amount),
          });
        }
      }

      logger.info('Generated committee lobbying analysis', {
        committeesAnalyzed: committees.length,
        committeesWithData: committeeData.length,
        totalFilingsProcessed: allFilings.length,
      });

      return committeeData.sort((a, b) => b.totalSpending - a.totalSpending);
    } catch (error) {
      logger.error('Failed to analyze committee lobbying data', error as Error, {
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
      logger.error('Failed to generate lobbying summary', error as Error);
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
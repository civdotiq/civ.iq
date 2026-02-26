/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Civic Alignment Analyzer
 *
 * Cross-references donor profile, voting record, and district needs
 * to surface factual gaps. No judgment, no ideology labels.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT, PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import type { CivicAlignmentInput, CivicAlignmentReport } from '@/types/ai';

export class CivicAlignmentAnalyzer {
  private static readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  /**
   * Analyze civic alignment for a legislator
   */
  static async analyzeAlignment(input: CivicAlignmentInput): Promise<CivicAlignmentReport> {
    const cacheKey = `civic-alignment:${input.legislator.bioguideId}`;

    try {
      // Check cache first
      const cached = await getRedisCache().get<CivicAlignmentReport>(cacheKey);
      if (cached) {
        logger.info('Civic alignment cache hit', {
          bioguideId: input.legislator.bioguideId,
          operation: 'civic_alignment_analysis',
        });
        return cached;
      }

      // Generate AI analysis
      const analysis = await this.generateAIAnalysis(input);

      // Cache the result
      await getRedisCache().set(cacheKey, analysis, this.CACHE_TTL);

      logger.info('Civic alignment analysis generated', {
        bioguideId: input.legislator.bioguideId,
        gaps: analysis.gaps.length,
        confidence: analysis.confidence,
        operation: 'civic_alignment_analysis',
      });

      return analysis;
    } catch (error) {
      logger.error('Civic alignment analysis failed, using fallback', error as Error, {
        bioguideId: input.legislator.bioguideId,
        operation: 'civic_alignment_analysis',
      });

      return this.generateFallbackAnalysis(input);
    }
  }

  /**
   * Generate AI-powered civic alignment analysis
   */
  private static async generateAIAnalysis(
    input: CivicAlignmentInput
  ): Promise<CivicAlignmentReport> {
    const systemPrompt = `You analyze civic data for CIV.IQ. You identify where a legislator's donor profile, voting record, and district needs diverge. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;

    const userPrompt = this.buildUserPrompt(input);

    const response = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 2000,
    });

    return this.parseAIResponse(response);
  }

  /**
   * Build the user prompt with all three datasets
   */
  private static buildUserPrompt(input: CivicAlignmentInput): string {
    const { legislator, votes, finance, district } = input;

    const votesList = votes
      .slice(0, 100)
      .map(
        v =>
          `- ${v.billNumber}: "${v.title}" | Vote: ${v.vote} | ${v.date} | Subjects: ${v.subjects.join(', ') || 'None'}`
      )
      .join('\n');

    const sectorsList = finance.topSectors
      .slice(0, 10)
      .map(s => `- ${s.sector}: $${s.amount.toLocaleString()} (${s.percentage.toFixed(1)}%)`)
      .join('\n');

    const contributorsList = finance.topContributors
      .slice(0, 10)
      .map(c => `- ${c.name} (${c.employer}): $${c.amount.toLocaleString()}`)
      .join('\n');

    const districtLabel = legislator.district
      ? `${legislator.state}-${legislator.district}`
      : legislator.state;

    return `LEGISLATOR: ${legislator.name} (${legislator.party}-${districtLabel})
CHAMBER: ${legislator.chamber}
COMMITTEES: ${legislator.committees.map(c => `${c.name} (${c.role})`).join(', ') || 'None listed'}

CONSTITUENCY DATA (${legislator.district ? `Congressional District ${districtLabel}` : `State of ${legislator.state}`}, source: U.S. Census Bureau ACS 5-Year Estimates 2022):
- Population: ${district.population > 0 ? district.population.toLocaleString() : 'Unknown'}
- Median Income: ${district.medianIncome > 0 ? '$' + district.medianIncome.toLocaleString() : 'Unknown'}
- Unemployment Rate: ${district.unemploymentRate > 0 ? district.unemploymentRate + '%' : 'Unknown'}
- Poverty Rate: ${district.povertyRate > 0 ? district.povertyRate + '%' : 'Unknown'}
- Uninsured Rate: ${district.uninsuredRate > 0 ? district.uninsuredRate + '%' : 'Unknown'}
- Broadband Availability: ${district.broadbandAvailability > 0 ? district.broadbandAvailability + '%' : 'Unknown'}
- Top Industries: ${district.topIndustries.join(', ') || 'Unknown'}

CAMPAIGN FINANCE (${finance.totalRaised > 0 ? '$' + finance.totalRaised.toLocaleString() + ' total raised' : 'No finance data'}):
Top Donor Sectors:
${sectorsList || 'No sector data available'}

Top Contributors:
${contributorsList || 'No contributor data available'}

Small Donor Percentage: ${finance.smallDonorPercentage.toFixed(1)}%

VOTING RECORD (${votes.length} recent votes):
${votesList || 'No vote data available'}

Given the data above, identify gaps where these three datasets do not align.

Respond in JSON:
{
  "districtNeeds": [
    { "category": "Category Name", "metric": "Specific metric with number", "severity": "high|moderate|low", "source": "Official data source name and year" }
  ],
  "votingActivity": [
    { "category": "Category Name", "totalVotes": 0, "yeaVotes": 0, "nayVotes": 0 }
  ],
  "donorProfile": [
    { "sector": "Sector Name", "amount": 0, "percentage": 0, "relatedCategories": ["Category"] }
  ],
  "gaps": [
    { "observation": "Factual statement referencing specific numbers" }
  ],
  "confidence": 0.0-1.0
}

${PLAIN_LANGUAGE_RULES}
- State only what the data shows. Do not speculate on motives or causation.
- Do not say a legislator "should" do anything.
- Do not characterize gaps as good, bad, corrupt, or virtuous.
- Each gap observation must reference specific numbers from the data.
- If the data is insufficient to identify gaps, say so.
`;
  }

  /**
   * Parse AI response into CivicAlignmentReport format
   */
  private static parseAIResponse(response: string): CivicAlignmentReport {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        districtNeeds: parsed.districtNeeds || [],
        votingActivity: parsed.votingActivity || [],
        donorProfile: parsed.donorProfile || [],
        gaps: parsed.gaps || [],
        confidence: parsed.confidence || 0.7,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Template-based fallback: structural cross-reference without AI
   */
  private static generateFallbackAnalysis(input: CivicAlignmentInput): CivicAlignmentReport {
    const { votes, finance, district } = input;

    // Count votes per category using keyword matching
    const voteCategoryCounts: Record<string, { total: number; yea: number; nay: number }> = {};

    for (const vote of votes) {
      for (const subject of vote.subjects) {
        const category = this.normalizeCategory(subject);
        if (!voteCategoryCounts[category]) {
          voteCategoryCounts[category] = { total: 0, yea: 0, nay: 0 };
        }
        voteCategoryCounts[category]!.total++;
        if (vote.vote === 'Yea') voteCategoryCounts[category]!.yea++;
        if (vote.vote === 'Nay') voteCategoryCounts[category]!.nay++;
      }
    }

    const districtNeeds = this.assessDistrictNeeds(district);

    const votingActivity = Object.entries(voteCategoryCounts).map(([category, counts]) => ({
      category,
      totalVotes: counts.total,
      yeaVotes: counts.yea,
      nayVotes: counts.nay,
    }));

    const donorProfile = finance.topSectors.map(s => ({
      sector: s.sector,
      amount: s.amount,
      percentage: s.percentage,
      relatedCategories: this.mapSectorToCategories(s.sector),
    }));

    const gaps = this.identifyStructuralGaps(districtNeeds, voteCategoryCounts, finance);

    return {
      districtNeeds,
      votingActivity,
      donorProfile,
      gaps,
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    };
  }

  /**
   * Assess district needs from metrics with severity thresholds
   */
  private static assessDistrictNeeds(
    district: CivicAlignmentInput['district']
  ): CivicAlignmentReport['districtNeeds'] {
    const needs: CivicAlignmentReport['districtNeeds'] = [];

    if (district.unemploymentRate > 6) {
      needs.push({
        category: 'Economic Security',
        metric: `Unemployment Rate: ${district.unemploymentRate}%`,
        severity: 'high',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    } else if (district.unemploymentRate > 4) {
      needs.push({
        category: 'Economic Security',
        metric: `Unemployment Rate: ${district.unemploymentRate}%`,
        severity: 'moderate',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    }

    if (district.povertyRate > 15) {
      needs.push({
        category: 'Economic Security',
        metric: `Poverty Rate: ${district.povertyRate}%`,
        severity: 'high',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    } else if (district.povertyRate > 10) {
      needs.push({
        category: 'Economic Security',
        metric: `Poverty Rate: ${district.povertyRate}%`,
        severity: 'moderate',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    }

    if (district.uninsuredRate > 12) {
      needs.push({
        category: 'Health',
        metric: `Uninsured Rate: ${district.uninsuredRate}%`,
        severity: 'high',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    } else if (district.uninsuredRate > 8) {
      needs.push({
        category: 'Health',
        metric: `Uninsured Rate: ${district.uninsuredRate}%`,
        severity: 'moderate',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    }

    if (district.broadbandAvailability > 0 && district.broadbandAvailability < 70) {
      needs.push({
        category: 'Broadband Access',
        metric: `Broadband Availability: ${district.broadbandAvailability}%`,
        severity: 'high',
        source: 'FCC, Broadband Data Collection',
      });
    } else if (district.broadbandAvailability > 0 && district.broadbandAvailability < 85) {
      needs.push({
        category: 'Broadband Access',
        metric: `Broadband Availability: ${district.broadbandAvailability}%`,
        severity: 'moderate',
        source: 'FCC, Broadband Data Collection',
      });
    }

    if (district.medianIncome > 0 && district.medianIncome < 40000) {
      needs.push({
        category: 'Economic Security',
        metric: `Median Income: $${district.medianIncome.toLocaleString()}`,
        severity: 'high',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    } else if (district.medianIncome > 0 && district.medianIncome < 55000) {
      needs.push({
        category: 'Economic Security',
        metric: `Median Income: $${district.medianIncome.toLocaleString()}`,
        severity: 'moderate',
        source: 'U.S. Census Bureau, ACS 5-Year Estimates (2022)',
      });
    }

    return needs;
  }

  /**
   * Identify structural gaps between district needs, votes, and donors
   */
  private static identifyStructuralGaps(
    districtNeeds: CivicAlignmentReport['districtNeeds'],
    voteCounts: Record<string, { total: number; yea: number; nay: number }>,
    finance: CivicAlignmentInput['finance']
  ): CivicAlignmentReport['gaps'] {
    const gaps: CivicAlignmentReport['gaps'] = [];

    // Find high-need categories with 0 votes
    for (const need of districtNeeds) {
      if (need.severity === 'high') {
        const relatedVoteCategories = this.mapNeedToVoteCategories(need.category);
        const totalRelatedVotes = relatedVoteCategories.reduce(
          (sum, cat) => sum + (voteCounts[cat]?.total || 0),
          0
        );

        if (totalRelatedVotes === 0) {
          gaps.push({
            observation: `District need: ${need.metric}. No votes found in related ${need.category.toLowerCase()} categories.`,
          });
        }
      }
    }

    // Check if top donor sectors correspond to district needs
    const needCategories = new Set(districtNeeds.map(n => n.category.toLowerCase()));
    for (const sector of finance.topSectors.slice(0, 3)) {
      const relatedCategories = this.mapSectorToCategories(sector.sector);
      const matchesNeed = relatedCategories.some(c => needCategories.has(c.toLowerCase()));
      if (!matchesNeed && sector.percentage > 15) {
        gaps.push({
          observation: `${sector.sector} accounts for ${sector.percentage.toFixed(1)}% of contributions ($${sector.amount.toLocaleString()}). No corresponding high-priority district need identified.`,
        });
      }
    }

    return gaps;
  }

  /**
   * Normalize subject strings into consistent category names
   */
  private static normalizeCategory(subject: string): string {
    const lower = subject.toLowerCase();
    const categoryMap: Array<[string[], string]> = [
      [['health', 'medical', 'medicare', 'medicaid', 'drug', 'insurance'], 'Healthcare'],
      [['defense', 'military', 'armed forces', 'veteran'], 'Defense'],
      [['education', 'school', 'student', 'university'], 'Education'],
      [['infrastructure', 'transport', 'highway', 'bridge', 'road', 'broadband'], 'Infrastructure'],
      [['tax', 'revenue', 'irs'], 'Taxation'],
      [['environment', 'climate', 'energy', 'epa'], 'Environment & Energy'],
      [['immigration', 'border', 'visa'], 'Immigration'],
      [['agriculture', 'farm', 'food'], 'Agriculture'],
      [['trade', 'tariff', 'commerce'], 'Trade & Commerce'],
      [['housing', 'hud', 'mortgage'], 'Housing'],
      [['employment', 'labor', 'job', 'workforce', 'wage', 'unemployment'], 'Employment'],
      [['poverty', 'welfare', 'snap', 'assistance'], 'Poverty'],
    ];

    for (const [keywords, category] of categoryMap) {
      if (keywords.some(k => lower.includes(k))) {
        return category;
      }
    }

    return subject.length > 30 ? subject.substring(0, 30) : subject;
  }

  /**
   * Map donor sectors to related policy categories
   */
  private static mapSectorToCategories(sector: string): string[] {
    const sectorMap: Record<string, string[]> = {
      Health: ['Healthcare'],
      Defense: ['Defense'],
      'Energy/Natural Resources': ['Environment & Energy', 'Infrastructure'],
      'Finance/Insurance/Real Estate': ['Housing', 'Taxation'],
      'Communications/Electronics': ['Infrastructure'],
      Transportation: ['Infrastructure'],
      Labor: ['Employment'],
      Construction: ['Infrastructure', 'Housing'],
      Agribusiness: ['Agriculture'],
      'Lawyers & Lobbyists': [],
      'Ideology/Single-Issue': [],
      'Misc Business': ['Trade & Commerce'],
      Other: [],
    };
    return sectorMap[sector] || [];
  }

  /**
   * Map district need categories to vote categories
   */
  private static mapNeedToVoteCategories(needCategory: string): string[] {
    const needMap: Record<string, string[]> = {
      'Economic Security': ['Employment', 'Poverty', 'Taxation'],
      Health: ['Healthcare'],
      'Broadband Access': ['Infrastructure'],
      Employment: ['Employment'],
      Healthcare: ['Healthcare'],
      Poverty: ['Poverty', 'Employment'],
      Infrastructure: ['Infrastructure'],
      Income: ['Employment', 'Taxation'],
    };
    return needMap[needCategory] || [needCategory];
  }
}

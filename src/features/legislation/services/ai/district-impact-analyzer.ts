/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Impact Analyzer
 *
 * Cross-references bill summaries with district-level data to generate
 * personalized impact analysis showing how legislation affects a specific district.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT, PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import type { DistrictImpact } from '@/types/district-impact';
import type { EconomicProfile, GovernmentServicesProfile } from '@/types/district-enhancements';

interface BillMetadata {
  billId: string;
  title: string;
  number: string;
}

interface DistrictData {
  districtId: string;
  economic: EconomicProfile;
  government: GovernmentServicesProfile;
}

export class DistrictImpactAnalyzer {
  private static readonly CACHE_TTL = 7 * 24 * 60 * 60; // 7 days

  /**
   * Analyze how a bill impacts a specific district
   */
  static async analyzeImpact(
    billSummary: string,
    districtData: DistrictData,
    billMetadata: BillMetadata
  ): Promise<DistrictImpact> {
    const cacheKey = `district-impact:${billMetadata.billId}:${districtData.districtId}`;

    try {
      // Check cache first
      const cached = await getRedisCache().get<DistrictImpact>(cacheKey);
      if (cached) {
        logger.info('District impact cache hit', {
          billId: billMetadata.billId,
          districtId: districtData.districtId,
          operation: 'district_impact_analysis',
        });
        return cached;
      }

      // Generate AI analysis
      const impact = await this.generateAIAnalysis(billSummary, districtData, billMetadata);

      // Cache the result
      await getRedisCache().set(cacheKey, impact, this.CACHE_TTL);

      logger.info('District impact analysis generated', {
        billId: billMetadata.billId,
        districtId: districtData.districtId,
        overallImpact: impact.overallImpact,
        confidence: impact.confidence,
        operation: 'district_impact_analysis',
      });

      return impact;
    } catch (error) {
      logger.error('District impact analysis failed, using fallback', error as Error, {
        billId: billMetadata.billId,
        districtId: districtData.districtId,
        operation: 'district_impact_analysis',
      });

      return this.generateFallbackAnalysis(districtData, billMetadata);
    }
  }

  /**
   * Generate AI-powered impact analysis
   */
  private static async generateAIAnalysis(
    billSummary: string,
    districtData: DistrictData,
    billMetadata: BillMetadata
  ): Promise<DistrictImpact> {
    const systemPrompt = `You explain how federal legislation impacts specific congressional districts for CIV.IQ. You ground your analysis in the district data provided. ${PLAIN_LANGUAGE_SYSTEM_PROMPT}`;

    const userPrompt = this.buildUserPrompt(billSummary, districtData, billMetadata);

    const response = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    return this.parseAIResponse(response, districtData, billMetadata);
  }

  /**
   * Build the user prompt with bill summary and district data
   */
  private static buildUserPrompt(
    billSummary: string,
    districtData: DistrictData,
    billMetadata: BillMetadata
  ): string {
    const { economic, government } = districtData;

    return `
BILL: ${billMetadata.number} - ${billMetadata.title}

BILL SUMMARY:
${billSummary}

DISTRICT: ${districtData.districtId}

DISTRICT ECONOMIC PROFILE:
- Unemployment Rate: ${economic.employment.unemploymentRate}%
- Labor Force Participation: ${economic.employment.laborForceParticipation}%
- Average Wage: $${economic.employment.averageWage.toLocaleString()}
- Major Industries: ${economic.employment.majorIndustries.join(', ') || 'Data unavailable'}
- Broadband Availability: ${economic.infrastructure.broadbandAvailability}%
- Fiber Availability: ${economic.connectivity.fiberAvailability}%
- Average Download Speed: ${economic.connectivity.averageDownloadSpeed} Mbps

DISTRICT FEDERAL SPENDING:
- Total Annual Spending: $${government.federalInvestment.totalAnnualSpending.toLocaleString()}
- Active Contracts/Grants: ${government.federalInvestment.contractsAndGrants}
- Infrastructure Investment: $${government.federalInvestment.infrastructureInvestment.toLocaleString()}

Analyze how this bill would impact district ${districtData.districtId}. Respond in JSON:
{
  "overallImpact": "High" | "Medium" | "Low" | "Uncertain",
  "summary": "2-3 sentence personalized impact summary for this district",
  "economicImpact": "How this bill affects the district economy",
  "infrastructureImpact": "How this bill affects district infrastructure and broadband",
  "affectedGroups": [
    { "group": "Group name", "impact": "How they are affected", "scale": "Estimated number affected" }
  ],
  "relevantDistrictData": [
    { "metric": "Metric name", "value": "Current value", "context": "How it compares nationally" }
  ],
  "confidence": 0.0-1.0
}

${PLAIN_LANGUAGE_RULES}
- Use the district data provided. Do not invent statistics.
- If the bill has little connection to the district data, set overallImpact to "Uncertain" and explain why.
- Include 2-4 affected groups and 2-4 relevant district data points.
`;
  }

  /**
   * Parse AI response into DistrictImpact format
   */
  private static parseAIResponse(
    response: string,
    districtData: DistrictData,
    billMetadata: BillMetadata
  ): DistrictImpact {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        billId: billMetadata.billId,
        districtId: districtData.districtId,
        overallImpact: parsed.overallImpact || 'Uncertain',
        summary: parsed.summary || '',
        economicImpact: parsed.economicImpact || '',
        infrastructureImpact: parsed.infrastructureImpact || '',
        affectedGroups: parsed.affectedGroups || [],
        relevantDistrictData: parsed.relevantDistrictData || [],
        confidence: parsed.confidence || 0.7,
        lastUpdated: new Date().toISOString(),
        source: 'ai-generated',
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error}`);
    }
  }

  /**
   * Generate a template-based fallback when AI is unavailable
   */
  private static generateFallbackAnalysis(
    districtData: DistrictData,
    billMetadata: BillMetadata
  ): DistrictImpact {
    const { economic, government } = districtData;

    const relevantDistrictData: DistrictImpact['relevantDistrictData'] = [];

    if (economic.employment.unemploymentRate > 0) {
      relevantDistrictData.push({
        metric: 'Unemployment Rate',
        value: `${economic.employment.unemploymentRate}%`,
        context:
          economic.employment.unemploymentRate > 5
            ? 'Above national average'
            : 'Near or below national average',
      });
    }

    if (economic.connectivity.fiberAvailability > 0) {
      relevantDistrictData.push({
        metric: 'Broadband Access',
        value: `${economic.connectivity.fiberAvailability}% fiber availability`,
        context:
          economic.connectivity.fiberAvailability < 50
            ? 'Below national average'
            : 'Near or above national average',
      });
    }

    if (government.federalInvestment.totalAnnualSpending > 0) {
      relevantDistrictData.push({
        metric: 'Federal Spending',
        value: `$${government.federalInvestment.totalAnnualSpending.toLocaleString()}`,
        context: 'Total annual federal investment in the state',
      });
    }

    return {
      billId: billMetadata.billId,
      districtId: districtData.districtId,
      overallImpact: 'Uncertain',
      summary: `This analysis shows available data for district ${districtData.districtId} in relation to ${billMetadata.number}. AI-powered impact analysis is temporarily unavailable.`,
      economicImpact: `The district has an unemployment rate of ${economic.employment.unemploymentRate}% and an average wage of $${economic.employment.averageWage.toLocaleString()}.`,
      infrastructureImpact: `The district has ${economic.connectivity.fiberAvailability}% fiber broadband availability and an average download speed of ${economic.connectivity.averageDownloadSpeed} Mbps.`,
      affectedGroups: [],
      relevantDistrictData,
      confidence: 0.3,
      lastUpdated: new Date().toISOString(),
      source: 'fallback',
    };
  }
}

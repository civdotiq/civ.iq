/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer): void {
  server.prompt(
    'legislator_accountability',
    'Comprehensive accountability analysis combining campaign finance, voting record, committee assignments, and lobbying connections for a legislator.',
    {
      bioguideId: z.string().describe('Congress bioguide identifier'),
    },
    ({ bioguideId }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Analyze the accountability profile of legislator ${bioguideId} using CIV.IQ data.`,
              '',
              'Please use these tools in sequence:',
              '1. get_representative_profile — get their committee assignments and basic info',
              '2. get_campaign_finance — see who funds them',
              '3. get_voting_history — see how they vote',
              '4. analyze_vote_prediction — ML analysis of donor influence on voting',
              '5. get_influence_chain — trace lobbying money to votes',
              '',
              'Then synthesize the findings into a factual, nonpartisan accountability summary.',
              'Focus on patterns between funding sources and legislative behavior.',
              'Never claim causation — use "pattern", "correlation", "association" only.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  server.prompt(
    'bill_impact_analysis',
    'Analyze a bill by examining sponsor funding, lobbying connections, and industry alignment.',
    {
      billId: z.string().describe('Bill identifier (e.g., hr1-119)'),
    },
    ({ billId }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Analyze bill ${billId} for potential industry influence using CIV.IQ data.`,
              '',
              'Please use these tools:',
              '1. get_bill_details — get the bill content, sponsor, and cosponsors',
              "2. get_campaign_finance — check the sponsor's funding sources",
              "3. search_lobbying — find lobbying filings related to the bill's policy area",
              '',
              'Then provide a factual analysis of:',
              "- Who funds the bill's sponsor and how that relates to the bill's policy area",
              '- Any lobbying activity aligned with the bill',
              '- Whether cosponsors share similar funding patterns',
              '',
              'Use only facts from the data. Never claim causation.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  server.prompt(
    'policy_comparison',
    'Compare two or more legislators on their voting records, funding sources, and policy positions.',
    {
      bioguideIds: z
        .string()
        .describe('Comma-separated bioguide identifiers (e.g., P000197,M000355)'),
    },
    ({ bioguideIds }) => {
      const ids = bioguideIds.split(',').map(id => id.trim());
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Compare legislators ${ids.join(', ')} using CIV.IQ data.`,
                '',
                'For each legislator, use:',
                '1. get_representative_profile — basic info and committees',
                '2. get_campaign_finance — funding sources',
                '3. get_voting_history — recent votes',
                '',
                'Then compare them on:',
                '- Party alignment and independence',
                '- Top funding sectors and how they differ',
                '- Voting patterns on shared votes',
                '- Committee overlap and specialization',
                '',
                'Present a balanced, factual comparison. Avoid editorializing.',
              ].join('\n'),
            },
          },
        ],
      };
    }
  );

  server.prompt(
    'district_deep_dive',
    'Comprehensive cross-domain analysis of a congressional district using all available data sources.',
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., PA)'),
      districtNumber: z.string().describe('District number (0 for at-large)'),
    },
    ({ stateCode, districtNumber }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Perform a comprehensive analysis of congressional district ${stateCode.toUpperCase()}-${districtNumber.padStart(2, '0')} using all CIV.IQ data.`,
              '',
              'Use these tools to build a complete picture:',
              '1. get_district_info — demographics and representative',
              '2. get_district_environmental_profile — EPA facilities and violations',
              '3. get_district_healthcare_profile — hospitals and care quality',
              '4. get_district_disaster_history — FEMA disaster declarations',
              '5. get_district_consumer_complaints — CFPB complaint patterns',
              '6. get_district_housing_profile — HUD housing affordability',
              '7. get_district_education_profile — higher education landscape',
              '8. get_district_research_profile — NIH-funded research',
              '9. get_district_banking_profile — FDIC banking landscape',
              '10. get_state_energy_profile — energy production and consumption',
              '11. get_climate_data — NOAA climate normals',
              '',
              'Then synthesize into a unified district profile covering:',
              "- Representative's committee assignments and how they relate to district needs",
              '- Key environmental and safety concerns',
              '- Healthcare infrastructure',
              '- Economic drivers: energy, education, research, banking',
              '- Cross-domain patterns (e.g., industry presence + lobbying + committee seats)',
              '',
              'Present facts only. Never claim causation between funding and votes.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  server.prompt(
    'industry_investigation',
    'Investigate an industry sector across regulatory, lobbying, and political dimensions.',
    {
      sector: z.string().describe('Industry sector (e.g., Health, Energy, Finance, Defense)'),
    },
    ({ sector }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Investigate the ${sector} industry sector across regulatory, lobbying, and political dimensions using CIV.IQ data.`,
              '',
              'Use these tools:',
              '1. analyze_industry_regulatory_landscape — regulatory actions, lobbying, and committee oversight',
              '2. search_lobbying — lobbying filings in the sector',
              '3. analyze_policy_area_ecosystem — map the policy area to agencies, committees, and legislation',
              '',
              'If Energy-related:',
              '- get_state_energy_profile — energy production data',
              '- search_epa_facilities — environmental compliance',
              '',
              'If Finance-related:',
              '- search_fdic_institutions — banking landscape',
              '- search_consumer_complaints — CFPB complaint patterns',
              '',
              'Synthesize into an industry landscape report covering:',
              '- Regulatory activity and enforcement patterns',
              '- Lobbying spending and top filers',
              '- Committee oversight structure',
              '- Industry sectors and policy areas involved',
              '',
              'Use only facts from data. Never claim causation.',
            ].join('\n'),
          },
        },
      ],
    })
  );

  server.prompt(
    'environmental_justice',
    'Environmental justice analysis for a congressional district combining environmental data with demographic and political context.',
    {
      stateCode: z.string().length(2).describe('Two-letter state code (e.g., OH)'),
      districtNumber: z.string().describe('District number (0 for at-large)'),
    },
    ({ stateCode, districtNumber }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              `Analyze environmental justice factors for district ${stateCode.toUpperCase()}-${districtNumber.padStart(2, '0')} using CIV.IQ data.`,
              '',
              'Use these tools:',
              '1. get_district_environmental_profile — EPA facilities, violations, Superfund sites, toxic releases',
              '2. get_district_info — demographics and socioeconomic context',
              '3. analyze_environmental_influence — EPA violations cross-referenced with lobbying and campaign finance',
              '4. get_climate_data — NOAA climate normals for the state',
              '5. get_state_climate_profile — severe weather events',
              '',
              'Analyze:',
              '- Concentration of EPA-regulated facilities and violations',
              '- Superfund and toxic release sites',
              '- Whether the representative serves on environmental oversight committees',
              '- Lobbying activity from companies with facilities in the district',
              '- Climate vulnerability from severe weather patterns',
              '',
              'Present a factual environmental justice profile. Note any correlations but never claim causation.',
            ].join('\n'),
          },
        },
      ],
    })
  );
}

/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { NextRequest, NextResponse } from 'next/server';
import { FECUtils } from '@/lib/fec-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const candidateId = searchParams.get('candidateId') || 'H8MI09068';
  
  if (!process.env.FEC_API_KEY) {
    return NextResponse.json({ error: 'FEC API key not configured' });
  }

  // Validate the candidate ID format
  const normalizedId = FECUtils.normalizeCandidateId(candidateId);
  const validationInfo = FECUtils.getCandidateIdValidationInfo(normalizedId);

  const result = {
    input: candidateId,
    normalized: normalizedId,
    validation: validationInfo,
    fecApiConfigured: FECUtils.isConfigured(),
    tests: [] as any[]
  };

  if (!validationInfo.isValid) {
    return NextResponse.json(result);
  }

  // Test each FEC API endpoint
  const endpoints = [
    {
      name: 'Candidate Details',
      url: `https://api.open.fec.gov/v1/candidate/${normalizedId}/`,
      description: 'Get candidate information'
    },
    {
      name: 'Financial Totals',
      url: `https://api.open.fec.gov/v1/candidate/${normalizedId}/totals/`,
      description: 'Get financial summary'
    },
    {
      name: 'Contributions',
      url: `https://api.open.fec.gov/v1/schedules/schedule_a/?candidate_id=${normalizedId}`,
      description: 'Get campaign contributions'
    },
    {
      name: 'Expenditures',
      url: `https://api.open.fec.gov/v1/schedules/schedule_b/?candidate_id=${normalizedId}`,
      description: 'Get campaign expenditures'
    }
  ];

  for (const endpoint of endpoints) {
    try {
      const testUrl = `${endpoint.url}${endpoint.url.includes('?') ? '&' : '?'}api_key=${process.env.FEC_API_KEY}&per_page=1`;
      const startTime = Date.now();
      
      const response = await fetch(testUrl, {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          'Accept': 'application/json'
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      let responseData = null;
      let errorDetails = null;

      if (response.ok) {
        responseData = await response.json();
      } else {
        try {
          errorDetails = await response.text();
        } catch (e) {
          errorDetails = 'Could not read error response';
        }
      }

      result.tests.push({
        endpoint: endpoint.name,
        description: endpoint.description,
        url: endpoint.url, // Don't include API key in response
        status: response.status,
        statusText: response.statusText,
        success: response.ok,
        duration: `${duration}ms`,
        resultCount: responseData?.results?.length || 0,
        pagination: responseData?.pagination,
        errorDetails: errorDetails ? errorDetails.substring(0, 500) : null
      });

    } catch (error) {
      result.tests.push({
        endpoint: endpoint.name,
        description: endpoint.description,
        url: endpoint.url,
        status: 'ERROR',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return NextResponse.json(result);
}
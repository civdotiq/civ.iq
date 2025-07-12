/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
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
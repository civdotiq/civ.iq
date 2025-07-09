/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { structuredLogger } from '@/lib/logging/logger';

interface BatchRequest {
  endpoints: string[];
  bioguideId: string;
}

interface BatchResponse {
  success: boolean;
  data: Record<string, any>;
  errors: Record<string, string>;
  metadata: {
    timestamp: string;
    requestedEndpoints: string[];
    successfulEndpoints: string[];
    failedEndpoints: string[];
    totalTime: number;
  };
  executionTime: number; // Added for better performance monitoring
}

/**
 * Batch API endpoint to fetch multiple representative data endpoints in parallel
 * This reduces the number of round-trips for profile pages that need multiple data sources
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const startTime = Date.now();
  
  try {
    const { bioguideId } = await params;
    const body: BatchRequest = await request.json();
    
    const { endpoints } = body;
    
    if (!endpoints || !Array.isArray(endpoints) || endpoints.length === 0) {
      return NextResponse.json(
        { error: 'endpoints array is required' },
        { status: 400 }
      );
    }
    
    if (endpoints.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 endpoints allowed per batch request' },
        { status: 400 }
      );
    }
    
    structuredLogger.info('Batch API request', {
      bioguideId,
      endpoints,
      endpointCount: endpoints.length
    });
    
    // Map of valid endpoints to their API paths
    const validEndpoints: Record<string, string> = {
      'profile': '',
      'votes': '/votes?limit=20',
      'bills': '/bills?limit=10',
      'finance': '/finance',
      'news': '/news?limit=5',
      'committees': '/committees',
      'party-alignment': '/party-alignment',
      'leadership': '/leadership'
    };
    
    // Filter and validate endpoints
    const validRequestedEndpoints = endpoints.filter(endpoint => 
      validEndpoints.hasOwnProperty(endpoint)
    );
    
    if (validRequestedEndpoints.length === 0) {
      return NextResponse.json(
        { error: 'No valid endpoints requested' },
        { status: 400 }
      );
    }
    
    // Create batch fetch promises
    const batchPromises = validRequestedEndpoints.map(async (endpoint) => {
      try {
        const apiPath = validEndpoints[endpoint];
        const fullUrl = `${request.nextUrl.origin}/api/representative/${bioguideId}${apiPath}`;
        
        // Use cached fetch with shorter cache times for batch requests
        const cacheKey = `batch-${bioguideId}-${endpoint}`;
        const data = await cachedFetch(
          cacheKey,
          async () => {
            const response = await fetch(fullUrl, {
              headers: {
                'User-Agent': 'CivIQ-Hub-Batch/1.0'
              }
            });
            
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
          },
          5 * 60 * 1000 // 5 minute cache for batch requests
        );
        
        return { endpoint, data, success: true };
      } catch (error) {
        structuredLogger.error(`Batch endpoint error: ${endpoint}`, error as Error, {
          bioguideId,
          endpoint
        });
        
        return {
          endpoint,
          error: error instanceof Error ? error.message : 'Unknown error',
          success: false
        };
      }
    });
    
    // Execute all requests in parallel
    const results = await Promise.all(batchPromises);
    
    // Process results
    const responseData: Record<string, any> = {};
    const errors: Record<string, string> = {};
    const successfulEndpoints: string[] = [];
    const failedEndpoints: string[] = [];
    
    results.forEach(result => {
      if (result.success) {
        responseData[result.endpoint] = result.data;
        successfulEndpoints.push(result.endpoint);
      } else {
        errors[result.endpoint] = result.error || 'Unknown error';
        failedEndpoints.push(result.endpoint);
      }
    });
    
    const totalTime = Date.now() - startTime;
    
    const batchResponse: BatchResponse = {
      success: successfulEndpoints.length > 0,
      data: responseData,
      errors,
      metadata: {
        timestamp: new Date().toISOString(),
        requestedEndpoints: validRequestedEndpoints,
        successfulEndpoints,
        failedEndpoints,
        totalTime
      },
      executionTime: totalTime // Added for API client compatibility
    };
    
    structuredLogger.info('Batch API completed', {
      bioguideId,
      successCount: successfulEndpoints.length,
      errorCount: failedEndpoints.length,
      totalTime
    });
    
    return NextResponse.json(batchResponse);
    
  } catch (error) {
    const totalTime = Date.now() - startTime;
    structuredLogger.error('Batch API error', error as Error, {
      bioguideId: (await params).bioguideId,
      totalTime
    });
    
    return NextResponse.json(
      {
        error: 'Batch API failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for health check and documentation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  
  return NextResponse.json({
    service: 'Representative Batch API',
    bioguideId,
    method: 'POST',
    description: 'Batch endpoint to fetch multiple representative data sources in parallel',
    availableEndpoints: [
      'profile',
      'votes',
      'bills', 
      'finance',
      'news',
      'committees',
      'party-alignment',
      'leadership'
    ],
    usage: {
      method: 'POST',
      body: {
        endpoints: ['profile', 'votes', 'bills']
      },
      maxEndpoints: 10
    },
    benefits: [
      'Reduced round-trip requests',
      'Parallel data fetching',
      'Consistent caching strategy',
      'Better error handling'
    ]
  });
}
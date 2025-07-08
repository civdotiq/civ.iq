import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import { withValidationAndSecurity, ValidatedRequest } from '@/lib/validation/middleware';
import { BaseValidator } from '@/lib/validation/schemas';
import { withErrorHandling } from '@/lib/error-handling/error-handler';
import { structuredLogger } from '@/lib/logging/logger';
import { performanceMonitor } from '@/utils/performance';

interface BatchRequest {
  bioguideIds: string[];
}

interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  state: string;
  district: string | null;
  party: string;
  chamber: 'House' | 'Senate';
  imageUrl: string;
  contactInfo: {
    phone: string;
    website: string;
    office: string;
  };
}

// Validate batch request
const validateBatchRequest = (data: any): { isValid: boolean; errors: string[]; sanitized?: BatchRequest } => {
  const errors: string[] = [];
  
  if (!data.bioguideIds || !Array.isArray(data.bioguideIds)) {
    errors.push('bioguideIds must be an array');
    return { isValid: false, errors };
  }

  if (data.bioguideIds.length === 0) {
    errors.push('bioguideIds array cannot be empty');
    return { isValid: false, errors };
  }

  if (data.bioguideIds.length > 50) {
    errors.push('bioguideIds array cannot contain more than 50 items');
    return { isValid: false, errors };
  }

  // Validate each bioguide ID
  const validatedIds: string[] = [];
  for (const id of data.bioguideIds) {
    const validation = BaseValidator.validateString(id, 'bioguideId', {
      required: true,
      minLength: 7,
      maxLength: 7,
      pattern: /^[A-Z]\d{6}$/
    });

    if (!validation.isValid) {
      errors.push(`Invalid bioguideId: ${id}`);
    } else {
      validatedIds.push(validation.data!);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitized: { bioguideIds: validatedIds }
  };
};

async function handleBatchRequest(request: ValidatedRequest<BatchRequest>): Promise<NextResponse> {
  const { bioguideIds } = request.validatedBody!;

  try {
    performanceMonitor.startTimer('batch-representatives-fetch', {
      count: bioguideIds.length,
      operation: 'batch_representatives'
    });

    // Fetch representatives in batches to avoid overwhelming the external API
    const batchSize = 10;
    const results: Record<string, Representative | null> = {};
    
    const batches = [];
    for (let i = 0; i < bioguideIds.length; i += batchSize) {
      batches.push(bioguideIds.slice(i, i + batchSize));
    }

    structuredLogger.info('Processing batch representative request', {
      totalIds: bioguideIds.length,
      batches: batches.length,
      operation: 'batch_representatives_start'
    }, request);

    // Process batches in parallel
    await Promise.all(
      batches.map(async (batch, batchIndex) => {
        const batchPromises = batch.map(async (bioguideId) => {
          try {
            const representative = await cachedFetch(
              `representative-${bioguideId}`,
              async () => {
                // Fetch from Congress API
                if (!process.env.CONGRESS_API_KEY) {
                  throw new Error('Congress API key not configured');
                }

                const response = await fetch(
                  `https://api.congress.gov/v3/member/${bioguideId}?api_key=${process.env.CONGRESS_API_KEY}&format=json`
                );

                if (!response.ok) {
                  if (response.status === 404) {
                    return null; // Representative not found
                  }
                  throw new Error(`Congress API error: ${response.status}`);
                }

                const data = await response.json();
                const member = data.member;

                if (!member) {
                  return null;
                }

                // Transform to our format
                return {
                  bioguideId: member.bioguideId,
                  name: member.directOrderName || `${member.firstName} ${member.lastName}`,
                  firstName: member.firstName,
                  lastName: member.lastName,
                  state: member.state,
                  district: member.district || null,
                  party: member.partyName,
                  chamber: member.chamber as 'House' | 'Senate',
                  imageUrl: member.depiction?.imageUrl || `/images/representatives/default-${member.chamber.toLowerCase()}.jpg`,
                  contactInfo: {
                    phone: member.phone || '',
                    website: member.officialWebsiteUrl || '',
                    office: member.office || ''
                  }
                };
              },
              30 * 60 * 1000 // 30 minutes cache
            );

            results[bioguideId] = representative;
          } catch (error) {
            structuredLogger.error(`Error fetching representative ${bioguideId}`, error as Error, {
              bioguideId,
              batchIndex,
              operation: 'batch_representative_fetch_error'
            }, request);
            results[bioguideId] = null;
          }
        });

        await Promise.all(batchPromises);
      })
    );

    const duration = performanceMonitor.endTimer('batch-representatives-fetch');
    
    const successCount = Object.values(results).filter(r => r !== null).length;
    const errorCount = bioguideIds.length - successCount;

    structuredLogger.info('Batch representative request completed', {
      totalRequested: bioguideIds.length,
      successCount,
      errorCount,
      duration,
      operation: 'batch_representatives_complete'
    }, request);

    return NextResponse.json({
      results,
      metadata: {
        totalRequested: bioguideIds.length,
        successCount,
        errorCount,
        timestamp: new Date().toISOString(),
        dataSource: 'congress.gov'
      }
    });

  } catch (error) {
    performanceMonitor.endTimer('batch-representatives-fetch');
    
    structuredLogger.error('Batch representatives request failed', error as Error, {
      bioguideIds: bioguideIds.slice(0, 10), // Log first 10 for debugging
      operation: 'batch_representatives_error'
    }, request);

    return NextResponse.json(
      { 
        error: 'Failed to fetch representatives batch',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Export POST handler
export async function POST(request: NextRequest) {
  try {
    // Custom validation for the batch request
    const rawBody = await request.json();
    const validation = validateBatchRequest(rawBody);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Add validated data to request
    const validatedRequest = request as ValidatedRequest<BatchRequest>;
    validatedRequest.validatedBody = validation.sanitized;

    return withErrorHandling(handleBatchRequest)(validatedRequest);
  } catch (error) {
    structuredLogger.error('POST batch representatives handler error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
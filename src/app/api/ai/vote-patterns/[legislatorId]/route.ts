/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Pattern Analysis API
 *
 * Returns AI-generated summary of a legislator's voting record across issue areas.
 * Counts and categorizes only - no ideology interpretation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { VotePatternAnalyzer } from '@/features/legislation/services/ai/vote-pattern-analyzer';
import logger from '@/lib/logging/simple-logger';
import { InputValidator } from '@/lib/validation/input-validator';
import type { VoteRecord } from '@/types/ai';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ legislatorId: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { legislatorId } = await params;

    // Validate legislatorId (bioguide format: letter + 6 digits, e.g., P000197)
    const idErrors = InputValidator.validateValue(legislatorId, {
      required: true,
      minLength: 5,
      maxLength: 20,
      pattern: /^[A-Z0-9]+$/i,
    });

    if (idErrors.length > 0) {
      return NextResponse.json(
        { error: 'Invalid legislator ID', details: idErrors },
        { status: 400 }
      );
    }

    const normalizedId = legislatorId.toUpperCase();

    logger.info('Vote pattern request received', {
      legislatorId: normalizedId,
      operation: 'vote_pattern_api',
    });

    // Fetch vote record from Congress.gov API
    const voteRecord = await fetchVoteRecord(normalizedId);

    if (!voteRecord || voteRecord.votes.length === 0) {
      return NextResponse.json(
        {
          error: 'Vote record not found',
          message: 'Unable to retrieve voting record for this legislator',
        },
        { status: 404 }
      );
    }

    // Generate vote pattern analysis
    const analysis = await VotePatternAnalyzer.analyzePatterns(voteRecord);

    const responseTime = Date.now() - startTime;

    logger.info('Vote pattern analysis completed', {
      legislatorId: normalizedId,
      responseTime,
      totalVotes: analysis.totalVotes,
      confidence: analysis.confidence,
      source: analysis.source,
      operation: 'vote_pattern_api',
    });

    return NextResponse.json(
      {
        analysis,
        metadata: {
          responseTime,
          legislatorId: normalizedId,
          dataSources: {
            votes: 'Congress.gov API',
          },
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const resolvedParams = await params;

    logger.error('Vote pattern analysis failed', error as Error, {
      legislatorId: resolvedParams.legislatorId,
      responseTime,
      operation: 'vote_pattern_api',
    });

    return NextResponse.json(
      {
        error: 'Vote pattern analysis failed',
        message: 'Unable to generate vote pattern analysis at this time',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch legislator vote record from Congress.gov API
 */
async function fetchVoteRecord(legislatorId: string): Promise<VoteRecord | null> {
  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      logger.warn('Congress API key not configured');
      return null;
    }

    // Fetch member's sponsored legislation to build vote context
    const url = `https://api.congress.gov/v3/member/${legislatorId}?api_key=${apiKey}`;
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const member = data.member;

    if (!member) {
      return null;
    }

    // Fetch recent votes from the member's chamber
    const chamber = member.terms?.[0]?.chamber?.toLowerCase() === 'senate' ? 'senate' : 'house';
    const votesUrl = `https://api.congress.gov/v3/${chamber}/vote?api_key=${apiKey}&limit=100&sort=date+desc`;

    const votesResponse = await fetch(votesUrl, {
      signal: AbortSignal.timeout(15000),
    });

    if (!votesResponse.ok) {
      return null;
    }

    const votesData = await votesResponse.json();
    const votes: VoteRecord['votes'] = [];

    for (const vote of votesData.votes || []) {
      // Map Congress.gov vote data to our format
      votes.push({
        billNumber: vote.bill?.number || vote.question || '',
        title: vote.bill?.title || vote.description || '',
        vote: mapVoteResult(vote.result),
        date: vote.date || '',
        subjects: vote.bill?.policyArea ? [vote.bill.policyArea.name] : [],
      });
    }

    return {
      legislatorId,
      votes,
    };
  } catch (error) {
    logger.warn('Failed to fetch vote record', {
      legislatorId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Map Congress.gov vote result to standard format
 */
function mapVoteResult(result: string | undefined): 'Yea' | 'Nay' | 'Not Voting' {
  if (!result) return 'Not Voting';
  const lower = result.toLowerCase();
  if (lower.includes('passed') || lower.includes('agreed') || lower.includes('yea')) {
    return 'Yea';
  }
  if (lower.includes('failed') || lower.includes('rejected') || lower.includes('nay')) {
    return 'Nay';
  }
  return 'Not Voting';
}

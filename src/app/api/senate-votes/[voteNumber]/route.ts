/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Enhanced Senate.gov proxy route with vote list and detail support
 * Handles CORS and provides better error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logging/logger-edge';
import { getSecureCorsOrigin } from '@/config/api.config';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

// Cache for storing fetched XML data
const voteCache = new Map<string, { data: string; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, value] of voteCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      voteCache.delete(key);
    }
  }
}

/**
 * Fetch Senate vote list for a specific congress and session
 */
async function fetchSenateVoteList(congress: string, session: string): Promise<string> {
  const cacheKey = `list-${congress}-${session}`;

  // Check cache
  const cached = voteCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info('Returning cached Senate vote list', { congress, session });
    return cached.data;
  }

  const url = `https://www.senate.gov/legislative/LIS/roll_call_lists/vote_menu_${congress}_${session}.xml`;

  logger.info('Fetching Senate vote list', { congress, session, url });

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      Accept: 'application/xml, text/xml',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch vote list: ${response.status} ${response.statusText}`);
  }

  const xmlText = await response.text();

  // Cache the result
  voteCache.set(cacheKey, { data: xmlText, timestamp: Date.now() });
  cleanCache();

  return xmlText;
}

/**
 * Fetch individual Senate vote detail
 */
async function fetchSenateVoteDetail(
  congress: string,
  session: string,
  voteNumber: string
): Promise<string> {
  const cacheKey = `vote-${congress}-${session}-${voteNumber}`;

  // Check cache
  const cached = voteCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.info('Returning cached Senate vote', { congress, session, voteNumber });
    return cached.data;
  }

  // Pad vote number to 5 digits as required by Senate.gov
  const paddedVoteNumber = voteNumber.padStart(5, '0');

  // Try multiple URL patterns as Senate.gov sometimes changes structure
  const urlPatterns = [
    `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${paddedVoteNumber}.xml`,
    `https://www.senate.gov/legislative/LIS/roll_call_votes/vote_${congress}_${session}_${paddedVoteNumber}.xml`,
    `https://www.senate.gov/legislative/LIS/roll_call_votes/${congress}/${session}/vote_${paddedVoteNumber}.xml`,
  ];

  let lastError: Error | null = null;

  for (const url of urlPatterns) {
    try {
      logger.info('Trying Senate vote URL', { url });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
          Accept: 'application/xml, text/xml',
        },
      });

      if (response.ok) {
        const xmlText = await response.text();

        // Validate it's actual XML and not an error page
        if (xmlText.includes('<roll_call_vote') || xmlText.includes('<vote_summary')) {
          // Cache the result
          voteCache.set(cacheKey, { data: xmlText, timestamp: Date.now() });
          cleanCache();

          logger.info('Successfully fetched Senate vote', {
            congress,
            session,
            voteNumber,
            url,
            dataLength: xmlText.length,
          });

          return xmlText;
        }
      }

      lastError = new Error(`Invalid response from ${url}: ${response.status}`);
    } catch (error) {
      lastError = error as Error;
      logger.debug('URL pattern failed', { url, error: lastError.message });
    }
  }

  throw lastError || new Error('Failed to fetch Senate vote from all URL patterns');
}

/**
 * Main GET handler for Senate vote proxy
 * Supports both vote lists and individual votes
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ voteNumber: string }> }
) {
  const { voteNumber } = await context.params;
  const searchParams = request.nextUrl.searchParams;

  // Extract congress and session from query params or use defaults
  const congress = searchParams.get('congress') || '119';
  const session = searchParams.get('session') || '1';
  const type = searchParams.get('type') || 'vote'; // 'vote' or 'list'

  logger.info('Senate proxy request', {
    voteNumber,
    congress,
    session,
    type,
    url: request.url,
  });

  try {
    let xmlText: string;

    if (type === 'list' || voteNumber === 'list') {
      // Fetch vote list
      xmlText = await fetchSenateVoteList(congress, session);
    } else {
      // Fetch individual vote
      if (!voteNumber || voteNumber === '[voteNumber]') {
        return NextResponse.json(
          { error: 'Vote number is required for individual votes' },
          { status: 400 }
        );
      }

      xmlText = await fetchSenateVoteDetail(congress, session, voteNumber);
    }

    // Process XML to fix relative URLs before sending
    xmlText = processXmlUrls(xmlText);

    // Return XML with proper CORS headers
    return new NextResponse(xmlText, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': getSecureCorsOrigin(),
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'X-Data-Source': 'senate.gov',
        'X-Congress': congress,
        'X-Session': session,
      },
    });
  } catch (error) {
    const err = error as Error;
    logger.error('Senate proxy error', err, {
      voteNumber,
      congress,
      session,
      operation: 'senate_proxy_error',
    });

    // Return more detailed error information
    return NextResponse.json(
      {
        error: 'Failed to fetch Senate data',
        details: err.message,
        voteNumber,
        congress,
        session,
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': getSecureCorsOrigin(),
        },
      }
    );
  }
}

/**
 * Handle preflight OPTIONS requests for CORS
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': getSecureCorsOrigin(),
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Process XML to convert relative URLs to absolute URLs
 */
function processXmlUrls(xmlText: string): string {
  const baseUrl = 'https://www.senate.gov';

  // Type for URL replacement patterns
  type ReplacementFn = (match: string, url: string) => string;

  // Replace common relative URL patterns in Senate XML
  const stringPatterns: Array<{ pattern: RegExp; replacement: string }> = [
    // Convert relative paths like "/legislative/..." to absolute
    {
      pattern: /href="(\/[^"]+)"/g,
      replacement: `href="${baseUrl}$1"`,
    },
    // Convert protocol-relative URLs like "//www.senate.gov/..."
    {
      pattern: /href="(\/\/[^"]+)"/g,
      replacement: 'href="https:$1"',
    },
  ];

  const functionPatterns: Array<{ pattern: RegExp; replacement: ReplacementFn }> = [
    // Fix issue_link and similar URL fields
    {
      pattern: /<issue_link>([^<]+)<\/issue_link>/g,
      replacement: (match: string, url: string) => {
        if (!url.startsWith('http')) {
          if (url.startsWith('//')) {
            return `<issue_link>https:${url}</issue_link>`;
          } else if (url.startsWith('/')) {
            return `<issue_link>${baseUrl}${url}</issue_link>`;
          }
        }
        return match;
      },
    },
    // Fix document_url fields
    {
      pattern: /<document_url>([^<]+)<\/document_url>/g,
      replacement: (match: string, url: string) => {
        if (!url.startsWith('http')) {
          if (url.startsWith('//')) {
            return `<document_url>https:${url}</document_url>`;
          } else if (url.startsWith('/')) {
            return `<document_url>${baseUrl}${url}</document_url>`;
          }
        }
        return match;
      },
    },
  ];

  let processedXml = xmlText;

  // Apply string replacements
  for (const { pattern, replacement } of stringPatterns) {
    processedXml = processedXml.replace(pattern, replacement);
  }

  // Apply function replacements
  for (const { pattern, replacement } of functionPatterns) {
    processedXml = processedXml.replace(pattern, replacement);
  }

  // Add a processing comment to the XML
  if (processedXml.startsWith('<?xml')) {
    processedXml = processedXml.replace(
      '?>',
      '?>\n<!-- URLs processed by CivIQ Hub proxy for absolute path resolution -->'
    );
  }

  return processedXml;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Text Fetcher
 *
 * Shared service for fetching bill text from the Congress API.
 * Used by both the standard summary route and the streaming summary route.
 */

import logger from '@/lib/logging/simple-logger';

export interface BillTextResult {
  number: string;
  title: string;
  congress: number;
  chamber: string;
  fullText: string;
}

/**
 * Fetch bill text from Congress API
 */
export async function fetchBillText(billId: string): Promise<BillTextResult | null> {
  try {
    const parts = billId.split('-');
    if (parts.length < 3) {
      throw new Error('Invalid bill ID format: expected congress-type-number');
    }
    const congress = parseInt(parts[0]!) || 119;
    const billType = parts[1]!;
    const billNumber = parts.slice(2).join('-');

    if (!billType || !billNumber) {
      throw new Error('Invalid bill ID format');
    }

    const congressApiKey = process.env.CONGRESS_API_KEY;
    if (!congressApiKey) {
      throw new Error('Congress API key not configured');
    }

    const apiHeaders = {
      'X-API-Key': congressApiKey,
      'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
    };

    const billDetailsUrl = `https://api.congress.gov/v3/bill/${congress}/${billType.toLowerCase()}/${billNumber}?format=json`;
    const billDetailsResponse = await fetch(billDetailsUrl, { headers: apiHeaders });

    if (!billDetailsResponse.ok) {
      throw new Error(`Failed to fetch bill details: ${billDetailsResponse.status}`);
    }

    const billDetails = await billDetailsResponse.json();
    const bill = billDetails.bill;

    const fullText = await fetchFullBillText(congress, billType, billNumber, congressApiKey);

    if (fullText) {
      return {
        number: bill.number,
        title: bill.title,
        congress: bill.congress,
        chamber: bill.originChamber === 'House' ? 'House' : 'Senate',
        fullText,
      };
    }

    const summaryText = await fetchCongressSummary(congress, billType, billNumber, congressApiKey);

    if (summaryText) {
      return {
        number: bill.number,
        title: bill.title,
        congress: bill.congress,
        chamber: bill.originChamber === 'House' ? 'House' : 'Senate',
        fullText: summaryText,
      };
    }

    throw new Error('Could not retrieve bill text or summary from Congress API');
  } catch (error) {
    logger.error('Failed to fetch bill text', error as Error, {
      billId,
      operation: 'bill_text_fetch',
    });
    return null;
  }
}

/**
 * Fetch full bill text from congress.gov via the text versions API
 */
async function fetchFullBillText(
  congress: number,
  billType: string,
  billNumber: string,
  apiKey: string
): Promise<string | null> {
  try {
    const textUrl = `https://api.congress.gov/v3/bill/${congress}/${billType.toLowerCase()}/${billNumber}/text?format=json`;
    const textResponse = await fetch(textUrl, {
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
      },
    });

    if (!textResponse.ok) {
      logger.warn('Failed to fetch bill text versions', {
        status: textResponse.status,
        congress,
        billType,
        billNumber,
      });
      return null;
    }

    const textData = await textResponse.json();
    const textVersions = textData.textVersions || [];
    if (textVersions.length === 0) {
      return null;
    }

    const latestVersion = textVersions[0];
    const fullTextUrl = latestVersion.formats?.find(
      (f: { type: string; url?: string }) => f.type === 'Formatted Text'
    )?.url;

    if (!fullTextUrl) {
      return null;
    }

    const fullTextResponse = await fetch(fullTextUrl, {
      headers: {
        'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    });

    if (!fullTextResponse.ok) {
      logger.warn('Congress.gov bill text fetch failed', {
        status: fullTextResponse.status,
        url: fullTextUrl,
      });
      return null;
    }

    return await fullTextResponse.text();
  } catch (error) {
    logger.warn('Error fetching full bill text', {
      error: error instanceof Error ? error.message : 'Unknown error',
      congress,
      billType,
      billNumber,
    });
    return null;
  }
}

/**
 * Fallback: fetch bill summary from Congress API summaries endpoint
 */
async function fetchCongressSummary(
  congress: number,
  billType: string,
  billNumber: string,
  apiKey: string
): Promise<string | null> {
  try {
    const summaryUrl = `https://api.congress.gov/v3/bill/${congress}/${billType.toLowerCase()}/${billNumber}/summaries?format=json`;
    const response = await fetch(summaryUrl, {
      headers: {
        'X-API-Key': apiKey,
        'User-Agent': 'CIV.IQ/1.0 (civic data platform; civdotiq.org)',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const summaries = data.summaries || [];
    if (summaries.length === 0) {
      return null;
    }

    const bestSummary = summaries[summaries.length - 1];
    const text = bestSummary.text || '';

    const plainText = text
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText.length < 50) {
      return null;
    }

    logger.info('Using Congress API summary as fallback', {
      congress,
      billType,
      billNumber,
      summaryLength: plainText.length,
    });

    return plainText;
  } catch (error) {
    logger.warn('Error fetching Congress summary fallback', {
      error: error instanceof Error ? error.message : 'Unknown error',
      congress,
      billType,
      billNumber,
    });
    return null;
  }
}

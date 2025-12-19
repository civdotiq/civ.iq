/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 15 minutes (floor schedules change frequently)
export const revalidate = 900;
export const dynamic = 'force-dynamic';

// Types for House floor schedule (from docs.house.gov XML)
interface HouseFloorItem {
  id: string;
  legisNum: string;
  title: string;
  category: string;
  documents: Array<{
    url: string;
    type: string;
  }>;
  addDate: string;
  publishDate: string;
}

// Types for Senate floor schedule (from senate.gov JSON)
interface SenateFloorSession {
  conveneTime: string;
  conveneDate: string;
  streamUrl: string | null;
  lastUpdated: string;
  isLive: boolean;
}

// Combined response type
interface FloorScheduleResponse {
  success: boolean;
  house: {
    weekOf: string;
    lastUpdated: string;
    items: HouseFloorItem[];
    categories: {
      suspension: HouseFloorItem[];
      rule: HouseFloorItem[];
      other: HouseFloorItem[];
    };
    sourceUrl: string;
  };
  senate: {
    session: SenateFloorSession | null;
    sourceUrl: string;
  };
  liveStreams: {
    house: string;
    senate: string;
    houseYouTube: string;
  };
  metadata: {
    generatedAt: string;
    dataSources: string[];
  };
  error?: string;
}

/**
 * Get the Monday of the current week in YYYYMMDD format
 */
function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  const monday = new Date(now.setDate(diff));

  const year = monday.getFullYear();
  const month = String(monday.getMonth() + 1).padStart(2, '0');
  const date = String(monday.getDate()).padStart(2, '0');

  return `${year}${month}${date}`;
}

/**
 * Parse House floor schedule XML
 */
function parseHouseXml(xmlText: string): {
  weekOf: string;
  lastUpdated: string;
  items: HouseFloorItem[];
} {
  const items: HouseFloorItem[] = [];

  // Extract week-date attribute
  const weekDateMatch = xmlText.match(/week-date="([^"]+)"/);
  const weekOf: string = weekDateMatch?.[1] ?? '';

  // Extract update-date attribute
  const updateDateMatch = xmlText.match(/update-date="([^"]+)"/);
  const lastUpdated: string = updateDateMatch?.[1] ?? '';

  // Parse floor-item elements using regex (simple XML parsing)
  const floorItemRegex = /<floor-item[^>]*id="([^"]*)"[^>]*>([\s\S]*?)<\/floor-item>/g;
  let match;

  while ((match = floorItemRegex.exec(xmlText)) !== null) {
    const id = match[1] ?? '';
    const content = match[2] ?? '';

    // Extract legis-num
    const legisNumMatch = content.match(/<legis-num>([^<]*)<\/legis-num>/);
    const legisNum = legisNumMatch?.[1]?.trim() ?? '';

    // Extract floor-text (title)
    const floorTextMatch = content.match(/<floor-text>([^<]*)<\/floor-text>/);
    const title = floorTextMatch?.[1]?.trim() ?? '';

    // Extract add-date
    const addDateMatch = match[0]?.match(/add-date="([^"]*)"/);
    const addDate = addDateMatch?.[1] ?? '';

    // Extract publish-date
    const publishDateMatch = match[0]?.match(/publish-date="([^"]*)"/);
    const publishDate = publishDateMatch?.[1] ?? '';

    // Extract documents
    const documents: Array<{ url: string; type: string }> = [];
    const fileRegex = /<file[^>]*doc-url="([^"]*)"[^>]*doc-type="([^"]*)"/g;
    let fileMatch;
    while ((fileMatch = fileRegex.exec(content)) !== null) {
      const docUrl = fileMatch[1] ?? '';
      const docType = fileMatch[2] ?? '';
      if (docUrl) {
        documents.push({
          url: docUrl,
          type: docType,
        });
      }
    }

    if (legisNum || title) {
      items.push({
        id,
        legisNum,
        title,
        category: '', // Will be set below
        documents,
        addDate,
        publishDate,
      });
    }
  }

  // Extract categories and assign to items
  const categoryRegex = /<category[^>]*sort-order="(\d+)"[^>]*>([^<]*)<\/category>/g;
  const categories: Array<{ order: number; name: string }> = [];
  let catMatch;
  while ((catMatch = categoryRegex.exec(xmlText)) !== null) {
    const orderStr = catMatch[1] ?? '0';
    const nameStr = catMatch[2] ?? '';
    categories.push({
      order: parseInt(orderStr),
      name: nameStr.trim(),
    });
  }

  // Simple category assignment based on position in XML
  const suspensionKeywords = ['suspension', 'suspend'];
  const ruleKeywords = ['pursuant to a rule', 'rule'];

  items.forEach(item => {
    // Find the category for this item by checking surrounding XML
    const itemIndex = xmlText.indexOf(`id="${item.id}"`);
    let categoryName = 'Other';

    for (const cat of categories) {
      const catIndex = xmlText.indexOf(cat.name);
      if (catIndex !== -1 && catIndex < itemIndex) {
        categoryName = cat.name;
      }
    }

    // Normalize category name
    const lowerCat = categoryName.toLowerCase();
    if (suspensionKeywords.some(k => lowerCat.includes(k))) {
      item.category = 'suspension';
    } else if (ruleKeywords.some(k => lowerCat.includes(k))) {
      item.category = 'rule';
    } else {
      item.category = 'other';
    }
  });

  return { weekOf, lastUpdated, items };
}

/**
 * Fetch House floor schedule from docs.house.gov
 */
async function fetchHouseSchedule(): Promise<{
  weekOf: string;
  lastUpdated: string;
  items: HouseFloorItem[];
} | null> {
  const cacheKey = 'floor-schedule-house';

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        const weekDate = getCurrentWeekMonday();
        const url = `https://docs.house.gov/billsthisweek/${weekDate}/${weekDate}.xml`;

        logger.info('Fetching House floor schedule', { url, weekDate });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/xml',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        if (!response.ok) {
          // Try previous week if current week not available
          const prevWeek = new Date();
          prevWeek.setDate(prevWeek.getDate() - 7);
          const prevWeekDate = getCurrentWeekMonday();
          const fallbackUrl = `https://docs.house.gov/billsthisweek/${prevWeekDate}/${prevWeekDate}.xml`;

          const fallbackResponse = await fetch(fallbackUrl, {
            headers: {
              Accept: 'application/xml',
              'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
            },
          });

          if (!fallbackResponse.ok) {
            logger.warn('House floor schedule not available', { status: response.status });
            return null;
          }

          const xmlText = await fallbackResponse.text();
          return parseHouseXml(xmlText);
        }

        const xmlText = await response.text();
        return parseHouseXml(xmlText);
      } catch (error) {
        logger.error('Error fetching House floor schedule', error as Error);
        return null;
      }
    },
    15 * 60 * 1000 // 15 minute cache
  );
}

/**
 * Fetch Senate floor schedule from senate.gov JSON
 */
async function fetchSenateSchedule(): Promise<SenateFloorSession | null> {
  const cacheKey = 'floor-schedule-senate';

  return cachedFetch(
    cacheKey,
    async () => {
      try {
        const url = 'https://www.senate.gov/legislative/schedule/floor_schedule.json';

        logger.info('Fetching Senate floor schedule', { url });

        const response = await fetch(url, {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          },
        });

        if (!response.ok) {
          logger.warn('Senate floor schedule not available', { status: response.status });
          return null;
        }

        const data = await response.json();
        const proceedings = data.floorProceedings?.[0];

        if (!proceedings) {
          return null;
        }

        // Build convene time string
        const hour = parseInt(proceedings.conveneHour || '0');
        const minutes = proceedings.conveneMinutes || '00';
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const conveneTime = `${hour12}:${minutes} ${ampm}`;

        // Build convene date string
        const conveneDate = `${proceedings.conveneYear}-${proceedings.conveneMonth?.padStart(2, '0')}-${proceedings.conveneDay?.padStart(2, '0')}`;

        // Check if currently live (within business hours on convene date)
        const now = new Date();
        const sessionDate = new Date(conveneDate);
        const isToday = now.toDateString() === sessionDate.toDateString();
        const currentHour = now.getHours();
        const isLive = isToday && currentHour >= hour && currentHour < 20; // Assume sessions end by 8 PM

        return {
          conveneTime,
          conveneDate,
          streamUrl: proceedings.convenedSessionStream || null,
          lastUpdated: proceedings.lastUpdated || new Date().toISOString(),
          isLive,
        };
      } catch (error) {
        logger.error('Error fetching Senate floor schedule', error as Error);
        return null;
      }
    },
    15 * 60 * 1000 // 15 minute cache
  );
}

export async function GET(request: NextRequest): Promise<NextResponse<FloorScheduleResponse>> {
  try {
    const { searchParams } = request.nextUrl;
    const chamber = searchParams.get('chamber')?.toLowerCase(); // 'house', 'senate', or null for both

    logger.info('Floor schedule API request', { chamber });

    // Fetch both schedules in parallel (or just one if specified)
    const [houseData, senateData] = await Promise.all([
      chamber === 'senate' ? null : fetchHouseSchedule(),
      chamber === 'house' ? null : fetchSenateSchedule(),
    ]);

    // Categorize House items
    const houseItems = houseData?.items || [];
    const categories = {
      suspension: houseItems.filter(i => i.category === 'suspension'),
      rule: houseItems.filter(i => i.category === 'rule'),
      other: houseItems.filter(i => i.category === 'other'),
    };

    const response: FloorScheduleResponse = {
      success: true,
      house: {
        weekOf: houseData?.weekOf || '',
        lastUpdated: houseData?.lastUpdated || '',
        items: houseItems,
        categories,
        sourceUrl: 'https://docs.house.gov/floor/',
      },
      senate: {
        session: senateData,
        sourceUrl: 'https://www.senate.gov/legislative/floor_activity_pail.htm',
      },
      liveStreams: {
        house: 'https://live.house.gov/',
        senate: 'https://www.senate.gov/floor/',
        houseYouTube: 'https://www.youtube.com/@USHouseClerk',
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSources: ['docs.house.gov', 'senate.gov'],
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Floor schedule API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        house: {
          weekOf: '',
          lastUpdated: '',
          items: [],
          categories: { suspension: [], rule: [], other: [] },
          sourceUrl: 'https://docs.house.gov/floor/',
        },
        senate: {
          session: null,
          sourceUrl: 'https://www.senate.gov/legislative/floor_activity_pail.htm',
        },
        liveStreams: {
          house: 'https://live.house.gov/',
          senate: 'https://www.senate.gov/floor/',
          houseYouTube: 'https://www.youtube.com/@USHouseClerk',
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSources: ['docs.house.gov', 'senate.gov'],
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

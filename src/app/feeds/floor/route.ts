/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Floor Activity Feed (Atom)
 *
 * Provides a subscribable Atom feed of House and Senate floor activity.
 *
 * @example GET /feeds/floor
 */

import { NextResponse } from 'next/server';
import {
  generateAtomFeed,
  createFloorFeedConfig,
  type AtomEntry,
} from '@/lib/feeds/atom-generator';

// ISR: Revalidate every 15 minutes (floor activity changes frequently)
export const revalidate = 900;

interface FloorItem {
  id?: string;
  chamber: 'House' | 'Senate';
  date: string;
  time?: string;
  description: string;
  billNumber?: string;
  billTitle?: string;
  actionType?: string;
  legislativeDay?: string;
}

interface FloorScheduleResponse {
  house?: FloorItem[];
  senate?: FloorItem[];
  items?: FloorItem[];
}

async function fetchFloorSchedule(): Promise<FloorItem[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(`${baseUrl}/api/floor-schedule`, {
      cache: 'force-cache',
    });
    if (!response.ok) return [];
    const data: FloorScheduleResponse = await response.json();

    // Combine house and senate items if structured that way
    const items: FloorItem[] = [];
    if (data.house) items.push(...data.house);
    if (data.senate) items.push(...data.senate);
    if (data.items) items.push(...data.items);

    return items;
  } catch {
    return [];
  }
}

export async function GET(): Promise<NextResponse> {
  const baseUrl = 'https://civdotiq.org';

  // Fetch floor schedule
  const floorItems = await fetchFloorSchedule();

  // Build entries from floor items
  const entries: AtomEntry[] = floorItems.map((item, index) => {
    const dateStr = item.time ? `${item.date}T${item.time}` : item.date;
    const itemDate = new Date(dateStr);
    const itemId = item.id ?? `floor-${item.chamber}-${item.date}-${index}`;

    let title = `[${item.chamber}] ${item.description}`;
    if (item.billNumber) {
      title = `[${item.chamber}] ${item.billNumber}: ${item.billTitle ?? item.description}`;
    }

    const link = item.billNumber ? `${baseUrl}/bill/${item.billNumber}` : `${baseUrl}/floor`;

    return {
      id: `${baseUrl}/floor/${itemId}`,
      title,
      link,
      updated: itemDate,
      published: itemDate,
      summary: item.description,
      categories: [
        { term: 'floor', label: 'Floor Activity' },
        { term: item.chamber.toLowerCase(), label: item.chamber },
        ...(item.actionType
          ? [{ term: item.actionType.toLowerCase(), label: item.actionType }]
          : []),
      ],
    };
  });

  // Sort by date (newest first)
  entries.sort((a, b) => b.updated.getTime() - a.updated.getTime());

  // Generate feed
  const feedConfig = createFloorFeedConfig();

  // Update the feed timestamp to the most recent entry
  const firstEntry = entries[0];
  if (firstEntry) {
    feedConfig.updated = firstEntry.updated;
  }

  const atomXml = generateAtomFeed(feedConfig, entries);

  return new NextResponse(atomXml, {
    status: 200,
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800',
    },
  });
}

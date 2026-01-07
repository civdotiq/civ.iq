/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Representative Activity Feed (Atom)
 *
 * Provides a subscribable Atom feed of a representative's activity:
 * - Recent votes
 * - Sponsored/cosponsored bills
 * - News mentions
 *
 * @example GET /feeds/representative/K000367
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  generateAtomFeed,
  createRepresentativeFeedConfig,
  type AtomEntry,
} from '@/lib/feeds/atom-generator';

// ISR: Revalidate every 30 minutes
export const revalidate = 1800;

interface RouteParams {
  params: Promise<{ bioguideId: string }>;
}

interface Vote {
  voteId: string;
  bill: {
    number: string;
    title: string;
  };
  question: string;
  result: string;
  date: string;
  position: string;
  chamber: string;
}

interface Bill {
  id?: string;
  number: string;
  title: string;
  introducedDate?: string;
  latestAction?: {
    actionDate: string;
    text: string;
  };
}

interface NewsArticle {
  title: string;
  url: string;
  publishedDate: string;
  source: string;
  summary?: string;
}

interface Representative {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: string;
}

async function fetchRepresentativeData(bioguideId: string): Promise<Representative | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/simple`, {
      cache: 'force-cache',
    });
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

async function fetchVotes(bioguideId: string): Promise<Vote[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/votes?limit=10`, {
      cache: 'force-cache',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.votes ?? [];
  } catch {
    return [];
  }
}

async function fetchBills(bioguideId: string): Promise<Bill[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/bills?limit=10`, {
      cache: 'force-cache',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.bills ?? data ?? [];
  } catch {
    return [];
  }
}

async function fetchNews(bioguideId: string): Promise<NewsArticle[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://civdotiq.org';
    const response = await fetch(`${baseUrl}/api/representative/${bioguideId}/news?limit=5`, {
      cache: 'force-cache',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.articles ?? [];
  } catch {
    return [];
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { bioguideId } = await params;
  const baseUrl = 'https://civdotiq.org';

  // Fetch representative data
  const rep = await fetchRepresentativeData(bioguideId);
  if (!rep) {
    return new NextResponse('Representative not found', { status: 404 });
  }

  // Fetch activity data in parallel
  const [votes, bills, news] = await Promise.all([
    fetchVotes(bioguideId),
    fetchBills(bioguideId),
    fetchNews(bioguideId),
  ]);

  // Build entries from votes
  const voteEntries: AtomEntry[] = votes.map(vote => ({
    id: `${baseUrl}/vote/${vote.voteId}`,
    title: `Voted ${vote.position} on ${vote.bill.number}: ${vote.bill.title}`,
    link: `${baseUrl}/representative/${bioguideId}?tab=votes`,
    updated: new Date(vote.date),
    published: new Date(vote.date),
    summary: `${rep.name} voted ${vote.position} on ${vote.question}. Result: ${vote.result}`,
    categories: [
      { term: 'vote', label: 'Vote' },
      { term: vote.chamber.toLowerCase(), label: vote.chamber },
    ],
  }));

  // Build entries from bills
  const billEntries: AtomEntry[] = bills.map(bill => {
    const date = bill.latestAction?.actionDate ?? bill.introducedDate ?? new Date().toISOString();
    return {
      id: `${baseUrl}/bill/${bill.number}`,
      title: `Sponsored: ${bill.number} - ${bill.title}`,
      link: `${baseUrl}/bill/${bill.number}`,
      updated: new Date(date),
      published: new Date(bill.introducedDate ?? date),
      summary: bill.latestAction?.text ?? `Bill ${bill.number} sponsored by ${rep.name}`,
      categories: [{ term: 'bill', label: 'Legislation' }],
    };
  });

  // Build entries from news
  const newsEntries: AtomEntry[] = news.map(article => ({
    id: article.url,
    title: article.title,
    link: article.url,
    updated: new Date(article.publishedDate),
    published: new Date(article.publishedDate),
    summary: article.summary ?? `News about ${rep.name} from ${article.source}`,
    author: { name: article.source },
    categories: [{ term: 'news', label: 'News' }],
  }));

  // Combine and sort all entries by date (newest first)
  const allEntries = [...voteEntries, ...billEntries, ...newsEntries].sort(
    (a, b) => b.updated.getTime() - a.updated.getTime()
  );

  // Limit to most recent 20 entries
  const entries = allEntries.slice(0, 20);

  // Generate feed
  const feedConfig = createRepresentativeFeedConfig(bioguideId, rep.name, rep.party, rep.state);

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
      'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
    },
  });
}

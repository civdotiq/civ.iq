/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Server-side fetcher for the redesigned StateLegislaturePage.
 * Real APIs only — empty payloads when a feed returns nothing.
 */

import { getStateName } from '@/lib/data/us-states';
import { getServerBaseUrl } from '@/lib/server-url';
import type {
  StateChamberSummary,
  StateLegislatureCalendarEvent,
  StateLegislaturePageData,
  StateLegislatureRecentBill,
  StateLegislatureSession,
} from './types';

interface RawChamber {
  name?: string;
  title?: string;
  totalSeats?: number;
  democraticSeats?: number;
  republicanSeats?: number;
  otherSeats?: number;
}

interface RawLegislatureResponse {
  state?: string;
  chambers?: { upper?: RawChamber; lower?: RawChamber };
  legislators?: unknown[];
  totalCount?: number;
  session?: {
    name?: string;
    startDate?: string;
    endDate?: string;
    status?: 'active' | 'in-recess' | 'adjourned' | 'upcoming';
  };
  error?: string;
}

interface RawCalendarResponse {
  success?: boolean;
  events?: Array<{
    id?: string;
    name?: string;
    start_date?: string;
    classification?: string;
    location?: { name?: string | null } | null;
  }>;
}

interface RawBillsResponse {
  bills?: Array<{
    id?: string;
    billNumber?: string;
    title?: string;
    chamber?: 'upper' | 'lower';
    status?: string;
    sponsor?: {
      name?: string;
      party?: string;
      district?: string;
    };
    lastActionDate?: string;
    introducedDate?: string;
  }>;
}

function chamberFromRaw(raw: RawChamber | undefined): StateChamberSummary | null {
  if (!raw || !raw.name || !raw.totalSeats || raw.totalSeats <= 0) return null;
  return {
    name: raw.name,
    title: raw.title ?? '',
    totalSeats: raw.totalSeats,
    democraticSeats: raw.democraticSeats ?? 0,
    republicanSeats: raw.republicanSeats ?? 0,
    otherSeats: raw.otherSeats ?? 0,
  };
}

function partyToken(party: string | undefined): 'd' | 'r' | 'i' {
  const p = (party ?? '').toLowerCase();
  if (p.startsWith('d')) return 'd';
  if (p.startsWith('r')) return 'r';
  return 'i';
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
}

async function loadLegislature(stateCode: string) {
  try {
    const url = `${getServerBaseUrl()}/api/state-legislature/${stateCode}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return (await res.json()) as RawLegislatureResponse;
  } catch {
    return null;
  }
}

async function loadCalendar(stateCode: string): Promise<StateLegislatureCalendarEvent[]> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const url = `${getServerBaseUrl()}/api/state-legislature/${stateCode}/calendar?startDate=${today}&limit=8`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as RawCalendarResponse;
    if (!data.success || !Array.isArray(data.events)) return [];
    return data.events.flatMap(e => {
      if (!e.id || !e.name || !e.start_date) return [];
      return [
        {
          id: e.id,
          name: e.name,
          start_date: e.start_date,
          classification: e.classification,
          location: e.location?.name ? { name: e.location.name } : undefined,
        },
      ];
    });
  } catch {
    return [];
  }
}

async function loadRecentBills(stateCode: string): Promise<StateLegislatureRecentBill[]> {
  try {
    const url = `${getServerBaseUrl()}/api/state-bills/${stateCode}?limit=10`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = (await res.json()) as RawBillsResponse;
    const bills = Array.isArray(data.bills) ? data.bills : [];
    return bills.flatMap(b => {
      if (!b.id || !b.billNumber || !b.title) return [];
      return [
        {
          id: b.id,
          identifier: b.billNumber,
          title: b.title,
          chamber: b.chamber === 'upper' ? 'upper' : 'lower',
          status: b.status ?? 'introduced',
          sponsorName: b.sponsor?.name,
          sponsorParty: partyToken(b.sponsor?.party),
          sponsorDistrict: b.sponsor?.district,
          lastActionDate: b.lastActionDate ?? b.introducedDate,
        },
      ];
    });
  } catch {
    return [];
  }
}

function deriveSession(raw: RawLegislatureResponse | null): StateLegislatureSession | null {
  if (!raw?.session?.name) return null;
  const session: StateLegislatureSession = {
    name: raw.session.name,
    startDate: raw.session.startDate,
    endDate: raw.session.endDate,
    status: raw.session.status,
  };
  const now = new Date();
  if (raw.session.startDate) {
    const start = new Date(raw.session.startDate);
    if (!Number.isNaN(start.getTime()) && start <= now) {
      session.daysIntoSession = daysBetween(start, now);
    }
  }
  if (raw.session.endDate) {
    const end = new Date(raw.session.endDate);
    if (!Number.isNaN(end.getTime()) && end >= now) {
      session.daysUntilAdjournment = daysBetween(now, end);
    }
  }
  return session;
}

export async function loadStateLegislaturePageData(
  stateCode: string
): Promise<StateLegislaturePageData> {
  const stateName = getStateName(stateCode) ?? stateCode;
  const [legislature, upcomingEvents, recentBills] = await Promise.all([
    loadLegislature(stateCode),
    loadCalendar(stateCode),
    loadRecentBills(stateCode),
  ]);

  const upper = chamberFromRaw(legislature?.chambers?.upper);
  const lower = chamberFromRaw(legislature?.chambers?.lower);
  const totalSeats =
    legislature?.totalCount && legislature.totalCount > 0
      ? legislature.totalCount
      : (upper?.totalSeats ?? 0) + (lower?.totalSeats ?? 0);

  return {
    stateCode,
    stateName,
    upper,
    lower,
    totalSeats,
    isUnicameral: !!upper && !lower,
    session: deriveSession(legislature),
    upcomingEvents,
    recentBills,
    fetchedAt: new Date().toISOString(),
  };
}

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { COMMITTEE_INFO } from '@/lib/data/committee-names';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

export interface OfficialResult {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  district?: string;
  initials: string;
}

export interface BillResult {
  number: string;
  type: string;
  congress: number;
  title: string;
  status?: string;
  updateDate?: string;
}

export interface CommitteeResult {
  id: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

export interface SearchData {
  query: string;
  elapsedMs: number;
  officials: OfficialResult[];
  bills: BillResult[];
  committees: CommitteeResult[];
  totals: { all: number; officials: number; bills: number; committees: number };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

async function searchOfficials(query: string, limit: number): Promise<OfficialResult[]> {
  try {
    const all = await getAllEnhancedRepresentatives();
    const q = query.toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];
    const filtered = all.filter(rep => {
      const haystack = [rep.name, rep.state, rep.party, rep.district]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return words.every(w => haystack.includes(w));
    });
    return filtered.slice(0, limit).map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party || 'Unknown',
      state: rep.state,
      chamber: rep.chamber as 'House' | 'Senate',
      district: rep.district,
      initials: initials(rep.name),
    }));
  } catch (err) {
    logger.error('SearchResults: officials search failed', err as Error);
    return [];
  }
}

async function searchBills(query: string, limit: number): Promise<BillResult[]> {
  const cacheKey = `redesign-search-bills-${query}-${limit}`;
  return cachedFetch(
    cacheKey,
    async () => {
      try {
        if (!process.env.CONGRESS_API_KEY) return [];
        const congress = process.env.CURRENT_CONGRESS || String(getCurrentCongressNumber());
        const response = await fetch(
          `https://api.congress.gov/v3/bill/${congress}?limit=100&sort=updateDate+desc`,
          {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'CIV.IQ/1.0',
              'X-API-Key': process.env.CONGRESS_API_KEY || '',
            },
          }
        );
        if (!response.ok) return [];
        const data = await response.json();
        const q = query.toLowerCase();
        const bills: BillResult[] = (data.bills ?? []).map(
          (b: {
            number: string;
            title: string;
            type: string;
            congress: number;
            updateDate?: string;
            latestAction?: { actionDate?: string };
          }) => ({
            number: `${b.type} ${b.number}`,
            type: b.type,
            congress: b.congress,
            title: b.title,
            updateDate: b.latestAction?.actionDate ?? b.updateDate,
          })
        );
        return bills
          .filter(b => b.number.toLowerCase().includes(q) || b.title.toLowerCase().includes(q))
          .slice(0, limit);
      } catch (err) {
        logger.error('SearchResults: bills search failed', err as Error);
        return [];
      }
    },
    5 * 60 * 1000
  );
}

function searchCommittees(query: string, limit: number): CommitteeResult[] {
  const q = query.toLowerCase();
  const out: CommitteeResult[] = Object.entries(COMMITTEE_INFO)
    .filter(([id, info]) => info.name.toLowerCase().includes(q) || id.toLowerCase().includes(q))
    .slice(0, limit)
    .map(([id, info]) => ({
      id,
      name: info.name,
      chamber: info.chamber === 'house' ? 'House' : info.chamber === 'senate' ? 'Senate' : 'Joint',
    }));
  return out;
}

export async function getSearchData(query: string): Promise<SearchData> {
  const start = Date.now();
  const trimmed = query.trim();
  if (!trimmed) {
    return {
      query: trimmed,
      elapsedMs: 0,
      officials: [],
      bills: [],
      committees: [],
      totals: { all: 0, officials: 0, bills: 0, committees: 0 },
    };
  }
  const [officials, bills] = await Promise.all([
    searchOfficials(trimmed, 8),
    searchBills(trimmed, 10),
  ]);
  const committees = searchCommittees(trimmed, 6);
  return {
    query: trimmed,
    elapsedMs: Date.now() - start,
    officials,
    bills,
    committees,
    totals: {
      all: officials.length + bills.length + committees.length,
      officials: officials.length,
      bills: bills.length,
      committees: committees.length,
    },
  };
}

import type {
  CompareFinance,
  CompareOfficial,
  CompareSidePayload,
  CompareVoting,
  PartyKey,
} from './types';

const FETCH_TIMEOUT_MS = 12_000;

function partyKey(raw: string | undefined): PartyKey {
  const p = (raw ?? '').toLowerCase();
  if (p.startsWith('d')) return 'd';
  if (p.startsWith('r')) return 'r';
  return 'i';
}

function partyLabel(key: PartyKey): string {
  if (key === 'd') return 'Democratic';
  if (key === 'r') return 'Republican';
  return 'Independent';
}

function shortLastName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '—';
  if (trimmed.includes(',')) {
    const last = trimmed.split(',')[0]?.trim();
    return last || trimmed;
  }
  const parts = trimmed.split(/\s+/);
  return parts[parts.length - 1] ?? trimmed;
}

function districtLabel(state: string, district: string | number | undefined): string {
  if (!state) return '—';
  if (district === undefined || district === null || district === '') return state;
  const num = String(district);
  if (num.toUpperCase() === 'STATE') return state;
  return `${state}-${num.padStart(2, '0')}`;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface RepProfileEnvelope {
  representative?: {
    bioguideId?: string;
    name?: string;
    party?: string;
    state?: string;
    district?: string | number;
    chamber?: 'House' | 'Senate';
    title?: string;
    role?: string;
    imageUrl?: string;
    terms?: Array<{ congress?: number; startYear?: number; endYear?: number }>;
    committees?: Array<{ name: string }>;
    caucuses?: Array<{ name?: string }>;
    nextElection?: number;
  };
  profile?: {
    basic?: {
      bioguideId?: string;
      name?: string;
      title?: string;
      party?: string;
      state?: string;
      district?: string | number;
      chamber?: 'House' | 'Senate';
    };
    terms?: Array<{ congress?: number; startYear?: number; endYear?: number }>;
    imageUrl?: string;
  };
  committees?: { count?: number };
  success?: boolean;
}

function toOfficial(envelope: RepProfileEnvelope | null): CompareOfficial | null {
  if (!envelope) return null;
  const rep = envelope.representative;
  const basic = envelope.profile?.basic;
  if (!rep && !basic) return null;
  const bioguideId = rep?.bioguideId ?? basic?.bioguideId;
  const name = rep?.name ?? basic?.name;
  const chamber = rep?.chamber ?? basic?.chamber;
  const state = rep?.state ?? basic?.state;
  if (!bioguideId || !name || !chamber || !state) return null;

  const pKey = partyKey(rep?.party ?? basic?.party);
  const district = rep?.district ?? basic?.district;
  const terms = rep?.terms ?? envelope.profile?.terms ?? [];
  const sinceTerm = terms.length > 0 ? terms[terms.length - 1] : undefined;
  const currentTerm = terms[0];
  const role =
    rep?.role ??
    rep?.title ??
    basic?.title ??
    (chamber === 'Senate' ? 'U.S. Senator' : 'U.S. Representative');
  const committeesCount = rep?.committees?.length ?? envelope.committees?.count ?? 0;
  const caucusesCount = rep?.caucuses?.length ?? 0;

  return {
    bioguideId: bioguideId.toUpperCase(),
    name,
    shortName: shortLastName(name),
    party: pKey,
    partyLabel: partyLabel(pKey),
    chamber,
    state,
    district: district === undefined ? undefined : String(district),
    districtLabel: districtLabel(state, district),
    position: role,
    imageUrl: rep?.imageUrl ?? envelope.profile?.imageUrl,
    since: sinceTerm?.startYear,
    nextElection: rep?.nextElection ?? currentTerm?.endYear,
    committeesCount,
    caucusesCount,
  };
}

interface ComparisonEnvelope {
  votingRecord?: {
    totalVotes?: number;
    partyLoyaltyScore?: number;
  };
  effectiveness?: {
    billsSponsored?: number;
    billsEnacted?: number;
    amendmentsAdopted?: number;
  };
  error?: string;
}

function toVoting(envelope: ComparisonEnvelope | null): CompareVoting | null {
  if (!envelope || envelope.error) return null;
  return {
    totalVotes: envelope.votingRecord?.totalVotes ?? 0,
    partyLoyaltyScore: envelope.votingRecord?.partyLoyaltyScore ?? 0,
    billsSponsored: envelope.effectiveness?.billsSponsored ?? 0,
    billsEnacted: envelope.effectiveness?.billsEnacted ?? 0,
    billsCosponsored: 0,
  };
}

interface FinanceEnvelope {
  totalRaised?: number;
  cashOnHand?: number;
  individualContributions?: number;
  pacContributions?: number;
  cycle?: number;
  metadata?: { dataFromCycle?: number };
  industrySectorBreakdown?: Array<{ sector: string; totalAmount: number }>;
  industryBreakdown?: Array<{ sector: string; amount: number }>;
  error?: string;
}

function toFinance(envelope: FinanceEnvelope | null): CompareFinance | null {
  if (!envelope || envelope.error) return null;
  const cycle = envelope.cycle ?? envelope.metadata?.dataFromCycle ?? new Date().getFullYear();
  const sector = envelope.industrySectorBreakdown?.[0];
  const employer = envelope.industryBreakdown?.[0];
  let topIndustry: string | undefined;
  let topIndustryAmount: number | undefined;
  if (sector) {
    topIndustry = sector.sector;
    topIndustryAmount = sector.totalAmount;
  } else if (employer) {
    topIndustry = employer.sector;
    topIndustryAmount = employer.amount;
  }
  return {
    cycle,
    totalRaised: envelope.totalRaised ?? 0,
    cashOnHand: envelope.cashOnHand ?? 0,
    individualContributions: envelope.individualContributions ?? 0,
    pacContributions: envelope.pacContributions ?? 0,
    topIndustry,
    topIndustryAmount,
  };
}

export async function fetchSide(bioguideId: string): Promise<CompareSidePayload> {
  const id = bioguideId.toUpperCase();
  const [profile, comparison, finance] = await Promise.all([
    fetchJson<RepProfileEnvelope>(`/api/representative/${id}`),
    fetchJson<ComparisonEnvelope>(`/api/compare?bioguideId=${id}`),
    fetchJson<FinanceEnvelope>(`/api/representative/${id}/finance`),
  ]);

  return {
    official: toOfficial(profile),
    voting: toVoting(comparison),
    finance: toFinance(finance),
    errors: {
      profile: profile === null,
      voting: comparison === null,
      finance: finance === null,
    },
  };
}

export function formatDollars(value: number | undefined): string {
  if (value === undefined || value === null || !Number.isFinite(value) || value <= 0) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

export function formatPercent(numerator: number, denominator: number): string {
  if (!denominator || denominator <= 0) return '—';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

export function formatCount(value: number | undefined, fallbackZero = false): string {
  if (value === undefined || value === null || !Number.isFinite(value)) return '—';
  if (value === 0 && !fallbackZero) return '—';
  return value.toLocaleString('en-US');
}

export function smallDonorPercent(finance: CompareFinance | null): string {
  if (!finance || finance.totalRaised <= 0) return '—';
  if (!finance.individualContributions) return '—';
  return formatPercent(finance.individualContributions, finance.totalRaised);
}

export function pacSharePercent(finance: CompareFinance | null): string {
  if (!finance || finance.totalRaised <= 0) return '—';
  return formatPercent(finance.pacContributions, finance.totalRaised);
}

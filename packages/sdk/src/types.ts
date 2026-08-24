// Types derived from public/openapi.json (v1.1.0, 39 paths, 29 schemas)

// ── Common ────────────────────────────────────────────────────────────

export interface Meta {
  apiVersion: string;
  timestamp: string;
  source?: string;
  license?: string;
  documentation?: string;
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface V1Error {
  error: { code: number; message: string; details?: string };
  meta?: Meta;
}

// ── Representatives ───────────────────────────────────────────────────

export interface RepresentativeSummary {
  bioguideId: string;
  name: string;
  party: 'D' | 'R' | 'I';
  state: string;
  district?: string | null;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string | null;
  website?: string | null;
  yearsInOffice?: number | null;
  nextElection?: string | null;
}

export interface RepresentativeDetail extends RepresentativeSummary {
  isHistorical?: boolean;
  votingMember?: boolean;
  role?: string;
  bio?: string | null;
  currentTerm?: Record<string, unknown> | null;
  socialMedia?: Record<string, unknown> | null;
  contact?: Record<string, unknown> | null;
  committees?: Record<string, unknown>[];
  leadershipRoles?: Record<string, unknown>[];
}

export interface RepresentativeListResponse {
  data: RepresentativeSummary[];
  pagination: Pagination;
  meta: Meta;
}

export interface RepresentativeDetailResponse {
  data: RepresentativeDetail;
  meta: Meta;
}

export interface FullRepresentativeProfile {
  representative: RepresentativeDetail;
  profile?: Record<string, unknown>;
  committees?: Record<string, unknown>[];
  biography?: Record<string, unknown> | null;
  socialMedia?: Record<string, unknown> | null;
  identifiers?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CompareResponse {
  votingRecord: Record<string, unknown>;
  campaignFinance: Record<string, unknown>;
  effectiveness: Record<string, unknown>;
}

// ── Bills ─────────────────────────────────────────────────────────────

export interface BillSummary {
  congress: number;
  number: string;
  type?: string | null;
  title?: string | null;
  originChamber?: string | null;
  updateDate?: string | null;
  latestAction?: { actionDate: string; text: string } | null;
  url: string;
}

export interface BillDetail {
  billId: string;
  congress: number;
  type: string;
  number: string;
  title: string;
  shortTitle?: string | null;
  originChamber?: string;
  introducedDate?: string;
  updateDate?: string | null;
  latestAction?: Record<string, unknown> | null;
  policyArea?: string | null;
  sponsors?: Array<{
    bioguideId: string;
    fullName: string;
    party: string;
    state: string;
  }>;
  cosponsorsCount?: number;
  committeesCount?: number;
  actionsCount?: number;
  textVersionsCount?: number;
  url?: string;
}

export interface BillAISummary {
  billId: string;
  title: string;
  summary: string;
  whatItDoes?: string;
  whyItMatters?: string;
  keyPoints?: string[];
  whoItAffects?: string[];
  readingLevel?: string;
  confidence?: number;
  lastUpdated?: string;
  source?: string;
}

export interface BillListResponse {
  data: BillSummary[];
  pagination: Pagination;
  meta: Meta;
}

export interface BillDetailResponse {
  data: BillDetail;
  meta: Meta;
}

export interface BillSummaryResponse {
  data: BillAISummary;
  meta: Meta;
}

// ── Votes ─────────────────────────────────────────────────────────────

export interface VoteDetail {
  voteId: string;
  chamber: string;
  congress: number;
  rollNumber: number;
  question?: string | null;
  description?: string | null;
  result?: string | null;
  date?: string | null;
  time?: string | null;
  totals?: { yea: number; nay: number; present: number; notVoting: number };
  positions?: Array<{
    name: string;
    party: string;
    state: string;
    vote: string;
    bioguideId: string;
  }>;
  url?: string;
}

export interface VoteDetailResponse {
  data: VoteDetail;
  meta: Meta;
}

// ── Districts ─────────────────────────────────────────────────────────

export interface DistrictDetail {
  districtId: string;
  state: string;
  district: string;
  label?: string;
  representatives: RepresentativeSummary[];
}

export interface DistrictDetailResponse {
  data: DistrictDetail;
  meta: Meta;
}

export interface DistrictListResponse {
  districts: DistrictDetail[];
  pagination: Pagination;
}

// ── Committees ────────────────────────────────────────────────────────

export interface CommitteeSummary {
  systemCode: string;
  name: string;
  chamber: string;
  type?: string | null;
  url?: string;
}

export interface CommitteeDetail {
  id: string;
  name: string;
  chamber: string;
  type?: string | null;
  jurisdiction?: string | null;
  url?: string | null;
  chair?: Record<string, unknown> | null;
  rankingMember?: Record<string, unknown> | null;
  members?: Record<string, unknown>[];
  subcommittees?: Record<string, unknown>[];
  lastUpdated?: string;
}

export interface CommitteeListResponse {
  data: CommitteeSummary[];
  pagination: Pagination;
  meta: Meta;
}

export interface CommitteeDetailResponse {
  data: CommitteeDetail;
  meta: Meta;
}

// ── Intelligence ──────────────────────────────────────────────────────

export interface IntelligenceInsight {
  confidence: number;
  dataAsOf: string;
  methodology: string;
  disclaimer: string;
  [key: string]: unknown;
}

export interface SectorLeaderboardResponse {
  sector: string;
  legislators: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    totalFromSector: number;
    percentOfTotal: number;
  }>;
  metadata?: Record<string, unknown>;
}

export interface MoneyReportResponse {
  state: string;
  district: string;
  representatives: RepresentativeSummary[];
  aggregates?: Record<string, unknown>;
  narrative?: string;
  confidence?: number;
  dataAsOf?: string;
}

export interface AddressRepresentativesResponse {
  representatives: RepresentativeSummary[];
  state: string;
  district: string;
  multiDistrict: boolean;
}

export interface InfluenceClustersResponse {
  clusters: Record<string, unknown>[];
  crossPartyHighlights: Record<string, unknown>[];
}

// ── Search ────────────────────────────────────────────────────────────

export interface UnifiedSearchResponse {
  query: string;
  totalResults: number;
  representatives: Record<string, unknown>[];
  bills: Record<string, unknown>[];
  committees: Record<string, unknown>[];
  stateLegislators: Record<string, unknown>[];
  stateBills: Record<string, unknown>[];
}

export interface PolicyAreaSearchResponse {
  policyArea: string;
  bills: Record<string, unknown>[];
  regulations: Record<string, unknown>[];
  spending?: Record<string, unknown> | null;
  committees: Record<string, unknown>[];
  metadata?: Record<string, unknown>;
}

// ── Geocode ───────────────────────────────────────────────────────────

export interface GeocodeResponse {
  success: boolean;
  district?: string;
  representatives: RepresentativeSummary[];
  stateLegislators?: Record<string, unknown>[];
  stateInfo?: Record<string, unknown>;
  geocoded?: Record<string, unknown>;
  isMultiDistrict?: boolean;
}

// ── States ────────────────────────────────────────────────────────────

export interface StateLegislatureResponse {
  state: string;
  stateName: string;
  legislators: Record<string, unknown>[];
  totalCount: number;
}

export interface StateBillsResponse {
  state: string;
  stateName: string;
  bills: Record<string, unknown>[];
  totalCount: number;
  pagination?: Pagination;
}

export interface StateLegislatorsByAddressResponse {
  legislators: Record<string, unknown>[];
  district: Record<string, unknown>;
}

// ── Graph ─────────────────────────────────────────────────────────────

export interface GraphNeighborsResponse {
  center: Record<string, unknown>;
  edges: Record<string, unknown>[];
  connectedNodes: Record<string, unknown>[];
  metadata: Record<string, unknown>;
}

// ── Query parameter types ─────────────────────────────────────────────

export interface ListRepresentativesParams {
  chamber?: 'house' | 'senate';
  state?: string;
  party?: 'D' | 'R' | 'I';
  limit?: number;
  offset?: number;
}

export interface ListBillsParams {
  sort?: 'updateDate+desc' | 'updateDate+asc' | 'number+desc' | 'number+asc';
  limit?: number;
  offset?: number;
}

export interface ListCommitteesParams {
  chamber?: string;
  limit?: number;
  offset?: number;
}

export interface UnifiedSearchParams {
  q: string;
  limit?: number;
}

export interface PolicyAreaSearchParams {
  policyArea: string;
  limit?: number;
}

export interface SectorLeaderboardParams {
  chamber?: 'house' | 'senate';
  party?: 'D' | 'R' | 'I';
  limit?: number;
}

export interface AddressInput {
  street: string;
  city: string;
  state: string;
}

export interface GeocodeInput {
  mode?: 'address' | 'coordinates';
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface GraphNeighborsParams {
  edgeTypes?: string;
  minConfidence?: number;
  limit?: number;
}

export interface StateLegislatureParams {
  chamber?: 'upper' | 'lower';
  party?: string;
}

export interface StateBillsParams {
  search?: string;
  status?: string;
  chamber?: 'upper' | 'lower';
  limit?: number;
}

export interface VotingRecordVote {
  voteId: string;
  question?: string;
  result?: string;
  date?: string;
  position?: string;
  chamber?: string;
  category?: string;
  isKeyVote?: boolean;
  bill?: { number?: string; title?: string; congress?: string; type?: string };
}

export interface VotingRecordResponse {
  votes: VotingRecordVote[];
  totalResults?: number;
  [key: string]: unknown;
}

export interface CampaignFinanceResponse {
  totalRaised?: number;
  totalSpent?: number;
  cashOnHand?: number;
  individualContributions?: number;
  pacContributions?: number;
  industryBreakdown?: Array<{ industry?: string; total?: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

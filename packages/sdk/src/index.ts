export { CivIQ } from './client.js';
export type { CivIQOptions } from './client.js';

export { HttpClient } from './http.js';
export type { HttpClientOptions } from './http.js';

export {
  CivIQError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  UpstreamError,
} from './errors.js';

export { RepresentativesResource } from './resources/representatives.js';
export { BillsResource } from './resources/bills.js';
export { VotesResource } from './resources/votes.js';
export { DistrictsResource } from './resources/districts.js';
export { CommitteesResource } from './resources/committees.js';
export { IntelligenceResource } from './resources/intelligence.js';
export { SearchResource } from './resources/search.js';
export { StatesResource } from './resources/states.js';
export { GraphResource } from './resources/graph.js';

export type {
  // Common
  Meta,
  Pagination,
  V1Error,
  // Representatives
  RepresentativeSummary,
  RepresentativeDetail,
  RepresentativeListResponse,
  RepresentativeDetailResponse,
  FullRepresentativeProfile,
  CompareResponse,
  // Bills
  BillSummary,
  BillDetail,
  BillAISummary,
  BillListResponse,
  BillDetailResponse,
  BillSummaryResponse,
  // Votes
  VoteDetail,
  VoteDetailResponse,
  // Districts
  DistrictDetail,
  DistrictDetailResponse,
  DistrictListResponse,
  // Committees
  CommitteeSummary,
  CommitteeDetail,
  CommitteeListResponse,
  CommitteeDetailResponse,
  // Intelligence
  IntelligenceInsight,
  SectorLeaderboardResponse,
  MoneyReportResponse,
  AddressRepresentativesResponse,
  InfluenceClustersResponse,
  // Search
  UnifiedSearchResponse,
  PolicyAreaSearchResponse,
  // Geocode
  GeocodeResponse,
  // States
  StateLegislatureResponse,
  StateBillsResponse,
  StateLegislatorsByAddressResponse,
  // Graph
  GraphNeighborsResponse,
  // Params
  ListRepresentativesParams,
  ListBillsParams,
  ListCommitteesParams,
  UnifiedSearchParams,
  PolicyAreaSearchParams,
  SectorLeaderboardParams,
  AddressInput,
  GeocodeInput,
  GraphNeighborsParams,
  StateLegislatureParams,
  StateBillsParams,
} from './types.js';

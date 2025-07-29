/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type {
  ApiResponse,
  PaginatedApiResponse,
  SearchParams,
  BatchRequest,
  BatchResponse,
} from './common.types';
import type {
  Representative,
  RepresentativeResponse,
  VotingRecord,
  CampaignFinance,
  PartyAlignment,
  RepresentativeBill,
} from '../models/Representative';

/**
 * Representatives list API response
 */
export interface RepresentativesListResponse
  extends ApiResponse<ReadonlyArray<RepresentativeResponse>> {
  readonly metadata: ApiResponse<ReadonlyArray<RepresentativeResponse>>['metadata'] & {
    readonly zipCode?: string;
    readonly state?: string;
    readonly district?: string;
    readonly totalRepresentatives: number;
  };
}

/**
 * Single representative API response
 */
export interface RepresentativeDetailResponse extends ApiResponse<Representative> {
  readonly metadata: ApiResponse<Representative>['metadata'] & {
    readonly bioguideId: string;
    readonly lastUpdated?: string;
  };
}

/**
 * Representatives search parameters
 */
export interface RepresentativesSearchParams extends SearchParams {
  readonly state?: string;
  readonly party?: string;
  readonly chamber?: 'house' | 'senate' | 'all';
  readonly committee?: string;
  readonly zipCode?: string;
  readonly district?: string;
}

/**
 * Representatives search response
 */
export interface RepresentativesSearchResponse
  extends PaginatedApiResponse<ReadonlyArray<RepresentativeResponse>> {
  readonly facets?: {
    readonly states: ReadonlyArray<{ readonly state: string; readonly count: number }>;
    readonly parties: ReadonlyArray<{ readonly party: string; readonly count: number }>;
    readonly chambers: ReadonlyArray<{ readonly chamber: string; readonly count: number }>;
  };
}

/**
 * Representative voting records parameters
 */
export interface VotingRecordsParams {
  readonly bioguideId: string;
  readonly congress?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly chamber?: 'house' | 'senate';
  readonly position?: 'Yea' | 'Nay' | 'Present' | 'Not Voting';
}

/**
 * Voting records API response
 */
export interface VotingRecordsResponse extends PaginatedApiResponse<ReadonlyArray<VotingRecord>> {
  readonly metadata: PaginatedApiResponse<ReadonlyArray<VotingRecord>>['metadata'] & {
    readonly bioguideId: string;
    readonly congress?: number;
    readonly summary?: {
      readonly totalVotes: number;
      readonly yeaVotes: number;
      readonly nayVotes: number;
      readonly presentVotes: number;
      readonly missedVotes: number;
    };
  };
}

/**
 * Campaign finance API response
 */
export interface CampaignFinanceResponse extends ApiResponse<CampaignFinance> {
  readonly metadata: ApiResponse<CampaignFinance>['metadata'] & {
    readonly bioguideId: string;
    readonly cycle: string;
    readonly lastReportDate?: string;
  };
}

/**
 * Party alignment API response
 */
export interface PartyAlignmentResponse extends ApiResponse<PartyAlignment> {
  readonly metadata: ApiResponse<PartyAlignment>['metadata'] & {
    readonly bioguideId: string;
    readonly congress?: number;
    readonly comparisonPeriod?: string;
  };
}

/**
 * Representative bills parameters
 */
export interface RepresentativeBillsParams {
  readonly bioguideId: string;
  readonly type?: 'sponsored' | 'cosponsored' | 'all';
  readonly congress?: number;
  readonly limit?: number;
  readonly offset?: number;
  readonly status?: string;
}

/**
 * Representative bills API response
 */
export interface RepresentativeBillsResponse
  extends PaginatedApiResponse<ReadonlyArray<RepresentativeBill>> {
  readonly metadata: PaginatedApiResponse<ReadonlyArray<RepresentativeBill>>['metadata'] & {
    readonly bioguideId: string;
    readonly type?: 'sponsored' | 'cosponsored' | 'all';
    readonly congress?: number;
    readonly summary?: {
      readonly totalBills: number;
      readonly sponsored: number;
      readonly cosponsored: number;
      readonly enacted: number;
    };
  };
}

/**
 * Batch representatives request
 */
export interface BatchRepresentativesRequest extends BatchRequest<string> {
  readonly options?: BatchRequest<string>['options'] & {
    readonly includeVotes?: boolean;
    readonly includeFinance?: boolean;
    readonly includeBills?: boolean;
    readonly includeNews?: boolean;
  };
}

/**
 * Batch representatives response
 */
export interface BatchRepresentativesResponse extends BatchResponse<Representative> {
  readonly aggregatedData?: {
    readonly totalRepresentatives: number;
    readonly partyBreakdown: Record<string, number>;
    readonly stateBreakdown: Record<string, number>;
    readonly chamberBreakdown: Record<string, number>;
  };
}

/**
 * Representatives comparison request
 */
export interface RepresentativesComparisonRequest {
  readonly bioguideIds: ReadonlyArray<string>;
  readonly metrics?: ReadonlyArray<'voting' | 'bills' | 'party_alignment' | 'finance'>;
  readonly congress?: number;
}

/**
 * Representatives comparison response
 */
export interface RepresentativesComparisonResponse
  extends ApiResponse<{
    readonly representatives: ReadonlyArray<Representative>;
    readonly comparison: {
      readonly votingSimilarity?: Record<string, number>;
      readonly billCosponsorship?: Record<string, number>;
      readonly partyAlignment?: Record<string, number>;
      readonly ideologicalDistance?: Record<string, number>;
    };
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly comparisonMetrics: ReadonlyArray<string>;
    readonly congress?: number;
  };
}

/**
 * District information parameters
 */
export interface DistrictParams {
  readonly state: string;
  readonly district: string;
}

/**
 * District information response
 */
export interface DistrictResponse
  extends ApiResponse<{
    readonly id: string;
    readonly state: string;
    readonly number: string;
    readonly population: number;
    readonly demographics: Record<string, unknown>;
    readonly representatives?: ReadonlyArray<RepresentativeResponse>;
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly state: string;
    readonly district: string;
    readonly lastCensus?: string;
  };
}

/**
 * State districts response
 */
export interface StateDistrictsResponse
  extends ApiResponse<
    ReadonlyArray<{
      readonly id: string;
      readonly number: string;
      readonly representative?: RepresentativeResponse;
    }>
  > {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly state: string;
    readonly totalDistricts: number;
  };
}

/**
 * Representative photo response
 */
export interface RepresentativePhotoResponse
  extends ApiResponse<{
    readonly url: string;
    readonly source: string;
    readonly lastUpdated?: string;
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly bioguideId: string;
  };
}

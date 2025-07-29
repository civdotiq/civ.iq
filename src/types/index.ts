/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Central type definitions export
 * This file re-exports all types for easy importing throughout the application
 */

// Model exports
export type * from './models/Representative';
export type * from './models/NewsArticle';
export type * from './models/Legislation';

// API type exports
export type * from './api/common.types';
export type * from './api/representatives.types';
export type * from './api/news.types';

// Re-export commonly used types with shorter names for convenience
export type {
  Representative,
  RepresentativeResponse,
  VotingRecord,
  CampaignFinance,
  PartyAlignment,
} from './models/Representative';

export type {
  NewsArticle,
  NewsTheme,
  RepresentativeNews,
  BatchNewsResponse,
} from './models/NewsArticle';

export type { Bill, BillType, BillStatus, Committee, RollCallVote } from './models/Legislation';

export type {
  ApiResponse,
  ApiError,
  ResponseMetadata,
  PaginatedApiResponse,
  ValidationResult,
} from './api/common.types';

export type {
  RepresentativesListResponse,
  RepresentativeDetailResponse,
  VotingRecordsResponse,
  CampaignFinanceResponse,
} from './api/representatives.types';

export type {
  NewsListResponse,
  RepresentativeNewsResponse,
  NewsApiSearchParams,
} from './api/news.types';

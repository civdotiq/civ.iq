/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// API Services
export { representativesService } from './api/representatives.service';

// Cache Services
export { redisService } from './cache/redis.service';

// AI Services
export { summarizationService } from './ai/summarization.service';

// Types
export type { CacheOperationResult } from './cache/redis.service';
export type {
  BillSummary,
  BillSummarizationOptions,
  MultiFormatSummary,
} from './ai/summarization.service';
export type {
  RepresentativeFilters,
  RepresentativesBatchRequest,
  VotingRecord,
  CampaignFinance,
  PartyAlignment,
} from './api/representatives.service';

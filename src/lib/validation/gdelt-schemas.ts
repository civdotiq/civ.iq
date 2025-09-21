/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Zod Validation Schemas
 *
 * Runtime validation for GDELT API responses to ensure data integrity
 * and type safety beyond compile-time TypeScript checking.
 */

import { z } from 'zod';
import { GDELTErrorType } from '@/types/gdelt';

// GDELT Article schema with proper nullable handling
export const GDELTArticleSchema = z.object({
  url: z.string().url(),
  urlmobile: z.string().url().nullable().optional(),
  title: z.string().nullable(),
  seendate: z.string(),
  socialimage: z.string().url().nullable().optional(),
  domain: z.string().nullable(),
  language: z.string().nullable(),
  sourcecountry: z.string().nullable().optional(),
  urltone: z.number().nullable().optional(),
  urlpubtimedate: z.string().nullable().optional(),
  urlpubtime: z.string().nullable().optional(),
  tone: z.number().nullable().optional(),
  country: z.string().nullable().optional(),
  lang: z.string().nullable().optional(),
});

// GDELT Timeline Entry schema
export const GDELTTimelineEntrySchema = z.object({
  datetime: z.string(),
  count: z.number().int().nonnegative(),
  tone: z.number().nullable().optional(),
});

// GDELT Metadata schema
export const GDELTMetadataSchema = z.object({
  totalResults: z.number().int().nonnegative().optional(),
  timespan: z.string().optional(),
  theme: z.string().optional(),
  domain: z.string().optional(),
  country: z.string().optional(),
});

// GDELT Response schema
export const GDELTResponseSchema = z.object({
  articles: z.array(GDELTArticleSchema).readonly().optional(),
  timeline: z.array(GDELTTimelineEntrySchema).readonly().optional(),
  metadata: GDELTMetadataSchema.optional(),
});

// GDELT Query Parameters schema
export const GDELTQueryParamsSchema = z.object({
  query: z.string().min(1),
  mode: z.enum(['artlist', 'timelinevol', 'timelinevolraw']).optional(),
  format: z.enum(['json', 'csv', 'html']).optional(),
  timespan: z.string().optional(),
  maxrecords: z.number().int().positive().max(250).optional(),
  theme: z.string().optional(),
  domain: z.string().optional(),
  country: z.string().optional(),
  sourcelang: z.string().optional(),
});

// GDELT Error schema
export const GDELTErrorSchema = z.object({
  type: z.nativeEnum(GDELTErrorType),
  message: z.string(),
  statusCode: z.number().int().optional(),
  timestamp: z.string().datetime(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// Success result schema
export const SuccessSchema = z.object({
  data: z.unknown(),
  error: z.undefined().optional(),
});

// Failure result schema
export const FailureSchema = z.object({
  data: z.undefined().optional(),
  error: GDELTErrorSchema,
});

// Result type schema (union of Success and Failure)
export const ResultSchema = z.union([
  z.object({
    data: z.unknown(),
    error: z.undefined().optional(),
  }),
  z.object({
    data: z.undefined().optional(),
    error: GDELTErrorSchema,
  }),
]);

// GDELT Event schema for real-time monitoring
export const GDELTEventSchema = z.object({
  globalEventId: z.string(),
  dateAdded: z.string(),
  sourceUrl: z.string().url(),
  actor1Name: z.string(),
  actor1CountryCode: z.string(),
  actor2Name: z.string(),
  actor2CountryCode: z.string(),
  eventCode: z.string(),
  eventBaseCode: z.string(),
  eventRootCode: z.string(),
  quadClass: z.number().int(),
  goldsteinScale: z.number(),
  numMentions: z.number().int().nonnegative(),
  numSources: z.number().int().nonnegative(),
  avgTone: z.number(),
  actionGeoCountryCode: z.string(),
  actionGeoStateName: z.string(),
  actionGeoCityName: z.string(),
  actionGeoLat: z.number(),
  actionGeoLong: z.number(),
});

// GDELT Trend schema
export const GDELTTrendSchema = z.object({
  term: z.string(),
  count: z.number().int().nonnegative(),
  trend: z.enum(['rising', 'falling', 'stable']),
  percentChange: z.number(),
  timeframe: z.string(),
});

// GDELT Real-time Stream schema
export const GDELTRealTimeStreamSchema = z.object({
  lastUpdate: z.string().datetime(),
  articles: z.array(z.unknown()),
  events: z.array(GDELTEventSchema),
  trends: z.array(GDELTTrendSchema),
  alerts: z.array(
    z.object({
      type: z.enum(['breaking', 'trending', 'crisis']),
      message: z.string(),
      timestamp: z.string().datetime(),
      urgency: z.enum(['low', 'medium', 'high']),
    })
  ),
});

/**
 * Validation helper functions
 */

/**
 * Validate GDELT API response with detailed error reporting
 */
export function validateGDELTResponse(data: unknown) {
  return GDELTResponseSchema.safeParse(data);
}

/**
 * Validate a single GDELT article
 */
export function validateGDELTArticle(data: unknown) {
  return GDELTArticleSchema.safeParse(data);
}

/**
 * Validate GDELT query parameters
 */
export function validateGDELTQueryParams(params: unknown) {
  return GDELTQueryParamsSchema.safeParse(params);
}

/**
 * Validate GDELT error object
 */
export function validateGDELTError(error: unknown) {
  return GDELTErrorSchema.safeParse(error);
}

/**
 * Parse and validate GDELT response with type inference
 */
export function parseGDELTResponse(data: unknown) {
  const result = GDELTResponseSchema.parse(data);
  return result;
}

/**
 * Parse and validate GDELT article array
 */
export function parseGDELTArticles(data: unknown) {
  const ArticlesArraySchema = z.array(GDELTArticleSchema);
  return ArticlesArraySchema.parse(data);
}

/**
 * Type guards using Zod validation
 */
export function isValidGDELTResponse(data: unknown): data is z.infer<typeof GDELTResponseSchema> {
  return GDELTResponseSchema.safeParse(data).success;
}

export function isValidGDELTArticle(data: unknown): data is z.infer<typeof GDELTArticleSchema> {
  return GDELTArticleSchema.safeParse(data).success;
}

export function isValidGDELTError(error: unknown): error is z.infer<typeof GDELTErrorSchema> {
  return GDELTErrorSchema.safeParse(error).success;
}

// Export inferred types for use in other modules
export type ValidatedGDELTResponse = z.infer<typeof GDELTResponseSchema>;
export type ValidatedGDELTArticle = z.infer<typeof GDELTArticleSchema>;
export type ValidatedGDELTQueryParams = z.infer<typeof GDELTQueryParamsSchema>;
export type ValidatedGDELTError = z.infer<typeof GDELTErrorSchema>;
export type ValidatedGDELTEvent = z.infer<typeof GDELTEventSchema>;
export type ValidatedGDELTTrend = z.infer<typeof GDELTTrendSchema>;
export type ValidatedGDELTRealTimeStream = z.infer<typeof GDELTRealTimeStreamSchema>;

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT API TypeScript Definitions for civic-intel-hub
 *
 * Implements strict type safety for GDELT Project DOC 2.0 API integration
 * Following civic-intel-hub patterns with readonly arrays and nullable fields
 */

// Core GDELT Article interface based on DOC 2.0 API response structure
export interface GDELTArticle {
  readonly url: string;
  readonly urlmobile?: string | null;
  readonly title: string | null;
  readonly seendate: string;
  readonly socialimage?: string | null;
  readonly domain: string | null;
  readonly language: string | null;
  readonly sourcecountry: string | null;
  readonly urltone?: number | null;
  readonly urlpubtimedate?: string | null;
  readonly urlpubtime?: string | null;
  readonly tone?: number | null;
  readonly country?: string | null;
  readonly lang?: string | null;
}

// GDELT Timeline Entry for temporal analysis
export interface GDELTTimelineEntry {
  readonly datetime: string;
  readonly count: number;
  readonly tone?: number | null;
}

// GDELT Metadata for API responses
export interface GDELTMetadata {
  readonly totalResults?: number;
  readonly timespan?: string;
  readonly theme?: string;
  readonly domain?: string;
  readonly country?: string;
}

// GDELT Television Coverage interface
export interface GDELTTelevisionMention {
  readonly station: string;
  readonly datetime: string;
  readonly duration?: number; // In seconds
  readonly snippet?: string;
  readonly tone?: number;
  readonly mentionContext?: string;
}

// GDELT Trending Topic interface
export interface GDELTTrendingTopic {
  readonly topic: string;
  readonly mentionCount: number;
  readonly trendScore: number; // Normalized trending score
  readonly timeframe: string;
  readonly peakDate?: string;
  readonly associatedEvents?: readonly string[];
}

// Enhanced GDELT API Response structure
export interface GDELTResponse {
  readonly articles?: ReadonlyArray<GDELTArticle>;
  readonly timeline?: ReadonlyArray<GDELTTimelineEntry>;
  readonly television?: ReadonlyArray<GDELTTelevisionMention>;
  readonly trending?: ReadonlyArray<GDELTTrendingTopic>;
  readonly metadata?: GDELTMetadata;
}

// GDELT Query Parameters interface
export interface GDELTQueryParams {
  readonly query: string;
  readonly mode?: 'artlist' | 'timelinevol' | 'timelinevolraw';
  readonly format?: 'json' | 'csv' | 'html';
  readonly timespan?: string;
  readonly maxrecords?: number;
  readonly theme?: string;
  readonly domain?: string;
  readonly country?: string;
  readonly sourcelang?: string;
  // GEO API parameters
  readonly geo?: string;
  readonly geores?: string;
  readonly near?: string;
  readonly withinradius?: string;
}

// GDELT GEO API parameters for location-based searches
export interface GDELTGeoParams {
  readonly location: string; // City, state, or coordinates
  readonly radius?: number; // Radius in kilometers
  readonly geores?: 'country' | 'state' | 'city';
}

// Enhanced GDELT query options for advanced features
export interface GDELTAdvancedOptions {
  readonly includeTelevision?: boolean;
  readonly trendingThreshold?: number;
  readonly sources?: readonly string[]; // Specific source domains
  readonly excludeSources?: readonly string[]; // Sources to exclude
  readonly includeImages?: boolean;
  readonly minTone?: number; // Minimum tone threshold
  readonly maxTone?: number; // Maximum tone threshold
}

// Error handling types following Result/Either pattern
export enum GDELTErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  PARSING_ERROR = 'PARSING_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  INVALID_QUERY = 'INVALID_QUERY',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  TIMEOUT = 'TIMEOUT',
  SERVER_ERROR = 'SERVER_ERROR',
}

export interface GDELTError {
  readonly type: GDELTErrorType;
  readonly message: string;
  readonly statusCode?: number;
  readonly timestamp: string;
  readonly details?: Record<string, unknown>;
}

// Result/Either pattern for functional error handling
export type Success<T> = {
  readonly data: T;
  readonly error?: never;
};

export type Failure<E = GDELTError> = {
  readonly data?: never;
  readonly error: E;
};

export type Result<T, E = GDELTError> = Success<T> | Failure<E>;

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Federal Register Types
 *
 * Types for Federal Register API data including executive orders,
 * proposed rules (regulations), and public comment periods.
 *
 * API Documentation: https://www.federalregister.gov/developers/documentation/api/v1
 */

import type { InsightBase } from '@/lib/intelligence/types';

// Agency information from Federal Register
export interface FederalRegisterAgency {
  id: number;
  name: string;
  slug: string;
  url: string;
  parentId?: number;
}

// Base document from Federal Register API
export interface FederalRegisterDocument {
  documentNumber: string;
  title: string;
  abstract: string | null;
  type: 'Presidential Document' | 'Rule' | 'Proposed Rule' | 'Notice';
  publicationDate: string;
  agencies: FederalRegisterAgency[];
  htmlUrl: string;
  pdfUrl: string;
}

// Executive Order (Presidential Document)
export interface ExecutiveOrder extends FederalRegisterDocument {
  type: 'Presidential Document';
  executiveOrderNumber?: string;
  signingDate?: string;
  president?: string;
}

// Proposed Rule (regulation open for comment)
export interface ProposedRule extends FederalRegisterDocument {
  type: 'Proposed Rule';
  commentUrl: string | null;
  commentsCloseOn: string | null;
  daysUntilClose: number | null;
  isOpen: boolean;
  regulationIdNumber?: string;
}

// Final Rule (enacted regulation)
export interface FinalRule extends FederalRegisterDocument {
  type: 'Rule';
  effectiveDate: string | null;
  regulationIdNumber?: string;
}

// Simplified document for display
export interface FederalRegisterItem {
  id: string;
  title: string;
  summary: string | null;
  type: 'executive_order' | 'proposed_rule' | 'final_rule' | 'notice';
  publishedDate: string;
  agency: string;
  agencySlug: string;
  url: string;
  pdfUrl: string;
  // Comment period info (for proposed rules)
  commentUrl?: string;
  commentsCloseOn?: string;
  daysUntilClose?: number;
  isOpenForComment?: boolean;
  // Executive order specific
  executiveOrderNumber?: string;
  // Rule specific
  effectiveDate?: string;
}

// API Response types
export interface FederalRegisterResponse {
  success: boolean;
  items: FederalRegisterItem[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
    hasMore: boolean;
  };
  filters: {
    type: string;
    agency?: string;
    openForComment?: boolean;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
    cacheHit?: boolean;
  };
  error?: string;
}

// Executive Orders response
export interface ExecutiveOrdersResponse {
  success: boolean;
  orders: FederalRegisterItem[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
  };
  error?: string;
}

// Open Comment Periods response
export interface CommentPeriodsResponse {
  success: boolean;
  openComments: FederalRegisterItem[];
  closingSoon: FederalRegisterItem[]; // Closing within 7 days
  recentlyClosed: FederalRegisterItem[]; // Closed within last 7 days
  stats: {
    totalOpen: number;
    closingThisWeek: number;
    avgDaysRemaining: number;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
  };
  error?: string;
}

// Raw API response from Federal Register
export interface FederalRegisterAPIResponse {
  count: number;
  description: string;
  total_pages: number;
  next_page_url: string | null;
  results: FederalRegisterAPIDocument[];
}

export interface FederalRegisterAPIDocument {
  document_number: string;
  title: string;
  abstract: string | null;
  type: string;
  subtype?: string;
  publication_date: string;
  signing_date?: string;
  president?: {
    name: string;
    identifier: string;
  };
  executive_order_number?: string;
  html_url: string;
  pdf_url: string;
  public_inspection_pdf_url?: string;
  comment_url?: string;
  comments_close_on?: string;
  effective_on?: string;
  regulation_id_number?: string;
  body_html_url?: string;
  raw_text_url?: string;
  agencies: Array<{
    raw_name: string;
    name: string;
    id: number;
    url: string;
    json_url: string;
    parent_id: number | null;
    slug: string;
  }>;
}

// ── Preamble Extraction Types ─────────────────────────────────────

/** Text statistics computed before AI extraction (statistics-first rule). */
export interface PreambleTextStats {
  wordCount: number;
  sectionCount: number;
  dollarAmountMentions: number;
  dateMentions: number;
  entityMentions: number;
  wasTruncated: boolean;
}

/** Industry or sector identified as impacted by the rule. */
export interface PreambleIndustryImpact {
  industry: string;
  impactType:
    | 'regulatory_burden'
    | 'deregulatory_relief'
    | 'new_requirement'
    | 'modified_requirement';
  description: string;
  estimatedAffectedEntities: number | null;
}

/** Cost estimate extracted from the preamble. */
export interface PreambleCostEstimate {
  description: string;
  amount: string;
  amountLow: number | null;
  amountHigh: number | null;
  type: 'cost' | 'benefit' | 'transfer';
  affectedParty: string;
  timePeriod: string | null;
}

/** A compliance or effective date timeline entry. */
export interface PreambleTimeline {
  date: string;
  event: string;
  isEstimate: boolean;
}

/** A single structured fact extracted from a Federal Register preamble. */
export interface PreambleFact {
  category:
    | 'industry_impact'
    | 'cost_estimate'
    | 'timeline'
    | 'affected_entity'
    | 'legal_authority'
    | 'compliance_requirement';
  summary: string;
  sourceQuote: string | null;
  confidence: number;
}

/** Full preamble extraction result. Extends InsightBase for consistency with other analyzers. */
export interface PreambleExtractionInsight extends InsightBase {
  documentNumber: string;
  title: string;
  agency: string;
  documentType: 'proposed_rule' | 'final_rule' | 'notice' | 'executive_order';
  publicationDate: string;
  textStats: PreambleTextStats;
  industryImpacts: PreambleIndustryImpact[];
  costEstimates: PreambleCostEstimate[];
  timelines: PreambleTimeline[];
  facts: PreambleFact[];
  narrative: string;
  /** Named entities extracted via local BERT NER model, if available. */
  entities?: import('@/lib/intelligence/embeddings/types').CivicEntity[];
}

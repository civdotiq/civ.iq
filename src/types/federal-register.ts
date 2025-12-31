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

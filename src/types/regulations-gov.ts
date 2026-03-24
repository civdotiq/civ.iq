/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Regulations.gov Types
 *
 * Types for the Regulations.gov API v4 (JSON:API format).
 * Provides public comment data on proposed federal rules.
 *
 * API Documentation: https://open.gsa.gov/api/regulationsgov/
 */

/** A document from Regulations.gov */
export interface RegDocument {
  id: string;
  type: 'documents';
  documentId: string;
  documentType: 'Proposed Rule' | 'Rule' | 'Notice' | 'Supporting & Related Material' | 'Other';
  title: string;
  agencyId: string;
  docketId: string;
  commentStartDate: string | null;
  commentEndDate: string | null;
  postedDate: string;
  lastModifiedDate: string;
  objectId: string;
  withdrawn: boolean;
}

/** Detailed document from Regulations.gov */
export interface RegDocumentDetail extends RegDocument {
  abstract: string | null;
  frDocNum: string | null;
  federalRegisterNumber: string | null;
  openForComment: boolean;
  commentCount: number;
  subtype: string | null;
  topics: string[];
  rin: string | null;
}

/** A public comment from Regulations.gov */
export interface RegComment {
  id: string;
  type: 'comments';
  commentId: string;
  documentId: string;
  docketId: string;
  agencyId: string;
  title: string;
  postedDate: string;
  submitterType: string | null;
  organization: string | null;
  category: string | null;
  withdrawn: boolean;
}

/** A docket (collection of documents) from Regulations.gov */
export interface RegDocket {
  id: string;
  type: 'dockets';
  docketId: string;
  agencyId: string;
  title: string;
  docketType: 'Rulemaking' | 'Nonrulemaking';
  lastModifiedDate: string;
  objectId: string;
}

/** Comment statistics for a docket */
export interface RegCommentStats {
  total: number;
  bySubmitterType: Record<string, number>;
  docketId: string;
  lastUpdated: string;
}

/** Filters for document search */
export interface RegDocFilters {
  agencyId?: string;
  docketId?: string;
  documentType?: string;
  searchTerm?: string;
  postedDateFrom?: string;
  postedDateTo?: string;
  commentEndDateFrom?: string;
  commentEndDateTo?: string;
  pageSize?: number;
  pageNumber?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/** Raw JSON:API response from Regulations.gov */
export interface RegAPIResponse<T> {
  data: Array<{
    id: string;
    type: string;
    attributes: T;
    links?: { self: string };
  }>;
  meta?: {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    numberOfElements: number;
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    firstPage: boolean;
    lastPage: boolean;
  };
}

/** Raw JSON:API single item response */
export interface RegAPISingleResponse<T> {
  data: {
    id: string;
    type: string;
    attributes: T;
    links?: { self: string };
  };
}

/** Rule lifecycle tracking for a docket */
export interface RuleLifecycle {
  docketId: string;
  agencyId: string;
  title: string;
  status: 'proposed' | 'comment_period' | 'comment_closed' | 'final' | 'effective' | 'withdrawn';
  proposedDate: string | null;
  commentOpenDate: string | null;
  commentCloseDate: string | null;
  finalRuleDate: string | null;
  effectiveDate: string | null;
  totalComments: number;
  rin: string | null;
}

/** API response for comments endpoint */
export interface RegCommentsResponse {
  success: boolean;
  comments: RegComment[];
  stats: RegCommentStats | null;
  document: {
    documentId: string;
    title: string;
    docketId: string;
    agencyId: string;
  } | null;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  metadata: {
    dataSource: string;
    generatedAt: string;
  };
  error?: string;
}

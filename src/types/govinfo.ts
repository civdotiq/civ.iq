/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GovInfo Types
 *
 * Types for GovInfo API data including congressional hearings,
 * reports, and other government documents.
 *
 * API Documentation: https://api.govinfo.gov/docs
 */

// GovInfo collection codes
export type GovInfoCollection =
  | 'CHRG' // Congressional Hearings
  | 'CRPT' // Congressional Reports
  | 'BILLS' // Congressional Bills
  | 'BILLSTATUS' // Bill Status
  | 'CDOC' // Congressional Documents
  | 'CREC'; // Congressional Record

// Document class codes
export type DocumentClass =
  | 'HHRG' // House Hearing
  | 'SHRG' // Senate Hearing
  | 'HRPT' // House Report
  | 'SRPT' // Senate Report
  | 'ERPT'; // Executive Report

// Base package from GovInfo collections API
export interface GovInfoPackage {
  packageId: string;
  lastModified: string;
  packageLink: string;
  docClass: DocumentClass;
  title: string;
  congress: string;
  dateIssued: string;
}

// Congressional hearing summary
export interface CongressionalHearing {
  id: string;
  packageId: string;
  title: string;
  congress: number;
  session: number;
  chamber: 'House' | 'Senate' | 'Joint';
  dateIssued: string;
  heldDates: string[];
  pages: number;
  committees: string[];
  witnesses: string[];
  detailsUrl: string;
  pdfUrl: string;
  txtUrl: string;
}

// Congressional report summary
export interface CongressionalReport {
  id: string;
  packageId: string;
  title: string;
  congress: number;
  session: number;
  chamber: 'House' | 'Senate' | 'Executive';
  reportNumber: string;
  dateIssued: string;
  pages: number;
  billNumbers: string[];
  detailsUrl: string;
  pdfUrl: string;
}

// Simplified document for display
export interface GovInfoDocument {
  id: string;
  title: string;
  type: 'hearing' | 'report' | 'bill' | 'record';
  congress: number;
  chamber: 'House' | 'Senate' | 'Joint';
  dateIssued: string;
  lastModified: string;
  pages: number | null;
  detailsUrl: string;
  pdfUrl: string | null;
}

// Hearings response
export interface HearingsResponse {
  success: boolean;
  hearings: GovInfoDocument[];
  pagination: {
    count: number;
    pageSize: number;
    nextPage: string | null;
  };
  filters: {
    congress?: number;
    chamber?: string;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
  };
  error?: string;
}

// Reports response
export interface ReportsResponse {
  success: boolean;
  reports: GovInfoDocument[];
  pagination: {
    count: number;
    pageSize: number;
    nextPage: string | null;
  };
  filters: {
    congress?: number;
    chamber?: string;
  };
  metadata: {
    generatedAt: string;
    dataSource: string;
  };
  error?: string;
}

// Raw API response from GovInfo collections
export interface GovInfoCollectionResponse {
  count: number;
  message: string | null;
  nextPage: string | null;
  previousPage: string | null;
  packages: GovInfoPackage[];
}

// Raw API response from GovInfo package summary
export interface GovInfoPackageSummary {
  packageId: string;
  collectionCode: string;
  collectionName: string;
  title: string;
  congress: string;
  session: string;
  branch: string;
  category: string;
  dateIssued: string;
  lastModified: string;
  chamber?: string;
  documentType?: string;
  docClass?: string;
  heldDates?: string[];
  pages?: string;
  governmentAuthor1?: string;
  governmentAuthor2?: string;
  publisher?: string;
  detailsLink?: string;
  download?: {
    pdfLink?: string;
    txtLink?: string;
    premisLink?: string;
    modsLink?: string;
    zipLink?: string;
  };
  relatedLink?: string;
  granulesLink?: string;
}

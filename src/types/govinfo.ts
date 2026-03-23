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

// Congressional Record granule member
export interface CRECGranuleMember {
  bioGuideId: string;
  memberName: string;
  role: string;
  party: string;
  state: string;
  chamber: 'H' | 'S';
  congress: number;
}

// Congressional Record granule from GovInfo API
export interface CRECGranule {
  granuleId: string;
  granuleClass: 'HOUSE' | 'SENATE' | 'EXTENSIONS' | 'DAILYDIGEST';
  subGranuleClass: string;
  title: string;
  packageId: string;
  dateIssued: string;
  members: CRECGranuleMember[];
  committees: Array<{
    authorityId: string;
    chamber: string;
    committeeName: string;
    type: string;
  }>;
  references: Array<{
    collectionCode: string;
    type: string;
    number: string;
    congress: string;
  }>;
  download: {
    txtLink?: string;
    pdfLink?: string;
    modsLink?: string;
  };
}

// Congressional Record granules list response
export interface CRECGranulesResponse {
  count: number;
  offset: number;
  pageSize: number;
  nextPage: string | null;
  previousPage: string | null;
  granules: CRECGranule[];
}

// Congressional Record search result
export interface CRECSearchResult {
  title: string;
  packageId: string;
  granuleId: string;
  collectionCode: string;
  dateIssued: string;
  lastModified: string;
  category: string;
  download: {
    txtLink?: string;
    pdfLink?: string;
  };
}

// Congressional Record search response
export interface CRECSearchResponse {
  count: number;
  offsetMark: string;
  nextOffsetMark: string | null;
  results: CRECSearchResult[];
}

// Processed floor speech for UI consumption
export interface FloorSpeech {
  id: string;
  title: string;
  date: string;
  chamber: 'House' | 'Senate';
  section: 'HOUSE' | 'SENATE' | 'EXTENSIONS';
  category: string;
  relatedBills: Array<{
    type: string;
    number: string;
    congress: number;
  }>;
  pdfUrl: string | null;
  govInfoUrl: string;
}

// Speeches API response
export interface SpeechesResponse {
  success: boolean;
  speeches: FloorSpeech[];
  pagination: {
    total: number;
    pageSize: number;
    hasMore: boolean;
  };
  metadata: {
    bioguideId: string;
    memberName: string;
    dataSource: string;
    dataAsOf: string;
  };
  error?: string;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Response validation schemas for ensuring API data integrity
// This is complementary to the input validation in schemas.ts

// Type guard interfaces for unknown data
interface DistrictData {
  state?: unknown;
  district?: unknown;
}

interface RepresentativeData {
  bioguideId?: unknown;
  name?: unknown;
  party?: unknown;
  state?: unknown;
  chamber?: unknown;
  title?: unknown;
  district?: unknown;
  phone?: unknown;
  website?: unknown;
  email?: unknown;
  socialMedia?: unknown;
  currentTerm?: unknown;
}

interface CongressApiData {
  members?: unknown;
  bills?: unknown;
  pagination?: unknown;
}

interface FecApiData {
  results?: unknown;
  pagination?: unknown;
}

interface MemberData {
  bioguideId?: unknown;
  name?: unknown;
  state?: unknown;
}

interface BillData {
  number?: unknown;
  title?: unknown;
  congress?: unknown;
  type?: unknown;
}

interface FecResultData {
  candidate_id?: unknown;
  committee_id?: unknown;
  candidate_name?: unknown;
  total_receipts?: unknown;
  total_disbursements?: unknown;
}

interface PaginationData {
  count?: unknown;
  pages?: unknown;
  per_page?: unknown;
}

export interface ResponseValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
  completeness: number; // 0-100%
  lastValidated: string;
}

// Schema for District data from Census API
export interface DistrictSchema {
  state: string;
  district: string;
}

export function validateDistrictResponse(data: unknown): ResponseValidationResult<DistrictSchema> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Type guard for data
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return {
      isValid: false,
      errors,
      warnings,
      completeness: 0,
      lastValidated: new Date().toISOString(),
    };
  }

  const districtData = data as DistrictData;

  // Required fields
  if (!districtData.state || typeof districtData.state !== 'string') {
    errors.push('Missing or invalid state field');
  }

  if (!districtData.district || typeof districtData.district !== 'string') {
    errors.push('Missing or invalid district field');
  }

  // Warnings for unexpected values
  if (
    districtData.state &&
    typeof districtData.state === 'string' &&
    districtData.state.length !== 2
  ) {
    warnings.push('State should be 2-letter abbreviation');
  }

  if (
    districtData.district &&
    typeof districtData.district === 'string' &&
    !/^\d{1,2}$/.test(districtData.district)
  ) {
    warnings.push('District should be 1-2 digit number');
  }

  const completeness = districtData.state && districtData.district ? 100 : 50;

  return {
    isValid: errors.length === 0,
    data:
      errors.length === 0
        ? {
            state: districtData.state as string,
            district: districtData.district as string,
          }
        : undefined,
    errors,
    warnings,
    completeness,
    lastValidated: new Date().toISOString(),
  };
}

// Schema for Representative data from Congress Legislators
export interface RepresentativeSchema {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  title: string;
  district?: string;
  phone?: string;
  website?: string;
  email?: string;
  socialMedia?: {
    twitter?: string;
    facebook?: string;
    youtube?: string;
  };
  currentTerm?: {
    startDate: string;
    endDate: string;
    office?: string;
    phone?: string;
    website?: string;
  };
}

export function validateRepresentativeResponse(
  data: unknown
): ResponseValidationResult<RepresentativeSchema> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let completeness = 0;

  // Type guard for data
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return {
      isValid: false,
      errors,
      warnings,
      completeness: 0,
      lastValidated: new Date().toISOString(),
    };
  }

  const repData = data as RepresentativeData;

  // Required fields (60% of score)
  if (!repData.bioguideId || typeof repData.bioguideId !== 'string') {
    errors.push('Missing or invalid bioguideId');
  } else {
    completeness += 15;
    if (!/^[A-Z]\d{6}$/.test(repData.bioguideId)) {
      warnings.push('Bioguide ID format may be invalid (should be letter + 6 digits)');
    }
  }

  if (!repData.name || typeof repData.name !== 'string') {
    errors.push('Missing or invalid name');
  } else {
    completeness += 15;
  }

  if (!repData.party || typeof repData.party !== 'string') {
    errors.push('Missing or invalid party');
  } else {
    completeness += 10;
  }

  if (!repData.state || typeof repData.state !== 'string') {
    errors.push('Missing or invalid state');
  } else {
    completeness += 10;
  }

  if (!repData.chamber || !['House', 'Senate'].includes(repData.chamber as string)) {
    errors.push('Missing or invalid chamber (must be House or Senate)');
  } else {
    completeness += 10;
  }

  // Optional but valuable fields (40% of score)
  if (repData.title && typeof repData.title === 'string') completeness += 5;
  if (repData.phone && typeof repData.phone === 'string') completeness += 10;
  if (repData.website && typeof repData.website === 'string') completeness += 10;
  if (repData.email && typeof repData.email === 'string') completeness += 5;
  if (repData.currentTerm && typeof repData.currentTerm === 'object') completeness += 10;

  // Business logic warnings
  if (repData.chamber === 'House' && !repData.district) {
    warnings.push('House representative missing district number');
  }

  if (repData.chamber === 'Senate' && repData.district) {
    warnings.push('Senate member should not have district number');
  }

  // Validate contact info format
  if (
    repData.phone &&
    typeof repData.phone === 'string' &&
    !/\d{3}[.-]?\d{3}[.-]?\d{4}/.test(repData.phone)
  ) {
    warnings.push('Phone number format may be inconsistent');
  }

  if (
    repData.website &&
    typeof repData.website === 'string' &&
    !repData.website.startsWith('http')
  ) {
    warnings.push('Website URL should start with http/https');
  }

  if (repData.email && typeof repData.email === 'string' && !repData.email.includes('@')) {
    warnings.push('Email format appears invalid');
  }

  const validatedData: RepresentativeSchema = {
    bioguideId: (repData.bioguideId as string) || '',
    name: (repData.name as string) || '',
    party: (repData.party as string) || '',
    state: (repData.state as string) || '',
    chamber: (repData.chamber as 'House' | 'Senate') || 'House',
    title: (repData.title as string) || '',
    district: repData.district as string,
    phone: repData.phone as string,
    website: repData.website as string,
    email: repData.email as string,
    socialMedia: repData.socialMedia as RepresentativeSchema['socialMedia'],
    currentTerm: repData.currentTerm as RepresentativeSchema['currentTerm'],
  };

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? validatedData : undefined,
    errors,
    warnings,
    completeness: Math.min(completeness, 100),
    lastValidated: new Date().toISOString(),
  };
}

// Schema for Congress.gov API responses
export interface CongressApiSchema {
  members?: Array<{
    bioguideId: string;
    name: string;
    party?: string;
    state: string;
  }>;
  bills?: Array<{
    number: string;
    title: string;
    congress: string;
    type: string;
  }>;
  pagination?: {
    count: number;
    next?: string;
  };
}

export function validateCongressApiResponse(
  data: unknown,
  expectedType: 'members' | 'bills'
): ResponseValidationResult<CongressApiSchema> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let completeness = 0;

  // Check top-level structure
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return {
      isValid: false,
      errors,
      warnings,
      completeness: 0,
      lastValidated: new Date().toISOString(),
    };
  }

  const congressData = data as CongressApiData;

  // Validate based on expected type
  if (expectedType === 'members') {
    if (!Array.isArray(congressData.members)) {
      errors.push('Missing or invalid members array');
    } else {
      completeness += 50;

      // Validate each member
      congressData.members.forEach((member: unknown, index: number) => {
        const memberData = member as MemberData;
        if (!memberData.bioguideId) {
          warnings.push(`Member ${index} missing bioguideId`);
        }
        if (!memberData.name) {
          warnings.push(`Member ${index} missing name`);
        }
        if (!memberData.state) {
          warnings.push(`Member ${index} missing state`);
        }
        if (
          memberData.bioguideId &&
          typeof memberData.bioguideId === 'string' &&
          !/^[A-Z]\d{6}$/.test(memberData.bioguideId)
        ) {
          warnings.push(`Member ${index} has invalid bioguide ID format`);
        }
      });

      if (congressData.members.length > 0) completeness += 30;
    }
  } else if (expectedType === 'bills') {
    if (!Array.isArray(congressData.bills)) {
      errors.push('Missing or invalid bills array');
    } else {
      completeness += 50;

      // Validate each bill
      congressData.bills.forEach((bill: unknown, index: number) => {
        const billData = bill as BillData;
        if (!billData.number) {
          warnings.push(`Bill ${index} missing number`);
        }
        if (!billData.title) {
          warnings.push(`Bill ${index} missing title`);
        }
        if (!billData.congress) {
          warnings.push(`Bill ${index} missing congress number`);
        }
        if (!billData.type) {
          warnings.push(`Bill ${index} missing type`);
        }
      });

      if (congressData.bills.length > 0) completeness += 30;
    }
  }

  // Check pagination
  if (congressData.pagination) {
    const paginationData = congressData.pagination as PaginationData;
    if (typeof paginationData.count === 'number') {
      completeness += 20;
    } else {
      warnings.push('Pagination count is not a number');
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (congressData as CongressApiSchema) : undefined,
    errors,
    warnings,
    completeness: Math.min(completeness, 100),
    lastValidated: new Date().toISOString(),
  };
}

// Schema for FEC API responses
export interface FecApiSchema {
  results?: Array<{
    candidate_id?: string;
    candidate_name?: string;
    committee_id?: string;
    committee_name?: string;
    total_receipts?: number;
    total_disbursements?: number;
  }>;
  pagination?: {
    count: number;
    pages: number;
    per_page: number;
  };
}

export function validateFecApiResponse(data: unknown): ResponseValidationResult<FecApiSchema> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let completeness = 0;

  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return {
      isValid: false,
      errors,
      warnings,
      completeness: 0,
      lastValidated: new Date().toISOString(),
    };
  }

  const fecData = data as FecApiData;

  if (!Array.isArray(fecData.results)) {
    errors.push('Missing or invalid results array');
  } else {
    completeness += 60;

    // Check each result
    fecData.results.forEach((result: unknown, index: number) => {
      const resultData = result as FecResultData;
      if (!resultData.candidate_id && !resultData.committee_id) {
        warnings.push(`Result ${index} missing both candidate_id and committee_id`);
      }

      if (
        resultData.total_receipts !== undefined &&
        typeof resultData.total_receipts !== 'number'
      ) {
        warnings.push(`Result ${index} total_receipts is not a number`);
      }

      if (
        resultData.total_disbursements !== undefined &&
        typeof resultData.total_disbursements !== 'number'
      ) {
        warnings.push(`Result ${index} total_disbursements is not a number`);
      }

      if (resultData.candidate_name && typeof resultData.candidate_name !== 'string') {
        warnings.push(`Result ${index} candidate_name is not a string`);
      }
    });

    if (fecData.results.length > 0) completeness += 20;
  }

  if (fecData.pagination) {
    const paginationData = fecData.pagination as PaginationData;
    if (typeof paginationData.count === 'number') {
      completeness += 20;
    } else {
      warnings.push('Pagination object exists but count is not a number');
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? (fecData as FecApiSchema) : undefined,
    errors,
    warnings,
    completeness: Math.min(completeness, 100),
    lastValidated: new Date().toISOString(),
  };
}

// Data Quality Report
export interface DataQualityReport {
  overall: {
    score: number; // 0-100
    status: 'excellent' | 'good' | 'fair' | 'poor';
    issues: string[];
    sources: number;
  };
  sources: {
    [key: string]: {
      status: 'healthy' | 'degraded' | 'failed';
      completeness: number;
      freshness: string;
      lastValidated: string;
      errors: string[];
      warnings: string[];
    };
  };
  recommendations: string[];
  timestamp: string;
}

export function generateDataQualityReport(
  validationResults: Array<{
    source: string;
    result: ResponseValidationResult<unknown>;
    freshness?: string;
  }>
): DataQualityReport {
  const totalScore = validationResults.reduce((sum, { result }) => sum + result.completeness, 0);
  const averageScore = validationResults.length > 0 ? totalScore / validationResults.length : 0;

  const allErrors = validationResults.flatMap(({ result }) => result.errors);
  const allWarnings = validationResults.flatMap(({ result }) => result.warnings);

  let status: 'excellent' | 'good' | 'fair' | 'poor';
  if (averageScore >= 90) status = 'excellent';
  else if (averageScore >= 75) status = 'good';
  else if (averageScore >= 50) status = 'fair';
  else status = 'poor';

  const sources: DataQualityReport['sources'] = {};
  validationResults.forEach(({ source, result, freshness }) => {
    sources[source] = {
      status: result.isValid ? (result.completeness >= 75 ? 'healthy' : 'degraded') : 'failed',
      completeness: result.completeness,
      freshness: freshness || 'unknown',
      lastValidated: result.lastValidated,
      errors: result.errors,
      warnings: result.warnings,
    };
  });

  // Generate recommendations
  const recommendations: string[] = [];
  if (averageScore < 75) {
    recommendations.push('Consider implementing data validation at the API gateway level');
  }
  if (allErrors.length > 0) {
    recommendations.push('Critical data integrity issues detected - immediate attention required');
  }
  if (allWarnings.length > 5) {
    recommendations.push('Multiple data quality warnings - review API response formats');
  }

  const failedSources = Object.values(sources).filter(s => s.status === 'failed').length;
  if (failedSources > 0) {
    recommendations.push(
      `${failedSources} data source(s) failing validation - implement fallback strategies`
    );
  }

  return {
    overall: {
      score: Math.round(averageScore),
      status,
      issues: [...allErrors, ...allWarnings],
      sources: validationResults.length,
    },
    sources,
    recommendations,
    timestamp: new Date().toISOString(),
  };
}

// Utility function to validate a complete API response
export function validateApiResponse<T>(
  data: unknown,
  validator: (data: unknown) => ResponseValidationResult<T>,
  source: string,
  freshness?: string
): { source: string; result: ResponseValidationResult<T>; freshness?: string } {
  const result = validator(data);

  return {
    source,
    result,
    freshness,
  };
}

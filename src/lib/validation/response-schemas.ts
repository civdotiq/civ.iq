/**
 * CIV.IQ - Civic Information  
 * Copyright (c) 2025 CIV.IQ 
 * Licensed under MIT License
 * Built with public government data
 */

// Response validation schemas for ensuring API data integrity
// This is complementary to the input validation in schemas.ts

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

export function validateDistrictResponse(data: any): ResponseValidationResult<DistrictSchema> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!data?.state || typeof data.state !== 'string') {
    errors.push('Missing or invalid state field');
  }
  
  if (!data?.district || typeof data.district !== 'string') {
    errors.push('Missing or invalid district field');
  }

  // Warnings for unexpected values
  if (data?.state && data.state.length !== 2) {
    warnings.push('State should be 2-letter abbreviation');
  }

  if (data?.district && !/^\d{1,2}$/.test(data.district)) {
    warnings.push('District should be 1-2 digit number');
  }

  const completeness = data?.state && data?.district ? 100 : 50;

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? { state: data.state, district: data.district } : undefined,
    errors,
    warnings,
    completeness,
    lastValidated: new Date().toISOString()
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

export function validateRepresentativeResponse(data: any): ResponseValidationResult<RepresentativeSchema> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let completeness = 0;

  // Required fields (60% of score)
  if (!data?.bioguideId || typeof data.bioguideId !== 'string') {
    errors.push('Missing or invalid bioguideId');
  } else {
    completeness += 15;
    if (!/^[A-Z]\d{6}$/.test(data.bioguideId)) {
      warnings.push('Bioguide ID format may be invalid (should be letter + 6 digits)');
    }
  }

  if (!data?.name || typeof data.name !== 'string') {
    errors.push('Missing or invalid name');
  } else {
    completeness += 15;
  }

  if (!data?.party || typeof data.party !== 'string') {
    errors.push('Missing or invalid party');
  } else {
    completeness += 10;
  }

  if (!data?.state || typeof data.state !== 'string') {
    errors.push('Missing or invalid state');
  } else {
    completeness += 10;
  }

  if (!data?.chamber || !['House', 'Senate'].includes(data.chamber)) {
    errors.push('Missing or invalid chamber (must be House or Senate)');
  } else {
    completeness += 10;
  }

  // Optional but valuable fields (40% of score)
  if (data?.title && typeof data.title === 'string') completeness += 5;
  if (data?.phone && typeof data.phone === 'string') completeness += 10;
  if (data?.website && typeof data.website === 'string') completeness += 10;
  if (data?.email && typeof data.email === 'string') completeness += 5;
  if (data?.currentTerm && typeof data.currentTerm === 'object') completeness += 10;

  // Business logic warnings
  if (data?.chamber === 'House' && !data?.district) {
    warnings.push('House representative missing district number');
  }

  if (data?.chamber === 'Senate' && data?.district) {
    warnings.push('Senate member should not have district number');
  }

  // Validate contact info format
  if (data?.phone && !/\d{3}[.-]?\d{3}[.-]?\d{4}/.test(data.phone)) {
    warnings.push('Phone number format may be inconsistent');
  }

  if (data?.website && !data.website.startsWith('http')) {
    warnings.push('Website URL should start with http/https');
  }

  if (data?.email && !data.email.includes('@')) {
    warnings.push('Email format appears invalid');
  }

  const validatedData: RepresentativeSchema = {
    bioguideId: data?.bioguideId || '',
    name: data?.name || '',
    party: data?.party || '',
    state: data?.state || '',
    chamber: data?.chamber || 'House',
    title: data?.title || '',
    district: data?.district,
    phone: data?.phone,
    website: data?.website,
    email: data?.email,
    socialMedia: data?.socialMedia,
    currentTerm: data?.currentTerm
  };

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? validatedData : undefined,
    errors,
    warnings,
    completeness: Math.min(completeness, 100),
    lastValidated: new Date().toISOString()
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

export function validateCongressApiResponse(data: any, expectedType: 'members' | 'bills'): ResponseValidationResult<CongressApiSchema> {
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
      lastValidated: new Date().toISOString()
    };
  }

  // Validate based on expected type
  if (expectedType === 'members') {
    if (!Array.isArray(data.members)) {
      errors.push('Missing or invalid members array');
    } else {
      completeness += 50;
      
      // Validate each member
      data.members.forEach((member: any, index: number) => {
        if (!member.bioguideId) {
          warnings.push(`Member ${index} missing bioguideId`);
        }
        if (!member.name) {
          warnings.push(`Member ${index} missing name`);
        }
        if (!member.state) {
          warnings.push(`Member ${index} missing state`);
        }
        if (member.bioguideId && !/^[A-Z]\d{6}$/.test(member.bioguideId)) {
          warnings.push(`Member ${index} has invalid bioguide ID format`);
        }
      });
      
      if (data.members.length > 0) completeness += 30;
    }
  } else if (expectedType === 'bills') {
    if (!Array.isArray(data.bills)) {
      errors.push('Missing or invalid bills array');
    } else {
      completeness += 50;
      
      // Validate each bill
      data.bills.forEach((bill: any, index: number) => {
        if (!bill.number) {
          warnings.push(`Bill ${index} missing number`);
        }
        if (!bill.title) {
          warnings.push(`Bill ${index} missing title`);
        }
        if (!bill.congress) {
          warnings.push(`Bill ${index} missing congress number`);
        }
        if (!bill.type) {
          warnings.push(`Bill ${index} missing type`);
        }
      });
      
      if (data.bills.length > 0) completeness += 30;
    }
  }

  // Check pagination
  if (data.pagination) {
    if (typeof data.pagination.count === 'number') {
      completeness += 20;
    } else {
      warnings.push('Pagination count is not a number');
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors,
    warnings,
    completeness: Math.min(completeness, 100),
    lastValidated: new Date().toISOString()
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

export function validateFecApiResponse(data: any): ResponseValidationResult<FecApiSchema> {
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
      lastValidated: new Date().toISOString()
    };
  }

  if (!Array.isArray(data.results)) {
    errors.push('Missing or invalid results array');
  } else {
    completeness += 60;
    
    // Check each result
    data.results.forEach((result: any, index: number) => {
      if (!result.candidate_id && !result.committee_id) {
        warnings.push(`Result ${index} missing both candidate_id and committee_id`);
      }
      
      if (result.total_receipts !== undefined && typeof result.total_receipts !== 'number') {
        warnings.push(`Result ${index} total_receipts is not a number`);
      }
      
      if (result.total_disbursements !== undefined && typeof result.total_disbursements !== 'number') {
        warnings.push(`Result ${index} total_disbursements is not a number`);
      }
      
      if (result.candidate_name && typeof result.candidate_name !== 'string') {
        warnings.push(`Result ${index} candidate_name is not a string`);
      }
    });
    
    if (data.results.length > 0) completeness += 20;
  }

  if (data.pagination && typeof data.pagination.count === 'number') {
    completeness += 20;
  } else if (data.pagination) {
    warnings.push('Pagination object exists but count is not a number');
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors,
    warnings,
    completeness: Math.min(completeness, 100),
    lastValidated: new Date().toISOString()
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

export function generateDataQualityReport(validationResults: Array<{ 
  source: string; 
  result: ResponseValidationResult<any>;
  freshness?: string; 
}>): DataQualityReport {
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
      warnings: result.warnings
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
    recommendations.push(`${failedSources} data source(s) failing validation - implement fallback strategies`);
  }

  return {
    overall: {
      score: Math.round(averageScore),
      status,
      issues: [...allErrors, ...allWarnings],
      sources: validationResults.length
    },
    sources,
    recommendations,
    timestamp: new Date().toISOString()
  };
}

// Utility function to validate a complete API response
export function validateApiResponse<T>(
  data: any, 
  validator: (data: any) => ResponseValidationResult<T>,
  source: string,
  freshness?: string
): { source: string; result: ResponseValidationResult<T>; freshness?: string } {
  const result = validator(data);
  
  return {
    source,
    result,
    freshness
  };
}
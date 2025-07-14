/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

// Data validation and sanitization utilities

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export class ValidationResult {
  public errors: ValidationError[] = [];
  public warnings: string[] = [];

  constructor(public data: any) {}

  addError(field: string, message: string, value?: any) {
    this.errors.push({ field, message, value });
  }

  addWarning(message: string) {
    this.warnings.push(message);
  }

  get isValid(): boolean {
    return this.errors.length === 0;
  }

  get hasWarnings(): boolean {
    return this.warnings.length > 0;
  }
}

// ZIP code validation
export function validateZipCode(zipCode: string): ValidationResult {
  const result = new ValidationResult(zipCode);
  
  if (!zipCode) {
    result.addError('zipCode', 'ZIP code is required');
    return result;
  }

  const sanitizedZip = zipCode.trim().replace(/\s+/g, '');
  
  // US ZIP code formats: 12345 or 12345-6789
  const zipRegex = /^(\d{5})(-\d{4})?$/;
  
  if (!zipRegex.test(sanitizedZip)) {
    result.addError('zipCode', 'Invalid ZIP code format. Use 12345 or 12345-6789');
    return result;
  }

  // Extract 5-digit ZIP for basic validation
  const basicZip = sanitizedZip.split('-')[0];
  const zipNum = parseInt(basicZip);

  // Basic range check (US ZIP codes range from 00501 to 99950)
  if (zipNum < 501 || zipNum > 99950) {
    result.addError('zipCode', 'ZIP code is outside valid US range');
    return result;
  }

  // Known invalid ZIP codes
  const invalidZips = ['00000', '11111', '22222', '33333', '44444', '55555', '66666', '77777', '88888', '99999'];
  if (invalidZips.includes(basicZip)) {
    result.addError('zipCode', 'Invalid ZIP code');
    return result;
  }

  result.data = sanitizedZip;
  return result;
}

// Bioguide ID validation
export function validateBioguideId(bioguideId: string): ValidationResult {
  const result = new ValidationResult(bioguideId);
  
  if (!bioguideId) {
    result.addError('bioguideId', 'Bioguide ID is required');
    return result;
  }

  const sanitized = bioguideId.trim().toUpperCase();
  
  // Bioguide ID format: 1 letter + 6 digits + optional 2 digits
  const bioguideRegex = /^[A-Z]\d{6}(\d{2})?$/;
  
  if (!bioguideRegex.test(sanitized)) {
    result.addError('bioguideId', 'Invalid Bioguide ID format');
    return result;
  }

  result.data = sanitized;
  return result;
}

// Representative data validation
export function validateRepresentativeData(data: any): ValidationResult {
  const result = new ValidationResult(data);
  
  if (!data || typeof data !== 'object') {
    result.addError('data', 'Representative data must be an object');
    return result;
  }

  // Required fields
  const requiredFields = ['bioguideId', 'name', 'party', 'state'];
  
  for (const field of requiredFields) {
    if (!data[field] || typeof data[field] !== 'string' || data[field].trim() === '') {
      result.addError(field, `${field} is required and must be a non-empty string`);
    }
  }

  // Validate bioguideId format
  if (data.bioguideId) {
    const bioguideValidation = validateBioguideId(data.bioguideId);
    if (!bioguideValidation.isValid) {
      result.errors.push(...bioguideValidation.errors);
    } else {
      data.bioguideId = bioguideValidation.data;
    }
  }

  // Validate party
  const validParties = ['Democratic', 'Republican', 'Independent', 'Libertarian', 'Green'];
  if (data.party && !validParties.includes(data.party)) {
    result.addWarning(`Unusual party affiliation: ${data.party}`);
  }

  // Validate state (should be full name or abbreviation)
  const stateAbbreviations = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ];
  
  const stateNames = [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
    'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
    'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
    'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
    'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
    'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming', 'District of Columbia'
  ];

  if (data.state && !stateAbbreviations.includes(data.state) && !stateNames.includes(data.state)) {
    result.addError('state', 'Invalid state name or abbreviation');
  }

  // Validate district (if present)
  if (data.district !== undefined && data.district !== null) {
    const district = parseInt(data.district);
    if (isNaN(district) || district < 0 || district > 53) {
      result.addError('district', 'District must be a number between 0 and 53');
    }
  }

  // Validate chamber
  if (data.chamber && !['House', 'Senate'].includes(data.chamber)) {
    result.addError('chamber', 'Chamber must be either "House" or "Senate"');
  }

  // Sanitize strings
  if (data.name) data.name = sanitizeString(data.name);
  if (data.party) data.party = sanitizeString(data.party);
  if (data.state) data.state = sanitizeString(data.state);

  result.data = data;
  return result;
}

// Financial data validation
export function validateFinancialData(data: any): ValidationResult {
  const result = new ValidationResult(data);
  
  if (!data || typeof data !== 'object') {
    result.addError('data', 'Financial data must be an object');
    return result;
  }

  // Validate contribution amounts
  if (data.contribution_receipt_amount !== undefined) {
    const amount = parseFloat(data.contribution_receipt_amount);
    if (isNaN(amount) || amount < 0) {
      result.addError('contribution_receipt_amount', 'Contribution amount must be a positive number');
    } else if (amount > 1000000) {
      result.addWarning(`Unusually large contribution amount: $${amount.toLocaleString()}`);
    }
  }

  // Validate dates
  if (data.contribution_receipt_date) {
    const date = new Date(data.contribution_receipt_date);
    if (isNaN(date.getTime())) {
      result.addError('contribution_receipt_date', 'Invalid date format');
    } else {
      const currentYear = new Date().getFullYear();
      const contributionYear = date.getFullYear();
      if (contributionYear < 1990 || contributionYear > currentYear + 1) {
        result.addError('contribution_receipt_date', 'Contribution date is outside reasonable range');
      }
    }
  }

  return result;
}

// Vote data validation
export function validateVoteData(data: any): ValidationResult {
  const result = new ValidationResult(data);
  
  if (!data || typeof data !== 'object') {
    result.addError('data', 'Vote data must be an object');
    return result;
  }

  // Validate vote position
  const validPositions = ['Yea', 'Nay', 'Present', 'Not Voting'];
  if (data.position && !validPositions.includes(data.position)) {
    result.addError('position', `Invalid vote position. Must be one of: ${validPositions.join(', ')}`);
  }

  // Validate date
  if (data.date) {
    const date = new Date(data.date);
    if (isNaN(date.getTime())) {
      result.addError('date', 'Invalid date format');
    }
  }

  // Validate bill number format
  if (data.bill?.number) {
    const billRegex = /^(H\.R\.|S\.|H\.RES\.|S\.RES\.|H\.CON\.RES\.|S\.CON\.RES\.)\s*\d+$/i;
    if (!billRegex.test(data.bill.number)) {
      result.addWarning(`Unusual bill number format: ${data.bill.number}`);
    }
  }

  return result;
}

// String sanitization
export function sanitizeString(str: string): string {
  if (typeof str !== 'string') return '';
  
  return str
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/[<>\"'&]/g, '') // Remove potentially harmful characters
    .substring(0, 500); // Limit length
}

// Number sanitization
export function sanitizeNumber(value: any, min?: number, max?: number): number | null {
  const num = parseFloat(value);
  
  if (isNaN(num)) return null;
  
  if (min !== undefined && num < min) return min;
  if (max !== undefined && num > max) return max;
  
  return num;
}

// URL validation and sanitization
export function validateAndSanitizeUrl(url: string): string | null {
  try {
    const sanitized = url.trim();
    const urlObj = new URL(sanitized);
    
    // Only allow HTTP and HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return null;
    }
    
    return urlObj.toString();
  } catch {
    return null;
  }
}

// Rate limiting helper
export function createRateLimitValidator(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();
  
  return function validateRateLimit(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!requests.has(identifier)) {
      requests.set(identifier, []);
    }
    
    const userRequests = requests.get(identifier)!;
    
    // Remove old requests
    const validRequests = userRequests.filter(time => time > windowStart);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limited
    }
    
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return true; // Allow request
  };
}
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Validation schemas and sanitization functions for API inputs
 * Provides comprehensive input validation, XSS protection, and data consistency checks
 */

import DOMPurify from 'isomorphic-dompurify';

// State abbreviation validation
export const STATE_ABBREVIATIONS = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC'
] as const;

export type StateAbbreviation = typeof STATE_ABBREVIATIONS[number];

// Validation result type
export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors: string[];
  sanitized?: T;
}

// Base validation class
export class BaseValidator {
  static sanitizeString(input: string, options: {
    maxLength?: number;
    allowHtml?: boolean;
    trimWhitespace?: boolean;
  } = {}): string {
    const {
      maxLength = 1000,
      allowHtml = false,
      trimWhitespace = true
    } = options;

    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }

    let sanitized = input;

    // Trim whitespace if requested
    if (trimWhitespace) {
      sanitized = sanitized.trim();
    }

    // Remove or sanitize HTML
    if (!allowHtml) {
      // Remove all HTML tags and decode entities
      sanitized = DOMPurify.sanitize(sanitized, { ALLOWED_TAGS: [] });
    } else {
      // Sanitize but allow safe HTML
      sanitized = DOMPurify.sanitize(sanitized, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: []
      });
    }

    // Enforce maximum length
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  static validateRequired(value: any, fieldName: string): string[] {
    const errors: string[] = [];
    
    if (value === undefined || value === null || value === '') {
      errors.push(`${fieldName} is required`);
    }
    
    return errors;
  }

  static validateString(value: any, fieldName: string, options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    allowedValues?: string[];
  } = {}): ValidationResult<string> {
    const errors: string[] = [];
    const {
      required = false,
      minLength = 0,
      maxLength = 1000,
      pattern,
      allowedValues
    } = options;

    // Check if required
    if (required) {
      errors.push(...this.validateRequired(value, fieldName));
      if (errors.length > 0) {
        return { isValid: false, errors };
      }
    }

    // If not required and empty, return valid
    if (!required && (value === undefined || value === null || value === '')) {
      return { isValid: true, data: '', errors: [], sanitized: '' };
    }

    // Type check
    if (typeof value !== 'string') {
      errors.push(`${fieldName} must be a string`);
      return { isValid: false, errors };
    }

    // Sanitize the string
    const sanitized = this.sanitizeString(value, { maxLength, trimWhitespace: true });

    // Length validation
    if (sanitized.length < minLength) {
      errors.push(`${fieldName} must be at least ${minLength} characters long`);
    }

    if (sanitized.length > maxLength) {
      errors.push(`${fieldName} must not exceed ${maxLength} characters`);
    }

    // Pattern validation
    if (pattern && !pattern.test(sanitized)) {
      errors.push(`${fieldName} format is invalid`);
    }

    // Allowed values validation
    if (allowedValues && !allowedValues.includes(sanitized)) {
      errors.push(`${fieldName} must be one of: ${allowedValues.join(', ')}`);
    }

    return {
      isValid: errors.length === 0,
      data: sanitized,
      errors,
      sanitized
    };
  }

  static validateNumber(value: any, fieldName: string, options: {
    required?: boolean;
    min?: number;
    max?: number;
    integer?: boolean;
  } = {}): ValidationResult<number> {
    const errors: string[] = [];
    const {
      required = false,
      min = Number.MIN_SAFE_INTEGER,
      max = Number.MAX_SAFE_INTEGER,
      integer = false
    } = options;

    // Check if required
    if (required) {
      errors.push(...this.validateRequired(value, fieldName));
      if (errors.length > 0) {
        return { isValid: false, errors };
      }
    }

    // If not required and empty, return valid
    if (!required && (value === undefined || value === null || value === '')) {
      return { isValid: true, data: 0, errors: [], sanitized: 0 };
    }

    // Convert and validate number
    const numValue = Number(value);

    if (isNaN(numValue)) {
      errors.push(`${fieldName} must be a valid number`);
      return { isValid: false, errors };
    }

    // Integer validation
    if (integer && !Number.isInteger(numValue)) {
      errors.push(`${fieldName} must be an integer`);
    }

    // Range validation
    if (numValue < min) {
      errors.push(`${fieldName} must be at least ${min}`);
    }

    if (numValue > max) {
      errors.push(`${fieldName} must not exceed ${max}`);
    }

    return {
      isValid: errors.length === 0,
      data: numValue,
      errors,
      sanitized: numValue
    };
  }

  static validateBoolean(value: any, fieldName: string, required = false): ValidationResult<boolean> {
    const errors: string[] = [];

    // Check if required
    if (required) {
      errors.push(...this.validateRequired(value, fieldName));
      if (errors.length > 0) {
        return { isValid: false, errors };
      }
    }

    // If not required and empty, return valid
    if (!required && (value === undefined || value === null || value === '')) {
      return { isValid: true, data: false, errors: [], sanitized: false };
    }

    // Convert to boolean
    let boolValue: boolean;
    
    if (typeof value === 'boolean') {
      boolValue = value;
    } else if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1' || lower === 'yes') {
        boolValue = true;
      } else if (lower === 'false' || lower === '0' || lower === 'no') {
        boolValue = false;
      } else {
        errors.push(`${fieldName} must be a valid boolean value`);
        return { isValid: false, errors };
      }
    } else if (typeof value === 'number') {
      boolValue = value !== 0;
    } else {
      errors.push(`${fieldName} must be a valid boolean value`);
      return { isValid: false, errors };
    }

    return {
      isValid: true,
      data: boolValue,
      errors: [],
      sanitized: boolValue
    };
  }
}

// Specific validators for common use cases
export class StateValidator extends BaseValidator {
  static validateStateAbbreviation(state: any): ValidationResult<StateAbbreviation> {
    const stringResult = this.validateString(state, 'state', {
      required: true,
      minLength: 2,
      maxLength: 2,
      pattern: /^[A-Z]{2}$/,
      allowedValues: [...STATE_ABBREVIATIONS]
    });

    if (!stringResult.isValid) {
      return { isValid: false, errors: stringResult.errors };
    }

    return {
      isValid: true,
      data: stringResult.data?.toUpperCase() as StateAbbreviation,
      errors: [],
      sanitized: stringResult.data?.toUpperCase() as StateAbbreviation
    };
  }
}

export class ZipCodeValidator extends BaseValidator {
  static validateZipCode(zip: any): ValidationResult<string> {
    const stringResult = this.validateString(zip, 'zip code', {
      required: true,
      minLength: 5,
      maxLength: 10,
      pattern: /^\d{5}(-\d{4})?$/
    });

    if (!stringResult.isValid) {
      return { isValid: false, errors: stringResult.errors };
    }

    // Normalize ZIP code (remove extra formatting)
    const sanitized = stringResult.data!.replace(/[^\d-]/g, '');

    return {
      isValid: true,
      data: sanitized,
      errors: [],
      sanitized
    };
  }
}

export class BioguideIdValidator extends BaseValidator {
  static validateBioguideId(bioguideId: any): ValidationResult<string> {
    return this.validateString(bioguideId, 'bioguide ID', {
      required: true,
      minLength: 7,
      maxLength: 7,
      pattern: /^[A-Z]\d{6}$/
    });
  }
}

export class PaginationValidator extends BaseValidator {
  static validatePage(page: any): ValidationResult<number> {
    return this.validateNumber(page, 'page', {
      required: false,
      min: 1,
      max: 1000,
      integer: true
    });
  }

  static validateLimit(limit: any): ValidationResult<number> {
    return this.validateNumber(limit, 'limit', {
      required: false,
      min: 1,
      max: 100,
      integer: true
    });
  }
}

export class SearchValidator extends BaseValidator {
  static validateSearchQuery(query: any): ValidationResult<string> {
    return this.validateString(query, 'search query', {
      required: false,
      minLength: 1,
      maxLength: 200,
      pattern: /^[a-zA-Z0-9\s\-_.,!?'"()]+$/
    });
  }
}

// XSS Protection utilities
export class XSSProtection {
  static sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  static sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
      
      return parsed.toString();
    } catch {
      return '';
    }
  }

  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    // Handle arrays separately to preserve their structure
    if (Array.isArray(obj)) {
      return (obj as any[]).map(item => {
        if (typeof item === 'string') {
          return this.sanitizeHtml(item);
        } else if (typeof item === 'object' && item !== null) {
          return this.sanitizeObject(item);
        }
        return item;
      }) as unknown as T;
    }
    
    const sanitized = {} as T;
    
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key as keyof T] = this.sanitizeHtml(value) as T[keyof T];
      } else if (Array.isArray(value)) {
        sanitized[key as keyof T] = this.sanitizeObject(value) as T[keyof T];
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key as keyof T] = this.sanitizeObject(value) as T[keyof T];
      } else {
        sanitized[key as keyof T] = value;
      }
    }
    
    return sanitized;
  }
}

// API input validation wrapper
export function validateApiInput<T>(
  input: Record<string, any>,
  validators: Record<keyof T, (value: any) => ValidationResult>
): ValidationResult<T> {
  const errors: string[] = [];
  const sanitized = {} as T;
  const data = {} as T;

  for (const [field, validator] of Object.entries(validators)) {
    const result = (validator as any)(input[field]);
    
    if (!result.isValid) {
      errors.push(...result.errors);
    } else if (result.data !== undefined) {
      data[field as keyof T] = result.data;
      sanitized[field as keyof T] = result.sanitized ?? result.data;
    }
  }

  return {
    isValid: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  };
}
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * API v2 Validation Schemas
 * Provides comprehensive validation for v2 API endpoints
 * Using custom validation since Zod couldn't be installed due to Node version constraints
 */

// Base validation result interface
export interface ValidationResult<T = unknown> {
  isValid: boolean;
  data?: T;
  errors: string[];
  warnings?: string[];
}

// Common field validators
export const FieldValidators = {
  bioguideId(value: unknown): ValidationResult<string> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['Bioguide ID must be a string'] };
    }
    if (!/^[A-Z]\d{6}$/.test(value)) {
      return { isValid: false, errors: ['Bioguide ID must follow format: A123456'] };
    }
    return { isValid: true, data: value, errors: [] };
  },

  zipCode(value: unknown): ValidationResult<string> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['ZIP code must be a string'] };
    }
    if (!/^\d{5}(-\d{4})?$/.test(value)) {
      return { isValid: false, errors: ['ZIP code must be 5 digits or 9 digits (12345-6789)'] };
    }
    return { isValid: true, data: value, errors: [] };
  },

  stateCode(value: unknown): ValidationResult<string> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['State code must be a string'] };
    }
    const normalized = value.toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) {
      return { isValid: false, errors: ['State code must be 2 letters (e.g., CA)'] };
    }
    return { isValid: true, data: normalized, errors: [] };
  },

  district(value: unknown): ValidationResult<string> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['District must be a string'] };
    }
    if (!/^\d{1,2}$/.test(value)) {
      return { isValid: false, errors: ['District must be 1-2 digits'] };
    }
    return { isValid: true, data: value, errors: [] };
  },

  party(value: unknown): ValidationResult<string> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['Party must be a string'] };
    }
    const validParties = ['Democratic', 'Republican', 'Independent'];
    if (!validParties.includes(value)) {
      return {
        isValid: false,
        errors: [`Party must be one of: ${validParties.join(', ')}`],
      };
    }
    return { isValid: true, data: value, errors: [] };
  },

  chamber(value: unknown): ValidationResult<'House' | 'Senate'> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['Chamber must be a string'] };
    }
    if (!['House', 'Senate'].includes(value)) {
      return { isValid: false, errors: ['Chamber must be "House" or "Senate"'] };
    }
    return { isValid: true, data: value as 'House' | 'Senate', errors: [] };
  },

  format(value: unknown): ValidationResult<'simple' | 'detailed' | 'full'> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['Format must be a string'] };
    }
    if (!['simple', 'detailed', 'full'].includes(value)) {
      return { isValid: false, errors: ['Format must be "simple", "detailed", or "full"'] };
    }
    return { isValid: true, data: value as 'simple' | 'detailed' | 'full', errors: [] };
  },

  positiveInteger(value: unknown, min = 1, max = 1000): ValidationResult<number> {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max || num !== Math.floor(num)) {
      return {
        isValid: false,
        errors: [`Value must be an integer between ${min} and ${max}`],
      };
    }
    return { isValid: true, data: num, errors: [] };
  },

  nonNegativeInteger(value: unknown, max = 10000): ValidationResult<number> {
    const num = Number(value);
    if (isNaN(num) || num < 0 || num > max || num !== Math.floor(num)) {
      return {
        isValid: false,
        errors: [`Value must be a non-negative integer up to ${max}`],
      };
    }
    return { isValid: true, data: num, errors: [] };
  },

  commaSeparatedList(value: unknown, validItems?: string[]): ValidationResult<string[]> {
    if (typeof value !== 'string') {
      return { isValid: false, errors: ['Value must be a comma-separated string'] };
    }

    const items = value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);

    if (validItems) {
      const invalidItems = items.filter(item => !validItems.includes(item));
      if (invalidItems.length > 0) {
        return {
          isValid: false,
          errors: [
            `Invalid items: ${invalidItems.join(', ')}. Valid options: ${validItems.join(', ')}`,
          ],
        };
      }
    }

    return { isValid: true, data: items, errors: [] };
  },

  boolean(value: unknown): ValidationResult<boolean> {
    if (value === 'true' || value === '1' || value === 1 || value === true) {
      return { isValid: true, data: true, errors: [] };
    }
    if (
      value === 'false' ||
      value === '0' ||
      value === 0 ||
      value === false ||
      value === null ||
      value === undefined
    ) {
      return { isValid: true, data: false, errors: [] };
    }
    return { isValid: false, errors: ['Value must be a boolean (true/false)'] };
  },
};

// V2 Representatives List Query Schema
export interface V2RepresentativesQuery {
  zip?: string;
  state?: string;
  district?: string;
  party?: string;
  chamber?: 'House' | 'Senate';
  format: 'simple' | 'detailed' | 'full';
  includeMultiDistrict: boolean;
  fields?: string[];
  limit: number;
  offset: number;
}

export function validateV2RepresentativesQuery(
  query: Record<string, unknown>
): ValidationResult<V2RepresentativesQuery> {
  const errors: string[] = [];
  const result: Partial<V2RepresentativesQuery> = {};

  // Validate ZIP code (optional)
  if (query.zip !== undefined) {
    const zipValidation = FieldValidators.zipCode(query.zip);
    if (!zipValidation.isValid) {
      errors.push(...zipValidation.errors);
    } else {
      result.zip = zipValidation.data;
    }
  }

  // Validate state (optional)
  if (query.state !== undefined) {
    const stateValidation = FieldValidators.stateCode(query.state);
    if (!stateValidation.isValid) {
      errors.push(...stateValidation.errors);
    } else {
      result.state = stateValidation.data;
    }
  }

  // Validate district (optional)
  if (query.district !== undefined) {
    const districtValidation = FieldValidators.district(query.district);
    if (!districtValidation.isValid) {
      errors.push(...districtValidation.errors);
    } else {
      result.district = districtValidation.data;
    }
  }

  // Validate party (optional)
  if (query.party !== undefined) {
    const partyValidation = FieldValidators.party(query.party);
    if (!partyValidation.isValid) {
      errors.push(...partyValidation.errors);
    } else {
      result.party = partyValidation.data;
    }
  }

  // Validate chamber (optional)
  if (query.chamber !== undefined) {
    const chamberValidation = FieldValidators.chamber(query.chamber);
    if (!chamberValidation.isValid) {
      errors.push(...chamberValidation.errors);
    } else {
      result.chamber = chamberValidation.data;
    }
  }

  // Validate format (optional, defaults to 'simple')
  const formatValidation = FieldValidators.format(query.format || 'simple');
  if (!formatValidation.isValid) {
    errors.push(...formatValidation.errors);
  } else {
    result.format = formatValidation.data;
  }

  // Validate includeMultiDistrict (optional, defaults to false)
  const includeMultiDistrictValidation = FieldValidators.boolean(
    query.includeMultiDistrict || false
  );
  if (!includeMultiDistrictValidation.isValid) {
    errors.push(...includeMultiDistrictValidation.errors);
  } else {
    result.includeMultiDistrict = includeMultiDistrictValidation.data;
  }

  // Validate fields (optional)
  if (query.fields !== undefined) {
    const fieldsValidation = FieldValidators.commaSeparatedList(query.fields);
    if (!fieldsValidation.isValid) {
      errors.push(...fieldsValidation.errors);
    } else {
      result.fields = fieldsValidation.data;
    }
  }

  // Validate limit (optional, defaults to 100)
  const limitValidation = FieldValidators.positiveInteger(query.limit || 100, 1, 1000);
  if (!limitValidation.isValid) {
    errors.push(...limitValidation.errors);
  } else {
    result.limit = limitValidation.data;
  }

  // Validate offset (optional, defaults to 0)
  const offsetValidation = FieldValidators.nonNegativeInteger(query.offset || 0, 100000);
  if (!offsetValidation.isValid) {
    errors.push(...offsetValidation.errors);
  } else {
    result.offset = offsetValidation.data;
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, data: result as V2RepresentativesQuery, errors: [] };
}

// V2 Representative Detail Query Schema
export interface V2RepresentativeDetailQuery {
  include?: string[];
  fields?: string[];
  format: 'simple' | 'detailed' | 'full';
}

export function validateV2RepresentativeDetailQuery(
  query: Record<string, unknown>
): ValidationResult<V2RepresentativeDetailQuery> {
  const errors: string[] = [];
  const result: Partial<V2RepresentativeDetailQuery> = {};

  // Validate include (optional)
  if (query.include !== undefined) {
    const validIncludes = [
      'votes',
      'bills',
      'committees',
      'finance',
      'news',
      'partyAlignment',
      'leadership',
      'district',
      'lobbying',
    ];
    const includeValidation = FieldValidators.commaSeparatedList(query.include, validIncludes);
    if (!includeValidation.isValid) {
      errors.push(...includeValidation.errors);
    } else {
      result.include = includeValidation.data;
    }
  }

  // Validate fields (optional)
  if (query.fields !== undefined) {
    const fieldsValidation = FieldValidators.commaSeparatedList(query.fields);
    if (!fieldsValidation.isValid) {
      errors.push(...fieldsValidation.errors);
    } else {
      result.fields = fieldsValidation.data;
    }
  }

  // Validate format (optional, defaults to 'full')
  const formatValidation = FieldValidators.format(query.format || 'full');
  if (!formatValidation.isValid) {
    errors.push(...formatValidation.errors);
  } else {
    result.format = formatValidation.data;
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return { isValid: true, data: result as V2RepresentativeDetailQuery, errors: [] };
}

// Bioguide ID parameter validation
export function validateBioguideId(id: unknown): ValidationResult<string> {
  return FieldValidators.bioguideId(id);
}

// Generic query object validator
export function validateQueryObject<T>(
  query: Record<string, unknown>,
  validator: (q: Record<string, unknown>) => ValidationResult<T>
): ValidationResult<T> {
  return validator(query);
}

// Input sanitization helpers
export const InputSanitizers = {
  /**
   * Remove potentially dangerous characters from input
   */
  sanitizeString(input: string): string {
    return input
      .replace(/[<>'"&]/g, '') // Remove HTML/XML chars
      .replace(/[;{}]/g, '') // Remove potential injection chars
      .trim();
  },

  /**
   * Normalize state codes to uppercase
   */
  normalizeStateCode(input: string): string {
    return input.toUpperCase().trim();
  },

  /**
   * Normalize bioguide IDs to uppercase
   */
  normalizeBioguideId(input: string): string {
    return input.toUpperCase().trim();
  },

  /**
   * Sanitize array of field names
   */
  sanitizeFieldNames(fields: string[]): string[] {
    return fields
      .map(field => field.trim())
      .filter(field => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) // Only valid identifiers
      .slice(0, 50); // Limit to 50 fields max
  },
};

// Error response formatter
export function formatValidationError(validation: ValidationResult): {
  success: false;
  error: {
    code: string;
    message: string;
    details: string[];
  };
} {
  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Invalid query parameters',
      details: validation.errors,
    },
  };
}

// Validation middleware helper
export function withValidation<T>(
  validator: (query: Record<string, unknown>) => ValidationResult<T>
) {
  return (query: Record<string, unknown>): ValidationResult<T> => {
    return validator(query);
  };
}

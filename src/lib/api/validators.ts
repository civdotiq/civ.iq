/**
 * API Parameter Validation Utilities
 *
 * Provides reusable validation functions for common API parameters.
 * Reduces code duplication across 90+ API routes.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';

/**
 * Result of parameter validation.
 */
export interface ValidationResult<T> {
  valid: boolean;
  value?: T;
  error?: NextResponse;
}

/**
 * Validate a ZIP code parameter.
 *
 * @param zip - ZIP code string to validate
 * @returns Validation result with normalized ZIP or error
 *
 * @example
 * ```typescript
 * const zipResult = validateZipCode(searchParams.get('zip'));
 * if (!zipResult.valid) {
 *   return zipResult.error;
 * }
 * const zip = zipResult.value; // Normalized 5-digit ZIP
 * ```
 */
export function validateZipCode(zip: string | null | undefined): ValidationResult<string> {
  if (!zip) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ZIP_CODE',
            message: 'ZIP code is required',
          },
        },
        { status: 400 }
      ),
    };
  }

  // Support 5-digit or 9-digit ZIP codes
  const zipPattern = /^\d{5}(-\d{4})?$/;
  const trimmedZip = zip.trim();

  if (!zipPattern.test(trimmedZip)) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_ZIP_CODE',
            message: 'ZIP code must be 5 digits (e.g., 48221) or 9 digits (e.g., 48221-1234)',
            provided: zip,
          },
        },
        { status: 400 }
      ),
    };
  }

  // Return just the 5-digit portion for consistency
  return {
    valid: true,
    value: trimmedZip.substring(0, 5),
  };
}

/**
 * Validate a state code parameter.
 *
 * @param state - State code to validate (e.g., 'MI', 'CA')
 * @returns Validation result with uppercase state code or error
 */
export function validateStateCode(state: string | null | undefined): ValidationResult<string> {
  if (!state) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_STATE_CODE',
            message: 'State code is required',
          },
        },
        { status: 400 }
      ),
    };
  }

  const trimmed = state.trim().toUpperCase();

  if (trimmed.length !== 2) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATE_CODE',
            message: 'State code must be 2 letters (e.g., MI, CA)',
            provided: state,
          },
        },
        { status: 400 }
      ),
    };
  }

  // Valid US state/territory codes
  const validStateCodes = [
    'AL',
    'AK',
    'AZ',
    'AR',
    'CA',
    'CO',
    'CT',
    'DE',
    'FL',
    'GA',
    'HI',
    'ID',
    'IL',
    'IN',
    'IA',
    'KS',
    'KY',
    'LA',
    'ME',
    'MD',
    'MA',
    'MI',
    'MN',
    'MS',
    'MO',
    'MT',
    'NE',
    'NV',
    'NH',
    'NJ',
    'NM',
    'NY',
    'NC',
    'ND',
    'OH',
    'OK',
    'OR',
    'PA',
    'RI',
    'SC',
    'SD',
    'TN',
    'TX',
    'UT',
    'VT',
    'VA',
    'WA',
    'WV',
    'WI',
    'WY',
    'DC',
    'PR',
    'VI',
    'GU',
    'AS',
    'MP',
  ];

  if (!validStateCodes.includes(trimmed)) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_STATE_CODE',
            message: 'Invalid US state or territory code',
            provided: state,
          },
        },
        { status: 400 }
      ),
    };
  }

  return {
    valid: true,
    value: trimmed,
  };
}

/**
 * Validate a bioguide ID parameter.
 *
 * @param bioguideId - Bioguide ID to validate (e.g., 'K000367')
 * @returns Validation result with uppercase bioguide ID or error
 */
export function validateBioguideId(
  bioguideId: string | null | undefined
): ValidationResult<string> {
  if (!bioguideId) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_BIOGUIDE_ID',
            message: 'Bioguide ID is required',
          },
        },
        { status: 400 }
      ),
    };
  }

  const trimmed = bioguideId.trim().toUpperCase();

  // Bioguide IDs are 7 characters: 1 letter + 6 digits
  const bioguidePattern = /^[A-Z]\d{6}$/;

  if (!bioguidePattern.test(trimmed)) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_BIOGUIDE_ID',
            message: 'Bioguide ID must be 1 letter followed by 6 digits (e.g., K000367)',
            provided: bioguideId,
          },
        },
        { status: 400 }
      ),
    };
  }

  return {
    valid: true,
    value: trimmed,
  };
}

/**
 * Validate a district number parameter.
 *
 * @param district - District number to validate
 * @returns Validation result with normalized district number or error
 */
export function validateDistrictNumber(
  district: string | null | undefined
): ValidationResult<string> {
  if (!district) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_DISTRICT',
            message: 'District number is required',
          },
        },
        { status: 400 }
      ),
    };
  }

  const trimmed = district.trim();

  // At-large districts
  if (trimmed.toUpperCase() === 'AL' || trimmed === '0' || trimmed === '00') {
    return {
      valid: true,
      value: '00',
    };
  }

  // Numeric districts (1-53)
  const num = parseInt(trimmed, 10);
  if (isNaN(num) || num < 0 || num > 53) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DISTRICT',
            message: 'District must be a number between 0-53 or "AL" for at-large',
            provided: district,
          },
        },
        { status: 400 }
      ),
    };
  }

  // Return zero-padded district number
  return {
    valid: true,
    value: num.toString().padStart(2, '0'),
  };
}

/**
 * Validate required string parameter.
 *
 * @param value - Parameter value
 * @param paramName - Name of the parameter for error messages
 * @returns Validation result with trimmed value or error
 */
export function validateRequiredString(
  value: string | null | undefined,
  paramName: string
): ValidationResult<string> {
  if (!value || value.trim() === '') {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: `${paramName} is required`,
          },
        },
        { status: 400 }
      ),
    };
  }

  return {
    valid: true,
    value: value.trim(),
  };
}

/**
 * Validate optional numeric parameter with min/max bounds.
 *
 * @param value - Parameter value
 * @param options - Validation options
 * @returns Validation result with parsed number or error
 */
export function validateNumericParam(
  value: string | null | undefined,
  options: {
    paramName: string;
    min?: number;
    max?: number;
    defaultValue?: number;
    required?: boolean;
  }
): ValidationResult<number> {
  const { paramName, min, max, defaultValue, required = false } = options;

  if (!value || value.trim() === '') {
    if (required) {
      return {
        valid: false,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'MISSING_PARAMETER',
              message: `${paramName} is required`,
            },
          },
          { status: 400 }
        ),
      };
    }

    if (defaultValue !== undefined) {
      return { valid: true, value: defaultValue };
    }

    return { valid: true, value: undefined };
  }

  const num = parseInt(value.trim(), 10);

  if (isNaN(num)) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_PARAMETER',
            message: `${paramName} must be a number`,
            provided: value,
          },
        },
        { status: 400 }
      ),
    };
  }

  if (min !== undefined && num < min) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARAMETER_OUT_OF_RANGE',
            message: `${paramName} must be at least ${min}`,
            provided: value,
          },
        },
        { status: 400 }
      ),
    };
  }

  if (max !== undefined && num > max) {
    return {
      valid: false,
      error: NextResponse.json(
        {
          success: false,
          error: {
            code: 'PARAMETER_OUT_OF_RANGE',
            message: `${paramName} must be at most ${max}`,
            provided: value,
          },
        },
        { status: 400 }
      ),
    };
  }

  return { valid: true, value: num };
}

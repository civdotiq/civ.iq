/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server'

export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'email' | 'zipcode' | 'bioguide' | 'state'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  allowedValues?: string[]
  transform?: (value: string) => string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string[]>
  sanitizedData: Record<string, any>
}

export class InputValidator {
  private static readonly patterns = {
    zipcode: /^\d{5}(-\d{4})?$/,
    bioguide: /^[A-Z]\d{6}$/,
    state: /^[A-Z]{2}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    alphanumeric: /^[a-zA-Z0-9\s]*$/,
    safeString: /^[a-zA-Z0-9\s\-_.,!?()]*$/
  }

  private static readonly stateCodes = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
  ])

  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/['"]/g, '') // Remove quotes
      .replace(/[&]/g, '&amp;') // Escape ampersands
      .substring(0, 1000) // Limit length
  }

  static validateValue(value: string, rule: ValidationRule): string[] {
    const errors: string[] = []

    // Required check
    if (rule.required && (!value || value.trim() === '')) {
      errors.push('This field is required')
      return errors
    }

    // Skip other validations if value is empty and not required
    if (!value || value.trim() === '') {
      return errors
    }

    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case 'number':
          if (isNaN(Number(value))) {
            errors.push('Must be a valid number')
          } else {
            const num = Number(value)
            if (rule.min !== undefined && num < rule.min) {
              errors.push(`Must be at least ${rule.min}`)
            }
            if (rule.max !== undefined && num > rule.max) {
              errors.push(`Must be at most ${rule.max}`)
            }
          }
          break

        case 'email':
          if (!this.patterns.email.test(value)) {
            errors.push('Must be a valid email address')
          }
          break

        case 'zipcode':
          if (!this.patterns.zipcode.test(value)) {
            errors.push('Must be a valid ZIP code (12345 or 12345-6789)')
          }
          break

        case 'bioguide':
          if (!this.patterns.bioguide.test(value)) {
            errors.push('Must be a valid Bioguide ID (e.g., S000148)')
          }
          break

        case 'state':
          const upperValue = value.toUpperCase()
          if (!this.stateCodes.has(upperValue)) {
            errors.push('Must be a valid state code (e.g., NY, CA)')
          }
          break

        case 'string':
          if (!this.patterns.safeString.test(value)) {
            errors.push('Contains invalid characters')
          }
          break
      }
    }

    // Length validation
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push(`Must be at least ${rule.minLength} characters`)
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push(`Must be at most ${rule.maxLength} characters`)
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push('Invalid format')
    }

    // Allowed values validation
    if (rule.allowedValues && !rule.allowedValues.includes(value)) {
      errors.push(`Must be one of: ${rule.allowedValues.join(', ')}`)
    }

    return errors
  }

  static validate(
    data: Record<string, string>,
    rules: Record<string, ValidationRule>
  ): ValidationResult {
    const errors: Record<string, string[]> = {}
    const sanitizedData: Record<string, any> = {}

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field]
      const fieldErrors = this.validateValue(value || '', rule)

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors
      } else if (value !== undefined) {
        // Apply transformation and sanitization
        let sanitizedValue = this.sanitizeString(value)
        
        if (rule.transform) {
          sanitizedValue = rule.transform(sanitizedValue)
        }

        // Type conversion
        if (rule.type === 'number' && sanitizedValue) {
          sanitizedData[field] = Number(sanitizedValue)
        } else if (rule.type === 'state' && sanitizedValue) {
          sanitizedData[field] = sanitizedValue.toUpperCase()
        } else {
          sanitizedData[field] = sanitizedValue
        }
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      sanitizedData
    }
  }

  static validateQueryParams(
    request: NextRequest,
    rules: Record<string, ValidationRule>
  ): ValidationResult {
    const { searchParams } = new URL(request.url)
    const data: Record<string, string> = {}

    for (const [key] of Object.entries(rules)) {
      const value = searchParams.get(key)
      if (value !== null) {
        data[key] = value
      }
    }

    return this.validate(data, rules)
  }

  static async validateRequestBody(
    request: NextRequest,
    rules: Record<string, ValidationRule>
  ): Promise<ValidationResult> {
    try {
      const body = await request.json()
      const data: Record<string, string> = {}

      for (const [key] of Object.entries(rules)) {
        if (body[key] !== undefined) {
          data[key] = String(body[key])
        }
      }

      return this.validate(data, rules)
    } catch (error) {
      return {
        isValid: false,
        errors: { body: ['Invalid JSON in request body'] },
        sanitizedData: {}
      }
    }
  }
}

// Predefined validation rules for common use cases
export const commonValidationRules = {
  zipCode: {
    required: true,
    type: 'zipcode' as const,
    transform: (value: string) => value.replace(/\s/g, '')
  },
  
  bioguideId: {
    required: true,
    type: 'bioguide' as const,
    transform: (value: string) => value.toUpperCase()
  },
  
  state: {
    required: true,
    type: 'state' as const,
    transform: (value: string) => value.toUpperCase()
  },
  
  limit: {
    type: 'number' as const,
    min: 1,
    max: 100,
    transform: (value: string) => value || '20'
  },
  
  search: {
    type: 'string' as const,
    minLength: 1,
    maxLength: 100,
    pattern: InputValidator['patterns'].safeString
  }
}

// Helper function to apply validation to API routes
export function withValidation<T = any>(
  validationRules: Record<string, ValidationRule>,
  source: 'query' | 'body' = 'query'
) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value

    descriptor.value = async function(request: NextRequest, ...args: any[]) {
      let validationResult: ValidationResult

      if (source === 'query') {
        validationResult = InputValidator.validateQueryParams(request, validationRules)
      } else {
        validationResult = await InputValidator.validateRequestBody(request, validationRules)
      }

      if (!validationResult.isValid) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: validationResult.errors
          }),
          { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        )
      }

      // Add validated data to request
      ;(request as any).validatedData = validationResult.sanitizedData

      return originalMethod.call(this, request, ...args)
    }

    return descriptor
  }
}
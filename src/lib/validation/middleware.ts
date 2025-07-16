/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Validation middleware for API routes
 * Provides automatic input validation, sanitization, and XSS protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { ValidationResult, validateApiInput, XSSProtection } from './schemas';
import { structuredLogger } from '@/lib/logging/logger';

export interface ValidationConfig<T = any> {
  query?: Record<keyof T, (value: any) => ValidationResult>;
  body?: Record<keyof T, (value: any) => ValidationResult>;
  params?: Record<keyof T, (value: any) => ValidationResult>;
  sanitizeResponse?: boolean;
  logValidationErrors?: boolean;
}

export interface ValidatedRequest<T = any> extends NextRequest {
  validatedQuery?: T;
  validatedBody?: T;
  validatedParams?: T;
}

export type ApiHandler<T = any> = (
  request: ValidatedRequest<T>,
  params?: { params: Promise<any> }
) => Promise<NextResponse>;

/**
 * Middleware wrapper that validates and sanitizes API inputs
 */
export function withValidation<T = any>(
  config: ValidationConfig<T>,
  handler: ApiHandler<T>
) {
  return async (
    request: NextRequest,
    context?: { params: Promise<any> }
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const { pathname } = new URL(request.url);
    
    try {
      // Extract input data
      const searchParams = new URL(request.url).searchParams;
      const queryObject: Record<string, any> = {};
      
      searchParams.forEach((value, key) => {
        queryObject[key] = value;
      });

      let bodyObject: Record<string, any> = {};
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            bodyObject = await request.json();
          } else if (contentType.includes('application/x-www-form-urlencoded')) {
            const formData = await request.formData();
            formData.forEach((value, key) => {
              bodyObject[key] = value.toString();
            });
          }
        } catch (error) {
          structuredLogger.error('Failed to parse request body', error as Error, {
            pathname,
            contentType: request.headers.get('content-type')
          });
          
          return NextResponse.json(
            { error: 'Invalid request body format' },
            { status: 400 }
          );
        }
      }

      let paramsObject: Record<string, any> = {};
      if (context?.params) {
        paramsObject = await context.params;
      }

      // Validate query parameters
      const validatedRequest = request as ValidatedRequest<T>;
      let hasValidationErrors = false;
      const validationErrors: string[] = [];

      if (config.query) {
        const queryValidation = validateApiInput(queryObject, config.query);
        if (!queryValidation.isValid) {
          hasValidationErrors = true;
          validationErrors.push(...queryValidation.errors.map(e => `Query: ${e}`));
        } else {
          validatedRequest.validatedQuery = queryValidation.sanitized;
        }
      }

      // Validate request body
      if (config.body) {
        const bodyValidation = validateApiInput(bodyObject, config.body);
        if (!bodyValidation.isValid) {
          hasValidationErrors = true;
          validationErrors.push(...bodyValidation.errors.map(e => `Body: ${e}`));
        } else {
          validatedRequest.validatedBody = bodyValidation.sanitized;
        }
      }

      // Validate URL parameters
      if (config.params) {
        const paramsValidation = validateApiInput(paramsObject, config.params);
        if (!paramsValidation.isValid) {
          hasValidationErrors = true;
          validationErrors.push(...paramsValidation.errors.map(e => `Params: ${e}`));
        } else {
          validatedRequest.validatedParams = paramsValidation.sanitized;
        }
      }

      // Handle validation errors
      if (hasValidationErrors) {
        if (config.logValidationErrors !== false) {
          structuredLogger.warn('API validation failed', {
            pathname,
            method: request.method,
            errors: validationErrors,
            query: queryObject,
            body: bodyObject,
            params: paramsObject
          });
        }

        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationErrors
          },
          { status: 400 }
        );
      }

      // Call the original handler
      const response = await handler(validatedRequest, context);

      // Sanitize response if requested
      if (config.sanitizeResponse && response.headers.get('content-type')?.includes('application/json')) {
        try {
          const responseData = await response.json();
          const sanitizedData = XSSProtection.sanitizeObject(responseData);
          
          return NextResponse.json(sanitizedData, {
            status: response.status,
            headers: response.headers
          });
        } catch (error) {
          structuredLogger.error('Failed to sanitize response', error as Error, {
            pathname
          });
          // Return original response if sanitization fails
          return response;
        }
      }

      // Log successful validation
      const duration = Date.now() - startTime;
      structuredLogger.info('API request validated successfully', {
        pathname,
        method: request.method,
        duration,
        hasQuery: !!config.query,
        hasBody: !!config.body,
        hasParams: !!config.params
      });

      return response;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      structuredLogger.error('API validation middleware error', error as Error, {
        pathname,
        method: request.method,
        duration
      });

      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Rate limiting validation helper
 */
export function validateRateLimit(request: NextRequest, limit: number, windowMs: number): boolean {
  // This would typically use Redis or another store to track requests
  // For now, this is a placeholder implementation
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  // TODO: Implement actual rate limiting with Redis
  structuredLogger.debug('Rate limit check', {
    ip,
    limit,
    windowMs,
    note: 'Rate limiting validation placeholder'
  });
  
  return true; // Allow all requests for now
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders(handler: ApiHandler) {
  return async (request: NextRequest, context?: { params: Promise<any> }) => {
    const response = await handler(request, context);
    
    // Add security headers
    const headers = new Headers(response.headers);
    
    // XSS Protection
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // CORS headers for API routes
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    
    // Cache headers
    if (request.method === 'GET') {
      headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    }

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
}

/**
 * Combined middleware for validation and security
 */
export function withValidationAndSecurity<T = any>(
  validationConfig: ValidationConfig<T>,
  handler: ApiHandler<T>
) {
  return withSecurityHeaders(withValidation(validationConfig, handler));
}

/**
 * Input sanitization helpers
 */
export class InputSanitizer {
  /**
   * Sanitize all string values in an object recursively
   */
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    return XSSProtection.sanitizeObject(obj);
  }

  /**
   * Sanitize array of objects
   */
  static sanitizeArray<T extends Record<string, any>>(arr: T[]): T[] {
    return arr.map(item => this.sanitizeObject(item));
  }

  /**
   * Clean SQL injection attempts from strings
   */
  static cleanSQLInjection(input: string): string {
    // Remove common SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|SCRIPT)\b)/gi,
      /(--|#|\/\*|\*\/)/g,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
      /'(\s*(OR|AND)\s*\d+\s*=\s*\d+\s*)/gi,
      /(\b(NULL|TRUE|FALSE)\b\s*(OR|AND)\s*\b(NULL|TRUE|FALSE)\b)/gi
    ];

    let cleaned = input;
    sqlPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });

    return cleaned.trim();
  }

  /**
   * Validate and sanitize email addresses
   */
  static sanitizeEmail(email: string): ValidationResult<string> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const sanitized = XSSProtection.sanitizeHtml(email.toLowerCase().trim());
    
    if (!emailRegex.test(sanitized)) {
      return {
        isValid: false,
        errors: ['Invalid email format']
      };
    }

    return {
      isValid: true,
      data: sanitized,
      errors: [],
      sanitized
    };
  }

  /**
   * Validate and sanitize phone numbers
   */
  static sanitizePhoneNumber(phone: string): ValidationResult<string> {
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Check for valid US phone number length
    if (digitsOnly.length === 10) {
      const formatted = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      return {
        isValid: true,
        data: formatted,
        errors: [],
        sanitized: formatted
      };
    } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
      const formatted = `+1 (${digitsOnly.slice(1, 4)}) ${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
      return {
        isValid: true,
        data: formatted,
        errors: [],
        sanitized: formatted
      };
    }

    return {
      isValid: false,
      errors: ['Invalid phone number format']
    };
  }
}
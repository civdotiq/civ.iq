# Security Guide

Comprehensive security guide for the Civic Intel Hub, covering input validation, XSS protection, API security, and operational security best practices.

## Table of Contents

- [Overview](#overview)
- [Input Validation & Sanitization](#input-validation--sanitization)
- [XSS Protection](#xss-protection)
- [API Security](#api-security)
- [Authentication & Authorization](#authentication--authorization)
- [Data Protection](#data-protection)
- [Infrastructure Security](#infrastructure-security)
- [Monitoring & Incident Response](#monitoring--incident-response)
- [Security Checklist](#security-checklist)

## Overview

The Civic Intel Hub implements comprehensive security measures to protect against common web vulnerabilities and ensure the integrity of government data access.

### Security Principles
- **Defense in Depth**: Multiple layers of security controls
- **Principle of Least Privilege**: Minimal access rights for users and systems
- **Data Minimization**: Collect and store only necessary data
- **Transparency**: Clear security practices and incident reporting
- **Continuous Monitoring**: Real-time security monitoring and alerting

### Security Features
- Comprehensive input validation and sanitization
- XSS protection across all user inputs
- Rate limiting and abuse prevention
- Structured logging and security monitoring
- Content Security Policy (CSP) implementation
- Secure API design with validation middleware

## Input Validation & Sanitization

### Validation Architecture

The application uses a multi-layer validation approach:

1. **Client-side validation**: Initial input checking
2. **API middleware validation**: Server-side validation for all endpoints
3. **Data consistency validation**: Cross-validation with external sources
4. **Output sanitization**: Clean data before sending to clients

### Input Validation Implementation

```typescript
// Base validation class
export class BaseValidator {
  static validateString(
    value: any, 
    fieldName: string, 
    options: ValidationOptions = {}
  ): ValidationResult<string> {
    // Type checking
    if (typeof value !== 'string') {
      return {
        isValid: false,
        errors: [`${fieldName} must be a string`]
      };
    }

    // Sanitize input
    let sanitized = this.sanitizeString(value, options);

    // Length validation
    if (options.minLength && sanitized.length < options.minLength) {
      return {
        isValid: false,
        errors: [`${fieldName} must be at least ${options.minLength} characters`]
      };
    }

    // Pattern validation
    if (options.pattern && !options.pattern.test(sanitized)) {
      return {
        isValid: false,
        errors: [`${fieldName} format is invalid`]
      };
    }

    return {
      isValid: true,
      data: sanitized,
      errors: [],
      sanitized
    };
  }

  static sanitizeString(input: string, options: SanitizationOptions = {}): string {
    let sanitized = input;

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Normalize whitespace
    if (options.normalizeWhitespace !== false) {
      sanitized = sanitized.replace(/\s+/g, ' ').trim();
    }

    // XSS protection
    if (options.preventXSS !== false) {
      sanitized = XSSProtection.sanitizeHtml(sanitized);
    }

    // SQL injection protection
    if (options.preventSQLInjection !== false) {
      sanitized = this.cleanSQLInjection(sanitized);
    }

    return sanitized;
  }
}
```

### Specific Validators

```typescript
// ZIP code validation
export class ZipCodeValidator {
  static validateZipCode(value: any): ValidationResult<string> {
    return BaseValidator.validateString(value, 'zipCode', {
      required: true,
      minLength: 5,
      maxLength: 5,
      pattern: /^\d{5}$/,
      sanitizeOptions: {
        preventXSS: true,
        normalizeWhitespace: true
      }
    });
  }
}

// Bioguide ID validation
export class BioguideValidator {
  static validateBioguideId(value: any): ValidationResult<string> {
    return BaseValidator.validateString(value, 'bioguideId', {
      required: true,
      minLength: 7,
      maxLength: 7,
      pattern: /^[A-Z]\d{6}$/,
      sanitizeOptions: {
        preventXSS: true,
        normalizeWhitespace: true,
        toUpperCase: true
      }
    });
  }
}
```

### Validation Middleware

```typescript
// API validation middleware
export function withValidation<T>(
  config: ValidationConfig<T>,
  handler: ApiHandler<T>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    try {
      // Extract and validate query parameters
      const searchParams = new URL(request.url).searchParams;
      const queryObject: Record<string, any> = {};
      
      searchParams.forEach((value, key) => {
        queryObject[key] = value;
      });

      // Validate request body if present
      let bodyObject: Record<string, any> = {};
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        try {
          const contentType = request.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const rawBody = await request.text();
            
            // Validate JSON structure
            if (rawBody.trim().length > 0) {
              bodyObject = JSON.parse(rawBody);
              
              // Check for malicious JSON structures
              if (this.containsMaliciousPatterns(bodyObject)) {
                return NextResponse.json(
                  { error: 'Malicious input detected' },
                  { status: 400 }
                );
              }
            }
          }
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid JSON format' },
            { status: 400 }
          );
        }
      }

      // Apply validation rules
      const validationResults = this.validateInput(queryObject, bodyObject, config);
      
      if (!validationResults.isValid) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: validationResults.errors
          },
          { status: 400 }
        );
      }

      // Proceed with validated and sanitized data
      return await handler(request, context);

    } catch (error) {
      structuredLogger.error('Validation middleware error', error, {
        url: request.url,
        method: request.method
      });

      return NextResponse.json(
        { error: 'Internal validation error' },
        { status: 500 }
      );
    }
  };
}
```

## XSS Protection

### HTML Sanitization

```typescript
import DOMPurify from 'isomorphic-dompurify';

export class XSSProtection {
  // Sanitize HTML content
  static sanitizeHtml(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      ALLOW_DATA_ATTR: false
    });
  }

  // Sanitize for HTML attribute context
  static sanitizeAttribute(input: string): string {
    return input
      .replace(/[<>"'&]/g, (match) => {
        const htmlEntities: Record<string, string> = {
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#x27;',
          '&': '&amp;'
        };
        return htmlEntities[match] || match;
      });
  }

  // Sanitize for JavaScript context
  static sanitizeJavaScript(input: string): string {
    return input
      .replace(/[\\'"<>]/g, '\\$&')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  // Recursively sanitize objects
  static sanitizeObject<T extends Record<string, any>>(obj: T): T {
    const sanitized: any = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = this.sanitizeHtml(key);
      
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeHtml(value);
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(item => 
          typeof item === 'string' ? this.sanitizeHtml(item) : 
          typeof item === 'object' ? this.sanitizeObject(item) : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }
    
    return sanitized;
  }
}
```

### Content Security Policy

```typescript
// CSP configuration for Next.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://vercel.live;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
`;

// Apply CSP headers
export function withCSP(handler: NextRequestHandler) {
  return async (request: NextRequest) => {
    const response = await handler(request);
    
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
  };
}
```

## API Security

### Rate Limiting

```typescript
// Advanced rate limiting with IP-based tracking
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request history for this identifier
    const requestHistory = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const recentRequests = requestHistory.filter(time => time > windowStart);
    
    // Check if under the limit
    if (recentRequests.length >= this.maxRequests) {
      this.requests.set(identifier, recentRequests);
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const requestHistory = this.requests.get(identifier) || [];
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const recentRequests = requestHistory.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  getResetTime(identifier: string): number {
    const requestHistory = this.requests.get(identifier) || [];
    if (requestHistory.length === 0) return Date.now();
    
    const oldestRequest = Math.min(...requestHistory);
    return oldestRequest + this.windowMs;
  }
}

// Rate limiting middleware
export function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>,
  rateLimiter: RateLimiter
): Promise<NextResponse> {
  const ip = getClientIP(request);
  
  if (!rateLimiter.isAllowed(ip)) {
    const resetTime = rateLimiter.getResetTime(ip);
    
    return Promise.resolve(
      NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          resetTime: new Date(resetTime).toISOString()
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimiter.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTime.toString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    );
  }

  return handler();
}
```

### API Key Security

```typescript
// Secure API key management
export class APIKeyManager {
  private static readonly API_KEYS = {
    congress: process.env.CONGRESS_API_KEY,
    fec: process.env.FEC_API_KEY,
    census: process.env.CENSUS_API_KEY,
    openstates: process.env.OPENSTATES_API_KEY
  };

  static getAPIKey(service: keyof typeof this.API_KEYS): string {
    const key = this.API_KEYS[service];
    
    if (!key) {
      throw new Error(`API key not configured for service: ${service}`);
    }

    return key;
  }

  static validateAPIKeys(): { valid: boolean; missing: string[] } {
    const missing: string[] = [];
    
    Object.entries(this.API_KEYS).forEach(([service, key]) => {
      if (!key || key.trim() === '') {
        missing.push(service);
      }
    });

    return {
      valid: missing.length === 0,
      missing
    };
  }

  // Mask API keys for logging
  static maskAPIKey(key: string): string {
    if (!key || key.length < 8) return '***';
    return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4);
  }
}
```

### Request Signing

```typescript
// Request signature verification for sensitive operations
export class RequestSigner {
  private static readonly SECRET = process.env.REQUEST_SIGNING_SECRET;

  static sign(payload: string, timestamp: number): string {
    const crypto = require('crypto');
    const data = `${timestamp}.${payload}`;
    
    return crypto
      .createHmac('sha256', this.SECRET)
      .update(data)
      .digest('hex');
  }

  static verify(payload: string, timestamp: number, signature: string): boolean {
    const expectedSignature = this.sign(payload, timestamp);
    
    // Prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  static isTimestampValid(timestamp: number, toleranceMs: number = 300000): boolean {
    const now = Date.now();
    const timestampMs = timestamp * 1000;
    
    return Math.abs(now - timestampMs) <= toleranceMs;
  }
}
```

## Authentication & Authorization

### JWT Token Security

```typescript
// Secure JWT implementation (if needed for future features)
export class TokenManager {
  private static readonly SECRET = process.env.JWT_SECRET;
  private static readonly EXPIRY = '1h';

  static generate(payload: object): string {
    const jwt = require('jsonwebtoken');
    
    return jwt.sign(
      payload,
      this.SECRET,
      {
        expiresIn: this.EXPIRY,
        issuer: 'civic-intel-hub',
        audience: 'civic-intel-hub-users'
      }
    );
  }

  static verify(token: string): any {
    const jwt = require('jsonwebtoken');
    
    try {
      return jwt.verify(token, this.SECRET, {
        issuer: 'civic-intel-hub',
        audience: 'civic-intel-hub-users'
      });
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static refresh(token: string): string {
    const payload = this.verify(token);
    delete payload.iat;
    delete payload.exp;
    
    return this.generate(payload);
  }
}
```

### Session Security

```typescript
// Secure session management
export class SessionManager {
  private static sessions = new Map<string, SessionData>();
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

  static createSession(userData: UserData): string {
    const sessionId = this.generateSecureId();
    const session: SessionData = {
      id: sessionId,
      userData,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      ipAddress: userData.ipAddress,
      userAgent: userData.userAgent
    };

    this.sessions.set(sessionId, session);
    return sessionId;
  }

  static validateSession(sessionId: string, ipAddress: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) return null;

    // Check session timeout
    if (Date.now() - session.lastActivity > this.SESSION_TIMEOUT) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Check IP address (basic session hijacking protection)
    if (session.ipAddress !== ipAddress) {
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }

  private static generateSecureId(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }
}
```

## Data Protection

### Sensitive Data Handling

```typescript
// Secure handling of sensitive data
export class DataProtection {
  // Remove sensitive fields from responses
  static sanitizeRepresentativeData(data: any): any {
    const { 
      privateEmail, 
      privatePhone, 
      internalNotes, 
      ...publicData 
    } = data;
    
    return publicData;
  }

  // Encrypt sensitive data before storage
  static encrypt(data: string): string {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipher(algorithm, key);
    cipher.setAAD(Buffer.from('civic-intel-hub'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }

  // Decrypt sensitive data
  static decrypt(encryptedData: string): string {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    
    const [ivHex, encrypted, authTagHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(algorithm, key);
    decipher.setAAD(Buffer.from('civic-intel-hub'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Secure data deletion
  static secureDelete(data: any): void {
    if (typeof data === 'object') {
      Object.keys(data).forEach(key => {
        data[key] = null;
        delete data[key];
      });
    }
  }
}
```

### Data Minimization

```typescript
// Implement data minimization principles
export class DataMinimization {
  // Only collect necessary fields
  static getMinimalRepresentativeData(fullData: any) {
    return {
      bioguideId: fullData.bioguideId,
      name: fullData.name,
      party: fullData.party,
      state: fullData.state,
      chamber: fullData.chamber,
      // Exclude sensitive or unnecessary fields
    };
  }

  // Automatic data retention
  static shouldRetainData(timestamp: number, retentionPeriod: number): boolean {
    return Date.now() - timestamp < retentionPeriod;
  }

  // Clean up old data
  static cleanupOldData(data: any[], retentionPeriod: number): any[] {
    return data.filter(item => 
      this.shouldRetainData(item.timestamp, retentionPeriod)
    );
  }
}
```

## Infrastructure Security

### HTTPS Configuration

```typescript
// Force HTTPS in production
export function enforceHTTPS(request: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    const protocol = request.headers.get('x-forwarded-proto');
    
    if (protocol !== 'https') {
      const httpsUrl = new URL(request.url);
      httpsUrl.protocol = 'https:';
      
      return NextResponse.redirect(httpsUrl.toString(), 301);
    }
  }
  
  return null;
}
```

### Security Headers

```typescript
// Comprehensive security headers
export function setSecurityHeaders(response: NextResponse): NextResponse {
  const headers = {
    // HTTPS enforcement
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // XSS protection
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    
    // Content Security Policy
    'Content-Security-Policy': cspHeader,
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    
    // Cross-origin policies
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
  };

  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

## Monitoring & Incident Response

### Security Monitoring

```typescript
// Security event monitoring
export class SecurityMonitor {
  private static suspiciousPatterns = [
    /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION)\b/i,
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /\b(eval|setTimeout|setInterval)\s*\(/gi
  ];

  static detectSuspiciousInput(input: string): SecurityThreat[] {
    const threats: SecurityThreat[] = [];
    
    this.suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(input)) {
        threats.push({
          type: this.getThreatType(index),
          pattern: pattern.source,
          input: input.substring(0, 100), // Limit logged input
          severity: this.getThreatSeverity(index),
          timestamp: Date.now()
        });
      }
    });

    return threats;
  }

  static logSecurityEvent(event: SecurityEvent): void {
    structuredLogger.warn('Security event detected', {
      type: event.type,
      severity: event.severity,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      url: event.url,
      timestamp: event.timestamp,
      operation: 'security_event'
    });

    // Alert on high-severity events
    if (event.severity === 'high') {
      this.alertSecurityTeam(event);
    }
  }

  private static alertSecurityTeam(event: SecurityEvent): void {
    // Send alert to security monitoring system
    // This could be Slack, email, PagerDuty, etc.
    console.error('HIGH SEVERITY SECURITY EVENT:', event);
  }
}
```

### Audit Logging

```typescript
// Comprehensive audit logging
export class AuditLogger {
  static logAPIAccess(request: NextRequest, response: NextResponse): void {
    const logData = {
      timestamp: new Date().toISOString(),
      method: request.method,
      url: request.url,
      statusCode: response.status,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      referrer: request.headers.get('referer'),
      contentLength: response.headers.get('content-length'),
      responseTime: Date.now() - (request as any).startTime,
      operation: 'api_access'
    };

    structuredLogger.info('API access', logData);
  }

  static logSecurityViolation(
    request: NextRequest, 
    violation: SecurityViolation
  ): void {
    const logData = {
      timestamp: new Date().toISOString(),
      type: violation.type,
      description: violation.description,
      severity: violation.severity,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent'),
      url: request.url,
      method: request.method,
      operation: 'security_violation'
    };

    structuredLogger.error('Security violation', logData);
  }
}
```

## Security Checklist

### Development Security
- [ ] Input validation on all user inputs
- [ ] XSS protection implemented
- [ ] SQL injection prevention
- [ ] CSRF protection where applicable
- [ ] Secure error handling (no sensitive data in errors)
- [ ] Security headers implemented
- [ ] Content Security Policy configured

### API Security
- [ ] Rate limiting implemented
- [ ] Request size limits enforced
- [ ] API key security measures
- [ ] Input sanitization on all endpoints
- [ ] Proper HTTP status codes
- [ ] No sensitive data in logs

### Infrastructure Security
- [ ] HTTPS enforced in production
- [ ] Secure environment variable management
- [ ] Regular security updates
- [ ] Secure session management
- [ ] Database security (if applicable)
- [ ] Network security configuration

### Monitoring & Response
- [ ] Security event logging
- [ ] Intrusion detection
- [ ] Regular security audits
- [ ] Incident response plan
- [ ] Security team contact information
- [ ] Backup and recovery procedures

### Compliance
- [ ] Data minimization practices
- [ ] User privacy protection
- [ ] Audit trail maintenance
- [ ] Regular penetration testing
- [ ] Security documentation
- [ ] Staff security training

For additional security considerations and best practices, refer to the [OWASP Top 10](https://owasp.org/www-project-top-ten/) and [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework).
# Security Policy

## Overview

CIV.IQ takes security seriously. This document outlines our security policies, procedures, and best practices to protect our users and maintain the integrity of our civic information platform.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** open a public issue
2. Email security@civ-iq.com with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Any suggested fixes

We will acknowledge receipt within 48 hours and provide regular updates on our progress.

## Security Measures

### Supply Chain Security

CIV.IQ implements multiple layers of protection against supply chain attacks:

#### Automated Scanning

- **Pre-install auditing**: All packages are scanned before installation using `audit-ci`
- **Git hooks**: Security audits run on every commit and push
- **Continuous monitoring**: Regular security scans in CI/CD pipeline

#### Package Management

- **Exact versioning**: All dependencies use exact versions (no ranges)
- **Lock file enforcement**: `package-lock.json` is required and tracked
- **Engine strict mode**: Ensures correct Node.js version

#### Security Commands

```bash
# Run security audit (moderate level)
npm run security:audit

# Run full security scan
npm run security:full

# Emergency vulnerability fix (use with caution)
npm run security:emergency
```

### Runtime Security

#### API Security

- **Redis-based rate limiting**: Production-ready rate limiting with Redis persistence (falls back to in-memory if Redis unavailable)
- **Input validation**: Comprehensive validation against malicious patterns (XSS, SQL injection, path traversal)
- **CORS configuration**: Properly configured cross-origin resource sharing
- **Authentication**: Required for sensitive operations
- **API key validation**: Automated validation of API keys for format and security issues

#### Data Protection

- No storage of personally identifiable information (PII)
- All API keys stored as environment variables
- Secure communication with government APIs
- XSS protection through proper sanitization

#### Client-Side Security

- **Content Security Policy (CSP)**: Environment-aware CSP headers
  - Production: Strict policy without `unsafe-inline` or `unsafe-eval`
  - Development: Permissive policy for hot reload compatibility
  - Includes `upgrade-insecure-requests`, `base-uri`, and `form-action` directives
- **Strict Transport Security (HSTS)**: Max-age 31536000 with includeSubDomains
- **X-Frame-Options**: DENY to prevent clickjacking
- **X-Content-Type-Options**: nosniff to prevent MIME sniffing
- **Automated dependency updates**: Dependabot configured for weekly security updates

### Development Security

#### Code Review

- All code changes require review
- Security-focused review checklist
- Automated security linting

#### Environment Security

- Development/staging/production separation
- Secrets never committed to repository
- Environment variables for configuration

## Security Checklist

Before each release, we verify:

- [ ] All dependencies are up to date
- [ ] No high or critical vulnerabilities in `npm audit`
- [ ] Security headers are properly configured
- [ ] Rate limiting is functional
- [ ] Input validation is comprehensive
- [ ] Error messages don't leak sensitive information
- [ ] API keys are properly secured

## Incident Response

In case of a security incident:

1. **Immediate Actions**
   - Assess the scope and impact
   - Contain the vulnerability
   - Begin investigation

2. **Communication**
   - Notify affected users if necessary
   - Update status page
   - Prepare incident report

3. **Resolution**
   - Deploy fix
   - Verify resolution
   - Monitor for recurrence

4. **Post-Incident**
   - Complete incident report
   - Update security procedures
   - Implement preventive measures

## Best Practices for Contributors

1. **Never commit secrets** - Use environment variables
2. **Validate all inputs** - Never trust user data
3. **Keep dependencies updated** - Regular updates reduce vulnerabilities
4. **Follow secure coding guidelines** - OWASP standards
5. **Report suspicious activity** - If something seems wrong, speak up

## Security Tools

We use the following tools to maintain security:

- **npm audit**: Built-in vulnerability scanning
- **GitHub Actions**: Automated security audits on every push/PR
- **Dependabot**: Automated dependency updates with security focus
- **CodeQL**: Static code analysis for security vulnerabilities
- **Dependency Review**: PR-level dependency vulnerability scanning
- **husky**: Git hooks for pre-commit security checks
- **Custom middleware**: Redis-based rate limiting and input validation
- **API key validation**: Automated validation of configuration security

## Contact

For security concerns, contact:

- Email: security@civ-iq.com
- Response time: Within 48 hours

## Recent Security Enhancements (November 2025)

### EFF Security Guidelines Compliance

Following the Electronic Frontier Foundation's Security Self-Defense guidelines, we've implemented:

1. **Supply Chain Protection**
   - Added `package-lock.json` for dependency pinning
   - Configured Dependabot for automated security updates
   - GitHub Actions security workflow with daily scans

2. **Production CSP Hardening**
   - Removed `unsafe-inline` and `unsafe-eval` from production CSP
   - Environment-aware security headers
   - Added `upgrade-insecure-requests` directive

3. **Redis-Based Rate Limiting**
   - Persistent rate limiting with Redis (src/lib/security/rate-limit-redis.ts)
   - Graceful fallback to in-memory when Redis unavailable
   - Per-endpoint configuration

4. **API Key Validation**
   - Automated validation of API key format and security (src/lib/security/api-key-validation.ts)
   - Detection of placeholder values and test keys
   - Production-specific configuration validation

5. **CI/CD Security Integration**
   - Automated npm audit on every push
   - CodeQL security analysis
   - Dependency review for pull requests
   - Lockfile verification in CI pipeline

## Updates

This security policy is reviewed quarterly and updated as needed. Last update: **November 13, 2025** (EFF compliance update).

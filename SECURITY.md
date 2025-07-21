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
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS properly configured
- Authentication required for sensitive operations

#### Data Protection
- No storage of personally identifiable information (PII)
- All API keys stored as environment variables
- Secure communication with government APIs
- XSS protection through proper sanitization

#### Client-Side Security
- Content Security Policy (CSP) headers
- Strict Transport Security (HSTS)
- X-Frame-Options to prevent clickjacking
- Regular dependency updates

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
- **audit-ci**: CI/CD integration for npm audit
- **husky**: Git hooks for pre-commit security checks
- **helmet**: Security headers for Express/Next.js
- **OWASP ZAP**: Web application security testing

## Contact

For security concerns, contact:
- Email: security@civ-iq.com
- Response time: Within 48 hours

## Updates

This security policy is reviewed quarterly and updated as needed. Last update: July 2025.
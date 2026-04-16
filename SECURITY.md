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
2. Email contact@civdotiq.org with:
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

## Known Accepted Vulnerabilities

Some `npm audit` findings remain open by deliberate decision. Each is documented below with the specific mitigation reasoning.

### `@huggingface/transformers@3.8.1` → transitive `tar` advisories

**Status:** Accepted. Pin held at `3.8.1`.

**Advisories:** GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256 — path traversal in `tar` extraction via hardlink / symlink / drive-relative linkpath. Reach us through `@huggingface/transformers` → `onnxruntime-node` → `tar`.

**Why we do not upgrade to `4.1.0`:**

- `4.1.0` was published 2026-04-15 (hours before this decision) with zero community soak time.
- `4.x` introduces new hard dependencies: `sharp@^0.34.5` (~30 MB native binaries, pushes toward Vercel 250 MB serverless limit), `@huggingface/tokenizers` (native crate), and a pre-release `onnxruntime-web@1.26.0-dev.*` pin.
- The major-version bump carries runtime breakage risk for our 4 dynamic `import('@huggingface/transformers')` sites (feature-extraction, zero-shot, NER, ONNX inference) that all test suites mock — meaning real breakage only surfaces at runtime against production models.

**Why the `tar` CVEs do not apply to us:**

The `tar` advisories require extracting **attacker-controlled** archives. CIV.IQ's only `tar` code path is HuggingFace model download during CI / cold-start, which extracts tarballs served from `huggingface.co` over HTTPS — a trusted source with integrity-verified model files. We never extract user-supplied, third-party, or network-arbitrary tarballs.

**Re-evaluation triggers:**

1. `@huggingface/transformers@4.x` reaches `>= 4.2.0` with at least 4 weeks of community usage, OR
2. A `3.x` patch release lands that upgrades the transitive `tar` to `>= 7.5.11`, OR
3. CIV.IQ introduces any code path that extracts non-HuggingFace tarballs.

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

- Email: contact@civdotiq.org
- Response time: Within 48 hours

## Security Enhancements

### EFF Security Guidelines Compliance

Following the Electronic Frontier Foundation's Security Self-Defense guidelines:

1. **Supply Chain Protection**
   - `package-lock.json` for dependency pinning
   - Dependabot for automated security updates
   - GitHub Actions security workflow with daily scans

2. **Production CSP Hardening**
   - No `unsafe-inline` or `unsafe-eval` in production CSP
   - Environment-aware security headers
   - `upgrade-insecure-requests` directive

3. **Redis-Based Rate Limiting**
   - Persistent rate limiting with Upstash Redis (`src/lib/security/rate-limit-redis.ts`)
   - Graceful fallback to in-memory when Redis unavailable
   - Per-endpoint configuration

4. **API Key Validation**
   - Automated validation of API key format and security (`src/lib/security/api-key-validation.ts`)
   - Detection of placeholder values and test keys
   - Production-specific configuration validation

5. **CI/CD Security Integration**
   - Automated npm audit on every push
   - CodeQL security analysis
   - Dependency review for pull requests
   - Lockfile verification in CI pipeline

6. **Intelligence Layer Security**
   - All ML models run server-side only (no client exposure)
   - AI-generated text validated for reading level and factual framing
   - No causation claims — correlation-only language enforced
   - Confidence scores and methodology disclosed on every insight
   - HuggingFace small models loaded on-demand, no external API calls for inference

## Updates

This security policy is reviewed quarterly and updated as needed. Last update: **April 15, 2026**.

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

Some `npm audit` findings remain open by deliberate decision. Each entry below is backed by source-code inspection of the affected packages, not inference. Last reviewed: 2026-04-15.

### Resolved in this review

- `mcp-handler` 1.0.7 → 1.1.0 (pulled `@modelcontextprotocol/sdk` 1.25.2 → 1.26.0). Closes GHSA-345p-7cg4-v4c7 — race-condition data leak across concurrent MCP client sessions. Runtime-exploitable via `/api/mcp`. Non-major, no API change at our `createMcpHandler` call site.
- `fast-xml-parser` 5.4.2 → 5.6.0. Closes GHSA-8gc5-j5rx-235r and GHSA-jp2q-39xq-3w4g — entity-expansion limit bypass via JS falsy evaluation. Our four `XMLParser` call sites do not configure entity limits, so exposure was latent rather than exploitable, but the upgrade is patch-level safe.

These were missed in the initial Phase 1 hardening pass (commits `7bdcae97`–`72e5e114`); recording the gap so future audits notice the pattern.

### Transitive `tar` advisories via `@huggingface/transformers` — partially resolved

**Status (2026-04-16 update):** `@huggingface/transformers` upgraded `3.8.1 → 4.1.0` after the deferral was reversed. Closes the `@huggingface/transformers → onnxruntime-node → tar` chain. The two remaining tar chains (npm's own `cacache`; `sqlite3 → node-gyp → make-fetch-happen → cacache`) are still accepted under the same install-time-only reasoning below.

**Why the deferral was reversed:** Phase 2 calibration work uncovered that the `3.8.1` runtime was silently broken on Node 25 — `embedText()` returned `null` in production while every mocked test passed (`docs/EMBEDDING-PIPELINE-BROKEN-2026-04.md`). That made the upgrade an integrity fix, not just a security fix. SECURITY.md previously required a non-mocked pipeline smoke test before upgrading; that test now exists at `scripts/smoke-embedding-pipeline.ts` (`npm run smoke:embedding`, exit 0 on success). The 4.1.0 install was verified by: smoke script PASS (294 ms cold load, 1.0 unit-norm 384-dim embedding), 48 ML inference unit tests still pass, `npm run validate:all` green.

**Advisories** (still applicable to remaining chains): GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256 — path traversal in `tar` extraction via hardlink, symlink, and drive-relative linkpath attacks. After the upgrade these now reach CIV.IQ through two chains:

- ~~`@huggingface/transformers` → `onnxruntime-node` → `tar`~~ — resolved by 4.1.0 upgrade
- npm's `cacache` (HTTP cache) → `tar`
- `sqlite3` → `node-gyp` → `make-fetch-happen` → `cacache` → `tar`

**Why these CVEs do not apply to CIV.IQ at runtime:**

All three code paths invoke `tar` **only at install time** (`npm install` / `npm ci`), never during serverless cold-start or request handling. A Vercel deployment builds once with `node_modules` frozen, then serves requests from the pre-built image — the `tar` chains have zero exposure to attacker-controlled input during the request path. Verified by reading:

- `node_modules/onnxruntime-node/script/install.js` — `tar.t(...)` is invoked only when `IS_LINUX_X64 && BIN_FOLDER_EXISTS && !CUDA_DLL_EXISTS`, i.e., Linux x64 downloading CUDA binaries. CIV.IQ uses the WASM backend (`onnxruntime-web`), not CUDA — comment in `src/lib/intelligence/embeddings/embedding-classifier.ts:13` documents this deliberate choice. The CUDA tarball is fetched from `https://github.com/microsoft/onnxruntime/releases/...` without integrity verification (a real weakness), but the code path is never entered in our deployment.
- `cacache` unpacks registry tarballs, but each is integrity-verified against the `sha512-...` hash recorded in `package-lock.json`. An attacker would need to both compromise the npm registry AND produce a tarball matching the hash AND exploit path traversal. The lockfile integrity defeats the substitution step.
- `node-gyp` only runs if `sqlite3` builds from source (prebuilt binaries are the happy path). Node.js headers are fetched from `nodejs.org` with integrity checks.

**Why the `@huggingface/transformers@4.1.0` deferral was reversed (2026-04-16):**

The original deferral cited (1) fresh release, (2) major-version API risk with mocked-only tests, and (3) install delta. The reversal addresses each:

1. **Fresh release** — still true, but the pin was producing a silently-broken runtime in production (zero embeddings returned). Sitting on a broken pin to wait out fresh-release risk is the wrong trade.
2. **Mocked-only tests** — the gap is now closed by `scripts/smoke-embedding-pipeline.ts`. Run `npm run smoke:embedding` after any change to `@huggingface/transformers`, Node major version, or `embedding-classifier.ts`. Exit 0 = pipeline functional. Pre-upgrade verification: 4.1.0 PASS in pure Node 25.
3. **Install delta** — observed: `npm install @huggingface/transformers@4.1.0` reported `added 1 package, changed 6 packages` and dropped `npm audit` from 9 vulns (7 high) to 7 vulns (5 high). No build or test regression.

**Corrections to prior speculation** (recorded so the reasoning is auditable):

- A previous version of this section claimed `sharp@^0.34.5` would be a new ~30 MB native dependency risking the Vercel 250 MB serverless limit. Empirically false: `sharp` is already present at `node_modules/@img/` (16 MB) — the 4.1.0 upgrade does not add it.
- A previous version claimed HuggingFace model files are "integrity-verified." `transformers.js/src/utils/hub.js` contains no checksum or ETag verification on model downloads (grepped `sha|etag|integrity|checksum|hash` — zero matches). Model files come over plain HTTPS from huggingface.co; a CDN compromise affects 3.8.1 and 4.1.0 equally. This is orthogonal to the tar CVEs and not a reason to pick one version over the other.

**Re-evaluation triggers (for the remaining `cacache` / `sqlite3` chains):**

1. A `cacache` patch release lands that upgrades transitive `tar` to `>= 7.5.11`, OR
2. CIV.IQ introduces any code path that extracts attacker-controlled tarballs at runtime (none exist today), OR
3. A critical runtime-exploitable CVE is disclosed that the install-time-only argument no longer covers.

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

# CIV.IQ Opus 4.5 Upgrade Plan

## Executive Summary

This document analyzes the civic-intel-hub codebase (built with Claude Sonnet 3.5) against capabilities now available with Claude Opus 4.5 and modern Claude Code agentic tools. The analysis identifies opportunities for architectural simplification, test coverage improvements, legacy pattern removal, and tooling integration.

**Codebase Metrics:**

- **99 API Routes** | 30,406 lines of code
- **124 Service Layer Files** | 102K+ lines in `/src/lib`
- **55% Static Data Files** | ZIP mappings, committee data, bioguide mappings
- **TypeScript Strict Mode** | Zero compilation errors maintained

---

## 1. Architectural Simplifications

### 1.1 API Route Boilerplate Reduction

**Current State:** Each of 99 API routes duplicates 150-200 lines of boilerplate:

```typescript
// Pattern repeated in EVERY route:
try {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();
  if (!bioguideId) {
    return NextResponse.json({ error: '...' }, { status: 400 });
  }

  const cacheKey = `entity:${id}:variant`;
  const cached = await govCache.get<Type>(cacheKey);
  if (cached) {
    logger.info('Cache hit', {...});
    return NextResponse.json({...cached, metadata: {...}});
  }

  // ... actual logic ...

  logger.info('Request complete', { duration: Date.now() - startTime });
  await govCache.set(cacheKey, data, { ttl: 3600000 });
  return NextResponse.json(response);
} catch (error) {
  logger.error('Failed', error as Error, { context });
  return NextResponse.json({ error: '...' }, { status: 500 });
}
```

**Opus 4.5 Opportunity:** Create a single higher-order function wrapper:

```typescript
// New: src/lib/api/route-wrapper.ts
export const createApiHandler =
  <T>(config: {
    cacheKey: (params: any) => string;
    ttl: number;
    handler: (params: any) => Promise<T>;
  }) =>
  async (request: Request, context: any) => {
    // All boilerplate handled automatically
  };

// Usage reduces 300-line routes to ~50 lines:
export const GET = createApiHandler({
  cacheKey: ({ bioguideId }) => `rep:${bioguideId}`,
  ttl: ISR_TIMES.ONE_HOUR,
  handler: async ({ bioguideId }) => getRepresentative(bioguideId),
});
```

**Impact:** ~15,000 lines of code reduction (50% of API routes)

**Files to Refactor:**

- `src/app/api/representative/[bioguideId]/route.ts` (312 lines)
- `src/app/api/representative/[bioguideId]/votes/route.ts` (748 lines)
- `src/app/api/representative/[bioguideId]/finance/comprehensive/route.ts` (430 lines)
- All 99 routes in `/src/app/api/`

---

### 1.2 Multi-Step Fallback Pattern Elimination

**Current State:** FEC API service has 175+ lines of sequential fallback logic:

```typescript
// src/lib/fec/fec-api-service.ts (lines 496-671)
async getCommitteeIdForCandidate(candidateId: string, cycle: number) {
  // STEP 1: Try /committees/?candidate_id={id}&cycle={cycle}
  const step1 = await this.fetchWithRetry(...);
  if (step1.results?.length) return step1.results[0].committee_id;

  // STEP 2: Try /candidate/{id}/committees/?cycle={cycle}
  const step2 = await this.fetchWithRetry(...);
  if (step2.results?.length) return step2.results[0].committee_id;

  // STEP 3: Try legacy /candidate/{id}/ endpoint
  const step3 = await this.fetchWithRetry(...);
  if (step3.principal_committees?.length) return ...;

  // STEP 4: Direct contribution lookup
  const step4 = await this.fetchWithRetry(...);
  // ... more fallback logic
}
```

**Opus 4.5 Opportunity:** Replace rigid fallback chains with AI-assisted resolution:

```typescript
// New pattern: AI decides which endpoint to try based on context
const committeeId = await aiResolver.resolve({
  goal: 'Get FEC committee ID for candidate',
  context: { candidateId, cycle, previousAttempts },
  availableEndpoints: [
    { url: '/committees/', priority: 1 },
    { url: '/candidate/{id}/committees/', priority: 2 },
    { url: '/candidate/{id}/', priority: 3 },
  ],
  fallbackStrategy: 'sequential-with-learning',
});
```

**Impact:**

- Eliminate 600+ lines of hardcoded fallback logic
- Self-healing when FEC API changes endpoints
- Better error messages explaining what was tried

**Files Affected:**

- `src/lib/fec/fec-api-service.ts` (1,166 lines - reduce to ~400)
- `src/lib/openstates-api.ts` (1,393 lines - reduce to ~600)

---

### 1.3 Industry Categorization Modernization

**Current State:** 500 lines of hardcoded regex patterns:

```typescript
// src/lib/fec/industry-categorizer.ts (lines 54-500)
const EMPLOYER_PATTERNS: Record<IndustrySector, RegExp[]> = {
  Technology: [
    /\b(google|alphabet)\b/i,
    /\b(microsoft)\b/i,
    /\b(apple)\b/i,
    // ... 50+ more patterns
  ],
  Finance: [
    /\b(goldman|sachs)\b/i,
    /\b(morgan|stanley)\b/i,
    // ... 40+ more patterns
  ],
  // ... 200+ total patterns
};
```

**Opus 4.5 Opportunity:** Single LLM call with caching:

```typescript
// New: src/lib/ai/industry-classifier.ts
export async function classifyIndustry(employer: string): Promise<IndustrySector> {
  const cacheKey = `industry:${employer.toLowerCase()}`;
  const cached = await cache.get(cacheKey);
  if (cached) return cached;

  const sector = await opus.classify({
    input: employer,
    categories: INDUSTRY_SECTORS,
    examples: CLASSIFICATION_EXAMPLES,
  });

  await cache.set(cacheKey, sector, { ttl: ONE_YEAR });
  return sector;
}
```

**Impact:**

- Delete 500 lines of regex patterns
- 95%+ accuracy vs 70% with pattern matching
- Handles new companies automatically
- No maintenance when companies rename

---

### 1.4 Entity Recognition Enhancement

**Current State:** Pattern-based entity recognition with intentional null returns:

```typescript
// src/lib/entity-recognition.ts (line 202)
// Returns null for representative ID to prevent fake links
function recognizeRepresentative(text: string): string | null {
  return null; // Intentionally disabled
}
```

**Opus 4.5 Opportunity:** Proper NER with confidence thresholds:

```typescript
// New: AI-powered entity recognition
export async function recognizeEntities(text: string) {
  const entities = await opus.extractEntities({
    text,
    types: ['representative', 'bill', 'committee', 'donor'],
    confidenceThreshold: 0.85,
    validateAgainst: {
      representatives: bioguideIds,
      bills: billPatterns,
      committees: committeeIds,
    },
  });

  return entities.filter(e => e.confidence > 0.85);
}
```

**Impact:**

- Enable hyperlinks for recognized entities
- Reduce 404s with validation against known IDs
- Better user experience with entity tooltips

---

## 2. Test Coverage Gaps

### 2.1 Current State Analysis

**Test Infrastructure:**

- Jest + React Testing Library configured
- Playwright for E2E tests
- Vitest available but underutilized

**Coverage Audit Results:**

| Category                                   | Total Endpoints | Tested | Coverage |
| ------------------------------------------ | --------------- | ------ | -------- |
| Representative APIs                        | 16              | 3      | 19%      |
| Campaign Finance                           | 8               | 1      | 13%      |
| State Legislature                          | 15              | 0      | 0%       |
| Districts & Geography                      | 13              | 2      | 15%      |
| Committees & Bills                         | 11              | 1      | 9%       |
| Federal Data (Register, Spending, GovInfo) | 6               | 0      | 0%       |
| Infrastructure (cache, health, admin)      | 12              | 2      | 17%      |
| **TOTAL**                                  | **99**          | **9**  | **9%**   |

**Critical Untested Paths:**

1. `src/app/api/state-legislature/` - 0% coverage, 15 endpoints
2. `src/app/api/federal-register/` - 0% coverage, 3 endpoints
3. `src/app/api/spending/` - 0% coverage, 2 endpoints
4. `src/app/api/govinfo/` - 0% coverage, 1 endpoint
5. `src/app/api/city/` - 0% coverage, 1 endpoint

---

### 2.2 Agentic TDD Implementation Plan

**Phase 1: API Contract Tests (Week 1-2)**

Use Opus 4.5 to auto-generate comprehensive test suites:

```typescript
// Prompt for test generation:
"Analyze the API route at src/app/api/representative/[bioguideId]/votes/route.ts
Generate Jest tests covering:
1. Success cases with real bioguide IDs (K000367, P000197)
2. Invalid bioguide ID handling
3. Cache hit vs miss scenarios
4. External API failure handling
5. Response schema validation
6. Edge cases (empty results, pagination)"
```

**Expected Output:**

```typescript
// Auto-generated: src/__tests__/api/representative/votes.test.ts
describe('GET /api/representative/[bioguideId]/votes', () => {
  describe('Success Cases', () => {
    it('returns voting record for valid bioguide', async () => {...});
    it('returns paginated results when limit specified', async () => {...});
    it('uses cached data when available', async () => {...});
  });

  describe('Error Handling', () => {
    it('returns 400 for invalid bioguide format', async () => {...});
    it('returns 404 for non-existent member', async () => {...});
    it('returns 503 when Congress.gov unavailable', async () => {...});
  });

  describe('Response Schema', () => {
    it('matches VotingRecordResponse interface', async () => {...});
  });
});
```

**Phase 2: Integration Tests (Week 3-4)**

Target coverage for cross-service interactions:

```typescript
// Test: Representative → Finance → Votes flow
describe('Representative Data Aggregation', () => {
  it('aggregates data from Congress.gov, FEC, and NewsAPI', async () => {
    const rep = await fetch('/api/representative/K000367/batch');
    expect(rep.profile).toBeDefined();
    expect(rep.finance).toBeDefined();
    expect(rep.votes).toBeDefined();
    expect(rep.news).toBeDefined();
  });
});
```

**Phase 3: E2E Tests with Playwright (Week 5-6)**

```typescript
// tests/e2e/representative-profile.spec.ts
test('complete representative profile flow', async ({ page }) => {
  await page.goto('/representative/K000367');

  // Verify all tabs load
  await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Votes' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Finance' })).toBeVisible();

  // Verify data loads
  await expect(page.getByText('Amy Klobuchar')).toBeVisible();
  await expect(page.getByText('Minnesota')).toBeVisible();
});
```

---

### 2.3 Coverage Target

**Goal: 80% Coverage by Q2 2025**

| Phase   | Target | Tests to Add         |
| ------- | ------ | -------------------- |
| Phase 1 | 40%    | 45 API tests         |
| Phase 2 | 60%    | 25 integration tests |
| Phase 3 | 80%    | 15 E2E tests         |

**Agentic Test Generation Strategy:**

```bash
# Claude Code slash command for test generation
/generate-tests src/app/api/state-legislature/[state]/route.ts \
  --coverage-target=80 \
  --mock-external-apis \
  --include-edge-cases
```

---

## 3. Legacy Patterns to Remove

### 3.1 Excessive Defensive Logging

**Current State:** ~1,200 logging statements across 99 routes

```typescript
// Example from src/app/api/representative/[bioguideId]/route.ts
logger.info('Starting representative fetch', { bioguideId });
logger.info('Checking cache', { cacheKey });
logger.info('Cache miss, fetching from Congress.gov', { bioguideId });
logger.info('Congress.gov response received', { status: response.status });
logger.info('Parsing response', { bioguideId });
logger.info('Fetching committee assignments', { bioguideId });
// ... 10+ more log statements per request
```

**Why This Existed:** Sonnet 3.5 needed extensive logs for debugging AI-assisted development

**Opus 4.5 Approach:** Trust middleware-level logging

```typescript
// New: Single middleware handles all logging
// src/lib/middleware/request-logger.ts
export function withRequestLogging(handler: Handler) {
  return async (req, ctx) => {
    const requestId = generateId();
    const start = Date.now();

    try {
      const result = await handler(req, ctx);
      logger.info('Request complete', { requestId, duration: Date.now() - start });
      return result;
    } catch (error) {
      logger.error('Request failed', { requestId, error });
      throw error;
    }
  };
}
```

**Impact:** Remove ~1,000 lines of logging code

---

### 3.2 Redundant Type Assertions

**Current State:** 15+ files with `as any` or `as Record<>` assertions

```typescript
// Found in: src/app/api/vote/[voteId]/route.ts
const voteData = response.data as any;

// Found in: src/app/api/committee/[committeeId]/route.ts
const members = data.members as Record<string, unknown>[];
```

**Files with Type Assertion Issues:**

1. `src/app/api/vote/[voteId]/route.ts`
2. `src/app/api/bill/[billId]/route.ts`
3. `src/app/api/committee/[committeeId]/route.ts`
4. `src/lib/fec/dataProcessor.ts`
5. `src/lib/openstates-api.ts`

**Opus 4.5 Approach:** Auto-generate proper types from API responses

```bash
# Claude Code command to fix type assertions
/fix-types src/app/api/vote/[voteId]/route.ts \
  --infer-from-runtime \
  --add-type-guards \
  --eliminate-any
```

---

### 3.3 Manual Data Transformation Functions

**Current State:** 76 lines of nested if-statements for expenditure categorization

```typescript
// src/lib/fec/dataProcessor.ts (lines 316-392)
function categorizeExpenditure(description: string, categoryCode: string): string {
  if (
    description.toLowerCase().includes('media') ||
    description.toLowerCase().includes('advertising') ||
    description.toLowerCase().includes('tv') ||
    description.toLowerCase().includes('radio')
  ) {
    return 'Media & Advertising';
  }
  if (
    description.toLowerCase().includes('salary') ||
    description.toLowerCase().includes('payroll') ||
    description.toLowerCase().includes('consultant')
  ) {
    return 'Staff & Payroll';
  }
  // ... 60+ more lines of if-statements
}
```

**Opus 4.5 Approach:** LLM classification with examples

```typescript
// New: AI-powered categorization
const category = await opus.classify({
  input: { description, categoryCode },
  categories: EXPENDITURE_CATEGORIES,
  examples: [
    { input: 'TV advertising buy', output: 'Media & Advertising' },
    { input: 'Staff salary Q4', output: 'Staff & Payroll' },
    // ... few-shot examples
  ],
});
```

---

### 3.4 Hardcoded Election Cycle Constants

**Current State:** Magic numbers scattered across files

```typescript
// src/app/api/representative/[bioguideId]/finance/route.ts
const FALLBACK_CYCLES: [number, ...number[]] = [2024, 2022, 2020, 2018];

// src/lib/fec/dataProcessor.ts
const SMALL_DONOR_THRESHOLD = 200;
const LARGE_DONOR_THRESHOLD = 2800;

// src/lib/services/finance-comparisons.ts
const HOUSE_DEMOCRAT_AVERAGES = {
  totalRaised: 1_350_000,
  // ... hardcoded 2024 benchmarks
};
```

**Opus 4.5 Approach:** Dynamic configuration with AI-assisted updates

```typescript
// New: src/config/election-cycles.ts
export const getElectionCycles = () => {
  const currentYear = new Date().getFullYear();
  const cycles = [];
  for (let year = currentYear; year >= 2018; year -= 2) {
    if (year % 2 === 0) cycles.push(year);
  }
  return cycles;
};

// Benchmarks fetched dynamically from FEC
export const getFinanceBenchmarks = cache(
  async () => fecApi.getAverageFundraising({ chamber: 'house', cycle: getCurrentCycle() }),
  { ttl: ONE_WEEK }
);
```

---

## 4. Tooling Integration Opportunities

### 4.1 Custom Slash Commands

**Recommended Claude Code Slash Commands:**

#### `/api-test <endpoint>`

Generates comprehensive tests for an API endpoint:

```bash
/api-test /api/representative/[bioguideId]/votes
# Output: Creates src/__tests__/api/representative/votes.test.ts
# with 15-20 test cases covering success, error, edge cases
```

#### `/diagnose-endpoint <endpoint>`

Runs OODA-style diagnosis on a failing endpoint:

```bash
/diagnose-endpoint /api/state-legislature/MI
# Output:
# OBSERVE: Response time 4.2s, 503 errors in last hour
# ORIENT: OpenStates API rate limited
# DECIDE: Implement request queuing
# ACT: Added rate limiter, PR ready
```

#### `/generate-types <api-url>`

Auto-generates TypeScript interfaces from API responses:

```bash
/generate-types https://api.congress.gov/v3/member/K000367
# Output: Creates src/types/generated/congress-member.ts
# with proper interfaces matching actual API response
```

#### `/upgrade-route <path>`

Refactors a route to use new patterns:

```bash
/upgrade-route src/app/api/representative/[bioguideId]/route.ts
# Output: Refactors to use createApiHandler wrapper
# Removes boilerplate, adds proper types
```

---

### 4.2 MCP Server Integrations

**Recommended MCP Servers:**

#### 1. Government API MCP Server

```json
{
  "name": "gov-apis",
  "description": "Direct access to government APIs with caching",
  "tools": [
    {
      "name": "congress_member",
      "description": "Fetch Congress.gov member data",
      "parameters": { "bioguideId": "string" }
    },
    {
      "name": "fec_candidate",
      "description": "Fetch FEC candidate data",
      "parameters": { "candidateId": "string", "cycle": "number" }
    },
    {
      "name": "openstates_legislator",
      "description": "Fetch state legislator data",
      "parameters": { "state": "string", "name": "string" }
    }
  ]
}
```

**Benefits:**

- Faster API exploration during development
- Automatic rate limiting and caching
- Real data in Claude Code context

#### 2. Test Data MCP Server

```json
{
  "name": "civiq-test-data",
  "description": "Access test fixtures and mock data",
  "tools": [
    {
      "name": "get_test_representative",
      "description": "Get a known-good representative for testing",
      "parameters": { "chamber": "house|senate", "party": "D|R|I" }
    },
    {
      "name": "get_test_bill",
      "description": "Get a known-good bill for testing",
      "parameters": { "congress": "number", "type": "hr|s|hjres|sjres" }
    }
  ]
}
```

#### 3. Database MCP Server (for Redis)

```json
{
  "name": "civiq-cache",
  "description": "Inspect and manage Redis cache",
  "tools": [
    {
      "name": "cache_stats",
      "description": "Get cache hit/miss statistics"
    },
    {
      "name": "cache_inspect",
      "description": "Inspect cached value for a key",
      "parameters": { "pattern": "string" }
    },
    {
      "name": "cache_invalidate",
      "description": "Invalidate cache entries",
      "parameters": { "pattern": "string" }
    }
  ]
}
```

---

### 4.3 Claude Code Hooks

**Recommended Hooks Configuration:**

```json
// .claude/hooks.json
{
  "pre-commit": {
    "command": "npm run lint && npm run type-check",
    "failOnError": true
  },
  "post-edit": {
    "patterns": ["src/app/api/**/*.ts"],
    "command": "npm run test -- --findRelatedTests ${FILE}",
    "async": true
  },
  "pre-push": {
    "command": "npm run validate:all",
    "failOnError": true
  }
}
```

---

### 4.4 Agentic Workflow Automations

#### Auto-Fix Type Errors

```yaml
# Workflow: When TypeScript errors detected
trigger: npm run type-check fails
steps: 1. Parse error output for file:line:column
  2. Read surrounding context (20 lines)
  3. Identify error pattern (missing prop, wrong type, null check)
  4. Apply fix using Edit tool
  5. Re-run type-check to verify
  6. If still failing, escalate to user
```

#### Auto-Generate API Documentation

```yaml
# Workflow: When new API route created
trigger: New file matching src/app/api/**/route.ts
steps: 1. Parse route for parameters, response types
  2. Generate OpenAPI spec snippet
  3. Update docs/API_REFERENCE.md
  4. Create PR with documentation changes
```

#### Auto-Update CLAUDE.md

```yaml
# Workflow: When API endpoints added/removed
trigger: Change to src/app/api/**/route.ts
steps: 1. Count all API routes
  2. Categorize by feature area
  3. Update endpoint counts in CLAUDE.md
  4. Update API documentation section
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- [ ] Create `createApiHandler` wrapper
- [ ] Refactor 10 highest-traffic routes
- [ ] Set up MCP server for government APIs
- [ ] Create `/api-test` slash command

### Phase 2: Test Coverage (Weeks 3-4)

- [ ] Generate tests for all 16 representative endpoints
- [ ] Generate tests for all 8 finance endpoints
- [ ] Set up CI pipeline with coverage gates
- [ ] Target: 40% coverage

### Phase 3: Legacy Cleanup (Weeks 5-6)

- [ ] Remove excessive logging (middleware approach)
- [ ] Fix all `as any` type assertions
- [ ] Replace hardcoded industry patterns with AI classifier
- [ ] Refactor expenditure categorization

### Phase 4: Advanced Integration (Weeks 7-8)

- [ ] Implement AI-powered entity recognition
- [ ] Create test data MCP server
- [ ] Set up Claude Code hooks
- [ ] Target: 60% coverage

### Phase 5: Polish (Weeks 9-10)

- [ ] Refactor remaining 89 API routes
- [ ] Full E2E test suite
- [ ] Performance optimization
- [ ] Target: 80% coverage

---

## 6. Success Metrics

| Metric                     | Current         | Target         | Improvement      |
| -------------------------- | --------------- | -------------- | ---------------- |
| Lines of Code (API routes) | 30,406          | 15,000         | 50% reduction    |
| Lines of Code (services)   | 102,000         | 60,000         | 40% reduction    |
| Test Coverage              | 9%              | 80%            | 9x improvement   |
| Type Assertions (`as any`) | 15 files        | 0 files        | 100% elimination |
| Logging Statements         | 1,200           | 200            | 83% reduction    |
| Industry Patterns          | 200+ regex      | 0              | AI-powered       |
| API Route Boilerplate      | 150 lines/route | 30 lines/route | 80% reduction    |

---

## 7. Risk Assessment

### Low Risk

- API wrapper refactoring (well-established pattern)
- Test generation (additive, doesn't break existing code)
- Logging reduction (can revert easily)

### Medium Risk

- Type assertion fixes (may require interface changes)
- Industry classifier migration (needs validation period)
- MCP server integration (new infrastructure)

### High Risk

- AI-powered entity recognition (accuracy concerns)
- Multi-step fallback elimination (critical for FEC data)

**Mitigation:**

- Feature flags for high-risk changes
- A/B testing for AI-powered features
- Gradual rollout with monitoring

---

## 8. Appendix: Files for Immediate Refactoring

### Highest Impact (Refactor First)

1. `src/app/api/representative/[bioguideId]/votes/route.ts` - 748 lines
2. `src/lib/fec/fec-api-service.ts` - 1,166 lines
3. `src/lib/openstates-api.ts` - 1,393 lines
4. `src/lib/fec/industry-categorizer.ts` - 499 lines
5. `src/app/api/representative/[bioguideId]/finance/comprehensive/route.ts` - 430 lines

### Quick Wins (Same Day)

1. Create `src/lib/api/route-wrapper.ts`
2. Create `src/lib/middleware/request-logger.ts`
3. Move constants to `src/config/election-cycles.ts`
4. Create `/api-test` slash command

### Test Generation Priority

1. `src/app/api/state-legislature/` - 15 untested endpoints
2. `src/app/api/federal-register/` - 3 untested endpoints
3. `src/app/api/spending/` - 2 untested endpoints
4. `src/app/api/representative/[bioguideId]/finance/` - 8 partially tested

---

_Generated by Claude Opus 4.5 analysis on 2026-01-05_
_Codebase snapshot: commit dc2200e (main branch)_

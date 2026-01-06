# CLAUDE.MD - CIV.IQ AI Assistant Instructions (Enhanced with Claude Code Patterns)

## 🎯 Quick Context

**Project**: civic-intel-hub | **Location**: D:\civic-intel-hub | **Stack**: Next.js 15 + TypeScript + React 18
**Purpose**: Federal civic data platform using ONLY real government APIs (no mock data ever)
**Methodology**: Claude Code best practices + OODA debugging framework
**Status**: ✅ **100% TypeScript Compliant** - ZERO compilation errors (November 2025)

# Guidance Principles

1. **Stop overthinking** - Don't suggest overly complex solutions when simple ones work

2. **Read carefully** - Read requests thoroughly before responding

3. **Focus exactly** - Answer exactly what is asked, no assumptions or tangents

## 🎯 CLARIFICATION-FIRST PRINCIPLE

Before implementing ANY feature:

1. **Ask explicit questions** - Don't assume based on similar projects
   - "Should this use the existing [pattern] or create new?"
   - "Which approach fits better: [Option A] or [Option B]?"
   - "What's the expected behavior when [edge case]?"

2. **Find existing patterns** - Search codebase before creating new

   ```bash
   # Look for similar implementations first
   grep -r "similar-pattern" src/ --include="*.ts*" | head -5
   find src -name "*similar-feature*" -type f
   ```

3. **Choose simplest approach** - One solution before abstraction
   - Simple: Direct API call in route.ts → validate → iterate
   - Complex: Service layer + caching + retry logic (only if needed)

4. **Validate assumptions** - State your approach and confirm
   ```
   "Based on patterns in [files], I'll implement this as [approach].
   This matches the existing [pattern] used in [location].
   Proceed with this approach?"
   ```

**Example**: "I see we could add this as a new endpoint or extend the existing `/api/representative` route. The existing pattern in `src/app/api/representative/[bioguideId]/votes/route.ts` suggests separate routes for distinct data. Should I follow that pattern?"

## ⚡ CRITICAL RULES (NEVER VIOLATE)

1. **Quality Gates**: ALL code must pass `npm run lint && npm test` - NO exceptions
2. **Real Data Only**: Use real government APIs or show "Data unavailable" - NEVER generate fake data
3. **TypeScript Strict**: No `any` types, full null safety with optional chaining
4. **Test Everything**: Features aren't complete until tested end-to-end
5. **Clean Commits**: Use conventional commits (feat/fix/docs/chore)
6. **30-Line Rule**: NEVER write more than 30 lines without validation

## 🔨 TASK DECOMPOSITION PROTOCOL

### Before Starting ANY Task:

```bash
# 1. Understand current state
git status && git log --oneline -5
npm run validate:all

# 2. Map the territory
find src -name "*[relevant]*.ts*" | head -10
grep -r "PatternName" src/ --include="*.ts*" | head -5

# 3. Create implementation manifest
echo "TASK: [Feature Name]
├── Current State: [git branch, last commit]
├── Files to Modify: [explicit list]
├── Validation Gates: [after each file]
└── Success Criteria: [measurable]"
```

### Task Breakdown Template:

```
LEVEL 1: EXPLORE
- Find existing patterns
- Identify dependencies
- Note potential issues

LEVEL 2: PLAN
- Step-by-step approach
- Validation checkpoints
- Rollback strategy

LEVEL 3: EXECUTE
- Implement in 30-line chunks
- Validate after each chunk
- Commit working states
```

## 🔄 ENHANCED DEVELOPMENT WORKFLOW

### Core Loop: Explore → Hypothesis → Implement → Validate → Iterate

```bash
# EXPLORE - Always understand before coding
find src -type f -name "*.tsx" | xargs grep -l "ComponentPattern" | head -5

# HYPOTHESIS - State your approach
echo "Based on patterns in [files], I will:"
echo "1. [Specific action]"
echo "2. [Expected outcome]"

# IMPLEMENT - Small, validated chunks
[Write 20-30 lines maximum]

# VALIDATE - Immediate feedback
npm run type-check || echo "Fixing type error..."
npm run lint --quiet

# ITERATE - Only continue if passing
git add . && git commit -m "checkpoint: [what works so far]"
```

## ⚡ RAPID FEEDBACK PROTOCOL

**Golden Rule**: Never write more than 30 lines without validation

### Incremental Development Pattern:

```bash
# Write small chunk
[implement 20-30 lines]

# Immediate type check
npx tsc --noEmit --skipLibCheck [current-file]

# Test in isolation (if applicable)
npx tsx -e "import { functionName } from './path'; console.log(functionName())"

# Verify no regression
npm run lint --quiet

# Continue only if passing
[next 20-30 lines]
```

### Validation Checkpoints:

- After EVERY type/interface change: `npm run type-check`
- After EVERY component change: Check dev server for errors
- After EVERY API change: `curl localhost:3000/api/[endpoint]`
- Before EVERY commit: `npm run validate:all`

## 🛠️ CIV.IQ SPECIFIC TOOL PATTERNS

### Finding Code Patterns:

```bash
# List all API routes
find src/app/api -name "route.ts" -type f | sort

# Check endpoint implementations
grep "export async function" src/app/api/**/route.ts

# Find type usage across codebase
grep -r "RepresentativeResponse" src/ --include="*.ts*" | cut -d: -f1 | uniq

# Track component dependencies
grep -r "import.*from.*features" src/components --include="*.tsx"

# Find all uses of a hook
grep -r "useRepresentative" src/ --include="*.tsx" | cut -d: -f1 | sort -u
```

### Batch Operations:

```bash
# Update multiple files with same pattern
files=$(grep -r "OldPattern" src/ --include="*.ts*" | cut -d: -f1 | uniq)
for file in $files; do
  echo "Checking: $file"
  grep -n "OldPattern" "$file"
done
```

## 🌐 API VALIDATION PROTOCOL

### Before Implementation - Test Real APIs:

```bash
# Test Congress.gov directly
curl -H "X-API-Key: $CONGRESS_API_KEY" \
  "https://api.congress.gov/v3/member/K000367" | jq '.'

# Verify response structure
[response] | jq 'keys'

# Extract type shape
echo "interface CongressResponse {"
[response] | jq -r 'to_entries | .[] | "  \(.key): \(.value | type);"'
echo "}"
```

### After Implementation - Verify Your Endpoint:

```bash
# Start dev server
npm run dev &

# Test your endpoint
curl http://localhost:3000/api/representative/K000367 | jq '.'

# Verify data flow
curl http://localhost:3000/api/representative/K000367/bills | jq '.[] | {title, congress}'

# Check for data completeness
curl http://localhost:3000/api/representative/K000367 | jq '{name, party, state, hasCommittees: .committees | length > 0}'
```

## 📋 SESSION STATE MANAGEMENT

### Session Start Protocol:

```typescript
/**
 * SESSION: [Date] [Time]
 * GOAL: [Specific objective]
 * CONTEXT: [Issue/Feature link]
 *
 * CHECKPOINTS:
 * [ ] Environment validated (npm run validate:all)
 * [ ] Branch created/checked out
 * [ ] Related files identified
 * [ ] Tests identified/created
 * [ ] Documentation updated
 *
 * FILES TO MODIFY:
 * - [ ] src/[specific/file/path.tsx]
 * - [ ] src/types/[interface.ts]
 *
 * SUCCESS CRITERIA:
 * - [ ] [Measurable outcome]
 * - [ ] All tests passing
 * - [ ] No TypeScript errors
 */
```

### Progress Tracking:

```bash
# Create session log
echo "[$(date '+%Y-%m-%d %H:%M')] Starting: $TASK" >> .session.log

# Checkpoint after each major step
echo "[$(date '+%H:%M')] ✅ Types updated in src/types/representative.ts" >> .session.log
echo "[$(date '+%H:%M')] ✅ API endpoint tested: 200 OK with data" >> .session.log
echo "[$(date '+%H:%M')] ⚠️ Issue: TypeScript error in line 45" >> .session.log
echo "[$(date '+%H:%M')] ✅ Fixed: Added null check" >> .session.log

# End of session summary
echo "[$(date '+%H:%M')] SESSION COMPLETE: $TASK implemented" >> .session.log
git add . && git commit -m "feat: $TASK - see .session.log for details"
```

## 🚑 ERROR RECOVERY PATTERNS

### Immediate Diagnosis:

```bash
# Capture full error context
npm run build 2>&1 | tee build-error.log
tail -50 build-error.log | grep -E "error|Error|failed"

# Find what changed
git diff HEAD~1 --name-only | grep -E "\.(ts|tsx)$"

# Quick type check on changed files
for file in $(git diff --name-only); do
  echo "Checking: $file"
  npx tsc --noEmit --skipLibCheck "$file" 2>&1 | head -5
done
```

### OODA Debugging Framework:

When facing complex issues, activate OODA protocol:

```bash
# OBSERVE - Gather all data
echo "=== OBSERVE PHASE ==="
npm run build 2>&1 | tee error.log
grep -n "error" error.log

# ORIENT - Analyze patterns
echo "=== ORIENT PHASE ==="
# What type of error? (Type, Runtime, Build, Logic)
# What changed recently? (git diff)
# Similar patterns elsewhere? (grep codebase)

# DECIDE - Choose approach
echo "=== DECIDE PHASE ==="
# Option A: [Quick fix]
# Option B: [Refactor]
# Option C: [Revert and retry]

# ACT - Implement with validation
echo "=== ACT PHASE ==="
[implement fix]
npm run type-check && echo "✅ Types fixed"
npm run build && echo "✅ Build successful"
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes (all use real data)
│   ├── (civic)/           # Civic app routes group
│   └── page.tsx          # Landing page
├── components/            # React components
├── features/              # Feature modules
│   ├── campaign-finance/ # FEC integration
│   ├── legislation/       # Bills & votes
│   └── representatives/  # Member data
├── lib/                   # Utilities and services
├── types/                 # TypeScript definitions
└── hooks/                 # Custom React hooks

Key Entry Points:
- Landing: src/app/page.tsx
- API Base: src/app/api/
- Types: src/types/representative.ts
- Features: src/features/
```

## ✅ Validation Commands

```bash
# MUST PASS before claiming completion:
npm run lint        # ESLint checks
npm test           # Jest unit tests
npm run type-check # TypeScript validation
npm run build      # Production build
npm run validate:all # Run ALL checks at once

# Development:
npm run dev        # Start dev server (http://localhost:3000)

# Data Processing:
npm run process-census          # Update Census data
npm run process-zip-districts   # Process ZIP mappings

# Debugging:
npm run diagnose:apis          # Test API connectivity
```

## 🌐 API Endpoints

**Total: 101 API Endpoints** - All return real data or appropriate error messages.

### Federal Representatives (16 endpoints)

**Includes territorial delegates:** All 5 U.S. territories are represented with non-voting delegates (PR, VI, GU, AS, MP)

```typescript
GET /api/representatives?zip=48221                           # List by ZIP code (includes territories)
GET /api/representatives/all                                 # All current members (540 total: 435 House + 100 Senate + 5 delegates)
GET /api/representatives/by-district                         # Filter by district
GET /api/representatives-multi-district                      # Multi-district lookup
GET /api/representative/[bioguideId]                        # Member profile (includes votingMember and role fields)
GET /api/representative/[bioguideId]/simple                 # Lightweight profile
GET /api/representative/[bioguideId]/batch                  # Batch data fetch
GET /api/representative/[bioguideId]/bills                  # Sponsored bills
GET /api/representative/[bioguideId]/votes                  # Voting records
GET /api/representative/[bioguideId]/votes-simple           # Lightweight votes
GET /api/representative/[bioguideId]/voting-record          # Full voting history
GET /api/representative/[bioguideId]/committees             # Committee assignments
GET /api/representative/[bioguideId]/leadership             # Leadership positions
GET /api/representative/[bioguideId]/party-alignment        # Party voting alignment
GET /api/representative/[bioguideId]/trending               # Trending topics
GET /api/representative/[bioguideId]/connections            # Hypertext connections (agencies, spending, hearings, comments)
```

### Campaign Finance (8 endpoints)

```typescript
GET /api/representative/[bioguideId]/finance                # FEC overview
GET /api/representative/[bioguideId]/finance/comprehensive  # Complete finance data
GET /api/representative/[bioguideId]/finance/contributors   # Top contributors
GET /api/representative/[bioguideId]/finance/expenditures   # Campaign spending
GET /api/representative/[bioguideId]/finance/funding-sources # Funding breakdown
GET /api/representative/[bioguideId]/finance/geography      # Geographic donors
GET /api/representative/[bioguideId]/finance/industries     # Industry contributions
GET /api/representative/[bioguideId]/election-cycles        # Election cycle data
```

### News & Media (3 endpoints)

```typescript
GET /api/representative/[bioguideId]/news                   # NewsAPI + Google News
GET /api/state-legislature/[state]/legislator/[id]/news     # State legislator news
GET /api/news/batch                                         # Batch news processing
```

### State Legislature (15 endpoints)

```typescript
GET /api/state-legislature/[state]                          # State overview
GET /api/state-legislature/[state]/legislator/[id]          # Legislator profile
GET /api/state-legislature/[state]/legislator/[id]/bills    # Legislator bills
GET /api/state-legislature/[state]/legislator/[id]/votes    # Legislator votes
GET /api/state-legislature/[state]/legislator/[id]/news     # Legislator news
GET /api/state-legislature/[state]/bill/[id]                # State bill details
GET /api/state-legislature/[state]/committee/[id]           # State committee
GET /api/state-legislature/[state]/committees               # All committees
GET /api/state-bills/[state]                                # State bills list
GET /api/state-representatives                              # State reps lookup
GET /api/state-legislators-by-address                       # Find by address
GET /api/state-executives/[state]                           # Governors, etc.
GET /api/state-judiciary/[state]                            # State judges
GET /api/representative/[bioguideId]/state-legislature      # Related state data
GET /api/representative/[bioguideId]/lobbying               # Lobbying disclosure
```

### Districts & Geography (13 endpoints)

```typescript
GET /api/districts/all                                      # All US districts
GET /api/districts/[districtId]                             # District profile
GET /api/districts/[districtId]/economic-profile            # Economic data
GET /api/districts/[districtId]/government-spending         # Federal spending
GET /api/districts/[districtId]/neighbors                   # Neighboring districts
GET /api/districts/[districtId]/news                        # District news
GET /api/districts/[districtId]/services-health             # Public services
GET /api/district-boundaries/[districtId]                   # Boundary GeoJSON
GET /api/district-boundaries/metadata                       # Boundary metadata
GET /api/district-map                                       # Interactive map data
GET /api/state-boundaries/[stateCode]                       # State boundaries
GET /api/state-demographics/[stateCode]                     # Census demographics
GET /api/representative/[bioguideId]/district               # Rep's district
```

### Committees & Bills (11 endpoints)

```typescript
GET /api/committees                                         # All committees
GET /api/committee/[committeeId]                            # Committee details
GET /api/committee/[committeeId]/bills                      # Committee bills
GET /api/committee/[committeeId]/reports                    # Committee reports
GET /api/committee/[committeeId]/timeline                   # Activity timeline
GET /api/committee/[committeeId]/wikipedia                  # Wikipedia data
GET /api/committee/[committeeId]/meetings                   # Committee meetings with videos
GET /api/committee-meetings                                 # All committee meetings (with live floor links)
GET /api/bills/latest                                       # Latest bills
GET /api/bill/[billId]                                      # Bill details
GET /api/bill/[billId]/summary                              # Bill summary
```

### Votes & Comparison (4 endpoints)

```typescript
GET /api/vote/[voteId]                                      # Vote details
GET /api/senate-votes/[voteNumber]                          # Senate vote
GET /api/compare                                            # Compare members
GET /api/congress/119th/stats                               # Session statistics
```

### Floor & Hearings (2 endpoints)

```typescript
GET /api/floor-schedule                                     # House/Senate floor schedule (bills this week)
GET /api/witnesses                                          # Congressional hearing witnesses (searchable)
```

### Federal Register (3 endpoints)

```typescript
GET /api/federal-register                                   # All Federal Register documents (filterable)
GET /api/federal-register/executive-orders                  # Presidential executive orders
GET /api/federal-register/comment-periods                   # Open public comment periods (civic participation!)
```

### Federal Spending (2 endpoints)

```typescript
GET /api/spending/district/[districtId]                     # Federal contracts & grants by congressional district
GET /api/spending/geography                                 # Geographic spending data (for maps)
```

### GovInfo (1 endpoint)

```typescript
GET /api/govinfo/hearings                                   # Congressional hearings (filterable by congress, chamber)
```

### Local Government (1 endpoint)

```typescript
GET /api/city/[cityId]/council                              # City council members (10 cities: Chicago, Seattle, Boston, etc.)
```

### Geocoding & Location (4 endpoints)

```typescript
GET /api/geocode                                            # Address geocoding
GET /api/unified-geocode                                    # Unified geocoding
GET /api/local-government/[location]                        # Local officials
GET /api/representative-photo/[id]                          # Official photos
```

### Infrastructure & Admin (12 endpoints)

```typescript
GET /api/health                                             # Health check
GET /api/health/redis                                       # Redis status
GET /api/warmup                                             # Cache warmup
GET /api/cache/status                                       # Cache status
GET /api/cache/warm                                         # Warm cache
GET /api/cache/refresh                                      # Refresh cache
GET /api/cache/invalidate                                   # Invalidate cache
GET /api/admin/cache                                        # Admin cache mgmt
GET /api/admin/fec-health                                   # FEC API health
GET /api/debug                                              # Debug info
GET /api/cron/rss-aggregator                                # RSS cron job
GET /api/agent                                              # AI agent endpoint
```

### API Versioning (2 endpoints)

```typescript
GET /api/v2/representatives                                 # V2 API - list
GET /api/v2/representatives/[id]                            # V2 API - details
```

### Search & Discovery (1 endpoint)

```typescript
GET /api/search                                             # Advanced search
```

**Note**: Legacy GDELT endpoints (`/api/gdelt/*`) exist but are deprecated and not actively used.

## 🔧 Common Implementation Patterns

### Adding a New API Endpoint:

```bash
# 1. Check existing patterns
find src/app/api -name "route.ts" | xargs grep "export async function GET" | head -5

# 2. Create route file
mkdir -p src/app/api/[new-endpoint]
touch src/app/api/[new-endpoint]/route.ts

# 3. Add types first
echo "// Add to src/types/[domain].ts"
echo "export interface NewEndpointResponse { ... }"

# 4. Implement with validation
[implement endpoint]
npm run type-check

# 5. Test immediately
curl http://localhost:3000/api/[new-endpoint] | jq '.'

# 6. Add to documentation
echo "GET /api/[new-endpoint] # Description" >> docs/API_REFERENCE.md
```

### Updating Representative Data:

```bash
# 1. Find current implementation
grep -r "getEnhancedRepresentative" src/

# 2. Check type definitions
cat src/types/representative.ts | grep "interface.*Representative"

# 3. Test with real bioguide
curl http://localhost:3000/api/representative/K000367 | jq '.name, .state, .party'

# 4. Verify Congress.gov integration
grep "CONGRESS_API" .env.local
```

### Fixing Type Errors:

```bash
# 1. Get specific error
npm run type-check 2>&1 | head -20

# 2. Find the type definition
grep -r "TypeName" src/types/

# 3. Check usage patterns
grep -r "TypeName" src/ --include="*.ts*" | head -10

# 4. Fix incrementally
[fix one file]
npx tsc --noEmit [fixed-file]
[repeat]
```

## 🎨 UI Guidelines

**Design System**: `src/styles/aicher-system.css` (1,500+ lines)
**Philosophy**: Otl Aicher / Dieter Rams / Ulm School of Design

### Core Principles

- Clean, minimalist, geometric design
- Mobile-first responsive
- Accessibility (WCAG 2.1 AA)
- Loading states for all async operations
- Error boundaries for fault tolerance

### DO NOT CHANGE (Established System)

| Element     | Value          | Notes                              |
| ----------- | -------------- | ---------------------------------- |
| **Font**    | Braun Linear   | Weights 100-700, DO NOT substitute |
| **Red**     | #e11d07        | Errors, Republican, logo           |
| **Green**   | #0a9338        | Success, Democrat, logo            |
| **Blue**    | #3ea2d4        | Links, interactive, accents        |
| **Grid**    | 8px base       | All spacing must be multiples      |
| **Borders** | 2px structural | 1px dividers, 3px emphasis         |

### Anti-Patterns to REJECT

These patterns are explicitly BANNED from the codebase:

1. **Purple gradients** - Clichéd AI aesthetic, violates 3-color system
2. **Rounded corners** (`border-radius`) - Use sharp rectangles only
3. **Box shadows** - Use 2px borders instead
4. **Inter/Roboto/Arial fonts** - We use Braun Linear exclusively
5. **Decorative icons/emojis** in UI chrome - Functional only
6. **Animated gradients** or background effects
7. **Skeleton loaders** - Use `.aicher-loading` spinner
8. **Toast notifications** - Use inline status feedback
9. **Soft/pastel colors** - Use full-saturation brand colors
10. **Medium font weights** (500/600 for body) - Use 400 or 700 only
11. **Hover shadows** - Use border-color change instead
12. **Gradient buttons** - Solid colors only

### CSS Class Quick Reference

```css
/* Containers */
.aicher-card              /* Standard container with 2px border */
.aicher-sidebar-card      /* Sidebar container */
.accent-bar-red/green/blue /* Left accent stripe (6px) */

/* Buttons */
.aicher-button            /* Secondary: white bg, black border */
.aicher-button-primary    /* Primary: blue bg, white text */
.aicher-button-high-emphasis /* High-impact CTA */
.accent-cta               /* Landing page CTA */

/* Typography */
.aicher-display           /* 64px uppercase display */
.aicher-title             /* 32px section headers */
.aicher-heading           /* 24px subsections */
.aicher-label             /* 12px uppercase labels */
.stat-number              /* Large statistics (48px) */

/* Layout */
.aicher-grid-2/3/4        /* Responsive grid layouts */
.aicher-data-list         /* Vertical list with dividers */
.aicher-tabs              /* Tab navigation */

/* Status */
.aicher-status-success/error/info /* Status indicators */
.legislation-status-passed/active/failed /* Bill status badges */
```

### Spacing Scale (8px Grid)

```css
--grid: 8px;
grid-1: 8px   /* Tight */
grid-2: 16px  /* Compact */
grid-3: 24px  /* Default */
grid-4: 32px  /* Comfortable */
grid-5: 40px  /* Section gaps (Aicher standard) */
grid-6: 48px  /* Major sections */
```

## 🚨 Troubleshooting Quick Reference

| Issue                          | Quick Fix                            | Validation                   |
| ------------------------------ | ------------------------------------ | ---------------------------- |
| "Cannot find module"           | `npm ci`                             | `npm run build`              |
| "Type 'any' is not assignable" | Add types in `src/types/`            | `npm run type-check`         |
| "Test timeout"                 | Increase timeout in `jest.config.js` | `npm test -- --verbose`      |
| "Build fails"                  | `rm -rf .next && npm run build`      | Check build-error.log        |
| "API returns no data"          | Check `.env.local` for API keys      | `npm run diagnose:apis`      |
| "SWR not updating"             | Check cache keys and mutate          | Browser DevTools Network tab |
| "Hydration mismatch"           | Wrap dynamic content in `Suspense`   | Check server vs client logs  |

## 📊 Current Status

### ✅ Production Ready

**Federal Government Data:**

- **Federal representatives** with Congress.gov data (540 total members)
  - 435 voting House representatives (50 states)
  - 100 voting Senators (50 states)
  - 5 non-voting territorial delegates (PR, VI, GU, AS, MP)
  - Constitutional distinction: `votingMember` and `role` fields per Article I & IV
- **Territorial representation** (Article IV, Section 3)
  - Puerto Rico: Resident Commissioner (4-year term, Republican)
  - Virgin Islands: Delegate (2-year term, Democrat)
  - Guam: Delegate (2-year term, Republican)
  - American Samoa: Delegate (2-year term, Republican)
  - Northern Mariana Islands: Delegate (2-year term, Republican)
  - UI badges with constitutional explanation tooltips
- ZIP code lookup (39,495 ZIPs including 132 territorial ZIPs)
- Campaign finance (FEC integration with 8 specialized endpoints)
- Voting records (House + Senate with XML parsing)
- Committee profiles with Wikipedia integration
- Bill tracking and legislative timelines
- 119th Congress statistics and metadata
- **Hypertext connections endpoint** - Links representatives to related civic data:
  - Committee-to-agency mapping (what agencies each rep oversees)
  - District spending from USAspending.gov (contracts and grants)
  - Relevant congressional hearings from GovInfo
  - Open comment periods from Federal Register
  - State legislators and city council members

**State & Local Government:**

- **State legislature integration** (OpenStates v3 API)
  - State legislator profiles (50% faster - direct service layer access)
  - State bill details with abstracts
  - Voting records and sponsored legislation
  - State legislative district maps (all 50 states + DC)
- **State executives & judiciary** (Wikidata integration)
  - Governors, lieutenant governors, attorneys general
  - State supreme court justices
  - Searchable by state code
- **State legislative district maps** (PMTiles-based)
  - Interactive boundary maps for all 7,383 state districts
  - 24MB optimized dataset (75% reduction from 95MB)
  - Covers all 50 states + DC (house + senate districts)
  - Chamber-based URL routing (/state-districts/[state]/[chamber]/[district])
- **Local government officials** lookup by address

**News & Media:**

- NewsAPI.org integration (primary news source)
- Google News RSS feed integration (fallback)
- Parallel fetching with automatic failover
- Note: GDELT integration removed (Oct 2023) - 77% performance improvement

**Geographic & Demographic Data:**

- **Address-to-legislators** geocoding (Census + OpenStates)
- Federal district boundaries (GeoJSON + PMTiles)
- State boundaries and demographics (Census Bureau)
- District economic profiles (BLS, FCC, DoE, CDC integration)
- Government spending by district
- Neighboring district analysis

**Wikipedia Integration:**

- Federal representative biographical data
- State legislator Wikipedia links
- Committee Wikipedia pages
- Wikidata for state executives & judiciary

**Infrastructure & Performance:**

- **Google Analytics** (G-F98819F2NC) - Site analytics via gtag.js in root layout
- **Congressional constants** (parties, chambers, sessions) - hardcoded for performance
- **Cache management API** - Admin endpoints for cache invalidation
- Redis health monitoring
- FEC API health checks
- API versioning (V2 endpoints)
- Batch data processing endpoints
- AI agent endpoint for enhanced queries

**Data Architecture:**

- Server → client → components flow
- Type-safe TypeScript throughout
- Real government APIs only (no mock data)
- Graceful degradation when APIs unavailable
- Static data files for rarely-changing data (Census Gazetteer, state metadata, committee bios)

### 🚧 In Development

- Enhanced district analytics and visualizations
- Performance optimizations (caching strategies, API batching)
- Mobile layout refinements

### 🐛 Known Issues

**HIGH (Functionality):**

- None currently

**LOW (Cleanup):**

- **Limited FEC Coverage**: Not all representatives have FEC ID mappings yet
- **District Boundaries**: Some boundary geometries need refinement for accuracy

**✅ FIXED (January 2026):**

- **Rate Limiting Implemented**: Full rate limiting with in-memory store in `src/middleware.ts` - path-based limits (100/min API, 60/min representatives, 30/min maps), request validation (XSS/SQLi/path traversal detection), security headers, 46 unit tests added

**✅ FIXED (December 2025):**

- **Donor Pages Dead Links**: Entity recognition now returns null for donors (prevents 404s)
- **V2 Multi-District Filter**: Implemented multi-district ZIP lookup in V2 API
- **Entity ID Generation**: Returns null for unidentified representatives (prevents fake bioguide IDs)
- **House Wikidata Integration**: Congressional districts now have Wikidata integration (all 50 states)
- **FEC State Bug**: State now extracted from FEC candidate ID (`src/lib/fec/dataProcessor.ts`)
- **Mobile Grids**: Added responsive breakpoints to VotingMetrics, TabsEnhanced, FundraisingTrends, ClientBillContent
- **GDELT References Removed**: Updated to NewsAPI + Google News in TabsEnhanced.tsx and data-sources/page.tsx

**Known Limitations (Not Bugs):**

- **Committee Data Sparse**: OpenStates v3 API has incomplete committee assignments (~30% coverage)
- **OpenStates Pagination**: State endpoints limited to 50 legislators and 20 bills per page (API maximum)

## 🔐 Security Requirements

- **NO Math.random()** for data generation
- **NO mock legislator generation**
- **NO fake bills or votes**
- Empty arrays when data unavailable
- Clear "Data unavailable" messaging
- All user input sanitized
- API keys in environment variables only
- Rate limiting on all API endpoints
- CORS properly configured

## 📝 Session Management

### At Start of Each Session:

```bash
# 1. Sync with latest
git pull origin main

# 2. Check environment
npm run validate:all

# 3. Create session branch (optional)
git checkout -b session/$(date +%Y%m%d)-[feature-name]

# 4. Start session log
echo "=== SESSION START: $(date) ===" >> .session.log
echo "GOAL: [What you're implementing]" >> .session.log

# 5. Note current focus below
```

**Recent Development Highlights** (Last 3 Months):

**December 2025:**

- ✅ **Committees Directory Page** - Rebuilt `/committees` page with static data (45 committees, 546 subcommittees), collapsible subcommittee lists using native `<details>`/`<summary>`, clickable stat boxes linking to chamber sections, and linked subcommittee names to their detail pages
- ✅ **FEC Lazy Singleton** - Fixed build-time error by changing FEC API service from eager to lazy Proxy-based initialization (prevents `FEC_API_KEY required` error during static generation)
- ✅ **Census Gazetteer Integration** - Added static `district-gazetteer.json` with real land area data for all 440 congressional districts (119th Congress) from Census Bureau 2024 Gazetteer, eliminating hardcoded fallback values

**November 2025:**

- ✅ **Otl Aicher Profile Page Refactor** - Complete redesign of representative profile pages for strict Ulm School compliance: 40px section gaps (de-densification), data list pattern for committees, geometric map placeholders, high-emphasis CTAs, line-clamp biographies with READ MORE toggle, strict color palette (red/green/blue only - eliminated purple)
- ✅ **Aggressive ISR Caching** - Added Next.js ISR caching to 65 API routes with tiered revalidation (1 week/1 day/1 hour/5 min) - significant performance boost across all endpoints
- ✅ **Committee Biography Caching** - Pre-generated Wikipedia/Wikidata data for all 34 congressional committees, eliminating API calls on committee page views
- ✅ **Representative Photo Optimization** - Downloaded and optimized 432 official photos (83% coverage), converted to WebP format with 83% file size reduction (61.78 MB → 10.65 MB)
- ✅ **State Legislature Metadata** - Created static metadata file for all 50 states + DC with chamber structure, session info, capitol cities (instant access, zero API calls)
- ✅ **Wikipedia Integration** - Added Wikipedia biographical data for state legislators, federal representatives, and committees
- ✅ **4-Tab UI Restructure** - Converted district pages to 4-tab structure (Overview, Bills, Map, State District Maps) for better discoverability
- ✅ **Unified District Pages** - Merged federal and state district page components for consistent UX
- ✅ **Aicher/Rams Visualizations** - Added geometric modernist data visualizations for district pages
- ✅ **Chamber-Based Routing** - Migrated state district routes to `/state-districts/[state]/[chamber]/[district]` format
- ✅ **PMTiles Optimization** - Optimized state district maps from 95 MB to 24 MB (75% reduction) by reducing max zoom from 12→10, 75% faster loading with zero quality loss
- ✅ **State District Maps Complete** - Added interactive PMTiles maps for all 7,383 state legislative districts (50 states + DC)
- ✅ **OpenStates Pagination Fix** - Fixed API pagination limits (legislators: 50/page, bills: 20/page), improved type safety (removed all `as any` assertions)
- ✅ **OpenStates Performance** - Security fix (API key redaction), performance boost (50% faster profile pages), bill abstracts endpoint
- ✅ **Congressional Constants** - Hardcoded reference data (parties, chambers, sessions) for performance
- ✅ **State Executives & Judiciary** - Added Wikidata integration for governors, attorneys general, and state supreme court justices

**October 2025:**

- ✅ **GDELT Removal** - Removed GDELT integration (77% file size reduction, 50% faster news endpoint) - replaced with NewsAPI + Google News
- ✅ **OpenStates v3 Migration** - GraphQL→REST API, 110+ state legislators
- ✅ **Address Geocoding** - Census + OpenStates integration for legislator lookup
- ✅ **Voting Systems** - Senate + House XML parsing, vote detail pages
- ✅ **FEC Build Fix** - Prevented API key validation during build phase

**September 2025:**

- ✅ **Otl Aicher Design System** - Geometric modernist UI across 416 files
- ✅ **District Enhancements** - BLS, FCC, DoE, CDC data integration
- ✅ **Demographics Fix** - State name→code mapping for Census API
- ✅ **Wikidata Integration** - 119th Congress metadata, biographical data

_For complete feature history, see git commits or docs/PHASE_TRACKER.md_

## 🆘 When Stuck

### Systematic Approach:

1. **STOP** - Don't create complex workarounds
2. **OBSERVE** - What exactly is failing? Get specific error
3. **RESEARCH** - Find similar patterns in codebase
4. **SIMPLIFY** - The simple solution is usually correct
5. **TEST** - Validate each step before proceeding
6. **ASK** - "Should I approach this as X or Y?"

### Emergency Recovery:

```bash
# If everything is broken
git stash
git checkout main
npm ci
npm run validate:all

# Start fresh with small steps
```

## 📚 Extended Documentation

### Core Documentation:

- `CLAUDE.md` - THIS FILE - AI assistant instructions
- `README.md` - Project overview and setup
- `ROADMAP.md` - Development phases and planning

### Technical Guides:

- `docs/API_REFERENCE.md` - Complete API documentation
- `docs/ARCHITECTURE.md` - System design and patterns
- `docs/DEVELOPMENT_GUIDE.md` - Development setup and commands
- `docs/development/OODA_DEBUGGING_METHODOLOGY.md` - Advanced debugging

### Implementation Docs:

- `docs/PHASE_TRACKER.md` - Feature completion tracking
- `docs/ZIP_CODE_MAPPING_SYSTEM.md` - ZIP to district mapping
- `docs/development/CAMPAIGN_FINANCE_FIX.md` - FEC integration
- `docs/development/OPENSTATES_V3_MIGRATION.md` - OpenStates API v2→v3 migration
- `docs/development/ADDRESS_TO_LEGISLATORS_INTEGRATION.md` - Address geocoding system

### Security & Deployment:

- `SECURITY.md` - Security policies
- `SECURITY-REMEDIATION.md` - Security audit details
- `docs/deployment/` - Deployment guides

---

**Remember**: This is a civic utility serving citizens with real government data.
Keep it clean, fast, transparent, and always use authentic sources.

**Claude Code Integration**: This file now includes Claude Code best practices.
Always reference these patterns for efficient, validated development.
